using System.IO.Pipes;
using System.Text;
using System.Net.Http.Json;
using R6AC.Agent.Core;
using R6AC.Agent.Detectors;
using R6AC.Agent.Hardware;
using R6AC.Agent.Integrity;
using R6AC.Agent.Reporting;
using R6AC.Agent.Security;
using R6AC.Agent.Update;
using R6AC.Agent.Utils;
using Serilog;

namespace R6AC.Agent;

/// <summary>
/// کلاس اصلی اجرای برنامه و چرخه اسکن دوره‌ای ایجنت کلاینت (نسخه سخت‌شده امنیتی).
/// Main execution class and periodic scan loop orchestration with anti-tamper and anti-debug protections.
/// </summary>
public class Program
{
    public static async Task Main(string[] args)
    {
        Logger.Initialize();
        Log.Information("R6AC Anti-Cheat Client Agent (Phase 5 Hardened) starting...");

        var cts = new CancellationTokenSource();
        Console.CancelKeyPress += (s, e) =>
        {
            Log.Information("Shutting down R6AC Agent...");
            e.Cancel = true;
            cts.Cancel();
        };

        var config = AgentConfig.Load();

        // 1. Verify Self-Integrity
        var integrityCheck = SelfIntegrityCheck.Verify(config);
        if (!integrityCheck.IsIntact)
        {
            Log.Fatal("Self-integrity check failed! Tampering or debugger detected. Refusing to start.");
            if (integrityCheck.FailureResult != null)
            {
                Log.Fatal("Failure Reason: {Reason}", integrityCheck.FailureResult.ReasonCode);
            }
            Logger.Close();
            Environment.Exit(1);
            return;
        }

        Log.Information("Self-integrity verified successfully.");

        // 2. Lock Critical Memory Regions (PAGE_EXECUTE_READ)
        // MemoryProtection.LockCriticalRegions(); // DISABLED: Causes AccessViolationException when VPN/Proxy tools (like Electro) try to inject Winsock hooks.

        // 3. Check for Updates
        var updateSvc = new UpdateService(config);
        var updateRes = await updateSvc.CheckForUpdateAsync(cts.Token);
        if (updateRes.IsUpdateAvailable && updateRes.Info != null)
        {
            if (updateRes.IsForceUpdate)
            {
                Log.Warning("Mandatory update required! Downloading v{Version}...", updateRes.Info.Version);
                var pkgPath = await updateSvc.DownloadUpdateAsync(updateRes.Info, cts.Token);
                if (updateSvc.VerifyUpdatePackage(pkgPath, updateRes.Info.Version, updateRes.Info.Sha256, updateRes.Info.Signature))
                {
                    updateSvc.ApplyUpdate(pkgPath);
                }
                Log.Fatal("Force update required. Exiting un-updated client.");
                Environment.Exit(0);
                return;
            }
            else
            {
                Log.Information("Optional agent update available: v{Version}", updateRes.Info.Version);
            }
        }

        var hwFingerprinter = new HardwareFingerprinter();
        var hwHash = hwFingerprinter.GetFingerprintHash();
        Log.Information("Hardware Fingerprint SHA-256: {HwHash}", hwHash);

        Console.WriteLine("======================================");
        Console.WriteLine("   R6AC Anticheat Agent - Login");
        Console.WriteLine("======================================");
        Console.Write("Username/Email: ");
        var username = Console.ReadLine() ?? "";
        Console.Write("Password: ");
        var password = ReadPassword();

        Console.WriteLine("Authenticating...");
        var baseUrl = StringVault.Get(VaultKey.ApiBaseUrl);
        using var authClient = new HttpClient { BaseAddress = new Uri(baseUrl) };
        var authRes = await authClient.PostAsJsonAsync("/api/v1/agent/auth", new { username, password, hwid = hwHash });
        if (!authRes.IsSuccessStatusCode)
        {
            var err = await authRes.Content.ReadAsStringAsync();
            Log.Fatal("Authentication failed! Status: {Status}, Error: {Error}", authRes.StatusCode, err);
            Environment.Exit(1);
            return;
        }

        var authData = await authRes.Content.ReadFromJsonAsync<JsonElement>();
        var token = authData.GetProperty("token").GetString() ?? "";
        var apiPlayerId = authData.GetProperty("playerId").GetString() ?? "";

        config.ServiceToken = token;

        var playerId = apiPlayerId;
        var matchId = args.Length > 1 ? args[1] : "MATCH_DEFAULT_ID";

        var sessionToken = new SessionToken(
            TokenId: token,
            PlayerId: playerId,
            MatchId: matchId,
            IssuedAt: DateTime.UtcNow,
            ExpiresAt: DateTime.UtcNow.AddHours(4),
            Signature: "SECURE_SIG"
        );

        var session = new AgentSession(playerId, matchId, sessionToken, hwHash);
        var reportQueue = new ReportQueue(config.LocalQueuePath);
        var apiReporter = new ApiReporter(config);

        var timingAnalyzer = new InputTimingAnalyzer();
        timingAnalyzer.StartBackgroundHook();

        var detectors = new List<IDetector>
        {
            new ProcessDetector(),
            new WindowDetector(),
            new InputDeviceDetector(),
            new NetworkInterfaceDetector(),
            new DriverDetector(),
            new BehavioralDetector(),
            new GameIntegrityCheck(config),
            new AdvancedUsbDetector(),
            new DualPcDetector(),
            new SpoofDetector(),
            new AntiVmDetector(),
            timingAnalyzer
        };

        var accumulator = new SuspicionAccumulator();
        var cooldown = new DetectionCooldown();

        Log.Information("Initialization complete. Starting monitoring loop (Interval: {Interval}s)...", config.ScanIntervalSeconds);

        try
        {
            while (!cts.Token.IsCancellationRequested)
            {
                Log.Debug("Starting scan cycle...");

                // 0a. Anti-Debug Check (Silent Failure mode triggers internally if debugger present)
                AntiDebug.RunAllChecks();

                // 0b. Method Prologue Integrity Check (DISABLED)
                // In .NET 8, GetFunctionPointer() points to JMP stubs for Tiered Compilation.
                // This triggers false positives. Binary integrity is already verified by SHA-256 manifest.

                // Global Gate: Only run full scan if game is running
                if (!GameProcessMonitor.IsGameRunning("RainbowSix"))
                {
                    Log.Debug("Game not running. Waiting for process...");
                    await Task.Delay(TimeSpan.FromSeconds(config.ScanIntervalSeconds), cts.Token);
                    continue;
                }

                foreach (var detector in detectors)
                {
                    if (cts.Token.IsCancellationRequested) break;

                    try
                    {
                        var result = await detector.ScanAsync(session, cts.Token);
                        if (result != null)
                        {
                            if (result.Severity == DetectionSeverity.Info)
                            {
                                accumulator.AddSignal(session.PlayerId, result);
                                continue;
                            }

                            accumulator.AddSignal(session.PlayerId, result);
                            var decision = accumulator.Evaluate(session.PlayerId);

                            if (decision.Type == EscalationDecisionType.CreateReport)
                            {
                                if (cooldown.IsOnCooldown(session.PlayerId, result.Type))
                                {
                                    Log.Debug("Detection {Type} is on cooldown. Skipping report.", result.Type);
                                    continue;
                                }

                                cooldown.RecordFired(session.PlayerId, result.Type);

                                // Use accumulator's computed confidence if it combined signals
                                var reportedResult = result with { Confidence = Math.Max(result.Confidence, decision.ComputedConfidence) };

                                Log.Warning("Detection escalated: {ReasonCode} ({Confidence:P0})",
                                    reportedResult.ReasonCode, reportedResult.Confidence);

                                var report = BuildReport(reportedResult, session, config);
                                await reportQueue.EnqueueAsync(report);

                                if (reportedResult.Confidence >= config.AutoKickThreshold)
                                {
                                    TriggerAutoKick(session, reportedResult);
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Log.Error(ex, "Error executing detector {DetectorName}", detector.DetectorName);
                    }
                }

                await TrySyncReportsAsync(reportQueue, apiReporter, cts.Token);

                await Task.Delay(TimeSpan.FromSeconds(config.ScanIntervalSeconds), cts.Token);
            }
        }
        catch (TaskCanceledException)
        {
            Log.Information("Scan loop canceled.");
        }
        finally
        {
            Logger.Close();
        }
    }

    private static DetectionReport BuildReport(DetectionResult result, AgentSession session, AgentConfig config)
    {
        var autoAction = "none";
        if (result.Confidence >= config.AutoKickThreshold) autoAction = "kick";
        else if (result.Confidence >= config.AutoFlagThreshold) autoAction = "flag";

        var requiresReview = result.Confidence < 0.95f;
        var evidenceJson = JsonSerializer.Serialize(result.Evidence, new JsonSerializerOptions { WriteIndented = false });

        return new DetectionReport(
            Id: Guid.NewGuid().ToString(),
            PlayerId: session.PlayerId,
            MatchId: session.MatchId,
            DetectionType: result.Type.ToString(),
                        Confidence: result.Confidence,
            ReasonCode: result.ReasonCode,
            EvidenceJson: evidenceJson,
            RequiresHumanReview: requiresReview,
            AutoAction: autoAction,
            CreatedAt: DateTime.UtcNow,
            IsSynced: false
        );
    }

    private static void TriggerAutoKick(AgentSession session, DetectionResult result)
    {
        Log.Error("AUTO-KICK TRIGGERED for Player {PlayerId} in Match {MatchId}: {Reason}", session.PlayerId, session.MatchId, result.ReasonCode);
        try
        {
            using var pipeClient = new NamedPipeClientStream(".", "r6ac_agent_ipc", PipeDirection.Out, PipeOptions.Asynchronous);
            pipeClient.Connect(500); // 500ms timeout
            using var writer = new StreamWriter(pipeClient, Encoding.UTF8);
            writer.WriteLine(JsonSerializer.Serialize(new { Action = "KICK", session.PlayerId, session.MatchId, result.ReasonCode }));
            writer.Flush();
        }
        catch
        {
            // Named pipe server might not be active
        }
    }

    private static async Task TrySyncReportsAsync(ReportQueue queue, ApiReporter reporter, CancellationToken ct)
    {
        var pending = await queue.GetPendingAsync();
        if (pending.Count == 0) return;

        Log.Information("Attempting to sync {Count} pending reports to server...", pending.Count);
        await reporter.SyncReports(queue, ct);
    }

    private static string ReadPassword()
    {
        var pass = string.Empty;
        ConsoleKey key;
        do
        {
            var keyInfo = Console.ReadKey(intercept: true);
            key = keyInfo.Key;

            if (key == ConsoleKey.Backspace && pass.Length > 0)
            {
                Console.Write("\b \b");
                pass = pass[0..^1];
            }
            else if (!char.IsControl(keyInfo.KeyChar))
            {
                Console.Write("*");
                pass += keyInfo.KeyChar;
            }
        } while (key != ConsoleKey.Enter);
        Console.WriteLine();
        return pass;
    }
}
