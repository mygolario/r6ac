using System.Drawing;
using System.Windows.Forms;
using R6AC.Agent.Core;
using R6AC.Agent.Reporting;

namespace R6AC.TrayApp;

public class LogForm : Form
{
    private readonly AgentService _agentService;
    private bool _isFa;

    private DataGridView _dgvReports = new();
    private Button _btnRefresh = new();
    private Button _btnClose = new();
    private Panel _headerPanel = new();
    private Label _lblTitle = new();

    public LogForm(AgentService agentService, bool isFa)
    {
        _agentService = agentService;
        _isFa = isFa;
        InitializeComponent();
        _ = LoadReports();
    }

    private void InitializeComponent()
    {
        this.Size = new Size(650, 450);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.FormBorderStyle = FormBorderStyle.FixedSingle;
        this.MaximizeBox = false;
        this.BackColor = Color.FromArgb(13, 13, 15);
        this.ForeColor = Color.White;
        this.Font = new Font("Segoe UI", 10F, FontStyle.Regular, GraphicsUnit.Point);
        this.Text = _isFa ? "مشاهده گزارش‌ها - R6AC" : "View Report Log - R6AC";

        // Header
        _headerPanel.Size = new Size(650, 45);
        _headerPanel.Dock = DockStyle.Top;
        _headerPanel.BackColor = Color.FromArgb(200, 16, 46);

        _lblTitle.Text = _isFa ? "گزارش‌های ثبت‌شده سیستم" : "SYSTEM DETECTION REPORTS";
        _lblTitle.Font = new Font("Segoe UI", 12F, FontStyle.Bold);
        _lblTitle.ForeColor = Color.White;
        _lblTitle.AutoSize = true;
        _lblTitle.Location = new Point(15, 10);
        _headerPanel.Controls.Add(_lblTitle);
        this.Controls.Add(_headerPanel);

        // DataGridView
        _dgvReports.Location = new Point(20, 65);
        _dgvReports.Size = new Size(595, 300);
        _dgvReports.BackgroundColor = Color.FromArgb(22, 22, 24);
        _dgvReports.ForeColor = Color.Black;
        _dgvReports.ReadOnly = true;
        _dgvReports.AllowUserToAddRows = false;
        _dgvReports.AllowUserToDeleteRows = false;
        _dgvReports.RowHeadersVisible = false;
        _dgvReports.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
        _dgvReports.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
        this.Controls.Add(_dgvReports);

        // Buttons
        _btnRefresh.Size = new Size(150, 38);
        _btnRefresh.Location = new Point(20, 380);
        _btnRefresh.FlatStyle = FlatStyle.Flat;
        _btnRefresh.BackColor = Color.FromArgb(22, 22, 24);
        _btnRefresh.ForeColor = Color.White;
        _btnRefresh.Text = _isFa ? "به‌روزرسانی" : "Refresh";
        _btnRefresh.Click += async (s, e) => await LoadReports();
        this.Controls.Add(_btnRefresh);

        _btnClose.Size = new Size(120, 38);
        _btnClose.Location = new Point(495, 380);
        _btnClose.FlatStyle = FlatStyle.Flat;
        _btnClose.FlatAppearance.BorderSize = 0;
        _btnClose.BackColor = Color.FromArgb(200, 16, 46);
        _btnClose.ForeColor = Color.White;
        _btnClose.Text = _isFa ? "بستن" : "Close";
        _btnClose.Click += (s, e) => this.Close();
        this.Controls.Add(_btnClose);
    }

    public async Task LoadReports()
    {
        if (_agentService.ReportQueue == null) return;
        var pending = await _agentService.ReportQueue.GetPendingAsync();

        if (this.InvokeRequired)
        {
            this.Invoke(new Action(() => BindGrid(pending)));
        }
        else
        {
            BindGrid(pending);
        }
    }

    private void BindGrid(List<DetectionReport> reports)
    {
        _dgvReports.DataSource = reports.Select(r => new {
            ID = r.Id.Substring(0, Math.Min(8, r.Id.Length)),
            Type = r.DetectionType,
            Confidence = (r.Confidence * 100).ToString("F0") + "%",
            Reason = r.ReasonCode,
            Synced = r.IsSynced ? "YES" : "NO",
            Time = r.CreatedAt.ToLocalTime().ToString("HH:mm:ss")
        }).ToList();
    }
}
