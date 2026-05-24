using R6AC.Agent.Detectors;
using R6AC.Agent.Hardware;
using Xunit;

namespace R6AC.Agent.Tests;

public class MockUsbDeviceScanner : UsbDeviceScanner
{
    private readonly List<ConnectedUsbDevice> _mockDevices;

    public MockUsbDeviceScanner(List<ConnectedUsbDevice> mockDevices)
    {
        _mockDevices = mockDevices;
    }

    public override List<ConnectedUsbDevice> GetConnectedDevices() => _mockDevices;
}

public class UsbDeviceScannerTests
{
    [Fact]
    public void ScanForSuspiciousHardware_ShouldDetectKMBox()
    {
        var devices = new List<ConnectedUsbDevice>
        {
            new("USB\\VID_1A86&PID_7523\\5&1A2B3C", "KMBox HW", "USB Input Device")
        };

        var scanner = new MockUsbDeviceScanner(devices);
        var res = scanner.ScanForSuspiciousHardware();

        Assert.NotNull(res);
        Assert.Equal(DetectionType.SUSPICIOUS_HARDWARE, res.Type);
        Assert.Equal("KMBOX_DETECTED", res.ReasonCode);
        Assert.Equal(0.85f, res.Confidence);
    }



    [Fact]
    public void ScanForSuspiciousHardware_ShouldReturnNullWhenClean()
    {
        var devices = new List<ConnectedUsbDevice>
        {
            new("HID\\VID_045E&PID_0719\\1", "Standard Mouse", "HID Device")
        };

        var scanner = new MockUsbDeviceScanner(devices);
        var res = scanner.ScanForSuspiciousHardware();

        Assert.Null(res);
    }
}
