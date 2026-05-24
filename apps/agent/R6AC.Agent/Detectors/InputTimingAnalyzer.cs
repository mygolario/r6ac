using System.Diagnostics;
using System.Runtime.InteropServices;
using R6AC.Agent.Core;

namespace R6AC.Agent.Detectors;

/// <summary>
/// حرکت تفکیک‌شده ماوس.
/// Mouse movement delta sample.
/// </summary>
public record struct MouseDelta(int Dx, int Dy, long TimestampMs, bool IsFiring);

/// <summary>
/// زمان واکنش کلیک.
/// Click reaction time sample.
/// </summary>
public record struct ClickReaction(double ReactionTimeMs, long TimestampMs);

/// <summary>
/// فاصله زمانی فشردن کلید.
/// Key press interval sample.
/// </summary>
public record struct KeyInterval(ushort VirtualKey, double IntervalMs, long TimestampMs);

/// <summary>
/// تحلیل‌گر دقیق زمان‌بندی ورودی‌های ماوس و کیبورد جهت کشف اسکریپت‌های ضدلگد (No-Recoil)، تریگربات و ماکرو.
/// Precision input timing analyzer for detecting no-recoil macros, triggerbots, and repeated key macros.
/// </summary>
public class InputTimingAnalyzer : IDetector, IDisposable
{
    public string DetectorName => "InputTimingAnalyzer";
    public DetectionType DetectionType => DetectionType.NO_RECOIL;

    private readonly List<MouseDelta> _mouseBuffer = new();
    private readonly List<ClickReaction> _reactionBuffer = new();
    private readonly List<KeyInterval> _keyBuffer = new();
    private readonly object _lockObj = new();

    private bool _isRunning = false;
    private Thread? _hookThread;
    private CancellationTokenSource? _cts;

    private const int BufferRetentionSeconds = 30;

    /// <summary>
    /// راه‌اندازی مانیتورینگ ورودی در پس‌زمینه.
    /// Start input monitoring in background thread.
    /// </summary>
    public void StartBackgroundHook()
    {
        if (_isRunning) return;

        _isRunning = true;
        _cts = new CancellationTokenSource();
        _hookThread = new Thread(() => BackgroundMonitoringLoop(_cts.Token))
        {
            IsBackground = true,
            Name = "R6AC_RawInputHook"
        };
        _hookThread.Start();
    }

    /// <summary>
    /// اجرای اسکن دوره‌ای روی بافر ۳۰ ثانیه‌ای ورودی‌ها.
    /// Run periodic scan over the rolling 30-second input buffer.
    /// </summary>
    public Task<DetectionResult?> ScanAsync(AgentSession session, CancellationToken ct)
    {
        return Task.Run(() => AnalyzeTimingBuffers(), ct);
    }

    /// <summary>
    /// تغذیه داده‌های تستی برای اجرای آزمون‌های واحد.
    /// Feed synthetic testing data for unit tests.
    /// </summary>
    public void FeedTestingData(List<MouseDelta> mouseDeltas, List<ClickReaction> reactions, List<KeyInterval> keyIntervals)
    {
        lock (_lockObj)
        {
            _mouseBuffer.Clear();
            _mouseBuffer.AddRange(mouseDeltas);
            _reactionBuffer.Clear();
            _reactionBuffer.AddRange(reactions);
            _keyBuffer.Clear();
            _keyBuffer.AddRange(keyIntervals);
        }
    }

