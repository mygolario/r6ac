namespace R6AC.Agent.Core;

/// <summary>
/// توکن نشست مسابقه که پیش از شروع مسابقه صادر شده است.
/// The tournament match session token pre-issued before match start.
/// </summary>
public record SessionToken(
    string TokenId,
    string PlayerId,
    string MatchId,
    DateTime IssuedAt,
    DateTime ExpiresAt,
    string Signature
);
