using System.Runtime.InteropServices;
using R6AC.Agent.Core;

namespace R6AC.Agent.Detectors;

/// <summary>
/// نقطه دوبعدی مختصات ماوس.
/// 2D Point coordinate for mouse positions.
/// </summary>
public record struct MousePoint(int X, int Y, long TimestampMs);

/// <summary>
/// تحلیل‌گر رفتاری ورودی‌های کاربر جهت تشخیص ماکروهای حرکتی و تریگربات.
/// Behavioral analyzer for user inputs to detect movement macros and triggerbots.
/// </summary>
public class BehavioralDetector : IDetector
{
    public string DetectorName => "BehavioralDetector";
    public DetectionType DetectionType => DetectionType.MACRO_TIMING;

    private readonly List<MousePoint> _mouseBuffer = new();
    private readonly List<long> _clickTimestampsBuffer = new();
    private readonly object _lockObj = new();
    private long _lastClickCheckMs = 0;

    private const int MaxBufferSize = 6000; // ~60 seconds at 10ms
    private const int MaxClicksSize = 1000;

    [DllImport("user32.dll")]
    private static extern bool GetCursorPos(out POINT lpPoint);

    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT
    {
        public int X;
        public int Y;
    }

    private const int VK_LBUTTON = 0x01;

    public Task<DetectionResult?> ScanAsync(AgentSession session, CancellationToken ct)
    {
        SampleCurrentInput();
        return Task.Run(() => AnalyzeBuffer(), ct);
    }

    /// <summary>
    /// نمونه‌برداری از وضعیت فعلی نشانگر ماوس و کلیک‌ها.
    /// Sample current mouse cursor position and click state.
    /// </summary>
    public void SampleCurrentInput()
    {
        if (!OperatingSystem.IsWindows()) return;

        try
        {
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

            if (GetCursorPos(out var p))
            {
                lock (_lockObj)
                {
                    _mouseBuffer.Add(new MousePoint(p.X, p.Y, now));
                    if (_mouseBuffer.Count > MaxBufferSize)
                    {
                        _mouseBuffer.RemoveAt(0);
                    }
                }
            }

            var leftClickState = GetAsyncKeyState(VK_LBUTTON);
            if ((leftClickState & 0x8000) != 0 && (now - _lastClickCheckMs) > 20)
            {
                lock (_lockObj)
                {
                    _clickTimestampsBuffer.Add(now);
                    if (_clickTimestampsBuffer.Count > MaxClicksSize)
                    {
                        _clickTimestampsBuffer.RemoveAt(0);
                    }
                    _lastClickCheckMs = now;
                }
            }
        }
        catch
        {
            // Ignore sampling errors
        }
    }

    /// <summary>
    /// تغذیه داده‌های آزمایشی برای اجرای تست‌های واحد.
    /// Feed synthetic testing data for unit tests.
    /// </summary>
    public void FeedSyntheticData(List<MousePoint> points, List<long> clickTimestampsMs)
    {
        lock (_lockObj)
        {
            _mouseBuffer.Clear();
            _mouseBuffer.AddRange(points);
            _clickTimestampsBuffer.Clear();
            _clickTimestampsBuffer.AddRange(clickTimestampsMs);
        }
    }

    /// <summary>
    public DetectionResult? Analyze() => AnalyzeBuffer();

