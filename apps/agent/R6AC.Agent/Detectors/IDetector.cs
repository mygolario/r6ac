using R6AC.Agent.Core;

namespace R6AC.Agent.Detectors;

/// <summary>
/// انواع تقلب‌ها و ناهنجاری‌های قابل تشخیص در سیستم.
/// Detection categories for identifiable cheats and anomalies.
/// </summary>
public enum DetectionType
{
    AIMBOT,
    WALLHACK,
    RADAR_HACK,
    TRIGGERBOT,
    DUAL_PC_STREAM,
    MACRO_TIMING,
    SUSPICIOUS_HARDWARE,
    FORBIDDEN_PROCESS,
    FORBIDDEN_DRIVER,
    FORBIDDEN_NETWORK,
    GAME_TAMPERING,
    KMBOX_DETECTED,
    ARDUINO_DETECTED,
    DUAL_PC_PATTERN,
    HWID_SPOOF,
    NO_RECOIL,
    SESSION_ANOMALY
}

/// <summary>
/// نتیجه اسکن یک ماژول تشخیص در صورت یافتن تقلب یا ناهنجاری.
/// Result of a detection scan when cheating or anomaly is found.
/// </summary>
public record DetectionResult(
    DetectionType Type,
    float Confidence,
    string ReasonCode,
    string Description,
    string DescriptionFA,
    Dictionary<string, object> Evidence
);

/// <summary>
/// رابط استاندارد ماژول‌های اسکنر و تشخیص‌دهنده.
/// Standard interface for scanner and detector modules.
/// </summary>
public interface IDetector
{
    string DetectorName { get; }
    DetectionType DetectionType { get; }
    Task<DetectionResult?> ScanAsync(AgentSession session, CancellationToken ct);
}
