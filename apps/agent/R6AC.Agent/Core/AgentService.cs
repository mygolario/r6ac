using System.Text;
using System.Text.Json;
using System.IO.Pipes;
using R6AC.Agent.Behavioral;
using R6AC.Agent.Detectors;
using R6AC.Agent.Hardware;
using R6AC.Agent.Integrity;
using R6AC.Agent.Kernel;
using R6AC.Agent.Reporting;
using R6AC.Agent.Utils;
using Serilog;

namespace R6AC.Agent.Core;

public class AgentService
{
    private readonly AgentConfig _config;
    private readonly CancellationTokenSource _cts = new();
    private AgentSession? _session;
    private ReportQueue? _reportQueue;
    private ApiReporter? _apiReporter;
    private KernelBridge? _kernelBridge;
    private SessionAnalyzer? _sessionAnalyzer;
    private DateTime _lastSessionAnalysisTime = DateTime.UtcNow;
    private List<IDetector> _detectors = new();

    public event EventHandler<DetectionReport>? OnDetectionTriggered;
    public event EventHandler<string>? OnStatusChanged;

    public string CurrentState { get; private set; } = "CLEAN"; // CLEAN, WARNING, ALERT
    public int DetectionCount { get; private set; } = 0;
    public DateTime LastSyncTime { get; private set; } = DateTime.MinValue;
    public string FingerprintHash { get; private set; } = "UNKNOWN";

    public AgentConfig Config => _config;
    public AgentSession? Session => _session;
    public ReportQueue? ReportQueue => _reportQueue;

    public AgentService(AgentConfig config)
    {
        _config = config;
    }

    public async Task<(bool Success, string Message)> InitializeAsync(string playerId = "PLAYER_1", string matchId = "MATCH_1234")
    {
        await Task.Yield();
        try
        {
            Logger.Initialize();
            Log.Information("Initializing AgentService...");

            var integrityCheck = SelfIntegrityCheck.Verify(_config);
            if (!integrityCheck.IsIntact)
            {
                var msg = "Self-integrity check failed! Tampering or debugger detected.";
                Log.Fatal(msg);
                return (false, msg);
            }

            var hwFingerprinter = new HardwareFingerprinter();
            FingerprintHash = hwFingerprinter.GetFingerprintHash();

            var token = new SessionToken(
                TokenId: Guid.NewGuid().ToString(),
                PlayerId: playerId,
                MatchId: matchId,
                IssuedAt: DateTime.UtcNow,
                ExpiresAt: DateTime.UtcNow.AddHours(4),
                Signature: "SECURE_SIG"
            );

            _session = new AgentSession(playerId, matchId, token, FingerprintHash);
            _reportQueue = new ReportQueue(_config.LocalQueuePath);
            _apiReporter = new ApiReporter(_config);
            _sessionAnalyzer = new SessionAnalyzer(_config, playerId, matchId);
            _lastSessionAnalysisTime = DateTime.UtcNow;

            if (_config.Detection.ProcessDetection) _detectors.Add(new ProcessDetector());
            if (_config.Detection.WindowDetection) _detectors.Add(new WindowDetector());
            if (_config.Detection.UsbDetection) _detectors.Add(new InputDeviceDetector());
            if (_config.Detection.NetworkDetection) _detectors.Add(new NetworkInterfaceDetector());
            if (_config.Detection.DriverDetection) _detectors.Add(new DriverDetector());
            if (_config.Detection.BehavioralDetection) _detectors.Add(new BehavioralDetector());
            if (_config.Detection.GameIntegrityCheck) _detectors.Add(new GameIntegrityCheck(_config));

            // Advanced Phase 4 Detectors
            _detectors.Add(new AdvancedUsbDetector());
            _detectors.Add(new DualPcDetector());
            _detectors.Add(new SpoofDetector());

            var timingAnalyzer = new InputTimingAnalyzer();
            timingAnalyzer.StartBackgroundHook();
            _detectors.Add(timingAnalyzer);

            return (true, "Agent initialized successfully.");
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Error initializing AgentService.");
            return (false, ex.Message);
        }
    }

    public void StartMonitoring()
    {
        _kernelBridge = new KernelBridge();
        if (_kernelBridge.Connect())
        {
            Log.Information("Connected to R6AC Kernel Driver successfully.");
            // Find game PID if already running
            var gameProc = System.Diagnostics.Process.GetProcessesByName("RainbowSix").FirstOrDefault();
            if (gameProc != null)
            {
                _kernelBridge.SetGamePid((uint)gameProc.Id);
            }
        }
        else
        {
            Log.Warning("Failed to connect to R6AC Kernel Driver. Running in user-mode only degradation.");
        }

        Task.Run(async () => await MonitoringLoopAsync(_cts.Token));
        Task.Run(async () => await SyncLoopAsync(_cts.Token));
    }

