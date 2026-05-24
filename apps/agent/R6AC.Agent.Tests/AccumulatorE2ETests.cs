using System.Collections.Generic;
using R6AC.Agent.Core;
using R6AC.Agent.Detectors;
using Xunit;
using Xunit.Abstractions;
using System.Text.Json;

namespace R6AC.Agent.Tests;

public class AccumulatorE2ETests
{
    private readonly ITestOutputHelper _output;

    public AccumulatorE2ETests(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public void SimulateEndToEndDetectionFlow()
    {
        var accumulator = new SuspicionAccumulator();
        var playerId = "TEST_USER_123";

        // 1. Send first Suspicious signal
        var res1 = new DetectionResult(
            DetectionType.MACRO_TIMING,
            DetectionSeverity.Suspicious,
            0.60f,
            "STRAIGHT_LINE_MOVEMENTS",
            "Slightly linear mouse movements",
            "حرکات نسبتاً خطی ماوس",
            new Dictionary<string, object> { ["CollinearRatio"] = 0.85 }
        );
        
        accumulator.AddSignal(playerId, res1);
        var decision1 = accumulator.Evaluate(playerId);
        
        // Assert no report yet for a single Suspicious event
        Assert.Equal(EscalationDecisionType.Monitor, decision1.Type);
        _output.WriteLine("Step 1 Passed: Single Suspicious event ignored.");

        // 2. Send second Suspicious signal (correlation)
        var res2 = new DetectionResult(
            DetectionType.SESSION_ANOMALY,
            DetectionSeverity.Suspicious,
            0.55f,
            "UNUSUAL_ALLOCATION",
            "Unusual memory allocation pattern",
            "الگوی تخصیص حافظه غیرعادی",
            new Dictionary<string, object>()
        );
        
        accumulator.AddSignal(playerId, res2);
        var decision2 = accumulator.Evaluate(playerId);
        
        // Assert escalation
        Assert.Equal(EscalationDecisionType.CreateReport, decision2.Type);
        Assert.True(decision2.ComputedConfidence > 0.80f); // Combined Bayesian
        _output.WriteLine($"Step 2 Passed: Correlated event escalated with confidence {decision2.ComputedConfidence}.");
        
        // 3. Test Kick Severity Immediate Escalation
        var res3 = new DetectionResult(
            DetectionType.GAME_TAMPERING,
            DetectionSeverity.Kick,
            1.00f,
            "CHEAT_ENGINE_FOUND",
            "Blacklisted process",
            "پروسه بلک‌لیست",
            new Dictionary<string, object>()
        );
        
        accumulator.AddSignal("USER_HACKER", res3);
        var decision3 = accumulator.Evaluate("USER_HACKER");
        
        Assert.Equal(EscalationDecisionType.CreateReport, decision3.Type);
        Assert.Equal(1.0f, decision3.ComputedConfidence);
        _output.WriteLine("Step 3 Passed: Kick severity immediately escalated.");
    }
}
