using R6AC.Agent.Core;
using R6AC.Agent.Reporting;

namespace R6AC.Agent.Behavioral;

/// <summary>
/// نمونه حرکت ماوس در سشن.
/// Mouse movement sample in session.
/// </summary>
public record struct MouseSample(int X, int Y, double VelocityPxSec, bool IsAimSnap, long TimestampMs);

/// <summary>
/// رویداد کلیک در سشن.
/// Click event in session.
/// </summary>
public record struct ClickEvent(double ReactionTimeMs, long TimestampMs);

/// <summary>
/// رویداد فشردن کلید در سشن.
/// Key press event in session.
/// </summary>
public record struct KeyEvent(ushort VirtualKey, double IntervalMs, long TimestampMs);

/// <summary>
/// گزارش نهایی تحلیل سشن مسابقه.
/// Final session analysis verdict record.
/// </summary>
public record SessionVerdict(
    string PlayerId,
    string MatchId,
    float FinalScore,
    VerdictLevel Verdict,
    BehavioralFeatures Features,
    List<string> TopReasons,
    DateTime Timestamp
);

/// <summary>
/// تحلیل‌گر پیوسته رویدادهای سشن مسابقه جهت استخراج ویژگی‌ها و قضاوت دوره‌ای.
/// Continuous match session event analyzer for extracting features and executing periodic verdicts.
/// </summary>
public class SessionAnalyzer
{
    private readonly AgentConfig _config;
    private readonly ScoringEngine _scoringEngine;
    private readonly string _playerId;
    private readonly string _matchId;
    private readonly DateTime _sessionStartTime;

    private readonly List<MouseSample> _mouseSamples = new();
    private readonly List<ClickEvent> _clickEvents = new();
    private readonly List<KeyEvent> _keyEvents = new();
    private readonly List<DetectionReport> _hardwareEvents = new();
    private readonly object _lockObj = new();

    public SessionAnalyzer(AgentConfig config, string playerId = "PLAYER_DEFAULT", string matchId = "MATCH_DEFAULT")
    {
        _config = config;
        _scoringEngine = new ScoringEngine(config);
        _playerId = playerId;
        _matchId = matchId;
        _sessionStartTime = DateTime.UtcNow;
    }

    /// <summary>
    /// ثبت نمونه حرکت ماوس.
    /// Record mouse movement sample.
    /// </summary>
    public void RecordMouseSample(MouseSample sample)
    {
        lock (_lockObj)
        {
            _mouseSamples.Add(sample);
            if (_mouseSamples.Count > 10000) _mouseSamples.RemoveAt(0);
        }
    }

    /// <summary>
    /// ثبت رویداد کلیک.
    /// Record click event.
    /// </summary>
    public void RecordClickEvent(ClickEvent click)
    {
        lock (_lockObj)
        {
            _clickEvents.Add(click);
            if (_clickEvents.Count > 2000) _clickEvents.RemoveAt(0);
        }
    }

    /// <summary>
    /// ثبت رویداد کلید کیبورد.
    /// Record key press event.
    /// </summary>
    public void RecordKeyEvent(KeyEvent key)
    {
        lock (_lockObj)
        {
            _keyEvents.Add(key);
            if (_keyEvents.Count > 5000) _keyEvents.RemoveAt(0);
        }
    }

    /// <summary>
    /// ثبت گزارش تشخیص سخت‌افزاری یا کرنل.
    /// Record hardware or kernel detection event.
    /// </summary>
    public void RecordHardwareEvent(DetectionReport hw)
    {
        lock (_lockObj)
        {
            _hardwareEvents.Add(hw);
        }
    }

