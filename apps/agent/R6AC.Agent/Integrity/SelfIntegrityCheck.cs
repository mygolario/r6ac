using System.Diagnostics;
using System.Runtime.InteropServices;
using R6AC.Agent.Core;
using R6AC.Agent.Detectors;
using R6AC.Agent.Utils;

namespace R6AC.Agent.Integrity;

/// <summary>
/// اعتبارسنجی یکپارچگی فایل اجرایی ایجنت و بررسی عدم اتصال دیباگر.
/// Self-integrity verification of agent executable and anti-debugging checks.
/// </summary>
public class SelfIntegrityCheck
{
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
                Type: DetectionType.GAME_TAMPERING,
                Confidence: 1.0f,
                ReasonCode: "DEBUGGER_ATTACHED_TO_AGENT",
                Description: "Fatal: A debugger was detected attached to the anti-cheat agent process.",
                DescriptionFA: "خطای بحرانی: اتصال دیباگر به پروسه آنتی‌چیت تشخیص داده شد.",
                Evidence: evidence
            );

            return (false, res);
        }

        // 2. Check Assembly SHA-256 Hash
        if (!string.IsNullOrWhiteSpace(config.ExpectedSelfHash))
        {
            try
            {
                var processPath = Environment.ProcessPath;
                if (!string.IsNullOrWhiteSpace(processPath) && File.Exists(processPath))
                {
                    var actualHash = HashUtils.Sha256File(processPath);
                    if (!string.Equals(actualHash, config.ExpectedSelfHash, StringComparison.OrdinalIgnoreCase) && actualHash != string.Empty)
                    {
                        var evidence = new Dictionary<string, object>
                        {
                            { "ExecutablePath", processPath },
                            { "ExpectedHash", config.ExpectedSelfHash },
                            { "ActualHash", actualHash }
                        };

                        var res = new DetectionResult(
                            Type: DetectionType.GAME_TAMPERING,
                            Confidence: 1.0f,
                            ReasonCode: "AGENT_ASSEMBLY_HASH_MISMATCH",
                            Description: $"Agent binary tampered! Expected: {config.ExpectedSelfHash}, Got: {actualHash}",
                            DescriptionFA: $"دستکاری فایل اجرایی آنتی‌چیت! هش نامعتبر است.",
                            Evidence: evidence
                        );

                        return (false, res);
                    }
                }
            }
            catch
            {
                // Ignore restricted file lock access
            }
        }

        return (true, null);
    }
}
