using System.Management;
using Microsoft.Win32;
using R6AC.Agent.Core;

namespace R6AC.Agent.Detectors;

/// <summary>
/// اسکنر درایورهای سیستم جهت تشخیص ابزارهای DMA و مپرهای حافظه غیرمجاز.
/// System driver scanner to detect DMA tools and unauthorized kernel memory mappers.
/// </summary>
public class DriverDetector : IDetector
{
    public string DetectorName => "DriverDetector";
    public DetectionType DetectionType => DetectionType.FORBIDDEN_DRIVER;

    private static readonly List<string> SuspiciousDriverNames = new()
    {
        "pcileech", "mmap", "kdmapper", "drvmap", "physmem", "memread", "iqvw64e", "vulnerable"
    };

    public Task<DetectionResult?> ScanAsync(AgentSession session, CancellationToken ct)
    {
        return Task.Run(() => ScanDrivers(), ct);
    }

    private DetectionResult? ScanDrivers()
    {
        if (!OperatingSystem.IsWindows()) return null;

        try
        {
            // 1. Check Win32_SystemDriver WMI
            using var searcher = new ManagementObjectSearcher("SELECT Name, DisplayName, PathName, State FROM Win32_SystemDriver WHERE State = 'Running'");
            foreach (var obj in searcher.Get())
            {
                var name = obj["Name"]?.ToString()?.ToLowerInvariant() ?? string.Empty;
                var disp = obj["DisplayName"]?.ToString()?.ToLowerInvariant() ?? string.Empty;
                var path = obj["PathName"]?.ToString()?.ToLowerInvariant() ?? string.Empty;

                foreach (var sig in SuspiciousDriverNames)
                {
                    if (name.Contains(sig) || disp.Contains(sig) || path.Contains(sig))
                    {
                        var evidence = new Dictionary<string, object>
                        {
                            { "DriverName", obj["Name"]?.ToString() ?? string.Empty },
                            { "DisplayName", obj["DisplayName"]?.ToString() ?? string.Empty },
                            { "PathName", obj["PathName"]?.ToString() ?? string.Empty },
                            { "MatchedSignature", sig }
                        };

                        return new DetectionResult(
                            Type: DetectionType.FORBIDDEN_DRIVER,
                            Confidence: 0.95f,
                            ReasonCode: "SUSPICIOUS_KERNEL_DRIVER",
                            Description: $"Suspicious kernel driver detected: {obj["Name"]} ({sig})",
                            DescriptionFA: $"درایور مشکوک در سطح کرنل یافت شد: {obj["Name"]} ({sig})",
                            Evidence: evidence
                        );
                    }
                }
            }

            // 2. Check Registry Services Hive
            using var regKey = Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Services");
            if (regKey != null)
            {
                foreach (var subKeyName in regKey.GetSubKeyNames())
                {
                    var nameLower = subKeyName.ToLowerInvariant();
                    foreach (var sig in SuspiciousDriverNames)
                    {
                        if (nameLower.Contains(sig))
                        {
                            using var sKey = regKey.OpenSubKey(subKeyName);
                            var imagePath = sKey?.GetValue("ImagePath")?.ToString() ?? string.Empty;

                            var evidence = new Dictionary<string, object>
                            {
                                { "ServiceName", subKeyName },
                                { "ImagePath", imagePath },
                                { "MatchedSignature", sig }
                            };

                            return new DetectionResult(
                                Type: DetectionType.FORBIDDEN_DRIVER,
                                Confidence: 0.90f,
                                ReasonCode: "SUSPICIOUS_REGISTRY_DRIVER_SERVICE",
                                Description: $"Suspicious driver service registered: {subKeyName}",
                                DescriptionFA: $"سرویس درایور مشکوک در رجیستری یافت شد: {subKeyName}",
                                Evidence: evidence
                            );
                        }
                    }
                }
            }
        }
        catch
        {
            // Ignore access restricted driver enumeration errors
        }

        return null;
    }
}
