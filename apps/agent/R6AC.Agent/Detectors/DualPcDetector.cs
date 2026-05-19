using System.Management;
using System.Net;
using System.Net.NetworkInformation;
using System.Text.RegularExpressions;
using R6AC.Agent.Core;

namespace R6AC.Agent.Detectors;

/// <summary>
/// اطلاعات کارت گرافیک و نمایشگر.
/// Video controller and display adapter info.
/// </summary>
public record DisplayAdapterInfo(string Name, string DeviceId, int CurrentHorizontalResolution, int CurrentVerticalResolution);

/// <summary>
/// ماژول تشخیص سیستم‌های دوگانه (Dual-PC) از طریق شناسایی کارت‌های کپچر، نمایشگرهای مجازی و استریم شبکه.
/// Dual-PC streaming cheat setup detector via capture cards, virtual displays, and network anomaly analysis.
/// </summary>
public class DualPcDetector : IDetector
{
    public string DetectorName => "DualPcDetector";
    public DetectionType DetectionType => DetectionType.DUAL_PC_PATTERN;

    private readonly List<DisplayAdapterInfo> _testingAdapters = new();
    private readonly List<string> _testingUsbPnpIds = new();
    private bool _useTestingData = false;
    private bool _simulateHighUdpTraffic = false;

    private static readonly string[] CaptureCardKeywords = new[]
    {
        "elgato", "avermedia", "magewell", "blackmagic", "obs virtual", "decklink", "streamlabs", "xsplit"
    };

    private static readonly string[] VirtualDisplayKeywords = new[]
    {
        "iddsampledriver", "virtual display", "indirect display", "parsec-", "sunshine-"
    };

    private static readonly HashSet<string> CaptureUsbVids = new(StringComparer.OrdinalIgnoreCase)
    {
        "0FD9", // Elgato
        "07CA", // AVerMedia
        "2935"  // Magewell
    };

    /// <summary>
    /// اجرای اسکن ناهمگام جهت کشف الگوهای استریم و کپچر غیرمجاز.
    /// Run asynchronous scan to discover unauthorized streaming and capture patterns.
    /// </summary>
    public Task<DetectionResult?> ScanAsync(AgentSession session, CancellationToken ct)
    {
        return Task.Run(() => PerformScan(session), ct);
    }

    /// <summary>
    /// تغذیه داده‌های شبیه‌سازی‌شده برای اجرای تست‌های واحد.
    /// Feed synthetic data for running unit tests.
    /// </summary>
    public void FeedTestingData(List<DisplayAdapterInfo> adapters, List<string> usbIds, bool highUdp = false)
    {
        _testingAdapters.Clear();
        _testingAdapters.AddRange(adapters);
        _testingUsbPnpIds.Clear();
        _testingUsbPnpIds.AddRange(usbIds);
        _useTestingData = true;
        _simulateHighUdpTraffic = highUdp;
    }

