using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using R6AC.Agent.Core;
using R6AC.Agent.Detectors;
using R6AC.Agent.Reporting;
using R6AC.Agent.Utils;
using Serilog;

namespace R6AC.Agent.Integrity;

public record ManifestFileInfo(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("sha256")] string Sha256,
    [property: JsonPropertyName("size")] long Size
);

public record IntegrityManifest(
    [property: JsonPropertyName("version")] string Version,
    [property: JsonPropertyName("timestamp")] DateTime Timestamp,
    [property: JsonPropertyName("files")] List<ManifestFileInfo> Files,
    [property: JsonPropertyName("signature")] string Signature
);

/// <summary>
/// اعتبارسنجی یکپارچگی فایل اجرایی ایجنت و بررسی عدم اتصال دیباگر.
/// Self-integrity verification of agent executable and anti-debugging checks.
/// </summary>
public class SelfIntegrityCheck
{
    public static bool IgnoreExitForTests { get; set; } = false;

    // Hardcoded 32-byte secret HMAC key: "R6AC_MANIFEST_SECRET_KEY_32BYTES"
    private static readonly byte[] ManifestKey = new byte[] {
        0x52, 0x36, 0x41, 0x43, 0x5F, 0x4D, 0x41, 0x4E, 0x49, 0x46, 0x45, 0x53, 0x54, 0x5F, 0x53, 0x45,
        0x43, 0x52, 0x45, 0x54, 0x5F, 0x4B, 0x45, 0x59, 0x5F, 0x33, 0x32, 0x42, 0x59, 0x54, 0x45, 0x53
    };

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CheckRemoteDebuggerPresent(IntPtr hProcess, out bool isDebuggerPresent);

    /// <summary>
    /// بررسی یکپارچگی و امنیت پروسه ایجنت در زمان اجرا.
    /// Run integrity and security checks on agent runtime.
    /// </summary>
    public static (bool IsIntact, DetectionResult? FailureResult) Verify(AgentConfig config)
    {
        // 1. Check Debugger
        var isAttached = Debugger.IsAttached;
        var isRemotePresent = false;

        if (OperatingSystem.IsWindows())
        {
            try
            {
                CheckRemoteDebuggerPresent(Process.GetCurrentProcess().Handle, out isRemotePresent);
            }
            catch { }
        }

        if (isAttached || isRemotePresent)
        {
            var evidence = new Dictionary<string, object>
            {
                { "DebuggerIsAttached", isAttached },
                { "RemoteDebuggerPresent", isRemotePresent }
            };

            var res = new DetectionResult(
                Type: DetectionType.TAMPER_DETECTED,
                Severity: DetectionSeverity.Kick,
                Confidence: 1.0f,
                ReasonCode: "DEBUGGER_ATTACHED_TO_AGENT",
                Description: "Fatal: A debugger was detected attached to the anti-cheat agent process.",
                DescriptionFA: "خطای بحرانی: اتصال دیباگر به پروسه آنتی‌چیت تشخیص داده شد.",
                Evidence: evidence
            );

            ReportTamperingAndExit(res, config);
            return (false, res);
        }

        // 2. Check Assembly SHA-256 Hash via Manifest
        var baseDir = AppDomain.CurrentDomain.BaseDirectory;
        var manifestPath = Path.Combine(baseDir, "integrity-manifest.json");

        if (File.Exists(manifestPath))
        {
            try
            {
                var manifestJson = File.ReadAllText(manifestPath);
                var manifest = JsonSerializer.Deserialize<IntegrityManifest>(manifestJson);
                if (manifest != null && manifest.Files != null)
                {
                    // Verify HMAC signature
                    var filesJson = JsonSerializer.Serialize(manifest.Files, new JsonSerializerOptions { WriteIndented = false });
                    using var hmac = new HMACSHA256(ManifestKey);
                    var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(filesJson));
                    var computedSig = Convert.ToHexString(hashBytes).ToLowerInvariant();

                    if (!string.Equals(manifest.Signature, computedSig, StringComparison.OrdinalIgnoreCase))
                    {
                        var evidence = new Dictionary<string, object>
                        {
                            { "ManifestPath", manifestPath },
                            { "ExpectedSignature", manifest.Signature ?? "" },
                            { "ComputedSignature", computedSig }
                        };

                        var res = new DetectionResult(
                            Type: DetectionType.TAMPER_DETECTED,
                            Severity: DetectionSeverity.Kick,
                            Confidence: 1.0f,
                            ReasonCode: "MANIFEST_SIGNATURE_MISMATCH",
                            Description: "Integrity manifest signature is invalid. Agent tampering detected.",
                            DescriptionFA: "امضای فایل یکپارچگی نامعتبر است. دستکاری در فایل‌های کلاینت تشخیص داده شد.",
                            Evidence: evidence
                        );

                        ReportTamperingAndExit(res, config);
                        return (false, res);
                    }

                    // Verify SHA-256 of files
                    foreach (var fileInfo in manifest.Files)
                    {
                        var filePath = Path.Combine(baseDir, fileInfo.Name);
                        if (File.Exists(filePath))
                        {
                            var actualHash = HashUtils.Sha256File(filePath);
                            if (!string.Equals(actualHash, fileInfo.Sha256, StringComparison.OrdinalIgnoreCase))
                            {
                                var evidence = new Dictionary<string, object>
                                {
                                    { "FilePath", filePath },
                                    { "ExpectedHash", fileInfo.Sha256 },
                                    { "ActualHash", actualHash }
                                };

                                var res = new DetectionResult(
                                    Type: DetectionType.TAMPER_DETECTED,
                                    Severity: DetectionSeverity.Kick,
                                    Confidence: 1.0f,
                                    ReasonCode: "AGENT_ASSEMBLY_HASH_MISMATCH",
                                    Description: $"Binary file tampered: {fileInfo.Name}. Expected: {fileInfo.Sha256}, Got: {actualHash}",
                                    DescriptionFA: $"دستکاری فایل باینری تشخیص داده شد: {fileInfo.Name}.",
                                    Evidence: evidence
                                );

                                ReportTamperingAndExit(res, config);
                                return (false, res);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Log.Warning(ex, "Error reading or verifying integrity-manifest.json.");
            }
        }
        else if (!IgnoreExitForTests && !baseDir.Contains("Tests"))
        {
            Log.Warning("integrity-manifest.json not found in directory. Proceeding unverified.");
        }

        return (true, null);
    }

    private static void ReportTamperingAndExit(DetectionResult res, AgentConfig config)
    {
        Log.Fatal("TAMPERING DETECTED: {ReasonCode} - {Description}", res.ReasonCode, res.Description);

        try
        {
            var evidenceJson = JsonSerializer.Serialize(res.Evidence, new JsonSerializerOptions { WriteIndented = false });
            var report = new DetectionReport(
                Id: Guid.NewGuid().ToString(),
                PlayerId: "SYSTEM_DEFENSE",
                MatchId: "NONE",
                DetectionType: res.Type.ToString(),
                        Confidence: res.Confidence,
                ReasonCode: res.ReasonCode,
                EvidenceJson: evidenceJson,
                RequiresHumanReview: false,
                AutoAction: "kick",
                CreatedAt: DateTime.UtcNow,
                IsSynced: false
            );

            // Send report synchronously before exiting
            var reporter = new ApiReporter(config);
            var t = reporter.SendReportAsync(report);
            t.Wait(1500);
        }
        catch { }

        if (!IgnoreExitForTests)
        {
            Environment.Exit(1);
        }
    }
}
