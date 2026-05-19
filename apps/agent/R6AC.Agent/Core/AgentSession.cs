namespace R6AC.Agent.Core;

/// <summary>
/// اطلاعات نشست فعال ایجنت برای بازیکن و مسابقه جاری.
/// Active agent session information for the current player and match.
/// </summary>
public class AgentSession
{
    public string PlayerId { get; set; } = string.Empty;
    public string MatchId { get; set; } = string.Empty;
    public SessionToken? Token { get; set; }
    public DateTime StartTime { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public string HardwareFingerprint { get; set; } = string.Empty;

    public AgentSession() { }

    public AgentSession(string playerId, string matchId, SessionToken? token, string fingerprint)
    {
        PlayerId = playerId;
        MatchId = matchId;
        Token = token;
        HardwareFingerprint = fingerprint;
        StartTime = DateTime.UtcNow;
        IsActive = true;
    }
}