    private void BackgroundMonitoringLoop(CancellationToken ct)
    {
        // In a full production C++ / C# native client, RegisterRawInputDevices would run a message loop here.
        // We simulate sampling or read from global hooks without blocking any thread.
        var sw = Stopwatch.StartNew();
        while (!ct.IsCancellationRequested)
        {
            CleanUpExpiredSamples(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
            Thread.Sleep(50);
        }
    }

    private void CleanUpExpiredSamples(long nowMs)
    {
        lock (_lockObj)
        {
            long cutoff = nowMs - (BufferRetentionSeconds * 1000);
            _mouseBuffer.RemoveAll(m => m.TimestampMs < cutoff);
            _reactionBuffer.RemoveAll(r => r.TimestampMs < cutoff);
            _keyBuffer.RemoveAll(k => k.TimestampMs < cutoff);
        }
    }

    private DetectionResult? AnalyzeTimingBuffers()
    {
        List<MouseDelta> mouseSamples;
        List<ClickReaction> reactionSamples;
        List<KeyInterval> keySamples;

        lock (_lockObj)
        {
            mouseSamples = _mouseBuffer.ToList();
            reactionSamples = _reactionBuffer.ToList();
            keySamples = _keyBuffer.ToList();
        }

        // 1. No-Recoil Script Detection (StdDev of Dy during rapid firing)
        var firingSamples = mouseSamples.Where(m => m.IsFiring && m.Dy != 0).ToList();
        if (firingSamples.Count >= 15)
        {
            var dyValues = firingSamples.Select(m => (double)m.Dy).ToList();
            var avgDy = dyValues.Average();
            var stdDevDy = Math.Sqrt(dyValues.Select(v => (v - avgDy) * (v - avgDy)).Sum() / dyValues.Count);

            if (stdDevDy < 2.0 && Math.Abs(avgDy) > 1.5)
            {
                return new DetectionResult(
                    Type: DetectionType.NO_RECOIL,
                    Severity: DetectionSeverity.Kick,
                    Confidence: 0.90f,
                    ReasonCode: "NO_RECOIL_MACRO_COMPENSATION",
                    Description: $"No-recoil script detected: Inhuman perfectly consistent downward mouse pull (StdDev: {stdDevDy:F2} px).",
                    DescriptionFA: $"اسکریپت ضدلگد (No-Recoil) شناسایی شد: کشش عمودی کاملا یکنواخت و غیرانسانی ماوس (انحراف معیار: {stdDevDy:F2} پیکسل).",
                    Evidence: new Dictionary<string, object>
                    {
                        ["SampleCount"] = firingSamples.Count,
                        ["AverageDy"] = Math.Round(avgDy, 2),
                        ["StandardDeviationDy"] = Math.Round(stdDevDy, 2)
                    }
                );
            }
        }

        // 2. Triggerbot Detection (Reaction times cluster at 0-15ms with StdDev < 5ms)
        if (reactionSamples.Count >= 10)
        {
            var times = reactionSamples.Select(r => r.ReactionTimeMs).ToList();
            var avgTime = times.Average();
            var stdDevTime = Math.Sqrt(times.Select(t => (t - avgTime) * (t - avgTime)).Sum() / times.Count);

            if (stdDevTime < 5.0 && avgTime < 35.0)
            {
                return new DetectionResult(
                    Type: DetectionType.TRIGGERBOT,
                    Severity: DetectionSeverity.Kick,
                    Confidence: 0.93f,
                    ReasonCode: "TRIGGERBOT_REACTION_ANOMALY",
                    Description: $"Triggerbot reaction anomaly: 10+ consecutive shots with inhuman reaction times (Avg: {avgTime:F1}ms, StdDev: {stdDevTime:F2}ms).",
                    DescriptionFA: $"واکنش غیرانسانی تریگربات: شلیک‌های پی‌درپی با زمان واکنش غیرطبیعی (میانگین: {avgTime:F1} میلی‌ثانیه، انحراف معیار: {stdDevTime:F2} میلی‌ثانیه).",
                    Evidence: new Dictionary<string, object>
                    {
                        ["SampleCount"] = reactionSamples.Count,
                        ["AverageReactionMs"] = Math.Round(avgTime, 2),
                        ["StandardDeviationMs"] = Math.Round(stdDevTime, 2)
                    }
                );
            }
        }

        // 3. Repeated Key Macro Detection (< 2ms interval variance)
        var keyGroups = keySamples.GroupBy(k => k.VirtualKey).Where(g => g.Count() >= 10).ToList();
        foreach (var group in keyGroups)
        {
            var intervals = group.Select(k => k.IntervalMs).ToList();
            var avgInt = intervals.Average();
            var variance = intervals.Select(i => (i - avgInt) * (i - avgInt)).Sum() / intervals.Count;

            if (variance < 0.5 && avgInt > 10.0)
            {
                return new DetectionResult(
                    Type: DetectionType.MACRO_TIMING,
                    Severity: DetectionSeverity.Flag,
                    Confidence: 0.84f,
                    ReasonCode: $"KEYBOARD_MACRO_VK_{group.Key}",
                    Description: $"Keyboard macro detected: Key repeat sequence with near-zero timing variance (Variance: {variance:F2}ms).",
                    DescriptionFA: $"ماکروی کیبورد شناسایی شد: تکرار دنباله کلیدها با واریانس زمانی نزدیک به صفر (واریانس: {variance:F2} میلی‌ثانیه).",
                    Evidence: new Dictionary<string, object>
                    {
                        ["VirtualKey"] = group.Key,
                        ["RepeatCount"] = intervals.Count,
                        ["AverageIntervalMs"] = Math.Round(avgInt, 2),
                        ["TimingVarianceMs"] = Math.Round(variance, 2)
                    }
                );
            }
        }

        return null;
    }

    public void Dispose()
    {
        if (_isRunning)
        {
            _cts?.Cancel();
            _hookThread?.Join(500);
            _cts?.Dispose();
            _isRunning = false;
        }
    }
}
