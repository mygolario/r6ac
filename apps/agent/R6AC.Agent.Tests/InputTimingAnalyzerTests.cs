using R6AC.Agent.Core;
using R6AC.Agent.Detectors;
using Xunit;

namespace R6AC.Agent.Tests;

public class InputTimingAnalyzerTests
{
    [Fact]
    public async Task ScanAsync_NoRecoilUnder2pxStdDev_ShouldDetectNoRecoil()
    {
        var analyzer = new InputTimingAnalyzer();
        var deltas = new List<MouseDelta>();
        long startMs = 1000;

        // Perfectly consistent downward pull (Dy = -5)
        for (int i = 0; i < 20; i++)
        {
            deltas.Add(new MouseDelta(0, -5, startMs + i * 50, true));
        }

        analyzer.FeedTestingData(deltas, new List<ClickReaction>(), new List<KeyInterval>());

        var session = new AgentSession("P1", "M1", new SessionToken("T1", "P1", "M1", DateTime.UtcNow, DateTime.UtcNow.AddHours(1), "SIG"), "HASH");
        var result = await analyzer.ScanAsync(session, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(DetectionType.NO_RECOIL, result.Type);
        Assert.Equal("NO_RECOIL_MACRO_COMPENSATION", result.ReasonCode);
        Assert.Equal(0.90f, result.Confidence);
    }

    [Fact]
    public async Task ScanAsync_TriggerbotUnder5msStdDev_ShouldDetectTriggerbot()
    {
        var analyzer = new InputTimingAnalyzer();
        var reactions = new List<ClickReaction>();
        long startMs = 1000;

        // Triggerbot reaction clustering around 10ms with near zero variance
        for (int i = 0; i < 15; i++)
        {
            reactions.Add(new ClickReaction(10.0 + (i % 2), startMs + i * 500));
        }

        analyzer.FeedTestingData(new List<MouseDelta>(), reactions, new List<KeyInterval>());

        var session = new AgentSession("P1", "M1", new SessionToken("T1", "P1", "M1", DateTime.UtcNow, DateTime.UtcNow.AddHours(1), "SIG"), "HASH");
        var result = await analyzer.ScanAsync(session, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(DetectionType.TRIGGERBOT, result.Type);
        Assert.Equal("TRIGGERBOT_REACTION_ANOMALY", result.ReasonCode);
        Assert.Equal(0.93f, result.Confidence);
    }

    [Fact]
    public async Task ScanAsync_NormalHumanInput_ShouldReturnNull()
    {
        var analyzer = new InputTimingAnalyzer();
        var deltas = new List<MouseDelta>();
        long startMs = 1000;

        // Variable human recoil control (-1, -10, -5, -2, -8, etc.)
        int[] pulls = { -1, -10, -5, -2, -8, -12, 0, -4, -7, -15, -3, -9, -11, -2, -6, -14, -1, -8 };
        for (int i = 0; i < pulls.Length; i++)
        {
            deltas.Add(new MouseDelta((i % 3) - 1, pulls[i], startMs + i * 50, true));
        }

        analyzer.FeedTestingData(deltas, new List<ClickReaction>(), new List<KeyInterval>());

        var session = new AgentSession("P1", "M1", new SessionToken("T1", "P1", "M1", DateTime.UtcNow, DateTime.UtcNow.AddHours(1), "SIG"), "HASH");
        var result = await analyzer.ScanAsync(session, CancellationToken.None);

        Assert.Null(result);
    }
}
