using System;
using System.Collections.Generic;
using System.Linq;
using R6AC.Agent.Detectors;

namespace R6AC.Agent.Core;

public record SuspicionSignal(
    DetectionType Type,
    DetectionSeverity Severity,
    float Confidence,
    DateTime Timestamp,
    DetectionResult OriginalResult
);

public enum EscalationDecisionType
{
    Monitor,
    CreateReport
}

public record EscalationDecision(
    EscalationDecisionType Type,
    float ComputedConfidence = 0f
)
{
    public static EscalationDecision Monitor => new(EscalationDecisionType.Monitor);
    public static EscalationDecision CreateReport(float conf) => new(EscalationDecisionType.CreateReport, conf);
}

public class SuspicionAccumulator
{
    private readonly Dictionary<string, List<SuspicionSignal>> _signals = new();
    private readonly TimeSpan _windowDuration = TimeSpan.FromMinutes(5);

    public void AddSignal(string playerId, DetectionResult result)
    {
        if (!_signals.ContainsKey(playerId))
        {
            _signals[playerId] = new List<SuspicionSignal>();
        }

        var now = DateTime.UtcNow;
        _signals[playerId].Add(new SuspicionSignal(
            result.Type,
            result.Severity,
            result.Confidence,
            now,
            result
        ));

        // Purge signals older than _windowDuration
        _signals[playerId].RemoveAll(s => now - s.Timestamp > _windowDuration);
    }

    public List<SuspicionSignal> GetRecentSignals(string playerId)
    {
        if (!_signals.TryGetValue(playerId, out var signals))
        {
            return new List<SuspicionSignal>();
        }
        var now = DateTime.UtcNow;
        signals.RemoveAll(s => now - s.Timestamp > _windowDuration);
        return signals;
    }

    public EscalationDecision Evaluate(string playerId)
    {
        var recent = GetRecentSignals(playerId);

        // Rule 1: Single KICK or FLAG severity signal -> escalate immediately
        if (recent.Any(s => s.Severity == DetectionSeverity.Kick || s.Severity == DetectionSeverity.Flag))
        {
            return EscalationDecision.CreateReport(recent.Max(s => s.Confidence));
        }

        // Rule 2: 2+ SUSPICIOUS signals of DIFFERENT types within 5 min -> escalate
        var suspiciousSignals = recent.Where(s => s.Severity == DetectionSeverity.Suspicious).ToList();
        var suspiciousTypes = suspiciousSignals.Select(s => s.Type).Distinct().Count();
        
        if (suspiciousTypes >= 2)
        {
            return EscalationDecision.CreateReport(CalculateCombinedConfidence(suspiciousSignals));
        }

        // Rule 3: 3+ SUSPICIOUS signals of SAME type within 5 min -> escalate
        if (suspiciousSignals.Count > 0)
        {
            var maxSameType = suspiciousSignals.GroupBy(s => s.Type).Max(g => g.Count());
            if (maxSameType >= 3)
            {
                return EscalationDecision.CreateReport(CalculateCombinedConfidence(suspiciousSignals));
            }
        }

        // Otherwise -> keep watching, do not report
        return EscalationDecision.Monitor;
    }

    private float CalculateCombinedConfidence(List<SuspicionSignal> signals)
    {
        // Bayesian combination: each independent signal updates probability
        // Start at 0.5, update with each signal
        float prob = 0.5f;
        foreach (var s in signals)
        {
            prob = prob + s.Confidence * (1f - prob); // independent combination
        }
        return Math.Clamp(prob, 0f, 1f);
    }
}
