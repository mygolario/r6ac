using R6AC.Agent.Behavioral;
using R6AC.Agent.Core;
using Xunit;

namespace R6AC.Agent.Tests;

public class ScoringEngineTests
{
    [Fact]
    public void ComputeScore_KnownCheatFeatures_ShouldScoreAbove92()
    {
        var config = new AgentConfig();
        var engine = new ScoringEngine(config);

        var cheatFeatures = new BehavioralFeatures(
            AimSnapFrequency: 15.0f,          // extreme aim snaps (>5.0 is max anomaly)
            TrackingSmoothness: 5.0f,         // near zero velocity variance -> aimbot lock
            ClickReactionTimeMs: 12.0f,       // triggerbot reaction time
            ClickReactionStdDev: 1.5f,        // inhuman reaction consistency
            NoRecoilScore: 0.98f,             // perfect recoil compensation
            MacroConsistencyScore: 0.95f,     // key macro
            KeyIntervalStdDev: 2.0f,          // inhuman key interval std dev
            HardwareAnomalyScore: 0.95f,      // KMBox detected
            SuspiciousUsbCount: 1,
            DmaIndicatorPresent: true,        // DMA indicator
            SessionDurationMinutes: 10.0f,
            TotalDetectionEvents: 5,
            KernelReportConfidenceAvg: 0.98f
        );

        float score = engine.ComputeScore(cheatFeatures);
        var verdict = engine.DetermineVerdict(score);

        Assert.True(score >= 0.92f, $"Score {score} should be >= 0.92");
        Assert.Equal(VerdictLevel.KICKED, verdict);
    }

    [Fact]
    public void ComputeScore_KnownCleanFeatures_ShouldScoreBelow50()
    {
        var config = new AgentConfig();
        var engine = new ScoringEngine(config);

        var cleanFeatures = new BehavioralFeatures(
            AimSnapFrequency: 0.1f,
            TrackingSmoothness: 45.0f,        // normal human movement
            ClickReactionTimeMs: 220.0f,      // normal human reaction
            ClickReactionStdDev: 35.0f,       // normal variance
            NoRecoilScore: 0.10f,
            MacroConsistencyScore: 0.10f,
            KeyIntervalStdDev: 45.0f,         // normal key interval std dev
            HardwareAnomalyScore: 0.0f,
            SuspiciousUsbCount: 0,
            DmaIndicatorPresent: false,
            SessionDurationMinutes: 30.0f,
            TotalDetectionEvents: 0,
            KernelReportConfidenceAvg: 0.0f
        );

        float score = engine.ComputeScore(cleanFeatures);
        var verdict = engine.DetermineVerdict(score);

        Assert.True(score < 0.50f, $"Score {score} should be < 0.50");
        Assert.Equal(VerdictLevel.CLEAN, verdict);
    }
}
