using System.Drawing;
using System.Windows.Forms;
using R6AC.Agent.Core;
using R6AC.Agent.Reporting;

namespace R6AC.TrayApp;

public class TrayContext : ApplicationContext
{
    private readonly AgentService _agentService;
    private readonly NotifyIcon _notifyIcon;
    private readonly ContextMenuStrip _contextMenu;
    private bool _isFa = true;

    private StatusForm? _statusForm;
    private LogForm? _logForm;

    private ToolStripItem? _itemHeader;
    private ToolStripItem? _itemStatus;
    private ToolStripItem? _itemSession;
    private ToolStripItem? _itemPlayer;
    private ToolStripItem? _itemViewLog;
    private ToolStripItem? _itemSync;
    private ToolStripItem? _itemLanguage;
    private ToolStripItem? _itemExit;

    private readonly Dictionary<string, string> _stringsFa = new()
    {
        { "Header", "سیستم ضد تقلب R6AC (نسخه ۱.۰.۰)" },
        { "Status_Clean", "وضعیت: ✅ عادی و پاک" },
        { "Status_Warning", "وضعیت: ⚠️ هشدار (بررسی مجدد)" },
        { "Status_Alert", "وضعیت: 🔴 خطر (شناسایی تقلب)" },
        { "Session_None", "مسابقه: بدون مسابقه فعال" },
        { "Player_None", "بازیکن: ثبت‌نام نشده" },
        { "View_Log", "📋 مشاهده لاگ گزارش‌ها" },
        { "Sync_Now", "🔄 همگام‌سازی فوری گزارش‌ها" },
        { "Language", "🌐 زبان: English" },
        { "Exit", "❌ خروج از آنتی‌چیت" },
        { "Exit_Confirm", "آیا برای خروج از سیستم آنتی‌چیت اطمینان دارید؟" },
        { "Confirm_Title", "تایید خروج" },
        { "Toast_Alert", "⚠️ رفتار مشکوک شناسایی شد" },
        { "Syncing", "در حال همگام‌سازی گزارش‌ها..." },
        { "Sync_Done", "همگام‌سازی با موفقیت انجام شد." }
    };

    private readonly Dictionary<string, string> _stringsEn = new()
    {
        { "Header", "R6AC Anti-Cheat (v1.0.0)" },
        { "Status_Clean", "Status: ✅ Clean" },
        { "Status_Warning", "Status: ⚠️ Warning (Pending Review)" },
        { "Status_Alert", "Status: 🔴 Alert (Flagged/Kicked)" },
        { "Session_None", "Session: No active session" },
        { "Player_None", "Player: Not registered" },
        { "View_Log", "📋 View Report Log" },
        { "Sync_Now", "🔄 Sync Reports Now" },
        { "Language", "🌐 Language: فارسی" },
        { "Exit", "❌ Exit R6AC Agent" },
        { "Exit_Confirm", "Are you sure you want to exit R6AC Agent?" },
        { "Confirm_Title", "Confirm Exit" },
        { "Toast_Alert", "⚠️ Suspicious activity detected" },
        { "Syncing", "Syncing detection reports..." },
        { "Sync_Done", "Reports synced successfully." }
    };

    private Dictionary<string, string> CurrentStrings => _isFa ? _stringsFa : _stringsEn;

    public TrayContext(AgentService agentService)
    {
        _agentService = agentService;
        _contextMenu = new ContextMenuStrip();
        _contextMenu.Font = new Font("Segoe UI", 10F, FontStyle.Regular, GraphicsUnit.Point);

        BuildContextMenu();

        _notifyIcon = new NotifyIcon
        {
            Icon = IconHelper.CreateStateIcon("CLEAN"),
            ContextMenuStrip = _contextMenu,
            Visible = true,
            Text = "R6AC Anti-Cheat"
        };

        _notifyIcon.DoubleClick += NotifyIcon_DoubleClick;

        _agentService.OnDetectionTriggered += AgentService_OnDetectionTriggered;
        _agentService.OnStatusChanged += AgentService_OnStatusChanged;
    }

    private void BuildContextMenu()
    {
        _contextMenu.Items.Clear();

        _itemHeader = _contextMenu.Items.Add(CurrentStrings["Header"]);
        _itemHeader.Enabled = false;

        _contextMenu.Items.Add(new ToolStripSeparator());

        _itemStatus = _contextMenu.Items.Add(CurrentStrings["Status_Clean"]);
        _itemSession = _contextMenu.Items.Add(CurrentStrings["Session_None"]);
        _itemPlayer = _contextMenu.Items.Add(CurrentStrings["Player_None"]);

        _contextMenu.Items.Add(new ToolStripSeparator());

        _itemViewLog = _contextMenu.Items.Add(CurrentStrings["View_Log"], null, (s, e) => ShowLogForm());
        _itemSync = _contextMenu.Items.Add(CurrentStrings["Sync_Now"], null, async (s, e) => await TriggerSync());

        _contextMenu.Items.Add(new ToolStripSeparator());

        _itemLanguage = _contextMenu.Items.Add(CurrentStrings["Language"], null, (s, e) => ToggleLanguage());

        _contextMenu.Items.Add(new ToolStripSeparator());

        _itemExit = _contextMenu.Items.Add(CurrentStrings["Exit"], null, (s, e) => ConfirmExit());

        UpdateMenuValues();
    }

