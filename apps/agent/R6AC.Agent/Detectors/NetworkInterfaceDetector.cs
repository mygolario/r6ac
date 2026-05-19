using System.Net.NetworkInformation;
using R6AC.Agent.Core;

namespace R6AC.Agent.Detectors;

/// <summary>
/// اسکنر رابط‌های شبکه جهت تشخیص تونل‌های غیرمجاز، VPNها و کانال‌های ثانویه ارتباطی (DMA).
/// Network interface scanner to detect unauthorized VPNs, tunnels, and secondary DMA channels.
/// </summary>
public class NetworkInterfaceDetector : IDetector
{
    public string DetectorName => "NetworkInterfaceDetector";
    public DetectionType DetectionType => DetectionType.FORBIDDEN_NETWORK;

    private static readonly List<string> WhitelistedKeywords = new() { "electro" };

    private static readonly List<string> SuspiciousKeywords = new()
    {
        "vpn", "tap", "tun", "zerotier", "hamachi", "radmin", "openvpn", "wireguard"
    };

    public Task<DetectionResult?> ScanAsync(AgentSession session, CancellationToken ct)
    {
        return Task.Run(() => ScanNetworkAdapters(), ct);
    }

    private DetectionResult? ScanNetworkAdapters()
    {
        try
        {
            var interfaces = NetworkInterface.GetAllNetworkInterfaces();
            var physicalCount = 0;
            var virtualCount = 0;
            var activePhysicalNames = new List<string>();

            foreach (var adapter in interfaces)
            {
                if (adapter.OperationalStatus != OperationalStatus.Up) continue;

                var name = adapter.Name.ToLowerInvariant();
                var desc = adapter.Description.ToLowerInvariant();

                // 1. Check Whitelist
                var isWhitelisted = WhitelistedKeywords.Any(kw => name.Contains(kw) || desc.Contains(kw));
                if (isWhitelisted)
                {
                    virtualCount++;
                    continue;
                }

                // 2. Check Suspicious Tunnels / VPNs
                foreach (var kw in SuspiciousKeywords)
                {
                    if (name.Contains(kw) || desc.Contains(kw))
                    {
                        var evidence = new Dictionary<string, object>
                        {
                            { "AdapterName", adapter.Name },
                            { "AdapterDescription", adapter.Description },
                            { "MatchedKeyword", kw }
                        };

                        return new DetectionResult(
                            Type: DetectionType.FORBIDDEN_NETWORK,
                            Confidence: 0.80f,
                            ReasonCode: "UNAUTHORIZED_VPN_OR_TUNNEL",
                            Description: $"Forbidden virtual network adapter active: {adapter.Name}",
                            DescriptionFA: $"رابط شبکه مجازی غیرمجاز در حال اجرا است: {adapter.Name}",
                            Evidence: evidence
                        );
                    }
                }

                // Classify physical vs virtual
                if (adapter.NetworkInterfaceType == NetworkInterfaceType.Ethernet ||
                    adapter.NetworkInterfaceType == NetworkInterfaceType.Wireless80211)
                {
                    if (!name.Contains("virtual") && !desc.Contains("virtual") &&
                        !name.Contains("vmware") && !desc.Contains("vmware") &&
                        !name.Contains("vbox") && !desc.Contains("vbox"))
                    {
                        physicalCount++;
                        activePhysicalNames.Add(adapter.Name);
                    }
                    else
                    {
                        virtualCount++;
                    }
                }
            }

            // 3. Check Active Adapter Count & Simultaneous Physical Channels
            if (physicalCount > 2)
            {
                var evidence = new Dictionary<string, object>
                {
                    { "ActivePhysicalCount", physicalCount },
                    { "ActivePhysicalAdapters", activePhysicalNames }
                };

                return new DetectionResult(
                    Type: DetectionType.FORBIDDEN_NETWORK,
                    Confidence: 0.70f,
                    ReasonCode: "EXCESSIVE_ACTIVE_NETWORK_INTERFACES",
                    Description: $"Multiple active physical network interfaces detected ({physicalCount}), potential DMA network stream.",
                    DescriptionFA: $"چندین رابط شبکه فیزیکی فعال یافت شد ({physicalCount})، احتمال وجود کانال انتقال داده ثانویه (DMA).",
                    Evidence: evidence
                );
            }
        }
        catch
        {
            // Ignore network enumeration exceptions
        }

        return null;
    }
}