    public void StopMonitoring()
    {
        _cts.Cancel();
        _kernelBridge?.Dispose();
        Logger.Close();
    }

    public async Task<bool> SyncNowAsync()
    {
        if (_reportQueue == null || _apiReporter == null) return false;
        try
        {
            var pending = await _reportQueue.GetPendingAsync();
            if (pending.Count == 0) return true;

            bool allSynced = true;
            foreach (var report in pending)
            {
                var success = await _apiReporter.SendReportAsync(report, CancellationToken.None);
                if (success)
                {
                    await _reportQueue.MarkSyncedAsync(report.Id);
                }
                else
                {
                    allSynced = false;
                }
            }
            LastSyncTime = DateTime.Now;
            OnStatusChanged?.Invoke(this, "SYNCED");
            return allSynced;
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Manual sync failed.");
            return false;
        }
    }

    private async Task MonitoringLoopAsync(CancellationToken ct)
    {
        if (_session == null || _reportQueue == null) return;

        while (!ct.IsCancellationRequested)
        {
            // 1. Poll Kernel Reports
            if (_kernelBridge != null)
            {
                try
                {
                    var kernelReports = _kernelBridge.GetPendingReports();
                    foreach (var kRep in kernelReports)
                    {
                        Log.Warning("Detection by KernelDriver: {Reason} ({Confidence:P0})", kRep.ReasonCode, kRep.Confidence);
                        DetectionCount++;

                        var autoAction = "none";
                        if (kRep.Confidence >= _config.Thresholds.AutoKickConfidence) autoAction = "kick";
                        else if (kRep.Confidence >= _config.Thresholds.AutoFlagConfidence) autoAction = "flag";

                        var evidenceJson = JsonSerializer.Serialize(new { kRep.ReportId, kRep.DetectionType, kRep.ProcessId, kRep.ProcessName });
                        var report = new DetectionReport(
                            Id: Guid.NewGuid().ToString(),
                            PlayerId: _session.PlayerId,
                            MatchId: _session.MatchId,
                            DetectionType: "KERNEL_" + kRep.DetectionType.ToString().ToUpper(),
                            Confidence: kRep.Confidence,
                            ReasonCode: kRep.ReasonCode,
                            EvidenceJson: evidenceJson,
                            RequiresHumanReview: kRep.Confidence < 0.95f,
                            AutoAction: autoAction,
                            CreatedAt: kRep.Timestamp.ToUniversalTime(),
                            IsSynced: false
                        );

                        await _reportQueue.EnqueueAsync(report);
                        _sessionAnalyzer?.RecordHardwareEvent(report);

                        if (kRep.Confidence >= _config.Thresholds.AutoKickConfidence)
                        {
                            CurrentState = "ALERT";
                            var dRes = new DetectionResult(
                                DetectionType.GAME_TAMPERING,
                                kRep.Confidence,
                                kRep.ReasonCode,
                                "Kernel Driver Protected Memory Anomaly Detected",
                                "تشخیص ناهنجاری حافظه محافظت شده توسط درایور سطح کرنل",
                                new Dictionary<string, object> { ["ReportId"] = kRep.ReportId }
                            );
                            TriggerAutoKick(_session, dRes);
                        }
                        else if (kRep.Confidence >= _config.Thresholds.AutoFlagConfidence && CurrentState != "ALERT")
                        {
                            CurrentState = "WARNING";
                        }

                        OnDetectionTriggered?.Invoke(this, report);
                        OnStatusChanged?.Invoke(this, CurrentState);
                    }
                }
                catch (Exception ex)
                {
                    Log.Error(ex, "Error polling KernelBridge");
                }
            }

            // 2. Poll User-Mode Detectors
            foreach (var detector in _detectors)
            {
                if (ct.IsCancellationRequested) break;

                try
                {
                    var result = await detector.ScanAsync(_session, ct);
                    if (result != null)
                    {
                        Log.Warning("Detection by {Detector}: {Reason} ({Confidence:P0})",
                            detector.DetectorName, result.ReasonCode, result.Confidence);

                        DetectionCount++;

                        var autoAction = "none";
                        if (result.Confidence >= _config.Thresholds.AutoKickConfidence) autoAction = "kick";
                        else if (result.Confidence >= _config.Thresholds.AutoFlagConfidence) autoAction = "flag";

                        var requiresReview = result.Confidence < 0.95f;
                        var evidenceJson = JsonSerializer.Serialize(result.Evidence, new JsonSerializerOptions { WriteIndented = false });

                        var report = new DetectionReport(
                            Id: Guid.NewGuid().ToString(),
                            PlayerId: _session.PlayerId,
                            MatchId: _session.MatchId,
                            DetectionType: result.Type.ToString(),
                            Confidence: result.Confidence,
                            ReasonCode: result.ReasonCode,
                            EvidenceJson: evidenceJson,
                            RequiresHumanReview: requiresReview,
                            AutoAction: autoAction,
                            CreatedAt: DateTime.UtcNow,
                            IsSynced: false
                        );

                        await _reportQueue.EnqueueAsync(report);
                        _sessionAnalyzer?.RecordHardwareEvent(report);

                        if (result.Confidence >= _config.Thresholds.AutoKickConfidence)
                        {
                            CurrentState = "ALERT";
                            TriggerAutoKick(_session, result);
                        }
                        else if (result.Confidence >= _config.Thresholds.AutoFlagConfidence && CurrentState != "ALERT")
                        {
                            CurrentState = "WARNING";
                        }

                        OnDetectionTriggered?.Invoke(this, report);
                        OnStatusChanged?.Invoke(this, CurrentState);
                    }
                }
                catch (Exception ex)
                {
                    Log.Error(ex, "Error running detector {Name}", detector.DetectorName);
                }
            }

            if ((DateTime.UtcNow - _lastSessionAnalysisTime).TotalMinutes >= (_config.Behavioral?.SessionAnalysisIntervalMinutes ?? 5))
            {
                await RunSessionAnalysisAsync();
            }

            await Task.Delay(TimeSpan.FromSeconds(_config.ScanIntervalSeconds), ct);
        }
    }

