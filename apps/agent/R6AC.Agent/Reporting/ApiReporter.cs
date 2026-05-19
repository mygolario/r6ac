using System.Net.Http.Headers;
using System.Net.Http.Json;
using Polly;
using Polly.Retry;
using R6AC.Agent.Core;
using R6AC.Agent.Security;
using Serilog;

namespace R6AC.Agent.Reporting;

/// <summary>
/// ارسال‌کننده گزارش‌ها به سرور R6AC با استفاده از سیاست‌های بازیابی Polly (۳ تلاش مجدد) و مکانیزم شکست خاموش.
/// Report reporter uploading reports to R6AC API using Polly retry policies and anti-debug silent failure.
/// </summary>
public class ApiReporter
{
    private readonly HttpClient _httpClient;
    private readonly ResiliencePipeline _retryPipeline;
    private readonly AgentConfig _config;

    public ApiReporter(AgentConfig config)
    {
        _config = config;
        var baseUrl = StringVault.Get(VaultKey.ApiBaseUrl);
        _httpClient = new HttpClient { BaseAddress = new Uri(baseUrl) };
        if (!string.IsNullOrWhiteSpace(config.ServiceToken))
        {
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", config.ServiceToken);
        }

        _retryPipeline = new ResiliencePipelineBuilder()
            .AddRetry(new RetryStrategyOptions
            {
                MaxRetryAttempts = 3,
                Delay = TimeSpan.FromSeconds(2),
                BackoffType = DelayBackoffType.Exponential,
                ShouldHandle = new PredicateBuilder().Handle<HttpRequestException>().Handle<TaskCanceledException>()
            })
            .Build();
    }

    /// <summary>
    /// همگام‌سازی تمامی گزارش‌های صف با سرور.
    /// Sync all pending reports in queue with server.
    /// </summary>
    public virtual async Task<bool> SyncReports(ReportQueue queue, CancellationToken ct = default)
    {
        var pending = await queue.GetPendingAsync();
        if (pending.Count == 0) return true;

        bool allSynced = true;
        foreach (var report in pending)
        {
            if (ct.IsCancellationRequested) break;
            var success = await SendReportAsync(report, ct);
            if (success)
            {
                await queue.MarkSyncedAsync(report.Id);
            }
            else
            {
                allSynced = false;
            }
        }
        return allSynced;
    }

    /// <summary>
    /// ارسال گزارش تشخیص به سرور.
    /// Send detection report to server.
    /// </summary>
    public virtual async Task<bool> SendReportAsync(DetectionReport report, CancellationToken ct = default)
    {
        if (AntiDebug.IsSilentModeActive)
        {
            var elapsed = (DateTime.UtcNow - AntiDebug.SilentModeStartTime).TotalSeconds;
            if (elapsed <= 60)
            {
                // Start reporting fabricated CLEAN results for 60 seconds
                var fakeCleanReport = report with { DetectionType = "CLEAN", Confidence = 0.0f, ReasonCode = "SYSTEM_CLEAN" };
                try
                {
                    await _httpClient.PostAsJsonAsync("/api/v1/reports", fakeCleanReport, ct);
                }
                catch { }
                return true; // Pretend success
            }
            else
            {
                // Silently stop reporting entirely
                return true; // Pretend success but do nothing
            }
        }

        if (_config.OfflineMode)
        {
            Log.Information("Agent is in offline mode. Report {ReportId} queued locally.", report.Id);
            return false;
        }

        try
        {
            return await _retryPipeline.ExecuteAsync(async state =>
            {
                var response = await _httpClient.PostAsJsonAsync("/api/v1/reports", report, state);
                if (response.IsSuccessStatusCode)
                {
                    Log.Information("Successfully synced report {ReportId} to server.", report.Id);
                    return true;
                }
                Log.Warning("Server returned status {StatusCode} when syncing report {ReportId}.", response.StatusCode, report.Id);
                return false;
            }, ct);
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "Failed to sync report {ReportId} to server (API unreachable). Remaining in local offline queue.", report.Id);
            return false;
        }
    }
}
