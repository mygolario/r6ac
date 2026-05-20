using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using R6AC.Agent.Behavioral;
using R6AC.Agent.Core;
using R6AC.Agent.Detectors;
using R6AC.Agent.Hardware;
using R6AC.Agent.Integrity;
using R6AC.Agent.Reporting;
using R6AC.Agent.Security;
using R6AC.Agent.Update;
using R6AC.Agent.Utils;
using Xunit;

namespace R6AC.Agent.Tests.SmokeTests;

public class AgentStartupSmokeTest
{
    public AgentStartupSmokeTest()
    {
        SelfIntegrityCheck.IgnoreExitForTests = true;
        UpdateService.IgnoreExitForTests = true;
    }

    [Fact]
    public async Task Detector_Initialization_Success()
    {
        // 1. UsbDeviceScanner
        var scanner = new UsbDeviceScanner();
        var usbRes = scanner.ScanForSuspiciousHardware(); // should run without throwing

        // 2. InputTimingAnalyzer
        var analyzer = new InputTimingAnalyzer();
        analyzer.FeedTestingData(new List<MouseDelta>(), new List<ClickReaction>(), new List<KeyInterval>());

        // 3. DualPcDetector
        var dualPc = new DualPcDetector();
        dualPc.FeedTestingData(new List<DisplayAdapterInfo>(), new List<string>());

        // 4. AdvancedUsbDetector
        var advUsb = new AdvancedUsbDetector();
        advUsb.FeedTestingDevices(new List<AdvancedHidInfo>());

        // 5. SpoofDetector
        var spoof = new SpoofDetector();
        spoof.FeedTestingData("S1", "S1", "S1", "M1", "M1", "M1", "SB1");

        var session = new AgentSession("P1", "M1", new SessionToken("T1", "P1", "M1", DateTime.UtcNow, DateTime.UtcNow.AddHours(1), "SIG"), "HASH");

        // Validate execution of scans
        var scan1 = await analyzer.ScanAsync(session, CancellationToken.None);
        var scan2 = await dualPc.ScanAsync(session, CancellationToken.None);
        var scan3 = await advUsb.ScanAsync(session, CancellationToken.None);
        var scan4 = await spoof.ScanAsync(session, CancellationToken.None);

        Assert.Null(scan1);
        Assert.Null(scan2);
        Assert.Null(scan3);
        Assert.Null(scan4);
    }

    [Fact]
    public void Config_Load_Validation()
    {
        var tempFile = Path.Combine(Path.GetTempPath(), $"temp_config_{Guid.NewGuid()}.json");
        try
        {
            var configData = new AgentConfig
            {
                Version = "2.1.0",
                ApiBaseUrl = "https://api-test.r6ac.ir",
                ScanIntervalSeconds = 15,
                OfflineMode = false
            };

            var json = JsonSerializer.Serialize(configData, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(tempFile, json);

            var loaded = AgentConfig.Load(tempFile);

            Assert.Equal("2.1.0", loaded.Version);
            Assert.Equal("https://api-test.r6ac.ir", loaded.ApiBaseUrl);
            Assert.Equal(15, loaded.ScanIntervalSeconds);
            Assert.False(loaded.OfflineMode);
        }
        finally
        {
            if (File.Exists(tempFile)) File.Delete(tempFile);
        }
    }

    [Fact]
    public async Task Offline_Queue_Persistence()
    {
        var dbPath = Path.Combine(Path.GetTempPath(), $"smoke_queue_{Guid.NewGuid()}.db");
        var queue = new ReportQueue(dbPath);

        var report = new DetectionReport(
            Id: Guid.NewGuid().ToString(),
            PlayerId: "PlayerSmoke",
            MatchId: "MatchSmoke",
            DetectionType: "HWID_SPOOF",
            Confidence: 0.96f,
            ReasonCode: "SMOKE_TEST",
            EvidenceJson: "{}",
            RequiresHumanReview: false,
            AutoAction: "flag",
            CreatedAt: DateTime.UtcNow,
            IsSynced: false
        );

        try
        {
            await queue.EnqueueAsync(report);

            var pending = await queue.GetPendingAsync();
            Assert.Single(pending);
            Assert.Equal(report.Id, pending[0].Id);
            Assert.Equal("HWID_SPOOF", pending[0].DetectionType);

            await queue.MarkSyncedAsync(report.Id);
            var pendingAfter = await queue.GetPendingAsync();
            Assert.Empty(pendingAfter);
        }
        finally
        {
            if (File.Exists(dbPath)) File.Delete(dbPath);
        }
    }

    [Fact]
    public void Hardware_Fingerprint_Consistency()
    {
        var fingerprinter = new MockHardwareFingerprinter("CPU_SMOKE_123", "MB_SMOKE_456", "BIOS_SMOKE_789", "DISK_SMOKE_101", "11:22:33:44:55:66");
        var hash1 = fingerprinter.GetFingerprintHash();
        var hash2 = fingerprinter.GetFingerprintHash();

        Assert.NotNull(hash1);
        Assert.Equal(64, hash1.Length);
        Assert.Equal(hash1, hash2);
    }

    [Fact]
    public void Scoring_Engine_Bounds()
    {
        var config = new AgentConfig();
        var engine = new ScoringEngine(config);

        var features = new BehavioralFeatures(
            AimSnapFrequency: 2.5f,
            TrackingSmoothness: 25.0f,
            ClickReactionTimeMs: 150.0f,
            ClickReactionStdDev: 12.0f,
            NoRecoilScore: 0.50f,
            MacroConsistencyScore: 0.40f,
            KeyIntervalStdDev: 15.0f,
            HardwareAnomalyScore: 0.20f,
            SuspiciousUsbCount: 0,
            DmaIndicatorPresent: false,
            SessionDurationMinutes: 15.0f,
            TotalDetectionEvents: 1,
            KernelReportConfidenceAvg: 0.30f
        );

        float score = engine.ComputeScore(features);
        Assert.True(score >= 0.0f && score <= 1.0f, $"Score {score} should be bounded between 0.0 and 1.0");
    }

    [Fact]
    public void StringVault_Decryption()
    {
        var url = StringVault.Get(VaultKey.ApiBaseUrl);
        Assert.NotNull(url);
        Assert.True(url.Contains("r6ac", StringComparison.OrdinalIgnoreCase) || url.Contains("localhost", StringComparison.OrdinalIgnoreCase));

        var hmacKey = StringVault.Get(VaultKey.ManifestHmacKey);
        Assert.NotNull(hmacKey);
        Assert.NotEmpty(hmacKey);
    }

    [Fact]
    public void AntiDebug_Hardening()
    {
        // Set mock debugger state to verify checks run stably
        AntiDebug.SetMockDebuggerPresent(false);
        var res = AntiDebug.RunAllChecks();
        Assert.NotNull(res);
        Assert.False(res.IsDebuggerPresent);
    }

    [Fact]
    public void SessionAnalyzer_Verdict()
    {
        // Validate clean behavior
        var detector = new BehavioralDetector();
        var points = new List<MousePoint>
        {
            new(100, 200, 1000), new(115, 205, 1050), new(120, 230, 1100),
            new(110, 250, 1150), new(90, 240, 1200)
        };

        detector.FeedSyntheticData(points, new List<long>());
        var res = detector.AnalyzeBuffer();

        Assert.Null(res); // human random movement should yield a clean (null) verdict
    }
}
