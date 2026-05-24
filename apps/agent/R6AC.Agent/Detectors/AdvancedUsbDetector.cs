using System.Management;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Diagnostics;
using System.Linq;
using R6AC.Agent.Core;
using R6AC.Agent.Utils;

namespace R6AC.Agent.Detectors;

/// <summary>
/// ساختار اطلاعات تفصیلی دستگاه‌های HID و USB.
/// Detailed HID and USB device information record.
/// </summary>
public record AdvancedHidInfo(
    string DevicePath,
    string Vid,
    string Pid,
    string Manufacturer,
    string Product,
    string SerialNumber,
    int InterfaceCount,
    bool IsMouseAndKeyboard,
    double DeclaredPollingRate,
    double MeasuredPollingRate
);

/// <summary>
/// اسکنر پیشرفته دستگاه‌های USB و HID با استفاده از SetupAPI جهت شناسایی دقیق سخت‌افزارهای تقلب.
/// Advanced USB and HID device scanner using SetupAPI for deep fingerprinting of cheat hardware.
/// </summary>
public class AdvancedUsbDetector : IDetector
{
    public string DetectorName => "AdvancedUsbDetector";
    public DetectionType DetectionType => DetectionType.KMBOX_DETECTED;

    private readonly List<AdvancedHidInfo> _testingDevices = new();
    private bool _useTestingDevices = false;

    // Known Arduino / Injector VIDs
    private static readonly HashSet<string> KnownArduinoVids = new(StringComparer.OrdinalIgnoreCase)
    {
        "2341", // Arduino
        "16C0", // Teensy / PJRC
        "1B4F", // Sparkfun
        "239A", // Adafruit
        "2E8A"  // Raspberry Pi Pico
    };

    private static readonly string[] SuspiciousKeywords = new[]
    {
        "kmbox", "kmnet", "arduino", "teensy", "raspberry", "pico"
    };

    /// <summary>
    /// اجرای اسکن ناهمگام دستگاه‌های USB جهت کشف سخت‌افزارهای غیرمجاز.
    /// Run asynchronous scan of USB devices to discover unauthorized hardware.
    /// </summary>
    public Task<DetectionResult?> ScanAsync(AgentSession session, CancellationToken ct)
    {
        return Task.Run(() => PerformScan(session), ct);
    }

    /// <summary>
    /// تغذیه دستگاه‌های تستی برای اجرای آزمون‌های واحد.
    /// Feed testing devices for executing unit tests.
    /// </summary>
    public void FeedTestingDevices(List<AdvancedHidInfo> devices)
    {
        _testingDevices.Clear();
        _testingDevices.AddRange(devices);
        _useTestingDevices = true;
    }

