using System.Diagnostics;
using R6AC.Agent.Core;

namespace R6AC.Agent.Detectors;

/// <summary>
/// ساختار امضای پردازش‌های ابزارهای تقلب.
/// Process signature definition for known cheat tools.
/// </summary>
public record ProcessSignature(string NameSubstring, float Confidence, string ReasonCode, DetectionType Type);

/// <summary>
/// اسکنر پردازش‌های در حال اجرا جهت تشخیص نرم‌افزارهای تقلب، دیباگرها و ناهنجاری‌ها.
/// Running process scanner to detect cheat software, debuggers, and anomalies.
/// </summary>
public class ProcessDetector : IDetector
{
    public string DetectorName => "ProcessDetector";
    public DetectionType DetectionType => DetectionType.FORBIDDEN_PROCESS;

    private static readonly List<ProcessSignature> CheatProcesses = new()
    {
        new("cheatengine", 0.95f, "CHEAT_ENGINE_RUNNING", DetectionType.AIMBOT),
        new("cheatengine-x86_64", 0.95f, "CHEAT_ENGINE_RUNNING", DetectionType.AIMBOT),
        new("x64dbg", 0.75f, "DEBUGGER_RUNNING", DetectionType.AIMBOT),
        new("ollydbg", 0.75f, "DEBUGGER_RUNNING", DetectionType.AIMBOT),
        new("ida64", 0.80f, "DISASSEMBLER_RUNNING", DetectionType.AIMBOT),
        new("processhacker", 0.70f, "PROCESS_HACKER_RUNNING", DetectionType.WALLHACK),
        new("wireshark", 0.60f, "PACKET_SNIFFER_RUNNING", DetectionType.RADAR_HACK),
        new("obs64", 0.40f, "SCREEN_CAPTURE_RUNNING", DetectionType.DUAL_PC_STREAM),
        new("streamlabs", 0.35f, "SCREEN_CAPTURE_RUNNING", DetectionType.DUAL_PC_STREAM),
    };

    public Task<DetectionResult?> ScanAsync(AgentSession session, CancellationToken ct)
    {
        return Task.Run(() => ScanProcesses(), ct);
    }

    private DetectionResult? ScanProcesses()
    {
        var processes = Process.GetProcesses();
        var gameCount = 0;

        foreach (var proc in processes)
        {
            try
            {
                var procName = proc.ProcessName.ToLowerInvariant();

                // 1. Check Multiple Game Instances
                if (procName.Contains("rainbowsix") || procName.Contains("r6s"))
                {
                    gameCount++;
                    if (gameCount > 1)
                    {
                        var evidence = new Dictionary<string, object>
                        {
                            { "GameInstancesCount", gameCount },
                            { "ProcessId", proc.Id }
                        };

                        return new DetectionResult(
                            Type: DetectionType.FORBIDDEN_PROCESS,
                            Confidence: 0.85f,
                            ReasonCode: "MULTIPLE_GAME_INSTANCES",
                            Description: "Multiple instances of Rainbow Six Siege detected running simultaneously.",
                            DescriptionFA: "بیش از یک نمونه از بازی رینبو سیکس به صورت همزمان در حال اجرا است.",
                            Evidence: evidence
                        );
                    }
                }

                // 2. Check Known Cheat Signatures
                foreach (var sig in CheatProcesses)
                {
                    if (procName.Contains(sig.NameSubstring))
                    {
                        var evidence = new Dictionary<string, object>
                        {
                            { "ProcessId", proc.Id },
                            { "ProcessName", proc.ProcessName },
                            { "SignatureMatched", sig.NameSubstring }
                        };

                        return new DetectionResult(
                            Type: sig.Type,
                            Confidence: sig.Confidence,
                            ReasonCode: sig.ReasonCode,
                            Description: $"Forbidden process detected running: {proc.ProcessName} ({sig.ReasonCode})",
                            DescriptionFA: $"پردازش غیرمجاز در حال اجرا یافت شد: {proc.ProcessName} ({sig.ReasonCode})",
                            Evidence: evidence
                        );
                    }
                }

                // 3. Check Nameless / Windowless High CPU Background Processes
                if (string.IsNullOrWhiteSpace(proc.MainWindowTitle))
                {
                    // To avoid win32 access denied exceptions on idle/system, check working set & threads
                    if (proc.Threads.Count > 30 && proc.WorkingSet64 > 100_000_000)
                    {
                        // Potential heavy background injector/miner/spoofer
                        if (!procName.Contains("svchost") && !procName.Contains("explorer") && !procName.Contains("system") && !procName.Contains("msmpeng"))
                        {
                            var evidence = new Dictionary<string, object>
                            {
                                { "ProcessId", proc.Id },
                                { "ProcessName", proc.ProcessName },
                                { "ThreadCount", proc.Threads.Count },
                                { "MemoryBytes", proc.WorkingSet64 }
                            };

                            return new DetectionResult(
                                Type: DetectionType.FORBIDDEN_PROCESS,
                                Confidence: 0.65f,
                                ReasonCode: "SUSPICIOUS_STATELESS_HIGH_RESOURCE_PROCESS",
                                Description: $"Suspicious background process with high resource consumption and no window: {proc.ProcessName}",
                                DescriptionFA: $"پردازش پس‌زمینه مشکوک با مصرف منابع بالا و بدون پنجره: {proc.ProcessName}",
                                Evidence: evidence
                            );
                        }
                    }
                }
            }
            catch
            {
                // Ignore Win32 exceptions for access restricted system processes
            }
        }

        return null;
    }
}
