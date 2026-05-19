namespace R6AC.Agent.Behavioral;

/// <summary>
/// ویژگی‌های استخراج‌شده از سشن جهت تغذیه به موتور امتیازدهی رفتاری و یادگیری ماشین.
/// Extracted numerical features from a match session for behavioral ML scoring.
/// </summary>
public record BehavioralFeatures(
    // Mouse features
    float AimSnapFrequency,        // How often aim moves >90deg in <50ms
    float TrackingSmoothness,      // StdDev of aim velocity (lower = suspicious)
    float ClickReactionTimeMs,     // Avg ms from target-acquire to click
    float ClickReactionStdDev,     // StdDev of reaction times
    float NoRecoilScore,           // 0-1, higher = more consistent compensation
    
    // Keyboard features  
    float MacroConsistencyScore,   // 0-1, higher = more macro-like
    float KeyIntervalStdDev,       // StdDev of repeated key intervals (ms)
    
    // Hardware features
    float HardwareAnomalyScore,    // 0-1 aggregated from hardware detectors
    int SuspiciousUsbCount,        // Count of suspicious USB devices
    bool DmaIndicatorPresent,      // Any DMA pattern seen this session
    
    // Session context
    float SessionDurationMinutes,
    int TotalDetectionEvents,
    float KernelReportConfidenceAvg  // Avg confidence of kernel-level reports
);

/// <summary>
/// استخراج‌کننده ویژگی‌های عددی از رویدادها و داده‌های خام سشن.
/// Feature extractor converting raw session events into standardized numerical feature vectors.
/// </summary>
public class FeatureExtractor
{
    /// <summary>
    /// تولید بردار ویژگی پیش‌فرض برای سشن‌های خالی یا ابتدایی.
    /// Default clean feature vector for empty or initial sessions.
    /// </summary>
    public static BehavioralFeatures GetDefaultFeatures()
    {
        return new BehavioralFeatures(
            AimSnapFrequency: 0.0f,
            TrackingSmoothness: 100.0f,
            ClickReactionTimeMs: 220.0f,
            ClickReactionStdDev: 35.0f,
            NoRecoilScore: 0.1f,
            MacroConsistencyScore: 0.1f,
            KeyIntervalStdDev: 45.0f,
            HardwareAnomalyScore: 0.0f,
            SuspiciousUsbCount: 0,
            DmaIndicatorPresent: false,
            SessionDurationMinutes: 1.0f,
            TotalDetectionEvents: 0,
            KernelReportConfidenceAvg: 0.0f
        );
    }
}
