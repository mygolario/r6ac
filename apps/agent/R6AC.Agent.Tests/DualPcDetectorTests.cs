using R6AC.Agent.Core;
using R6AC.Agent.Detectors;
using Xunit;

namespace R6AC.Agent.Tests;

public class DualPcDetectorTests
{
    [Fact]
    public async Task ScanAsync_ElgatoCaptureCard_ShouldDetectDualPcPattern()
    {
        var detector = new DualPcDetector();
        detector.FeedTestingData(
            new List<DisplayAdapterInfo> { new("Elgato Game Capture HD60", "DEV1", 1920, 1080) },
            new List<string> { "USB\\VID_0FD9&PID_0060" }
        );

        var session = new AgentSession("P1", "M1", new SessionToken("T1", "P1", "M1", DateTime.UtcNow, DateTime.UtcNow.AddHours(1), "SIG"), "HASH");
        var result = await detector.ScanAsync(session, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(DetectionType.DUAL_PC_PATTERN, result.Type);
        Assert.Equal("CAPTURE_CARD_DISPLAY_ADAPTER", result.ReasonCode);
    }

    [Fact]
    public async Task ScanAsync_PhantomDisplay_ShouldDetectDualPcPattern()
    {
        var detector = new DualPcDetector();
        detector.FeedTestingData(
            new List<DisplayAdapterInfo> { new("Generic PnP Monitor", "DISPLAY1", 0, 0) }, // 0x0 phantom
            new List<string>()
        );

        var session = new AgentSession("P1", "M1", new SessionToken("T1", "P1", "M1", DateTime.UtcNow, DateTime.UtcNow.AddHours(1), "SIG"), "HASH");
        var result = await detector.ScanAsync(session, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(DetectionType.DUAL_PC_PATTERN, result.Type);
        Assert.Equal("PHANTOM_DISPLAY_CONNECTED", result.ReasonCode);
    }
}