    /// <summary>
    /// تحلیل بافر داده‌های ۶۰ ثانیه اخیر برای یافتن الگوهای غیرانسانی.
    /// Analyze recent 60-second buffer for inhuman patterns.
    /// </summary>
    public DetectionResult? AnalyzeBuffer()
    {
        List<MousePoint> points;
        List<long> clicks;

        lock (_lockObj)
        {
            points = _mouseBuffer.ToList();
            clicks = _clickTimestampsBuffer.ToList();
        }

        // 1. Analyze Click Intervals (Triggerbot)
        const int MinSamplesRequired = 30;
        if (clicks.Count >= MinSamplesRequired)
        {
            var intervals = new List<double>();
            for (int i = 0; i < clicks.Count - 1; i++)
            {
                intervals.Add(clicks[i + 1] - clicks[i]);
            }

            if (intervals.Count > 0)
            {
                var avg = intervals.Average();
                var sumOfSquaresOfDifferences = intervals.Select(val => (val - avg) * (val - avg)).Sum();
                var stdDev = (float)Math.Sqrt(sumOfSquaresOfDifferences / intervals.Count);

                DetectionSeverity? sev = stdDev switch
                {
                    > 20f => null,
                    > 10f => DetectionSeverity.Info,
                    > 5f => DetectionSeverity.Suspicious,
                    > 2f => DetectionSeverity.Flag,
                    _ => DetectionSeverity.Kick,
                };

                if (sev.HasValue)
                {
                    float conf = stdDev switch
                    {
                        > 10f => 0.10f,
                        > 5f => 0.55f,
                        > 2f => 0.80f,
                        _ => 0.93f,
                    };

                    var evidence = new Dictionary<string, object>
                    {
                        { "ClickCount", clicks.Count },
                        { "AverageIntervalMs", Math.Round(avg, 2) },
                        { "StandardDeviationMs", Math.Round(stdDev, 2) }
                    };

                    return new DetectionResult(
                        Type: DetectionType.TRIGGERBOT,
                         Severity: sev.Value,
                        Confidence: conf,
                        ReasonCode: "INHUMAN_CLICK_REGULARITY",
                        Description: $"Consistent click interval detected (StdDev: {stdDev:F2}ms).",
                        DescriptionFA: $"زمان‌بندی کلیک‌ها (انحراف معیار: {stdDev:F2} میلی‌ثانیه).",
                        Evidence: evidence
                    );
                }
            }
        }

        // 2. Analyze Mouse Movements (Macro Straight Lines)
        if (points.Count >= 10)
        {
            var straightCount = 0;
            var totalCount = 0;
            double maxSpeed = 0;

            for (int i = 0; i < points.Count - 2; i++)
            {
                var p1 = points[i];
                var p2 = points[i + 1];
                var p3 = points[i + 2];

                var dx1 = p2.X - p1.X;
                var dy1 = p2.Y - p1.Y;
                var dt1 = p2.TimestampMs - p1.TimestampMs;

                if (dt1 > 0)
                {
                    var dist = Math.Sqrt(dx1 * dx1 + dy1 * dy1);
                    var speed = (dist / dt1) * 1000.0; // pixels per sec
                    if (speed > maxSpeed) maxSpeed = speed;
                }

                if ((p1.X == p2.X && p1.Y == p2.Y) || (p2.X == p3.X && p2.Y == p3.Y)) continue;

                var dx2 = p3.X - p2.X;
                var dy2 = p3.Y - p2.Y;

                totalCount++;

                var crossProduct = (long)dx1 * dy2 - (long)dy1 * dx2;
                if (crossProduct == 0)
                {
                    straightCount++;
                }
            }

            if (maxSpeed > 50_000)
            {
                var evidence = new Dictionary<string, object>
                {
                    { "MaxSpeedPixelsPerSec", Math.Round(maxSpeed, 2) }
                };

                return new DetectionResult(
                    Type: DetectionType.AIMBOT,
                         Severity: DetectionSeverity.Kick,
                    Confidence: 0.95f,
                    ReasonCode: "INHUMAN_MOUSE_VELOCITY",
                    Description: $"Inhuman mouse velocity detected ({maxSpeed:F0} px/s), potential aimbot flick.",
                    DescriptionFA: $"سرعت غیرانسانی ماوس ثبت شد ({maxSpeed:F0} پیکسل بر ثانیه)، احتمال پرش سریع ایم‌بات.",
                    Evidence: evidence
                );
            }

            if (totalCount >= 10)
            {
                var ratio = (float)straightCount / totalCount;
                DetectionSeverity severity = ClassifyStraightness(ratio);

                float confidence = ratio switch
                {
                    < 0.55f => 0.00f,
                    < 0.70f => 0.00f,
                    < 0.82f => 0.55f,
                    < 0.93f => 0.80f,
                    _ => 0.95f
                };

                var evidence = new Dictionary<string, object>
                {
                    { "TotalMovementsChecked", totalCount },
                    { "StraightLineMovements", straightCount },
                    { "CollinearRatio", Math.Round(ratio, 3) }
                };

                return new DetectionResult(
                    Type: DetectionType.MACRO_TIMING,
                         Severity: severity,
                    Confidence: confidence,
                    ReasonCode: "STRAIGHT_LINE_MOVEMENTS",
                    Description: $"Mouse movements analyzed ({(ratio * 100):F1}% linear).",
                    DescriptionFA: $"حرکات ماوس ثبت شد ({(ratio * 100):F1}٪ خطی).",
                    Evidence: evidence
                );
            }
        }

        return null;
    }

    private DetectionSeverity ClassifyStraightness(float ratio)
    {
        return ratio switch
        {
            < 0.55f => DetectionSeverity.Info,        // Normal human aim
            < 0.70f => DetectionSeverity.Info,        // Good aim, not suspicious
            < 0.82f => DetectionSeverity.Suspicious,  // Unusually precise
            < 0.93f => DetectionSeverity.Flag,        // Very likely assisted
            _       => DetectionSeverity.Kick,        // Near-certain aimbot
        };
    }
}
