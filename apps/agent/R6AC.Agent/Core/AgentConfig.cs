using System.Text.Json;
using System.Text.Json.Serialization;

namespace R6AC.Agent.Core;

public class DetectionConfig
{
    [JsonPropertyName("processDetection")] public bool ProcessDetection { get; set; } = true;
    [JsonPropertyName("windowDetection")] public bool WindowDetection { get; set; } = true;
    [JsonPropertyName("usbDetection")] public bool UsbDetection { get; set; } = true;
    [JsonPropertyName("networkDetection")] public bool NetworkDetection { get; set; } = true;
    [JsonPropertyName("driverDetection")] public bool DriverDetection { get; set; } = true;
    [JsonPropertyName("behavioralDetection")] public bool BehavioralDetection { get; set; } = true;
    [JsonPropertyName("gameIntegrityCheck")] public bool GameIntegrityCheck { get; set; } = true;
    [JsonPropertyName("selfIntegrityCheck")] public bool SelfIntegrityCheck { get; set; } = true;
}

public class ThresholdsConfig
{
    [JsonPropertyName("autoFlagConfidence")] public float AutoFlagConfidence { get; set; } = 0.75f;
    [JsonPropertyName("autoKickConfidence")] public float AutoKickConfidence { get; set; } = 0.92f;
    [JsonPropertyName("behavioralWindowSeconds")] public int BehavioralWindowSeconds { get; set; } = 10;
    [JsonPropertyName("maxStraightLinePercent")] public int MaxStraightLinePercent { get; set; } = 40;
    [JsonPropertyName("triggerBotMaxStdDevMs")] public double TriggerBotMaxStdDevMs { get; set; } = 5.0;
}

public class ElectroLanConfig
{
    [JsonPropertyName("whitelistedAdapterPrefixes")] public List<string> WhitelistedAdapterPrefixes { get; set; } = new() { "ElectroLAN", "TAP-Windows" };
}

public class BehavioralWeightsConfig
{
    [JsonPropertyName("aimSnapFrequency")] public float AimSnapFrequency { get; set; } = 0.15f;
    [JsonPropertyName("trackingSmoothness")] public float TrackingSmoothness { get; set; } = 0.15f;
    [JsonPropertyName("clickReactionTimeMs")] public float ClickReactionTimeMs { get; set; } = 0.10f;
    [JsonPropertyName("clickReactionStdDev")] public float ClickReactionStdDev { get; set; } = 0.12f;
    [JsonPropertyName("noRecoilScore")] public float NoRecoilScore { get; set; } = 0.12f;
    [JsonPropertyName("macroConsistencyScore")] public float MacroConsistencyScore { get; set; } = 0.08f;
    [JsonPropertyName("hardwareAnomalyScore")] public float HardwareAnomalyScore { get; set; } = 0.18f;
    [JsonPropertyName("dmaIndicatorPresent")] public float DmaIndicatorPresent { get; set; } = 0.10f;
}

public class BehavioralConfig
{
    [JsonPropertyName("sessionAnalysisIntervalMinutes")] public int SessionAnalysisIntervalMinutes { get; set; } = 5;
    [JsonPropertyName("mouseBufferSizeSeconds")] public int MouseBufferSizeSeconds { get; set; } = 30;
    [JsonPropertyName("noRecoilStdDevThresholdClean")] public double NoRecoilStdDevThresholdClean { get; set; } = 5.0;
    [JsonPropertyName("noRecoilStdDevThresholdCheat")] public double NoRecoilStdDevThresholdCheat { get; set; } = 2.0;
    [JsonPropertyName("triggerbotMaxStdDevMs")] public double TriggerbotMaxStdDevMs { get; set; } = 5.0;
    [JsonPropertyName("triggerbotMinSamples")] public int TriggerbotMinSamples { get; set; } = 10;
    [JsonPropertyName("macroIntervalVarianceMs")] public double MacroIntervalVarianceMs { get; set; } = 2.0;
    [JsonPropertyName("weights")] public BehavioralWeightsConfig Weights { get; set; } = new();
}

/// <summary>
/// تنظیمات اصلی ایجنت کلاینت آنتی‌چیت.
/// Main configuration for the anti-cheat client agent.
/// </summary>
public class AgentConfig
{
    [JsonPropertyName("version")] public string Version { get; set; } = "1.0.0";
    [JsonPropertyName("apiBaseUrl")] public string ApiBaseUrl { get; set; } = "https://api.r6ac.ir";
    [JsonPropertyName("scanIntervalSeconds")] public int ScanIntervalSeconds { get; set; } = 5;
    [JsonPropertyName("reportSyncIntervalSeconds")] public int ReportSyncIntervalSeconds { get; set; } = 30;
    [JsonPropertyName("offlineMode")] public bool OfflineMode { get; set; } = true;
    [JsonPropertyName("language")] public string Language { get; set; } = "fa";

    [JsonPropertyName("detection")] public DetectionConfig Detection { get; set; } = new();
    [JsonPropertyName("thresholds")] public ThresholdsConfig Thresholds { get; set; } = new();
    [JsonPropertyName("electroLan")] public ElectroLanConfig ElectroLan { get; set; } = new();
    [JsonPropertyName("behavioral")] public BehavioralConfig Behavioral { get; set; } = new();

    // Legacy or internal properties
    [JsonIgnore] public string ServiceToken { get; set; } = string.Empty;
    [JsonIgnore] public string LocalQueuePath { get; set; } = "r6ac_queue.db";
    [JsonIgnore] public string ExpectedSelfHash { get; set; } = string.Empty;
    [JsonIgnore] public string ExpectedGameHash { get; set; } = string.Empty;

    [JsonIgnore]
    public float AutoFlagThreshold
    {
        get => Thresholds.AutoFlagConfidence;
        set => Thresholds.AutoFlagConfidence = value;
    }

    [JsonIgnore]
    public float AutoKickThreshold
    {
        get => Thresholds.AutoKickConfidence;
        set => Thresholds.AutoKickConfidence = value;
    }

    /// <summary>
    /// بارگذاری تنظیمات از فایل JSON. در صورت عدم وجود، فایل پیش‌فرض ایجاد می‌شود.
    /// Load configuration from a JSON file. If not found, creates default.
    /// </summary>
    public static AgentConfig Load(string path = "agent-config.json")
    {
        if (!File.Exists(path))
        {
            var defaultConfig = new AgentConfig();
            try
            {
                var json = JsonSerializer.Serialize(defaultConfig, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(path, json);
            }
            catch
            {
                // Fallback to in-memory default if write permissions are restricted
            }
            return defaultConfig;
        }

        try
        {
            var content = File.ReadAllText(path);
            var config = JsonSerializer.Deserialize<AgentConfig>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return config ?? new AgentConfig();
        }
        catch
        {
            return new AgentConfig();
        }
    }
}
