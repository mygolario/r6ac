using R6AC.Agent.Core;
using R6AC.Agent.Hardware;

namespace R6AC.Agent.Detectors;

/// <summary>
/// ماژول تشخیص سخت‌افزارهای ورودی غیرمجاز و تزریق سیگنال.
/// Input device detector module for identifying unauthorized hardware injection.
/// </summary>
public class InputDeviceDetector : IDetector
{
    private readonly UsbDeviceScanner _scanner;

    public string DetectorName => "InputDeviceDetector";
    public DetectionType DetectionType => DetectionType.SUSPICIOUS_HARDWARE;

    public InputDeviceDetector()
    {
        _scanner = new UsbDeviceScanner();
    }

    public InputDeviceDetector(UsbDeviceScanner scanner)
    {
        _scanner = scanner;
    }

    public Task<DetectionResult?> ScanAsync(AgentSession session, CancellationToken ct)
    {
        return Task.Run(() => _scanner.ScanForSuspiciousHardware(), ct);
    }
}