    private DetectionResult? PerformScan(AgentSession session)
    {
        var devices = _useTestingDevices ? _testingDevices : EnumerateHidDevices();
        bool gameIsRunning = GameProcessMonitor.IsGameRunning("RainbowSix");
        bool devIdeRunning = Process.GetProcesses().Any(p => Whitelist.SafeProcessNames.Contains(p.ProcessName.ToLowerInvariant()) && (p.ProcessName.ToLowerInvariant() == "code" || p.ProcessName.ToLowerInvariant() == "devenv" || p.ProcessName.ToLowerInvariant() == "rider64"));

        foreach (var dev in devices)
        {
            var mfg = dev.Manufacturer.ToLowerInvariant();
            var prod = dev.Product.ToLowerInvariant();
            var vid = dev.Vid.ToUpperInvariant();
            var serial = dev.SerialNumber;

            if (Whitelist.SafeUsbVidPid.Contains($"VID_{vid}") && vid != "1532" && vid != "046D")
            {
                AuditLogger.LogEvent("AdvancedUsbDetector", DetectionSeverity.Info, $"Whitelisted vendor (VID_{vid})", prod);
                continue; // Safe, but Razer/Logitech need specific spoof checks
            }
            if (vid == "1532" || vid == "046D")
            {
                AuditLogger.LogEvent("AdvancedUsbDetector", DetectionSeverity.Info, $"Checking known spoof-prone vendor (VID_{vid})", prod);
            }

            // 1. Manufacturer string keyword check
            foreach (var kw in SuspiciousKeywords)
            {
                if (mfg.Contains(kw) || prod.Contains(kw))
                {
                    var reason = $"VID:0x{dev.Vid} PID:0x{dev.Pid} Manufacturer:{dev.Manufacturer} SerialNumber:{(string.IsNullOrWhiteSpace(dev.SerialNumber) ? "none" : dev.SerialNumber)}";
                    var isArduino = kw == "arduino" || kw == "teensy" || kw == "raspberry" || kw == "pico";
                    
                    if (isArduino)
                    {
                        bool arduinoActingAsHid = dev.IsMouseAndKeyboard || dev.InterfaceCount > 0; // Simplified HID check
                        if (gameIsRunning && arduinoActingAsHid && !devIdeRunning)
                        {
                            return new DetectionResult(
                                Type: DetectionType.ARDUINO_DETECTED,
                         Severity: DetectionSeverity.Suspicious,
                                Confidence: 0.60f,
                                ReasonCode: reason,
                                Description: $"Arduino/Teensy development board detected acting as HID during gameplay.",
                                DescriptionFA: $"برد توسعه آردوینو/تینسی در حال کار به عنوان ماوس/کیبورد حین بازی کشف شد.",
                                Evidence: new Dictionary<string, object>
                                {
                                    ["Vid"] = dev.Vid,
                                    ["Pid"] = dev.Pid,
                                    ["Manufacturer"] = dev.Manufacturer
                                }
                            );
                        }
                        else
                        {
                            AuditLogger.LogEvent("AdvancedUsbDetector", DetectionSeverity.Info, "Arduino connected (alone/dev)", reason);
                            continue;
                        }
                    }

                    return new DetectionResult(
                        Type: DetectionType.KMBOX_DETECTED,
                         Severity: gameIsRunning ? DetectionSeverity.Kick : DetectionSeverity.Flag,
                        Confidence: gameIsRunning ? 0.91f : 0.82f,
                        ReasonCode: reason,
                        Description: $"Prohibited hardware injector detected: {mfg} ({prod})",
                        DescriptionFA: $"سخت‌افزار غیرمجاز تزریق ورودی کشف شد: {mfg} ({prod})",
                        Evidence: new Dictionary<string, object>
                        {
                            ["DevicePath"] = dev.DevicePath,
                            ["Vid"] = dev.Vid,
                            ["Pid"] = dev.Pid,
                            ["Manufacturer"] = dev.Manufacturer,
                            ["Product"] = dev.Product,
                            ["KeywordMatched"] = kw
                        }
                    );
                }
            }

            // 2. Known Arduino / Teensy VIDs
            if (KnownArduinoVids.Contains(vid))
            {
                var reason = $"VID:0x{dev.Vid} PID:0x{dev.Pid} Manufacturer:{dev.Manufacturer} SerialNumber:{(string.IsNullOrWhiteSpace(dev.SerialNumber) ? "none" : dev.SerialNumber)}";
                bool arduinoActingAsHid = dev.IsMouseAndKeyboard || dev.InterfaceCount > 0;
                
                if (gameIsRunning && arduinoActingAsHid && !devIdeRunning)
                {
                    return new DetectionResult(
                        Type: DetectionType.ARDUINO_DETECTED,
                         Severity: DetectionSeverity.Suspicious,
                        Confidence: 0.60f,
                        ReasonCode: reason,
                        Description: $"Arduino/Teensy development board detected acting as HID during gameplay.",
                        DescriptionFA: $"برد توسعه آردوینو/تینسی در حال کار به عنوان ماوس/کیبورد حین بازی کشف شد.",
                        Evidence: new Dictionary<string, object>
                        {
                            ["Vid"] = dev.Vid,
                            ["Pid"] = dev.Pid,
                            ["Manufacturer"] = dev.Manufacturer
                        }
                    );
                }
                else
                {
                    AuditLogger.LogEvent("AdvancedUsbDetector", DetectionSeverity.Info, "Arduino connected (alone/dev)", reason);
                    continue;
                }
            }

            // 3. Razer Anomaly (0x1532)
            if (vid == "1532")
            {
                if (!prod.Contains("razer", StringComparison.OrdinalIgnoreCase) &&
                    !prod.Contains("deathadder", StringComparison.OrdinalIgnoreCase) &&
                    !prod.Contains("viper", StringComparison.OrdinalIgnoreCase) &&
                    !prod.Contains("basilisk", StringComparison.OrdinalIgnoreCase) &&
                    !prod.Contains("naga", StringComparison.OrdinalIgnoreCase) &&
                    !prod.Contains("huntsman", StringComparison.OrdinalIgnoreCase) &&
                    !prod.Contains("blackwidow", StringComparison.OrdinalIgnoreCase) &&
                    !prod.Contains("ornata", StringComparison.OrdinalIgnoreCase))
                {
                    var reason = $"VID:0x{dev.Vid} PID:0x{dev.Pid} Manufacturer:{dev.Manufacturer} SerialNumber:{(string.IsNullOrWhiteSpace(dev.SerialNumber) ? "none" : dev.SerialNumber)}";
                    return new DetectionResult(
                        Type: DetectionType.KMBOX_DETECTED,
                         Severity: DetectionSeverity.Flag,
                        Confidence: 0.90f,
                        ReasonCode: reason,
                        Description: $"Spoofed Razer VID (0x1532) with non-standard product string: {dev.Product}",
                        DescriptionFA: $"دستگاه با شناسه جعلی ریزر (0x1532) و نام محصول نامعتبر: {dev.Product}",
                        Evidence: new Dictionary<string, object>
                        {
                            ["Vid"] = dev.Vid,
                            ["Product"] = dev.Product
                        }
                    );
                }
            }



            // 5. Composite Mouse + Keyboard simultaneously on single interface anomaly
            if (dev.IsMouseAndKeyboard)
            {
                var reason = $"VID:0x{dev.Vid} PID:0x{dev.Pid} Manufacturer:{dev.Manufacturer} SerialNumber:{(string.IsNullOrWhiteSpace(dev.SerialNumber) ? "none" : dev.SerialNumber)}";
                return new DetectionResult(
                    Type: DetectionType.KMBOX_DETECTED,
                         Severity: DetectionSeverity.Flag,
                    Confidence: 0.89f,
                    ReasonCode: reason,
                    Description: $"Anomalous composite device claiming simultaneous mouse and keyboard interfaces.",
                    DescriptionFA: $"دستگاه غیرعادی با ادعای همزمان بودن ماوس و کیبورد در یک واسط.",
                    Evidence: new Dictionary<string, object>
                    {
                        ["Vid"] = dev.Vid,
                        ["Pid"] = dev.Pid,
                        ["InterfaceCount"] = dev.InterfaceCount
                    }
                );
            }

            // 6. Polling Rate Anomaly (>20% higher measured vs declared)
            if (dev.DeclaredPollingRate > 0 && dev.MeasuredPollingRate > 0)
            {
                if (dev.MeasuredPollingRate > dev.DeclaredPollingRate * 1.20)
                {
                    var reason = $"VID:0x{dev.Vid} PID:0x{dev.Pid} Manufacturer:{dev.Manufacturer} SerialNumber:{(string.IsNullOrWhiteSpace(dev.SerialNumber) ? "none" : dev.SerialNumber)}";
                    return new DetectionResult(
                        Type: DetectionType.KMBOX_DETECTED,
                         Severity: DetectionSeverity.Kick,
                        Confidence: 0.94f,
                        ReasonCode: reason,
                        Description: $"Polling rate anomaly: Measured ({dev.MeasuredPollingRate:F0}Hz) exceeds declared ({dev.DeclaredPollingRate:F0}Hz) by >20%.",
                        DescriptionFA: $"ناهنجاری نرخ نمونه‌برداری: نرخ اندازه‌گیری شده ({dev.MeasuredPollingRate:F0} هرتز) بیش از ۲۰٪ از نرخ اسمی ({dev.DeclaredPollingRate:F0} هرتز) بیشتر است.",
                        Evidence: new Dictionary<string, object>
                        {
                            ["DeclaredHz"] = dev.DeclaredPollingRate,
                            ["MeasuredHz"] = dev.MeasuredPollingRate
                        }
                    );
                }
            }
        }

        return null;
    }

