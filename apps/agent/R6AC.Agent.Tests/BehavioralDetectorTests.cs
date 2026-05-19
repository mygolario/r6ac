using R6AC.Agent.Detectors;
using Xunit;

namespace R6AC.Agent.Tests;

public class BehavioralDetectorTests
{
    [Fact]
    public void AnalyzeBuffer_ShouldDetectInhumanClickRegularity()
    {
        var detector = new BehavioralDetector();
        var clicks = new List<long>();
        long start = 100000;

        for (int i = 0; i < 25; i++)
        {
            clicks.Add(start + i * 100); // exactly 100ms apart -> 0 std dev
        }

        detector.FeedSyntheticData(new List<MousePoint>(), clicks);
        var res = detector.AnalyzeBuffer();

        Assert.NotNull(res);
        Assert.Equal(DetectionType.TRIGGERBOT, res.Type);
        Assert.Equal("INHUMAN_CLICK_REGULARITY", res.ReasonCode);
        Assert.Equal(0.88f, res.Confidence);
    }

    [Fact]
    public void AnalyzeBuffer_ShouldDetectLinearMouseMovement()
    {
        var detector = new BehavioralDetector();
        var points = new List<MousePoint>();
        long time = 1000;

        for (int i = 0; i < 15; i++)
        {
            points.Add(new MousePoint(100 + i * 10, 200 + i * 10, time + i * 50));
        }

        detector.FeedSyntheticData(points, new List<long>());
        var res = detector.AnalyzeBuffer();

        Assert.NotNull(res);
        Assert.Equal(DetectionType.MACRO_TIMING, res.Type);
        Assert.Equal("EXCESSIVE_STRAIGHT_LINE_MOVEMENTS", res.ReasonCode);
        Assert.True(res.Confidence >= 0.60f);
    }

    [Fact]
    public void AnalyzeBuffer_ShouldReturnNullForHumanRandomMovements()
    {
        var detector = new BehavioralDetector();
        var points = new List<MousePoint>
        {
            new(100, 200, 1000), new(115, 205, 1050), new(120, 230, 1100),
            new(110, 250, 1150), new(90, 240, 1200), new(85, 210, 1250),
            new(105, 190, 1300), new(130, 185, 1350), new(150, 200, 1400),
            new(160, 220, 1450), new(155, 245, 1500)
        };

        detector.FeedSyntheticData(points, new List<long>());
        var res = detector.AnalyzeBuffer();

        Assert.Null(res);
    }
}
