using LiteDB;

namespace R6AC.Agent.Reporting;

/// <summary>
/// گزارش تشخیص تقلب برای ارسال به سرور و ذخیره‌سازی محلی.
/// Detection report structure matching API contract and local queue persistence.
/// </summary>
public record DetectionReport(
    [property: BsonId] string Id,
    string PlayerId,
    string MatchId,
    string DetectionType,
    float Confidence,
    string ReasonCode,
    string EvidenceJson,
    bool RequiresHumanReview,
    string AutoAction,
    DateTime CreatedAt,
    bool IsSynced = false
);
