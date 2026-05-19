using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using Microsoft.Win32;
using R6AC.Agent.Core;

namespace R6AC.TrayApp;

public class StatusForm : Form
{
    private readonly AgentService _agentService;
    private bool _isDragging = false;
    private Point _dragCursorPoint;
    private Point _dragFormPoint;
    private bool _isFa = true;

    private Label _lblTitle = new();
    private Label _lblVersion = new();
    private Label _lblSession = new();
    private Label _lblFingerprint = new();
    private Label _lblLastSync = new();
    private Label _lblDetections = new();
    private Button _btnAutoStart = new();
    private Button _btnClose = new();
    private Panel _headerPanel = new();

    public StatusForm(AgentService agentService, bool isFa)
    {
        _agentService = agentService;
        _isFa = isFa;
        InitializeComponent();
        UpdateData();
    }

    private void InitializeComponent()
    {
        this.Size = new Size(400, 320);
        this.FormBorderStyle = FormBorderStyle.None;
        this.StartPosition = FormStartPosition.CenterScreen;
        this.TopMost = true;
        this.BackColor = Color.FromArgb(13, 13, 15);
        this.ForeColor = Color.White;
        this.Font = new Font("Segoe UI", 10F, FontStyle.Regular, GraphicsUnit.Point);

        // Header Panel
        _headerPanel.Size = new Size(400, 45);
        _headerPanel.Dock = DockStyle.Top;
        _headerPanel.BackColor = Color.FromArgb(200, 16, 46); // Crimson accent
        _headerPanel.MouseDown += Header_MouseDown;
        _headerPanel.MouseMove += Header_MouseMove;
        _headerPanel.MouseUp += Header_MouseUp;

        _lblTitle.Text = _isFa ? "سیستم ضد تقلب R6AC" : "R6AC ANTI-CHEAT";
        _lblTitle.Font = new Font("Segoe UI", 14F, FontStyle.Bold, GraphicsUnit.Point);
        _lblTitle.ForeColor = Color.White;
        _lblTitle.AutoSize = true;
        _lblTitle.Location = new Point(15, 10);
        _lblTitle.MouseDown += Header_MouseDown;
        _lblTitle.MouseMove += Header_MouseMove;
        _lblTitle.MouseUp += Header_MouseUp;

        _headerPanel.Controls.Add(_lblTitle);
        this.Controls.Add(_headerPanel);

        // Labels
        int y = 65;
        int spacing = 32;

        _lblVersion.Location = new Point(20, y);
        _lblVersion.AutoSize = true;
        this.Controls.Add(_lblVersion);

        y += spacing;
        _lblSession.Location = new Point(20, y);
        _lblSession.AutoSize = true;
        this.Controls.Add(_lblSession);

        y += spacing;
        _lblFingerprint.Location = new Point(20, y);
        _lblFingerprint.AutoSize = true;
        this.Controls.Add(_lblFingerprint);

        y += spacing;
        _lblLastSync.Location = new Point(20, y);
        _lblLastSync.AutoSize = true;
        this.Controls.Add(_lblLastSync);

        y += spacing;
        _lblDetections.Location = new Point(20, y);
        _lblDetections.AutoSize = true;
        this.Controls.Add(_lblDetections);

        // Buttons
        _btnAutoStart.Size = new Size(220, 38);
        _btnAutoStart.Location = new Point(20, 260);
        _btnAutoStart.FlatStyle = FlatStyle.Flat;
        _btnAutoStart.FlatAppearance.BorderSize = 1;
        _btnAutoStart.FlatAppearance.BorderColor = Color.FromArgb(60, 60, 65);
        _btnAutoStart.BackColor = Color.FromArgb(22, 22, 24);
        _btnAutoStart.ForeColor = Color.White;
        _btnAutoStart.Cursor = Cursors.Hand;
        _btnAutoStart.Click += BtnAutoStart_Click;
        this.Controls.Add(_btnAutoStart);

        _btnClose.Size = new Size(120, 38);
        _btnClose.Location = new Point(260, 260);
        _btnClose.FlatStyle = FlatStyle.Flat;
        _btnClose.FlatAppearance.BorderSize = 0;
        _btnClose.BackColor = Color.FromArgb(200, 16, 46);
        _btnClose.ForeColor = Color.White;
        _btnClose.Cursor = Cursors.Hand;
        _btnClose.Text = _isFa ? "بستن" : "Close";
        _btnClose.Click += (s, e) => this.Close();
        this.Controls.Add(_btnClose);

        UpdateAutoStartButtonText();
    }

