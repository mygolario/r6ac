using System.Diagnostics;
using System.Linq;

namespace R6AC.Agent.Core;

public static class GameProcessMonitor
{
    public static bool IsGameRunning(string processName)
    {
        var processes = Process.GetProcesses();
        return processes.Any(p => p.ProcessName.Contains(processName, System.StringComparison.OrdinalIgnoreCase));
    }
}
