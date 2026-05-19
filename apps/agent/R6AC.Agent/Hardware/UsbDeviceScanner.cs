using System.Management;
using R6AC.Agent.Detectors;

namespace R6AC.Agent.Hardware;

/// <summary>
/// مشخصات امضای سخت‌افزاری دستگاه‌های تقلب شناخته‌شده.
/// Signature definition for known cheat hardware devices.
/// </summary>
public record UsbSignature(string Name, string VidPid, float Confidence, string ReasonCode);

/// <summary>
/// اطلاعات دستگاه USB متصل شده.
/// Connected USB device information.
/// </summary>
public record ConnectedUsbDevice(string DeviceId, string Name, string Description);

/// <summary>
/// اسکنر دستگاه‌های USB متصل به سیستم جهت تشخیص سخت‌افزارهای تقلب (KMBox، Arduino و غیره).
/// USB device scanner to detect cheat hardware (KMBox, Arduino, Raspberry Pi, etc.).
/// </summary>
public class UsbDeviceScanner
{
    public static readonly List<UsbSignature> KnownCheatDevices = new()
    {
        new("KMBox", "VID_1A86&PID_7523", 0.85f, "KMBOX_DETECTED"),
        new("KMBox Net", "VID_0403&PID_6001", 0.80f, "KMBOX_NET_DETECTED"),
        new("Arduino Uno", "VID_2341&PID_0043", 0.65f, "ARDUINO_INPUT_DEVICE"),
        new("Arduino Leonardo", "VID_2341&PID_8036", 0.70f, "ARDUINO_HID_DEVICE"),
        new("Arduino Micro", "VID_2341&PID_8037", 0.70f, "ARDUINO_HID_DEVICE"),
        new("Raspberry Pi", "VID_2E8A", 0.60f, "RASPBERRY_PI_DEVICE"),
        new("Unknown HID Composite", "VID_1532", 0.50f, "SUSPICIOUS_HID_DEVICE"),
    };

    /// <summary>
    /// دریافت لیست تمامی دستگاه‌های USB و HID متصل به سیستم از طریق WMI.
    /// Retrieve all connected USB and HID devices via WMI.
    /// </summary>
    public virtual List<ConnectedUsbDevice> GetConnectedDevices()
    {
        var list = new List<ConnectedUsbDevice>();
        if (!OperatingSystem.IsWindows()) return list;

        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT DeviceID, Name, Description FROM Win32_PnPEntity WHERE DeviceID LIKE 'USB%' OR DeviceID LIKE 'HID%'");
            foreach (var obj in searcher.Get())
            {
                var id = obj["DeviceID"]?.ToString() ?? string.Empty;
                var name = obj["Name"]?.ToString() ?? string.Empty;
                var desc = obj["Description"]?.ToString() ?? string.Empty;
                if (!string.IsNullOrWhiteSpace(id))
                {
                    list.Add(new ConnectedUsbDevice(id, name, desc));
                }
            }
        }
        catch
        {
            // Handle lack of WMI permissions gracefully
        }
        return list;
    }

    /// <summary>
    /// بررسی دستگاه‌های متصل با امضاهای تقلب و شمارش دستگاه‌های HID.
    /// Check connected devices against cheat signatures and monitor HID counts.
    /// </summary>
    public DetectionResult? ScanForSuspiciousHardware()
    {
        var devices = GetConnectedDevices();
        var hidCount = 0;
        var evidenceList = new List<string>();

        foreach (var dev in devices)
        {
            var idUpper = dev.DeviceId.ToUpperInvariant();
            if (idUpper.Contains("HID"))
            {
                hidCount++;
            }

            foreach (var sig in KnownCheatDevices)
            {
                if (idUpper.Contains(sig.VidPid))
                {
                    var evidence = new Dictionary<string, object>
                    {
                        { "DeviceId", dev.DeviceId },
                        { "DeviceName", dev.Name },
                        { "SignatureMatched", sig.Name }
                    };

                    return new DetectionResult(
                        Type: DetectionType.SUSPICIOUS_HARDWARE,
                        Confidence: sig.Confidence,
                        ReasonCode: sig.ReasonCode,
                        Description: $"Suspicious USB hardware detected: {sig.Name} ({dev.Name})",
                        DescriptionFA: $"سخت‌افزار مشکوک USB متصل شد: {sig.Name} ({dev.Name})",
                        Evidence: evidence
                    );
                }
            }
        }

        if (hidCount > 2)
        {
            var evidence = new Dictionary<string, object>
            {
                { "TotalHidDevices", hidCount },
                { "DeviceList", devices.Select(d => d.Name).ToList() }
            };

            return new DetectionResult(
                Type: DetectionType.MACRO_TIMING,
                Confidence: 0.60f,
                ReasonCode: "MULTIPLE_HID_INJECTION_DEVICES",
                Description: $"Excessive HID input devices detected ({hidCount} devices), potential macro injection setup.",
                DescriptionFA: $"تعداد غیرعادی دستگاه‌های ورودی HID متصل است ({hidCount} دستگاه)، احتمال استفاده از سخت‌افزار ماکرو.",
                Evidence: evidence
            );
        }

        return null;
    }
}
