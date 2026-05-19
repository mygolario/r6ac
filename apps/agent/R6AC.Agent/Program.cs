using System.IO.Pipes;
using System.Text;
using System.Text.Json;
using R6AC.Agent.Core;
using R6AC.Agent.Detectors;
using R6AC.Agent.Hardware;
using R6AC.Agent.Integrity;
using R6AC.Agent.Reporting;
using R6AC.Agent.Utils;
using Serilog;

namespace R6AC.Agent;

/// <summary>
/// کلاس اصلی اجرای برنامه و چرخه اسکن دوره‌ای ایجنت کلاینت.
/// Main execution class and periodic scan loop orchestration.
/// </summary>
public class Program
{
    public static async Task Main(string[] args)
    {
        Logger.Initialize();
        Log.Information("R6AC Anti-Cheat Client Agent starting...");

        var cts = new CancellationTokenSource();
        Console.CancelKeyPress += (s, e) =>
        {
            Log.Information("Shutting down R6AC Agent...");
            e.Cancel = true;
            cts.Cancel();
        };

        var config = AgentConfig.Load();
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

        var hwFingerprinter = new HardwareFingerprinter();
        var hwHash = hwFingerprinter.GetFingerprintHash();
        Log.Information("Hardware Fingerprint SHA-256: {HwHash}", hwHash);

        var playerId = args.Length > 0 ? args[0] : "PLAYER_DEFAULT_ID";
        var matchId = args.Length > 1 ? args[1] : "MATCH_DEFAULT_ID";

        var sessionToken = new SessionToken(
            TokenId: Guid.NewGuid().ToString(),
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
            timingAnalyzer
        };

        Log.Information("Initialization complete. Starting monitoring loop (Interval: {Interval}s)...", config.ScanIntervalSeconds);

        try
        {
            while (!cts.Token.IsCancellationRequested)
            {
                Log.Debug("Starting scan cycle...");

                foreach (var detector in detectors)
                {
                    if (cts.Token.IsCancellationRequested) break;

                    try
                    {
                        var result = await detector.ScanAsync(session, cts.Token);
                        if (result != null)
                        {
                            Log.Warning("Detection triggered by {DetectorName}: {ReasonCode} ({Confidence:P0})",
                                detector.DetectorName, result.ReasonCode, result.Confidence);

                            var report = BuildReport(result, session, config);
                            await reportQueue.EnqueueAsync(report);

                            if (result.Confidence >= config.AutoKickThreshold)
                            {
                                TriggerAutoKick(session, result);
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
            // Named pipe server (game/tournament wrapper) might not be active
        }
    }

    private static async Task TrySyncReportsAsync(ReportQueue queue, ApiReporter reporter, CancellationToken ct)
    {
        var pending = await queue.GetPendingAsync();
        if (pending.Count == 0) return;

        Log.Information("Attempting to sync {Count} pending reports to server...", pending.Count);

        foreach (var report in pending)
        {
            if (ct.IsCancellationRequested) break;

            var success = await reporter.SendReportAsync(report, ct);
            if (success)
            {
                await queue.MarkSyncedAsync(report.Id);
            }
        }
    }
}
