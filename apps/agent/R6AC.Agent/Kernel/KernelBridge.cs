using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

namespace R6AC.Agent.Kernel;

public enum KernelDetectionType
{
    ProcessInjection = 1,
    SuspiciousImageLoad = 2,
    ExternalMemoryAccess = 3,
    DmaPatternDetected = 4,
    HandleStripAttempt = 5,
    KernelDriverAnomaly = 6
}

public record KernelReport(
    uint ReportId,
    KernelDetectionType DetectionType,
    float Confidence,
    uint ProcessId,
    string ProcessName,
    string ReasonCode,
    DateTime Timestamp
);

public record DriverStatus(
    bool DriverActive,
    uint MonitoredPid,
    uint ReportCount,
    uint CallbacksRegistered
);

public class KernelBridge : IDisposable
{
    private const uint R6AC_IOCTL_BASE = 0x8000;
    private const uint METHOD_BUFFERED = 0;
    private const uint FILE_READ_ACCESS = 0x0001;
    private const uint FILE_WRITE_ACCESS = 0x0002;

    private static uint CtlCode(uint deviceType, uint function, uint method, uint access) =>
        (deviceType << 16) | (access << 14) | (function << 2) | method;

    private readonly uint IOCTL_R6AC_GET_STATUS = CtlCode(R6AC_IOCTL_BASE, 0x01, METHOD_BUFFERED, FILE_READ_ACCESS);
    private readonly uint IOCTL_R6AC_GET_REPORTS = CtlCode(R6AC_IOCTL_BASE, 0x02, METHOD_BUFFERED, FILE_READ_ACCESS);
    private readonly uint IOCTL_R6AC_SET_GAME_PID = CtlCode(R6AC_IOCTL_BASE, 0x03, METHOD_BUFFERED, FILE_WRITE_ACCESS);
    private readonly uint IOCTL_R6AC_CLEAR_REPORTS = CtlCode(R6AC_IOCTL_BASE, 0x04, METHOD_BUFFERED, FILE_WRITE_ACCESS);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode, Pack = 8)]
    private struct R6AC_DETECTION_REPORT_RAW
    {
        public uint ReportId;
        public uint DetectionType;
        public uint Confidence;
        public uint ProcessId;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)]
        public string ProcessName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
        public string ReasonCode;
        public long Timestamp;
    }

    [StructLayout(LayoutKind.Sequential, Pack = 1)]
    private struct R6AC_STATUS_RAW
    {
        public byte DriverActive;
        public uint MonitoredPid;
        public uint ReportCount;
        public uint CallbacksRegistered;
    }

    private SafeFileHandle? _handle;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern SafeFileHandle CreateFile(
        string fileName,
        uint desiredAccess,
        uint shareMode,
        IntPtr securityAttributes,
        uint creationDisposition,
        uint flagsAndAttributes,
        IntPtr templateFile
    );

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool DeviceIoControl(
        SafeFileHandle hDevice,
        uint ioControlCode,
        ref uint inBuffer,
        uint nInBufferSize,
        out R6AC_STATUS_RAW outBuffer,
        uint nOutBufferSize,
        out uint pBytesReturned,
        IntPtr overlapped
    );

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool DeviceIoControl(
        SafeFileHandle hDevice,
        uint ioControlCode,
        IntPtr inBuffer,
        uint nInBufferSize,
        IntPtr outBuffer,
        uint nOutBufferSize,
        out uint pBytesReturned,
        IntPtr overlapped
    );

    private const uint GENERIC_READ = 0x80000000;
    private const uint GENERIC_WRITE = 0x40000000;
    private const uint OPEN_EXISTING = 3;

    public bool Connect()
    {
        _handle = CreateFile(@"\\.\R6ACDriver", GENERIC_READ | GENERIC_WRITE, 0, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);
        return _handle != null && !_handle.IsInvalid;
    }

    public bool SetGamePid(uint pid)
    {
        if (_handle == null || _handle.IsInvalid) return false;
        uint bytesReturned;
        uint inPid = pid;
        return DeviceIoControl(_handle, IOCTL_R6AC_SET_GAME_PID, ref inPid, sizeof(uint), out _, 0, out bytesReturned, IntPtr.Zero);
    }

    public DriverStatus GetStatus()
    {
        if (_handle == null || _handle.IsInvalid) return new DriverStatus(false, 0, 0, 0);
        uint bytesReturned;
        uint dummy = 0;
        if (DeviceIoControl(_handle, IOCTL_R6AC_GET_STATUS, ref dummy, 0, out R6AC_STATUS_RAW raw, (uint)Marshal.SizeOf<R6AC_STATUS_RAW>(), out bytesReturned, IntPtr.Zero))
        {
            return new DriverStatus(raw.DriverActive != 0, raw.MonitoredPid, raw.ReportCount, raw.CallbacksRegistered);
        }
        return new DriverStatus(false, 0, 0, 0);
    }

    public List<KernelReport> GetPendingReports()
    {
        var list = new List<KernelReport>();
        if (_handle == null || _handle.IsInvalid) return list;

        int maxReports = 64;
        int structSize = Marshal.SizeOf<R6AC_DETECTION_REPORT_RAW>();
        int bufSize = maxReports * structSize;

        IntPtr ptr = Marshal.AllocHGlobal(bufSize);
        try
        {
            if (DeviceIoControl(_handle, IOCTL_R6AC_GET_REPORTS, IntPtr.Zero, 0, ptr, (uint)bufSize, out uint bytesReturned, IntPtr.Zero))
            {
                int count = (int)(bytesReturned / structSize);
                for (int i = 0; i < count; i++)
                {
                    IntPtr itemPtr = IntPtr.Add(ptr, i * structSize);
                    var raw = Marshal.PtrToStructure<R6AC_DETECTION_REPORT_RAW>(itemPtr);
                    list.Add(new KernelReport(
                        raw.ReportId,
                        (KernelDetectionType)raw.DetectionType,
                        raw.Confidence / 100.0f,
                        raw.ProcessId,
                        raw.ProcessName ?? "",
                        raw.ReasonCode ?? "",
                        DateTime.FromFileTime(raw.Timestamp)
                    ));
                }
            }
        }
        finally
        {
            Marshal.FreeHGlobal(ptr);
        }

        return list;
    }

    public bool ClearReports()
    {
        if (_handle == null || _handle.IsInvalid) return false;
        uint bytesReturned;
        uint dummy = 0;
        return DeviceIoControl(_handle, IOCTL_R6AC_CLEAR_REPORTS, ref dummy, 0, out _, 0, out bytesReturned, IntPtr.Zero);
    }

    public void Dispose()
    {
        _handle?.Dispose();
    }
}
