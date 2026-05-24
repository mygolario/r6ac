using System;
using System.Collections.Generic;
using R6AC.Agent.Detectors;

namespace R6AC.Agent.Core;

public class DetectionCooldown
{
    // Once a detection type fires for a player, don't re-fire for this duration
    private static readonly Dictionary<DetectionType, TimeSpan> Cooldowns = new()
    {
        { DetectionType.FORBIDDEN_PROCESS, TimeSpan.FromMinutes(10) },
        { DetectionType.ARDUINO_DETECTED, TimeSpan.FromMinutes(15) },
        { DetectionType.DUAL_PC_STREAM, TimeSpan.FromMinutes(10) },
        { DetectionType.MACRO_TIMING, TimeSpan.FromMinutes(5) },
        { DetectionType.FORBIDDEN_DRIVER, TimeSpan.FromMinutes(2) },  // DMA = urgent, short cooldown
        { DetectionType.KMBOX_DETECTED, TimeSpan.FromMinutes(2) },
        { DetectionType.SESSION_ANOMALY, TimeSpan.FromMinutes(3) },
    };

    private readonly Dictionary<(string playerId, DetectionType type), DateTime> _lastFired = new();

    public bool IsOnCooldown(string playerId, DetectionType type)
    {
        var key = (playerId, type);
        if (!_lastFired.TryGetValue(key, out var lastTime)) return false;
        var cooldown = Cooldowns.GetValueOrDefault(type, TimeSpan.FromMinutes(5));
        return DateTime.UtcNow - lastTime < cooldown;
    }

    public void RecordFired(string playerId, DetectionType type)
    {
        _lastFired[(playerId, type)] = DateTime.UtcNow;
    }
}
