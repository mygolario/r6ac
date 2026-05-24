using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using R6AC.Agent.Core;

namespace R6AC.Agent.Detectors;

/// <summary>
/// اسکنر پنجره‌های ویندوز با استفاده از P/Invoke جهت تشخیص اورلی‌های نامرئی و ابزارهای ESP.
/// Windows scanner using P/Invoke to detect hidden overlays and ESP tools.
/// </summary>
public class WindowDetector : IDetector
{
    public string DetectorName => "WindowDetector";
    public DetectionType DetectionType => DetectionType.WALLHACK;

    private static readonly List<string> SuspiciousKeywords = new()
    {
        "esp", "aimbot", "hack", "cheat", "overlay", "radar", "chams", "wallhack"
    };

    private static readonly List<string> WhitelistedApps = new()
    {
        "discord", "obs", "explorer", "browser", "r6ac", "taskmgr", "devenv", "rider", "code",
        "softether", "electro", "bazitory", "shecan", "cmd", "rainbow six", "vulkan",
        "steam", "nvidia", "geforce", "amd", "radeon", "overwolf", "epic", "uplay", "ubisoft",
        "nordvpn", "expressvpn", "cyberghost", "protonvpn", "surfshark", "windscribe", 
        "mullvad", "exitlag", "wtfast", "mudfish", "pingzapper", "noping", "hidemyass", 
        "tunnelbear", "private internet access", "vyprvpn", "ipvanish", "hotspot shield", 
        "cloudflare", "warp", "outline", "v2ray", "shadowsocks", "clash", "nekoray", 
        "netch", "v2rayn", "openconnect", "anyconnect"
    };

    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern long GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
        public int Width => Right - Left;
        public int Height => Bottom - Top;
    }

    private const int GWL_EXSTYLE = -20;
    private const long WS_EX_LAYERED = 0x00080000L;
    private const long WS_EX_TRANSPARENT = 0x00000020L;

    public Task<DetectionResult?> ScanAsync(AgentSession session, CancellationToken ct)
    {
        return Task.Run(() => ScanWindows(), ct);
    }

    private DetectionResult? ScanWindows()
    {
        if (!OperatingSystem.IsWindows()) return null;

        DetectionResult? detectedResult = null;

        try
        {
            EnumWindows((hWnd, lParam) =>
            {
                var sb = new StringBuilder(512);
                GetWindowText(hWnd, sb, sb.Capacity);
                var title = sb.ToString().ToLowerInvariant();
                var isVisible = IsWindowVisible(hWnd);
                var exStyle = GetWindowLong(hWnd, GWL_EXSTYLE);

                // 1. Check Keywords
                bool isWhitelisted = WhitelistedApps.Any(app => title.Contains(app));
                
                foreach (var kw in SuspiciousKeywords)
                {
                    if (!string.IsNullOrWhiteSpace(title) && Regex.IsMatch(title, $@"\b{kw}\b", RegexOptions.IgnoreCase) && !isWhitelisted)
                    {
                        var evidence = new Dictionary<string, object>
                        {
                            { "WindowHandle", hWnd.ToString("X") },
                            { "WindowTitle", sb.ToString() },
                            { "KeywordMatched", kw }
                        };

                        detectedResult = new DetectionResult(
                            Type: DetectionType.WALLHACK,
                            Severity: DetectionSeverity.Kick,
                            Confidence: 0.90f,
                            ReasonCode: "FORBIDDEN_WINDOW_TITLE",
                            Description: $"Suspicious window title detected: {sb}",
                            DescriptionFA: $"پنجره مشکوک حاوی عنوان غیرمجاز یافت شد: {sb}",
                            Evidence: evidence
                        );
                        return false; // Stop enumerating
                    }
                }

                // 2. Check Layered / Transparent Overlay
                var isLayered = (exStyle & WS_EX_LAYERED) != 0;
                var isTransparent = (exStyle & WS_EX_TRANSPARENT) != 0;

                if (isVisible && isLayered && isTransparent)
                {
                    GetWindowRect(hWnd, out var rect);
                    if (rect.Width > 500 && rect.Height > 500 && string.IsNullOrWhiteSpace(title))
                    {
                        var evidence = new Dictionary<string, object>
                        {
                            { "WindowHandle", hWnd.ToString("X") },
                            { "Dimensions", $"{rect.Width}x{rect.Height}" },
                            { "ExStyle", exStyle.ToString("X") }
                        };

                        detectedResult = new DetectionResult(
                            Type: DetectionType.WALLHACK,
                            Severity: DetectionSeverity.Kick,
                            Confidence: 0.85f,
                            ReasonCode: "TRANSPARENT_SCREEN_OVERLAY",
                            Description: "Full-screen transparent layered overlay window detected, potential ESP/Wallhack.",
                            DescriptionFA: "پنجره شفاف تمام صفحه یافت شد، احتمال وجود اورلی تقلب (ESP).",
                            Evidence: evidence
                        );
                        return false;
                    }
                }

                // 3. Zero-size Layered Window (Hidden Overlay)
                if (isLayered)
                {
                    GetWindowRect(hWnd, out var rect);
                    if (rect.Width == 0 && rect.Height == 0 && isVisible && !string.IsNullOrWhiteSpace(title))
                    {
                        var evidence = new Dictionary<string, object>
                        {
                            { "WindowHandle", hWnd.ToString("X") },
                            { "WindowTitle", sb.ToString() }
                        };

                        detectedResult = new DetectionResult(
                            Type: DetectionType.WALLHACK,
                            Severity: DetectionSeverity.Flag,
                            Confidence: 0.40f,
                            ReasonCode: "ZERO_DIMENSION_LAYERED_WINDOW",
                            Description: $"Hidden overlay window with zero dimensions detected: {sb}",
                            DescriptionFA: $"پنجره اورلی مخفی با ابعاد صفر یافت شد: {sb}",
                            Evidence: evidence
                        );
                        return false;
                    }
                }

                return true; // Continue enumerating
            }, IntPtr.Zero);
        }
        catch
        {
            // Ignore UI enumeration errors
        }

        return detectedResult;
    }
}
