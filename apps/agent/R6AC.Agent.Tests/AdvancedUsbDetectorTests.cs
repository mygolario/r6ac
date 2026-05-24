using R6AC.Agent.Core;
using R6AC.Agent.Detectors;
using Xunit;

namespace R6AC.Agent.Tests;

public class AdvancedUsbDetectorTests
{
    [Fact]
    public async Task ScanAsync_PollingRateAnomaly_ShouldDetectKMBox()
    {
        var detector = new AdvancedUsbDetector();
        detector.FeedTestingDevices(new List<AdvancedHidInfo>
        {
            new("PATH1", "1234", "5678", "Generic", "Gaming Mouse", "999", 1, false, 1000, 1350) // >20% anomaly
        });

        var session = new AgentSession("P1", "M1", new SessionToken("T1", "P1", "M1", DateTime.UtcNow, DateTime.UtcNow.AddHours(1), "SIG"), "HASH");
        var result = await detector.ScanAsync(session, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(DetectionType.KMBOX_DETECTED, result.Type);
        Assert.Equal(0.94f, result.Confidence);
    }
}