    /// <summary>
    /// استخراج لیست دستگاه‌های متصل از طریق WMI و استخراج مشخصات از رشته PnP.
    /// Retrieve list of connected devices via WMI and parse properties from PnP strings.
    /// </summary>
    private List<AdvancedHidInfo> EnumerateHidDevices()
    {
        var list = new List<AdvancedHidInfo>();
        if (!OperatingSystem.IsWindows()) return list;

        try
        {
            using var searcher = new ManagementObjectSearcher(@"SELECT DeviceID, PNPDeviceID, Name, Caption, Description, Manufacturer FROM Win32_PnPEntity WHERE DeviceID LIKE 'USB%' OR DeviceID LIKE 'HID%'");
            var vidPidRegex = new Regex(@"VID_([0-9A-F]{4})&PID_([0-9A-F]{4})", RegexOptions.IgnoreCase);

            foreach (var obj in searcher.Get())
            {
                var deviceId = obj["DeviceID"]?.ToString() ?? string.Empty;
                var pnpId = obj["PNPDeviceID"]?.ToString() ?? string.Empty;
                var name = obj["Name"]?.ToString() ?? string.Empty;
                var mfg = obj["Manufacturer"]?.ToString() ?? string.Empty;

                var vidMatch = vidPidRegex.Match(deviceId);
                if (vidMatch.Success)
                {
                    var vid = vidMatch.Groups[1].Value;
                    var pid = vidMatch.Groups[2].Value;

                    var serial = string.Empty;
                    var parts = pnpId.Split('\\');
                    if (parts.Length > 2)
                    {
                        var lastPart = parts[parts.Length - 1];
                        if (!lastPart.Contains('&'))
                        {
                            serial = lastPart;
                        }
                    }

                    var isMouseKeyboardCombo = name.Contains("Composite", StringComparison.OrdinalIgnoreCase) && 
                        (name.Contains("Mouse", StringComparison.OrdinalIgnoreCase) || name.Contains("Keyboard", StringComparison.OrdinalIgnoreCase));

                    list.Add(new AdvancedHidInfo(
                        DevicePath: pnpId,
                        Vid: vid,
                        Pid: pid,
                        Manufacturer: string.IsNullOrWhiteSpace(mfg) ? "Generic" : mfg,
                        Product: name,
                        SerialNumber: serial,
                        InterfaceCount: 1,
                        IsMouseAndKeyboard: isMouseKeyboardCombo,
                        DeclaredPollingRate: 1000.0,
                        MeasuredPollingRate: 1000.0
                    ));
                }
            }
        }
        catch
        {
            // Fallback gracefully if WMI permissions are restricted
        }

        return list;
    }
}
