using R6AC.Agent.Reporting;
using Xunit;

namespace R6AC.Agent.Tests;

public class ReportQueueTests
{
    private readonly string _dbPath;

    public ReportQueueTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"test_queue_{Guid.NewGuid()}.db");
    }

    [Fact]
    public async Task Lifecycle_Enqueue_GetPending_MarkSynced()
    {
        var queue = new ReportQueue(_dbPath);

        var report = new DetectionReport(
            Id: Guid.NewGuid().ToString(),
            PlayerId: "P1",
            MatchId: "M1",
            DetectionType: "AIMBOT",
            Confidence: 0.99f,
            ReasonCode: "TEST_REASON",
            EvidenceJson: "{}",
            RequiresHumanReview: false,
            AutoAction: "kick",
            CreatedAt: DateTime.UtcNow,
            IsSynced: false
        );

        // 1. Enqueue
        await queue.EnqueueAsync(report);

        // 2. GetPending
        var pending1 = await queue.GetPendingAsync();
        Assert.Single(pending1);
        Assert.Equal(report.Id, pending1[0].Id);
        Assert.False(pending1[0].IsSynced);

        // 3. MarkSynced
        await queue.MarkSyncedAsync(report.Id);

        // 4. Verify Pending is now empty
        var pending2 = await queue.GetPendingAsync();
        Assert.Empty(pending2);

        // Cleanup
        try
        {
            if (File.Exists(_dbPath)) File.Delete(_dbPath);
        }
        catch { }
    }
}