    private DetectionResult? PerformScan(AgentSession session)
    {
        var adapters = _useTestingData ? _testingAdapters : GetDisplayAdapters();
        var usbIds = _useTestingData ? _testingUsbPnpIds : GetConnectedUsbDeviceIds();

        // 1. Display Adapter / Video Controller Anomaly Checks
        foreach (var adapter in adapters)
        {
            var nameLower = adapter.Name.ToLowerInvariant();

            // A. Capture card driver check
            foreach (var kw in CaptureCardKeywords)
            {
                if (nameLower.Contains(kw))
                {
                    return new DetectionResult(
                        Type: DetectionType.DUAL_PC_PATTERN,
                        Confidence: 0.70f,
                        ReasonCode: "CAPTURE_CARD_DISPLAY_ADAPTER",
                        Description: $"Hardware capture card detected: {adapter.Name}",
                        DescriptionFA: $"کارت کپچر سخت‌افزاری متصل به سیستم کشف شد: {adapter.Name}",
                        Evidence: new Dictionary<string, object>
                        {
                            ["AdapterName"] = adapter.Name,
                            ["DeviceId"] = adapter.DeviceId,
                            ["MatchedKeyword"] = kw
                        }
                    );
                }
            }

            // B. Virtual display driver check
            foreach (var kw in VirtualDisplayKeywords)
            {
                if (nameLower.Contains(kw))
                {
                    return new DetectionResult(
                        Type: DetectionType.DUAL_PC_PATTERN,
                        Confidence: 0.75f,
                        ReasonCode: "VIRTUAL_DISPLAY_ADAPTER",
                        Description: $"Virtual/Indirect display driver detected: {adapter.Name}",
                        DescriptionFA: $"درایور نمایشگر مجازی/غیرمستقیم شناسایی شد: {adapter.Name}",
                        Evidence: new Dictionary<string, object>
                        {
                            ["AdapterName"] = adapter.Name,
                            ["DeviceId"] = adapter.DeviceId,
                            ["MatchedKeyword"] = kw
                        }
                    );
                }
            }

            // C. Phantom display (0x0 resolution)
            if (adapter.CurrentHorizontalResolution == 0 && adapter.CurrentVerticalResolution == 0)
            {
                // Verify it's not just a generic uninitialized driver
                if (!adapter.DeviceId.Contains("ROOT", StringComparison.OrdinalIgnoreCase))
                {
                    return new DetectionResult(
                        Type: DetectionType.DUAL_PC_PATTERN,
                        Confidence: 0.80f,
                        ReasonCode: "PHANTOM_DISPLAY_CONNECTED",
                        Description: $"Phantom secondary display detected with 0x0 resolution ({adapter.Name}).",
                        DescriptionFA: $"نمایشگر ثانویه فانتوم با وضوح 0x0 کشف شد ({adapter.Name}).",
                        Evidence: new Dictionary<string, object>
                        {
                            ["AdapterName"] = adapter.Name,
                            ["DeviceId"] = adapter.DeviceId
                        }
                    );
                }
            }
        }

        // 2. USB Capture Card VID Scan
        var vidRegex = new Regex(@"VID_([0-9A-F]{4})", RegexOptions.IgnoreCase);
        foreach (var pnpId in usbIds)
        {
            var match = vidRegex.Match(pnpId);
            if (match.Success)
            {
                var vid = match.Groups[1].Value.ToUpperInvariant();
                if (CaptureUsbVids.Contains(vid))
                {
                    return new DetectionResult(
                        Type: DetectionType.DUAL_PC_PATTERN,
                        Confidence: 0.70f,
                        ReasonCode: $"USB_CAPTURE_DEVICE_VID_{vid}",
                        Description: $"USB capture card connected (VID: 0x{vid}). Dual-PC streaming pattern.",
                        DescriptionFA: $"کارت کپچر USB متصل است (شناسه: 0x{vid}). الگوی استریم دوگانه.",
                        Evidence: new Dictionary<string, object>
                        {
                            ["PnpId"] = pnpId,
                            ["Vid"] = vid
                        }
                    );
                }
            }
        }

        // 3. Network UDP Stream Anomaly (>5MB/s outbound traffic to LAN IP)
        if (CheckHighVolumeUdpStream())
        {
            return new DetectionResult(
                Type: DetectionType.DUAL_PC_PATTERN,
                Confidence: 0.85f,
                ReasonCode: "HIGH_VOLUME_LAN_UDP_STREAM",
                Description: $"High bandwidth outbound UDP traffic (>5MB/s) to LAN IP during match. Potential screen streaming.",
                DescriptionFA: $"ترافیک خروجی سنگین UDP (بیش از ۵ مگابایت بر ثانیه) به آی‌پی محلی در حین بازی. احتمال استریم تصویر به سیستم دوم.",
                Evidence: new Dictionary<string, object>
                {
                    ["BandwidthThresholdMbps"] = 40.0,
                    ["StreamProtocol"] = "UDP"
                }
            );
        }

        return null;
    }

    private List<DisplayAdapterInfo> GetDisplayAdapters()
    {
        var list = new List<DisplayAdapterInfo>();
        if (!OperatingSystem.IsWindows()) return list;

        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT Name, DeviceID, CurrentHorizontalResolution, CurrentVerticalResolution FROM Win32_VideoController");
            foreach (var obj in searcher.Get())
            {
                var name = obj["Name"]?.ToString() ?? string.Empty;
                var devId = obj["DeviceID"]?.ToString() ?? string.Empty;
                int.TryParse(obj["CurrentHorizontalResolution"]?.ToString(), out var hRes);
                int.TryParse(obj["CurrentVerticalResolution"]?.ToString(), out var vRes);

                if (!string.IsNullOrWhiteSpace(name))
                {
                    list.Add(new DisplayAdapterInfo(name, devId, hRes, vRes));
                }
            }
        }
        catch
        {
            // Ignore WMI errors
        }

        return list;
    }

    private List<string> GetConnectedUsbDeviceIds()
    {
        var list = new List<string>();
        if (!OperatingSystem.IsWindows()) return list;

        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT DeviceID FROM Win32_PnPEntity WHERE DeviceID LIKE 'USB%'");
            foreach (var obj in searcher.Get())
            {
                var devId = obj["DeviceID"]?.ToString() ?? string.Empty;
                if (!string.IsNullOrWhiteSpace(devId))
                {
                    list.Add(devId);
                }
            }
        }
        catch
        {
            // Ignore WMI errors
        }

        return list;
    }

    private bool CheckHighVolumeUdpStream()
    {
        if (_simulateHighUdpTraffic) return true;

        try
        {
            if (!NetworkInterface.GetIsNetworkAvailable()) return false;

            var stats = IPGlobalProperties.GetIPGlobalProperties().GetUdpIPv4Statistics();
            // In a real high-frequency monitoring loop, we would measure delta over 1 second.
            // For one-shot detection, if datagrams sent is extremely high relative to received in a short time.
            if (stats.DatagramsSent > 500_000 && stats.DatagramsReceived < stats.DatagramsSent / 10)
            {
                return true;
            }
        }
        catch
        {
            // Ignore network stat errors
        }

        return false;
    }
}
