using System;
using System.IO;
using R6AC.Agent.Detectors;

namespace R6AC.Agent.Utils;

public static class AuditLogger
{
    private static readonly object _lock = new object();
    private static string _logDirectory = "logs";
    private static string _logFilePath;

    static AuditLogger()
    {
        if (!Directory.Exists(_logDirectory))
        {
            Directory.CreateDirectory(_logDirectory);
        }
        _logFilePath = Path.Combine(_logDirectory, $"r6ac-audit-{DateTime.UtcNow:yyyyMMdd}.log");
    }

    public static void LogEvent(string component, DetectionSeverity severity, string reason, string additionalContext = "")
    {
        lock (_lock)
        {
            try
            {
                var time = DateTime.UtcNow.ToString("HH:mm:ss");
                var contextStr = string.IsNullOrEmpty(additionalContext) ? "" : $" | {additionalContext}";
                var logLine = $"[AUDIT] {time} | {component} | Severity: {severity} | Reason: {reason}{contextStr}\n";
                File.AppendAllText(_logFilePath, logLine);
            }
            catch
            {
                // Fallback or ignore if write fails to prevent crashing the agent
            }
        }
    }
}
