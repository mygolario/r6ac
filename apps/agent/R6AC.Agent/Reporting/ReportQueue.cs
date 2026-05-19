using LiteDB;

namespace R6AC.Agent.Reporting;

/// <summary>
/// صف ذخیره‌سازی محلی گزارش‌ها با استفاده از LiteDB (حالت آفلاین-اول).
/// Local persistence queue for detection reports using LiteDB (Offline-first).
/// </summary>
public class ReportQueue
{
    private readonly string _dbPath;
    private const string CollectionName = "reports";

    public ReportQueue(string dbPath)
    {
        _dbPath = dbPath;
        EnsureDatabaseDirectory();
    }

    private void EnsureDatabaseDirectory()
    {
        try
        {
            var dir = Path.GetDirectoryName(_dbPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }
        }
        catch
        {
            // Ignore directory creation errors if path is root or restricted
        }
    }

    /// <summary>
    /// افزودن گزارش جدید به صف محلی.
    /// Add a new report to the local queue.
    /// </summary>
    public Task EnqueueAsync(DetectionReport report)
    {
        return Task.Run(() =>
        {
            using var db = new LiteDatabase(_dbPath);
            var col = db.GetCollection<DetectionReport>(CollectionName);
            col.Insert(report);
            col.EnsureIndex(x => x.IsSynced);
        });
    }

    /// <summary>
    /// دریافت تمامی گزارش‌های ارسال نشده.
    /// Retrieve all unsynced pending reports.
    /// </summary>
    public Task<List<DetectionReport>> GetPendingAsync()
    {
        return Task.Run(() =>
        {
            using var db = new LiteDatabase(_dbPath);
            var col = db.GetCollection<DetectionReport>(CollectionName);
            return col.Find(x => !x.IsSynced).ToList();
        });
    }

    /// <summary>
    /// علامت‌گذاری یک گزارش به عنوان ارسال‌شده (همگام‌سازی شده).
    /// Mark a specific report as successfully synced.
    /// </summary>
    public Task MarkSyncedAsync(string reportId)
    {
        return Task.Run(() =>
        {
            using var db = new LiteDatabase(_dbPath);
            var col = db.GetCollection<DetectionReport>(CollectionName);
            var report = col.FindById(reportId);
            if (report != null)
            {
                var updated = report with { IsSynced = true };
                col.Update(updated);
            }
        });
    }
}