    public void UpdateLanguage(bool isFa)
    {
        _isFa = isFa;
        _lblTitle.Text = _isFa ? "سیستم ضد تقلب R6AC" : "R6AC ANTI-CHEAT";
        _btnClose.Text = _isFa ? "بستن" : "Close";
        UpdateData();
        UpdateAutoStartButtonText();
    }

    public void UpdateData()
    {
        if (this.InvokeRequired)
        {
            this.Invoke(new Action(UpdateData));
            return;
        }

        var ver = _agentService.Config.Version;
        _lblVersion.Text = _isFa ? $"نسخه: {ver} (ساخت اردیبهشت ۱۴۰۵)" : $"Version: {ver} (Build May 2026)";

        var sessionStatus = _agentService.Session != null ? (_isFa ? "در حال مسابقه" : "Active Match") : (_isFa ? "آماده به کار" : "Idle");
        _lblSession.Text = _isFa ? $"وضعیت مسابقه: {sessionStatus}" : $"Session Status: {sessionStatus}";

        var hash = _agentService.FingerprintHash;
        var shortHash = hash.Length >= 8 ? hash.Substring(hash.Length - 8).ToUpperInvariant() : hash;
        _lblFingerprint.Text = _isFa ? $"شناسه سخت‌افزاری: ••••••••{shortHash}" : $"Hardware ID: ••••••••{shortHash}";

        var syncTime = _agentService.LastSyncTime == DateTime.MinValue ? (_isFa ? "هرگز" : "Never") : _agentService.LastSyncTime.ToString("HH:mm:ss");
        _lblLastSync.Text = _isFa ? $"آخرین همگام‌سازی: {syncTime}" : $"Last Sync: {syncTime}";

        _lblDetections.Text = _isFa ? $"تعداد تشخیص در این مسابقه: {_agentService.DetectionCount}" : $"Detections this session: {_agentService.DetectionCount}";
        if (_agentService.DetectionCount > 0)
        {
            _lblDetections.ForeColor = Color.FromArgb(234, 179, 8); // Yellow/Warning
        }
        else
        {
            _lblDetections.ForeColor = Color.White;
        }
    }

    private void Header_MouseDown(object? sender, MouseEventArgs e)
    {
        if (e.Button == MouseButtons.Left)
        {
            _isDragging = true;
            _dragCursorPoint = Cursor.Position;
            _dragFormPoint = this.Location;
        }
    }

    private void Header_MouseMove(object? sender, MouseEventArgs e)
    {
        if (_isDragging)
        {
            Point dif = Point.Subtract(Cursor.Position, new Size(_dragCursorPoint));
            this.Location = Point.Add(_dragFormPoint, new Size(dif));
        }
    }

    private void Header_MouseUp(object? sender, MouseEventArgs e)
    {
        _isDragging = false;
    }

    private bool IsAutoStartEnabled()
    {
        if (!OperatingSystem.IsWindows()) return false;
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", false);
            var val = key?.GetValue("R6AC") as string;
            return !string.IsNullOrWhiteSpace(val);
        }
        catch { return false; }
    }

    private void SetAutoStart(bool enable)
    {
        if (!OperatingSystem.IsWindows()) return;
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true);
            if (key != null)
            {
                if (enable)
                {
                    var path = $"\"{Application.ExecutablePath}\"";
                    key.SetValue("R6AC", path);
                }
                else
                {
                    key.DeleteValue("R6AC", false);
                }
            }
        }
        catch { }
    }

    private void UpdateAutoStartButtonText()
    {
        var enabled = IsAutoStartEnabled();
        var statusFa = enabled ? "روشن" : "خاموش";
        var statusEn = enabled ? "ON" : "OFF";
        _btnAutoStart.Text = _isFa ? $"اجرا در زمان لود ویندوز: {statusFa}" : $"Start with Windows: {statusEn}";
    }

    private void BtnAutoStart_Click(object? sender, EventArgs e)
    {
        var enabled = IsAutoStartEnabled();
        SetAutoStart(!enabled);
        UpdateAutoStartButtonText();
    }
}