    private void ToggleLanguage()
    {
        _isFa = !_isFa;
        _contextMenu.RightToLeft = _isFa ? RightToLeft.Yes : RightToLeft.No;

        if (_itemHeader != null) _itemHeader.Text = CurrentStrings["Header"];
        if (_itemViewLog != null) _itemViewLog.Text = CurrentStrings["View_Log"];
        if (_itemSync != null) _itemSync.Text = CurrentStrings["Sync_Now"];
        if (_itemLanguage != null) _itemLanguage.Text = CurrentStrings["Language"];
        if (_itemExit != null) _itemExit.Text = CurrentStrings["Exit"];

        UpdateMenuValues();

        if (_statusForm != null && !_statusForm.IsDisposed)
        {
            _statusForm.UpdateLanguage(_isFa);
        }
    }

    private void UpdateMenuValues()
    {
        if (_itemStatus == null || _itemSession == null || _itemPlayer == null) return;

        var state = _agentService.CurrentState.ToUpperInvariant();
        if (state == "ALERT") _itemStatus.Text = CurrentStrings["Status_Alert"];
        else if (state == "WARNING") _itemStatus.Text = CurrentStrings["Status_Warning"];
        else _itemStatus.Text = CurrentStrings["Status_Clean"];

        if (_agentService.Session != null)
        {
            _itemSession.Text = _isFa ? $"مسابقه: {_agentService.Session.MatchId}" : $"Session: {_agentService.Session.MatchId}";
            _itemPlayer.Text = _isFa ? $"بازیکن: {_agentService.Session.PlayerId}" : $"Player: {_agentService.Session.PlayerId}";
        }
        else
        {
            _itemSession.Text = CurrentStrings["Session_None"];
            _itemPlayer.Text = CurrentStrings["Player_None"];
        }
    }

    private void NotifyIcon_DoubleClick(object? sender, EventArgs e)
    {
        ShowStatusForm();
    }

    private void ShowStatusForm()
    {
        if (_statusForm == null || _statusForm.IsDisposed)
        {
            _statusForm = new StatusForm(_agentService, _isFa);
        }
        _statusForm.Show();
        _statusForm.BringToFront();
    }

    private void ShowLogForm()
    {
        if (_logForm == null || _logForm.IsDisposed)
        {
            _logForm = new LogForm(_agentService, _isFa);
        }
        _logForm.Show();
        _logForm.BringToFront();
    }

    private async Task TriggerSync()
    {
        if (_itemSync != null) _itemSync.Enabled = false;
        _notifyIcon.ShowBalloonTip(2000, "R6AC Anti-Cheat", CurrentStrings["Syncing"], ToolTipIcon.Info);

        await _agentService.SyncNowAsync();

        if (_logForm != null && !_logForm.IsDisposed)
        {
            await _logForm.LoadReports();
        }

        if (_statusForm != null && !_statusForm.IsDisposed)
        {
            _statusForm.UpdateData();
        }

        _notifyIcon.ShowBalloonTip(2000, "R6AC Anti-Cheat", CurrentStrings["Sync_Done"], ToolTipIcon.Info);
        if (_itemSync != null) _itemSync.Enabled = true;
    }

    private void AgentService_OnDetectionTriggered(object? sender, DetectionReport report)
    {
        UpdateTrayIconState();
        _notifyIcon.ShowBalloonTip(3000, "R6AC Anti-Cheat", CurrentStrings["Toast_Alert"], ToolTipIcon.Warning);

        if (_statusForm != null && !_statusForm.IsDisposed)
        {
            _statusForm.UpdateData();
        }
        if (_logForm != null && !_logForm.IsDisposed)
        {
            _logForm.Invoke(new Action(async () => await _logForm.LoadReports()));
        }
    }

    private void AgentService_OnStatusChanged(object? sender, string status)
    {
        UpdateTrayIconState();
        if (_statusForm != null && !_statusForm.IsDisposed)
        {
            _statusForm.UpdateData();
        }
    }

    private void UpdateTrayIconState()
    {
        var state = _agentService.CurrentState.ToUpperInvariant();
        _notifyIcon.Icon = IconHelper.CreateStateIcon(state);
        UpdateMenuValues();
    }

    private void ConfirmExit()
    {
        var res = MessageBox.Show(
            CurrentStrings["Exit_Confirm"],
            CurrentStrings["Confirm_Title"],
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Question,
            MessageBoxDefaultButton.Button2,
            _isFa ? MessageBoxOptions.RtlReading : 0
        );

        if (res == DialogResult.Yes)
        {
            _agentService.StopMonitoring();
            _notifyIcon.Visible = false;
            _notifyIcon.Dispose();
            Application.Exit();
        }
    }
}
