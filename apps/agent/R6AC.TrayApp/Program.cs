using System.Windows.Forms;
using R6AC.Agent.Core;

namespace R6AC.TrayApp;

public static class Program
{
    [STAThread]
    public static async Task Main(string[] args)
    {
        // CLI helper for installer build
        if (args.Length >= 2 && args[0] == "--generate-icon")
        {
            var path = args[1];
            IconHelper.SaveDefaultIcon(path);
            return;
        }

        ApplicationConfiguration.Initialize();

        var config = AgentConfig.Load("agent-config.json");
        var service = new AgentService(config);

        var initRes = await service.InitializeAsync();
        if (!initRes.Success)
        {
            MessageBox.Show(initRes.Message, "R6AC Anti-Cheat Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        service.StartMonitoring();

        var context = new TrayContext(service);
        Application.Run(context);
    }
}
