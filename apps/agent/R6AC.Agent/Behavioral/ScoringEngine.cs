using R6AC.Agent.Core;

namespace R6AC.Agent.Behavioral;

/// <summary>
/// سطوح مختلف تصمیم‌گیری و قضاوت در مورد ناهنجاری‌های رفتاری و سخت‌افزاری.
/// Verdict levels for behavioral and hardware anomalies.
/// </summary>
public enum VerdictLevel
{
    CLEAN,
    SUSPICIOUS,
    FLAGGED,
    KICKED
}

/// <summary>
/// موتور امتیازدهی رفتاری مبتنی بر ترکیب وزن‌دار ویژگی‌های استخراج‌شده جهت تشخیص الگوهای تقلب.
/// Weighted behavioral ML scoring engine combining extracted features with calibrated thresholds.
/// </summary>
public class ScoringEngine
{
    private readonly AgentConfig _config;

    // Feature weights (tunable via agent-config.json)
    private readonly Dictionary<string, float> _weights = new(StringComparer.OrdinalIgnoreCase)
    {
        ["AimSnapFrequency"]         = 0.15f,
        ["TrackingSmoothness"]       = 0.15f,
        ["ClickReactionTimeMs"]      = 0.10f,
        ["ClickReactionStdDev"]      = 0.12f,
        ["NoRecoilScore"]            = 0.12f,
        ["MacroConsistencyScore"]    = 0.08f,
        ["HardwareAnomalyScore"]     = 0.18f,
        ["DmaIndicatorPresent"]      = 0.10f,
    };

    public ScoringEngine(AgentConfig config)
    {
        _config = config;
        UpdateWeightsFromConfig();
    }

    /// <summary>
    /// به‌روزرسانی وزن‌ها از فایل پیکربندی.
    /// Update weights from configuration.
    /// </summary>
    public void UpdateWeightsFromConfig()
    {
        if (_config.Behavioral?.Weights != null)
        {
            var w = _config.Behavioral.Weights;
            _weights["AimSnapFrequency"] = w.AimSnapFrequency;
            _weights["TrackingSmoothness"] = w.TrackingSmoothness;
            _weights["ClickReactionTimeMs"] = w.ClickReactionTimeMs;
            _weights["ClickReactionStdDev"] = w.ClickReactionStdDev;
            _weights["NoRecoilScore"] = w.NoRecoilScore;
            _weights["MacroConsistencyScore"] = w.MacroConsistencyScore;
            _weights["HardwareAnomalyScore"] = w.HardwareAnomalyScore;
            _weights["DmaIndicatorPresent"] = w.DmaIndicatorPresent;
        }

        // Normalize weights so they sum exactly to 1.0f
        var totalWeight = _weights.Values.Sum();
        if (totalWeight > 0 && Math.Abs(totalWeight - 1.0f) > 0.001f)
        {
            var keys = _weights.Keys.ToList();
            foreach (var k in keys)
            {
                _weights[k] /= totalWeight;
            }
        }
    }

    /// <summary>
    /// محاسبه امتیاز نهایی ناهنجاری (۰.۰ تمیز تا ۱.۰ تقلب قطعی).
    /// Compute final anomaly score (0.0 clean to 1.0 definite cheat).
    /// </summary>
    public float ComputeScore(BehavioralFeatures f)
    {
        // Normalize each feature into an anomaly score between 0.0f and 1.0f
        float normAimSnap = Math.Min(f.AimSnapFrequency / 5.0f, 1.0f);
        float normSmoothness = Math.Max(0.0f, 1.0f - Math.Min(f.TrackingSmoothness / 40.0f, 1.0f));
        float normReaction = f.ClickReactionTimeMs < 40.0f ? 1.0f : Math.Max(0.0f, 1.0f - (f.ClickReactionTimeMs / 180.0f));
        float normReactStd = f.ClickReactionStdDev < 6.0f ? 1.0f : Math.Max(0.0f, 1.0f - (f.ClickReactionStdDev / 25.0f));
        float normNoRecoil = Math.Clamp(f.NoRecoilScore, 0.0f, 1.0f);
        float normMacro = Math.Clamp(f.MacroConsistencyScore, 0.0f, 1.0f);
        float normHw = Math.Clamp(f.HardwareAnomalyScore, 0.0f, 1.0f);
        float normDma = f.DmaIndicatorPresent ? 1.0f : 0.0f;

        float finalScore = 
            normAimSnap * _weights["AimSnapFrequency"] +
            normSmoothness * _weights["TrackingSmoothness"] +
            normReaction * _weights["ClickReactionTimeMs"] +
            normReactStd * _weights["ClickReactionStdDev"] +
            normNoRecoil * _weights["NoRecoilScore"] +
            normMacro * _weights["MacroConsistencyScore"] +
            normHw * _weights["HardwareAnomalyScore"] +
            normDma * _weights["DmaIndicatorPresent"];

        return Math.Clamp(finalScore, 0.0f, 1.0f);
    }

    /// <summary>
    /// تعیین سطح قضاوت بر اساس امتیاز محاسبه‌شده و آستانه‌های موجود در تنظیمات.
    /// Determine verdict level based on computed score and configuration thresholds.
    /// </summary>
    public VerdictLevel DetermineVerdict(float score)
    {
        float kickThresh = _config.AutoKickThreshold > 0 ? _config.AutoKickThreshold : 0.92f;
        float flagThresh = _config.AutoFlagThreshold > 0 ? _config.AutoFlagThreshold : 0.75f;
        float suspThresh = 0.50f;

        if (score >= kickThresh) return VerdictLevel.KICKED;
        if (score >= flagThresh) return VerdictLevel.FLAGGED;
        if (score >= suspThresh) return VerdictLevel.SUSPICIOUS;
        return VerdictLevel.CLEAN;
    }
}
