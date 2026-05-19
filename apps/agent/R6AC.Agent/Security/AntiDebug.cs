using System.Diagnostics;
using System.Management;
using System.Runtime.InteropServices;
using Serilog;

namespace R6AC.Agent.Security;

public record AntiDebugResult(bool IsDebuggerPresent, string TriggeredCheckName);

/// <summary>
/// تشخیص دیباگر و ابزارهای مهندسی معکوس با مکانیزم شکست خاموش (Silent Failure).
/// Advanced anti-debug and anti-analysis checks triggering silent failure mode on detection.
/// </summary>
public static class AntiDebug
{
    public static bool IsSilentModeActive { get; private set; }
    public static DateTime SilentModeStartTime { get; private set; }

    private static bool _mockDebuggerPresent = false;

    public static void SetMockDebuggerPresent(bool present)
    {
        _mockDebuggerPresent = present;
        if (present)
        {
            TriggerSilentMode();
        }
    }

    [DllImport("kernel32.dll", ExactSpelling = true, SetLastError = true)]
    private static extern bool IsDebuggerPresent();

    [DllImport("kernel32.dll", ExactSpelling = true, SetLastError = true)]
    private static extern bool CheckRemoteDebuggerPresent(IntPtr hProcess, out bool isDebuggerPresent);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr GetCurrentThread();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetThreadContext(IntPtr hThread, IntPtr lpContext);

    [StructLayout(LayoutKind.Sequential)]
    private struct PROCESS_BASIC_INFORMATION
    {
        public IntPtr Reserved1;
        public IntPtr PebBaseAddress;
        public IntPtr Reserved2_0;
        public IntPtr Reserved2_1;
        public UIntPtr UniqueProcessId;
        public IntPtr Reserved3;
    }

    [DllImport("ntdll.dll", SetLastError = true)]
    private static extern int NtQueryInformationProcess(IntPtr processHandle, int processInformationClass, out PROCESS_BASIC_INFORMATION processInformation, int processInformationLength, out int returnLength);

    private const int ProcessBasicInformationClass = 0;

    public static void TriggerSilentMode()
    {
        if (!IsSilentModeActive)
        {
            IsSilentModeActive = true;
            SilentModeStartTime = DateTime.UtcNow;
            Log.Warning("Anti-debug triggered — entering silent mode");
        }
    }

    public static AntiDebugResult RunAllChecks()
    {
        if (_mockDebuggerPresent)
        {
            TriggerSilentMode();
            return new AntiDebugResult(true, "MockDebugger");
        }

        if (IsDebuggerPresentWinApi())
        {
            TriggerSilentMode();
            return new AntiDebugResult(true, nameof(IsDebuggerPresentWinApi));
        }

        if (IsTimingAnomalyDetected())
        {
            TriggerSilentMode();
            return new AntiDebugResult(true, nameof(IsTimingAnomalyDetected));
        }

        if (HasHardwareBreakpoints())
        {
            TriggerSilentMode();
            return new AntiDebugResult(true, nameof(HasHardwareBreakpoints));
        }

        if (IsSuspiciousParentProcess())
        {
            TriggerSilentMode();
            return new AntiDebugResult(true, nameof(IsSuspiciousParentProcess));
        }

        if (HasDebugHeapFlags())
        {
            TriggerSilentMode();
            return new AntiDebugResult(true, nameof(HasDebugHeapFlags));
        }

        return new AntiDebugResult(false, "CLEAN");
    }

    // Check 1: Windows API debugger detection
    public static bool IsDebuggerPresentWinApi()
    {
        if (!OperatingSystem.IsWindows()) return false;
        if (Debugger.IsAttached || IsDebuggerPresent()) return true;
        try
        {
            CheckRemoteDebuggerPresent(Process.GetCurrentProcess().Handle, out var isRemote);
            return isRemote;
        }
        catch
        {
            return false;
        }
    }

