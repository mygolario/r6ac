using System.Diagnostics;
using R6AC.Agent.Core;
using R6AC.Agent.Detectors;
using R6AC.Agent.Utils;

namespace R6AC.Agent.Integrity;

/// <summary>
/// اعتبارسنجی فایل اجرایی بازی و نظارت بر ماژول‌های (DLL) بارگذاری شده.
/// Game executable verification and loaded DLL module inspection.
/// </summary>
public class GameIntegrityCheck : IDetector
{
    public string DetectorName => "GameIntegrityCheck";
    public DetectionType DetectionType => DetectionType.GAME_TAMPERING;

    private readonly AgentConfig _config;

    private static readonly List<string> SuspiciousDllPaths = new()
    {
        @"temp\", @"appdata\", @"local\", @"roaming\"
    };

    private static readonly List<string> WhitelistedDllKeywords = new()
    {
        "windows", "system32", "syswow64", "program files", "ubisoft", "rainbowsix", "rainbow six", "vulkan", "steam", "epic games", "discord", "overwolf", "rivatuner", "rtss", "nvidia", "amd"
    };

    public GameIntegrityCheck(AgentConfig config)
    {
        _config = config;
    }

    public Task<DetectionResult?> ScanAsync(AgentSession session, CancellationToken ct)
    {
        return Task.Run(() => CheckGameIntegrity(), ct);
    }

    private DetectionResult? CheckGameIntegrity()
    {
        var processes = Process.GetProcessesByName("RainbowSix").Concat(Process.GetProcessesByName("RainbowSix_Vulkan")).ToList();
        if (processes.Count == 0) return null;

        foreach (var proc in processes)
        {
            try
            {
                // 1. Check Executable SHA-256 Hash
                var mainModulePath = proc.MainModule?.FileName ?? string.Empty;
                if (!string.IsNullOrWhiteSpace(mainModulePath) && File.Exists(mainModulePath))
                {
                    if (!string.IsNullOrWhiteSpace(_config.ExpectedGameHash))
                    {
                        var actualHash = HashUtils.Sha256File(mainModulePath);
                        if (!string.Equals(actualHash, _config.ExpectedGameHash, StringComparison.OrdinalIgnoreCase) && actualHash != string.Empty)
                        {
                            var evidence = new Dictionary<string, object>
                            {
                                { "GamePath", mainModulePath },
                                { "ExpectedHash", _config.ExpectedGameHash },
                                { "ActualHash", actualHash },
                                { "ProcessId", proc.Id }
                            };

                            return new DetectionResult(
                                Type: DetectionType.GAME_TAMPERING,
                                Severity: DetectionSeverity.Kick,
                                Confidence: 1.0f,
                                ReasonCode: "GAME_EXECUTABLE_HASH_MISMATCH",
                                Description: $"Game executable tampered! Expected: {_config.ExpectedGameHash}, Got: {actualHash}",
                                DescriptionFA: $"دستکاری فایل اجرایی بازی تشخیص داده شد! هش فایل بازی نامعتبر است.",
                                Evidence: evidence
                            );
                        }
                    }
                }

                // 2. Check Loaded Modules (DLL Injection Inspection)
                foreach (ProcessModule mod in proc.Modules)
                {
                    var modPath = mod.FileName?.ToLowerInvariant() ?? string.Empty;
                    var modName = mod.ModuleName?.ToLowerInvariant() ?? string.Empty;

                    if (string.IsNullOrWhiteSpace(modPath)) continue;

                    var isWhitelisted = WhitelistedDllKeywords.Any(kw => modPath.Contains(kw));
                    if (!isWhitelisted)
                    {
                        var isSuspiciousPath = SuspiciousDllPaths.Any(kw => modPath.Contains(kw));
                        if (isSuspiciousPath || modName.Contains("cheat") || modName.Contains("hack") || modName.Contains("hook"))
                        {
                            var evidence = new Dictionary<string, object>
                            {
                                { "ModulePath", modPath },
                                { "ModuleName", modName },
                                { "BaseAddress", mod.BaseAddress.ToString("X") },
                                { "ProcessId", proc.Id }
                            };

                            return new DetectionResult(
                                Type: DetectionType.GAME_TAMPERING,
                                Severity: DetectionSeverity.Kick,
                                Confidence: 0.85f,
                                ReasonCode: "UNRECOGNIZED_DLL_INJECTION",
                                Description: $"Suspicious unauthorized DLL injected into game process: {modName}",
                                DescriptionFA: $"کتابخانه غیرمجاز (DLL) در پروسه بازی بارگذاری شده است: {modName}",
                                Evidence: evidence
                            );
                        }
                    }
                }
            }
            catch
            {
                // Ignore Win32 access denied when inspecting system handles
            }
        }

        return null;
    }
}