    public async Task RunSessionAnalysisAsync()
    {
        if (_sessionAnalyzer == null || _session == null || _reportQueue == null) return;
        try
        {
            var verdict = _sessionAnalyzer.Analyze();
            _lastSessionAnalysisTime = DateTime.UtcNow;
            Log.Information("Session Analysis complete. Verdict: {Verdict} (Score: {Score:F2})", verdict.Verdict, verdict.FinalScore);

            if (verdict.Verdict == VerdictLevel.FLAGGED || verdict.Verdict == VerdictLevel.KICKED)
            {
                var evidenceJson = JsonSerializer.Serialize(new
                {
                    verdict.FinalScore,
                    verdict.Verdict,
                    verdict.Features,
                    verdict.TopReasons
                });

                var autoAction = verdict.Verdict == VerdictLevel.KICKED ? "kick" : "flag";
                var report = new DetectionReport(
                    Id: Guid.NewGuid().ToString(),
                    PlayerId: _session.PlayerId,
                    MatchId: _session.MatchId,
                    DetectionType: "SESSION_ANOMALY",
                    Confidence: verdict.FinalScore,
                    ReasonCode: "BEHAVIORAL_ML_VERDICT_" + verdict.Verdict,
                    EvidenceJson: evidenceJson,
                    RequiresHumanReview: verdict.Verdict != VerdictLevel.KICKED,
                    AutoAction: autoAction,
                    CreatedAt: DateTime.UtcNow,
                    IsSynced: false
                );

                await _reportQueue.EnqueueAsync(report);

                if (verdict.Verdict == VerdictLevel.KICKED)
                {
                    CurrentState = "ALERT";
                    var dRes = new DetectionResult(
                        DetectionType.SESSION_ANOMALY,
                        verdict.FinalScore,
                        "BEHAVIORAL_ML_VERDICT_KICKED",
                        "Behavioral ML Engine triggered automatic match kick.",
                        "موتور هوش مصنوعی رفتاری دستور اخراج خودکار از مسابقه را صادر کرد.",
                        new Dictionary<string, object> { ["Score"] = verdict.FinalScore }
                    );
                    TriggerAutoKick(_session, dRes);
                }
                else if (CurrentState != "ALERT")
                {
                    CurrentState = "WARNING";
                }

                OnDetectionTriggered?.Invoke(this, report);
                OnStatusChanged?.Invoke(this, CurrentState);
            }
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Error running session analysis.");
        }
    }

    private async Task SyncLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromSeconds(_config.ReportSyncIntervalSeconds), ct);
            if (ct.IsCancellationRequested) break;
            await SyncNowAsync();
        }
    }

    private static void TriggerAutoKick(AgentSession session, DetectionResult result)
    {
        try
        {
            using var pipeClient = new NamedPipeClientStream(".", "r6ac_agent_ipc", PipeDirection.Out, PipeOptions.Asynchronous);
            pipeClient.Connect(500);
            using var writer = new StreamWriter(pipeClient, Encoding.UTF8);
            writer.WriteLine(JsonSerializer.Serialize(new { Action = "KICK", session.PlayerId, session.MatchId, result.ReasonCode }));
            writer.Flush();
        }
        catch { }
    }
}
