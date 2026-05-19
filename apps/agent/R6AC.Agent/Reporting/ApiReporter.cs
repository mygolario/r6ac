using System.Net.Http.Headers;
using System.Net.Http.Json;
using Polly;
using Polly.Retry;
using R6AC.Agent.Core;
using Serilog;

namespace R6AC.Agent.Reporting;

/// <summary>
/// ارسال‌کننده گزارش‌ها به سرور R6AC با استفاده از سیاست‌های بازیابی Polly (۳ تلاش مجدد).
/// Report reporter uploading reports to R6AC API using Polly retry policies (3 retries).
/// </summary>
public class ApiReporter
{
    private readonly HttpClient _httpClient;
    private readonly ResiliencePipeline _retryPipeline;
    private readonly AgentConfig _config;

    public ApiReporter(AgentConfig config)
    {
        _config = config;
        _httpClient = new HttpClient { BaseAddress = new Uri(config.ApiBaseUrl) };
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
    /// ارسال گزارش تشخیص به سرور.
    /// Send detection report to server.
    /// </summary>
    public virtual async Task<bool> SendReportAsync(DetectionReport report, CancellationToken ct = default)
    {
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
