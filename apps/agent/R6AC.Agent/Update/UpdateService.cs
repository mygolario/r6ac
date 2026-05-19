using System.Diagnostics;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using R6AC.Agent.Core;
using R6AC.Agent.Detectors;
using R6AC.Agent.Reporting;
using R6AC.Agent.Security;
using R6AC.Agent.Utils;
using Serilog;

namespace R6AC.Agent.Update;

/// <summary>
/// سرویس دریافت، اعتبارسنجی و اعمال آپدیت‌های کلاینت به صورت امن.
/// Secure update service verifying SHA-256 and HMAC signatures before applying packages.
/// </summary>
public class UpdateService
{
    private readonly AgentConfig _config;
    private readonly HttpClient _httpClient;
    public static bool IgnoreExitForTests { get; set; } = false;
    private static UpdateCheckResult? _mockCheckResult = null;

    public static void SetMockCheckResult(UpdateCheckResult? res) => _mockCheckResult = res;

    public UpdateService(AgentConfig config)
    {
        _config = config;
        var baseUrl = StringVault.Get(VaultKey.ApiBaseUrl);
        _httpClient = new HttpClient { BaseAddress = new Uri(baseUrl) };
    }

    public async Task<UpdateCheckResult> CheckForUpdateAsync(CancellationToken ct = default)
    {
        if (_mockCheckResult != null) return _mockCheckResult;

        try
        {
            var res = await _httpClient.GetAsync("/api/v1/agent/latest-version", ct);
            if (res.IsSuccessStatusCode)
            {
                var info = await res.Content.ReadFromJsonAsync<UpdateInfo>(cancellationToken: ct);
                if (info != null)
                {
                    var currentVer = Version.Parse("1.0.0");
                    var latestVer = Version.Parse(info.Version);
                    var minVer = Version.Parse(info.MinVersion);

                    bool isUpdateAvailable = latestVer > currentVer;
                    bool isForced = info.ForceUpdate || currentVer < minVer;

                    return new UpdateCheckResult(isUpdateAvailable, isForced, info);
                }
            }
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "Failed to check for latest agent version.");
        }

        return new UpdateCheckResult(false, false, null);
    }

    public async Task<string> DownloadUpdateAsync(UpdateInfo info, CancellationToken ct = default)
    {
        Log.Information("Downloading agent update v{Version} from {Url}...", info.Version, info.DownloadUrl);

        var tempPath = Path.GetTempFileName() + "_R6AC-Setup.exe";

        if (info.DownloadUrl.StartsWith("http://") || info.DownloadUrl.StartsWith("https://"))
        {
            using var s = await _httpClient.GetStreamAsync(info.DownloadUrl, ct);
            using var fs = File.Create(tempPath);
            await s.CopyToAsync(fs, ct);
        }
        else
        {
            File.WriteAllText(tempPath, "MOCK_INSTALLER_CONTENT");
        }

        Log.Information("Update package downloaded to {TempPath}", tempPath);
        return tempPath;
    }

    public bool VerifyUpdatePackage(string filePath, string expectedVersion, string expectedHash, string signature)
    {
        if (!File.Exists(filePath)) return false;

        try
        {
            var actualHash = HashUtils.Sha256File(filePath);
            if (!string.Equals(actualHash, expectedHash, StringComparison.OrdinalIgnoreCase))
            {
                Log.Warning("Update package SHA-256 mismatch! Expected {Expected}, Got {Actual}", expectedHash, actualHash);
                ReportUpdateTamper(filePath, expectedHash, actualHash);
                try { File.Delete(filePath); } catch { }
                return false;
            }

            var secretKey = StringVault.Get(VaultKey.UpdateHmacKey);
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secretKey));
            var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(expectedVersion + expectedHash));
            var computedSig = Convert.ToHexString(hashBytes).ToLowerInvariant();

            if (!string.Equals(computedSig, signature, StringComparison.OrdinalIgnoreCase))
            {
                Log.Warning("Update package HMAC signature mismatch! Expected {Expected}, Got {Actual}", signature, computedSig);
                ReportUpdateTamper(filePath, signature, computedSig);
                try { File.Delete(filePath); } catch { }
                return false;
            }

            Log.Information("Update package verified successfully (SHA-256 + HMAC valid).");
            return true;
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Error verifying update package.");
            try { File.Delete(filePath); } catch { }
            return false;
        }
    }

    private void ReportUpdateTamper(string path, string expected, string actual)
    {
        var evidence = new Dictionary<string, object>
        {
            { "FilePath", path },
            { "ExpectedValue", expected },
            { "ActualValue", actual }
        };

        var res = new DetectionResult(
            Type: DetectionType.TAMPER_DETECTED,
            Confidence: 1.0f,
            ReasonCode: "UPDATE_PACKAGE_TAMPERED",
            Description: "Downloaded update package failed cryptographic verification (tampering detected).",
            DescriptionFA: "بسته آپدیت دانلود شده در اعتبارسنجی رمزنگاری نامعتبر شناخته شد.",
            Evidence: evidence
        );

        var evidenceJson = JsonSerializer.Serialize(res.Evidence, new JsonSerializerOptions { WriteIndented = false });
        var rep = new DetectionReport(
            Id: Guid.NewGuid().ToString(),
            PlayerId: "SYSTEM_DEFENSE",
            MatchId: "NONE",
            DetectionType: res.Type.ToString(),
            Confidence: res.Confidence,
            ReasonCode: res.ReasonCode,
            EvidenceJson: evidenceJson,
            RequiresHumanReview: false,
            AutoAction: "flag",
            CreatedAt: DateTime.UtcNow,
            IsSynced: false
        );

        try
        {
            var reporter = new ApiReporter(_config);
            var t = reporter.SendReportAsync(rep);
            t.Wait(1000);
        }
        catch { }
    }

    public void ApplyUpdate(string installerPath)
    {
        Log.Information("Applying update via installer {Path}...", installerPath);

        if (!IgnoreExitForTests && OperatingSystem.IsWindows() && File.Exists(installerPath))
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = installerPath,
                    Arguments = "/S",
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to launch installer process.");
            }

            Environment.Exit(0);
        }
    }
}