    /// <summary>
    /// اجرای تحلیل کلی روی داده‌های انباشته‌شده سشن و صدور قضاوت نهایی.
    /// Run full analysis over accumulated session data and produce final verdict.
    /// </summary>
    public SessionVerdict Analyze()
    {
        List<MouseSample> mouseList;
        List<ClickEvent> clickList;
        List<KeyEvent> keyList;
        List<DetectionReport> hwList;

        lock (_lockObj)
        {
            mouseList = _mouseSamples.ToList();
            clickList = _clickEvents.ToList();
            keyList = _keyEvents.ToList();
            hwList = _hardwareEvents.ToList();
        }

        double durationMins = (DateTime.UtcNow - _sessionStartTime).TotalMinutes;
        if (durationMins < 0.1) durationMins = 0.1;

        // 1. Mouse Features
        float snapFreq = (float)(mouseList.Count(m => m.IsAimSnap) / durationMins);
        float smoothness = 100.0f;
        if (mouseList.Count >= 5)
        {
            var vels = mouseList.Select(m => m.VelocityPxSec).ToList();
            var avgVel = vels.Average();
            smoothness = (float)Math.Sqrt(vels.Select(v => (v - avgVel) * (v - avgVel)).Sum() / vels.Count);
        }

        // 2. Click Features
        float clickTimeMs = 240.0f;
        float clickStdDev = 40.0f;
        if (clickList.Count >= 5)
        {
            var times = clickList.Select(c => c.ReactionTimeMs).ToList();
            var avgTime = times.Average();
            clickTimeMs = (float)avgTime;
            clickStdDev = (float)Math.Sqrt(times.Select(t => (t - avgTime) * (t - avgTime)).Sum() / times.Count);
        }

        // 3. Keyboard Macro Features
        float macroScore = 0.1f;
        float keyIntStdDev = 50.0f;
        if (keyList.Count >= 10)
        {
            var intervals = keyList.Select(k => k.IntervalMs).ToList();
            var avgInt = intervals.Average();
            keyIntStdDev = (float)Math.Sqrt(intervals.Select(i => (i - avgInt) * (i - avgInt)).Sum() / intervals.Count);
            if (keyIntStdDev < 5.0f) macroScore = 0.85f;
            if (keyIntStdDev < 2.0f) macroScore = 0.95f;
        }

        // 4. Hardware Anomaly Features
        float hwScore = 0.0f;
        int usbCount = 0;
        bool hasDma = false;
        float kernelConfSum = 0.0f;
        int kernelCount = 0;

        foreach (var rep in hwList)
        {
            var typeUpper = rep.DetectionType.ToUpperInvariant();
            if (typeUpper.Contains("KMBOX") || typeUpper.Contains("ARDUINO") || typeUpper.Contains("SPOOF") || typeUpper.Contains("SUSPICIOUS"))
            {
                usbCount++;
                if (rep.Confidence > hwScore) hwScore = rep.Confidence;
            }
            if (typeUpper.Contains("DMA") || rep.ReasonCode.Contains("DMA"))
            {
                hasDma = true;
                if (rep.Confidence > hwScore) hwScore = rep.Confidence;
            }
            if (typeUpper.StartsWith("KERNEL_"))
            {
                kernelConfSum += rep.Confidence;
                kernelCount++;
            }
        }

        float kernelConfAvg = kernelCount > 0 ? (kernelConfSum / kernelCount) : 0.0f;
        float noRecoilScore = clickStdDev < 5.0f ? 0.90f : 0.10f; // estimated or linked to timing

        var features = new BehavioralFeatures(
            AimSnapFrequency: snapFreq,
            TrackingSmoothness: smoothness,
            ClickReactionTimeMs: clickTimeMs,
            ClickReactionStdDev: clickStdDev,
            NoRecoilScore: noRecoilScore,
            MacroConsistencyScore: macroScore,
            KeyIntervalStdDev: keyIntStdDev,
            HardwareAnomalyScore: hwScore,
            SuspiciousUsbCount: usbCount,
            DmaIndicatorPresent: hasDma,
            SessionDurationMinutes: (float)durationMins,
            TotalDetectionEvents: hwList.Count,
            KernelReportConfidenceAvg: kernelConfAvg
        );

        float finalScore = _scoringEngine.ComputeScore(features);
        var verdict = _scoringEngine.DetermineVerdict(finalScore);

        var topReasons = new List<string>();
        if (verdict != VerdictLevel.CLEAN)
        {
            if (snapFreq > 10.0f) topReasons.Add("Frequent Aim Snaps (>10/min) | پرش‌های مکرر و مشکوک نشانه‌گیری");
            if (smoothness < 15.0f) topReasons.Add("Abnormal Aim Velocity Variance (Aimbot lock) | واریانس غیرطبیعی سرعت نشانه‌گیری (قفل ایم‌بات)");
            if (clickTimeMs < 40.0f && clickStdDev < 5.0f) topReasons.Add("Inhuman Triggerbot Reaction Times (<40ms) | زمان واکنش غیرانسانی تریگربات");
            if (macroScore > 0.8f) topReasons.Add("Inhuman Key Macro Regularity | نظم زمانی غیرانسانی در فشردن کلیدها (ماکرو)");
            if (hwScore > 0.7f) topReasons.Add($"Prohibited Hardware Anomaly Detected ({hwScore:P0}) | ناهنجاری سخت‌افزاری غیرمجاز");
            if (hasDma) topReasons.Add("Direct Memory Access (DMA) Indicator | نشانگر دسترسی مستقیم به حافظه (DMA)");
        }

        if (topReasons.Count == 0)
        {
            topReasons.Add("Normal Gameplay Patterns Observed | الگوهای بازی طبیعی مشاهده شد");
        }

        return new SessionVerdict(
            PlayerId: _playerId,
            MatchId: _matchId,
            FinalScore: finalScore,
            Verdict: verdict,
            Features: features,
            TopReasons: topReasons,
            Timestamp: DateTime.UtcNow
        );
    }
}