    // Check 2: Timing attack detection
    public static bool IsTimingAnomalyDetected()
    {
        var sw = Stopwatch.StartNew();
        long dummy = 0;
        for (int i = 0; i < 50_000; i++)
        {
            dummy += (i * 3) ^ 0x55AA;
        }
        sw.Stop();

        // Execution normally takes < 5ms. If > 250ms, debugger stepping suspected
        return sw.ElapsedMilliseconds > 250;
    }

    // Check 3: Hardware breakpoint detection
    public static bool HasHardwareBreakpoints()
    {
        if (!OperatingSystem.IsWindows() || IntPtr.Size != 8) return false;

        IntPtr ptr = IntPtr.Zero;
        try
        {
            int contextSize = 1232; // Size of x64 CONTEXT
            ptr = Marshal.AllocHGlobal(contextSize);
            for (int i = 0; i < contextSize; i++) Marshal.WriteByte(ptr, i, 0);

            // Set ContextFlags = CONTEXT_DEBUG_REGISTERS (0x00100010L)
            Marshal.WriteInt32(ptr, 48, 0x00100010);

            if (GetThreadContext(GetCurrentThread(), ptr))
            {
                // DR0-DR3 are at offset 72, 80, 88, 96 in x64 CONTEXT
                ulong dr0 = (ulong)Marshal.ReadInt64(ptr, 72);
                ulong dr1 = (ulong)Marshal.ReadInt64(ptr, 80);
                ulong dr2 = (ulong)Marshal.ReadInt64(ptr, 88);
                ulong dr3 = (ulong)Marshal.ReadInt64(ptr, 96);

                if (dr0 != 0 || dr1 != 0 || dr2 != 0 || dr3 != 0)
                {
                    return true;
                }
            }
        }
        catch
        {
            // Ignore context read errors
        }
        finally
        {
            if (ptr != IntPtr.Zero) Marshal.FreeHGlobal(ptr);
        }

        return false;
    }

    // Check 4: Parent process check
    public static bool IsSuspiciousParentProcess()
    {
        if (!OperatingSystem.IsWindows()) return false;

        try
        {
            int currentPid = Process.GetCurrentProcess().Id;
            int parentPid = 0;

            if (NtQueryInformationProcess(Process.GetCurrentProcess().Handle, ProcessBasicInformationClass, out var pbi, Marshal.SizeOf<PROCESS_BASIC_INFORMATION>(), out _) == 0)
            {
                parentPid = (int)pbi.Reserved3; // Reserved3 holds InheritedFromUniqueProcessId
            }

            if (parentPid > 0)
            {
                var parentProc = Process.GetProcessById(parentPid);
                var name = parentProc.ProcessName.ToLowerInvariant();
                if (name.Contains("x64dbg") || name.Contains("windbg") || name.Contains("ida") || name.Contains("ollydbg") || name.Contains("dnspy") || name.Contains("ghidra") || name.Contains("cheatengine") || name.Contains("de4dot"))
                {
                    return true;
                }
            }
        }
        catch
        {
            // Parent process might have already exited
        }

        return false;
    }

    // Check 5: Heap flag check
    public static bool HasDebugHeapFlags()
    {
        if (!OperatingSystem.IsWindows()) return false;

        try
        {
            if (NtQueryInformationProcess(Process.GetCurrentProcess().Handle, ProcessBasicInformationClass, out var pbi, Marshal.SizeOf<PROCESS_BASIC_INFORMATION>(), out _) == 0)
            {
                if (pbi.PebBaseAddress != IntPtr.Zero)
                {
                    int offset = IntPtr.Size == 8 ? 0x68 : 0xBC;
                    int flags = Marshal.ReadInt32(pbi.PebBaseAddress, offset);
                    // Flag 0x70 = FLG_HEAP_ENABLE_TAIL_CHECK | FLG_HEAP_ENABLE_FREE_CHECK | FLG_HEAP_VALIDATE_PARAMETERS
                    if ((flags & 0x70) != 0)
                    {
                        return true;
                    }
                }
            }
        }
        catch
        {
            // Ignore restricted memory read
        }

        return false;
    }
}
