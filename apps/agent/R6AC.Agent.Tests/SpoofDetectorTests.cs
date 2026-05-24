using R6AC.Agent.Core;
using R6AC.Agent.Detectors;
using Xunit;

namespace R6AC.Agent.Tests;

public class SpoofDetectorTests
{
    [Fact]
    public async Task ScanAsync_DefaultSmbios_ShouldDetectAnomaly()
    {
        var detector = new SpoofDetector();
        detector.FeedTestingData(
            wmiDisk: "SERIAL123",
            regDisk: "SERIAL123",
            ioctlDisk: "SERIAL123",
            wmiMac: "001122334455",
            regMac: "001122334455",
            apiMac: "001122334455",
            smbiosSerial: "Default string"
        );

        var session = new AgentSession("P1", "M1", new SessionToken("T1", "P1", "M1", DateTime.UtcNow, DateTime.UtcNow.AddHours(1), "SIG"), "HASH");
        var result = await detector.ScanAsync(session, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(DetectionType.HWID_SPOOF, result.Type);
        Assert.Equal("SMBIOS_DEFAULT_SERIAL_ANOMALY", result.ReasonCode);
    }

    [Fact]
    public async Task ScanAsync_ConsistentHardware_ShouldReturnNull()
    {
        var detector = new SpoofDetector();
        detector.FeedTestingData(
            wmiDisk: "SERIAL123",
            regDisk: "SERIAL123",
            ioctlDisk: "SERIAL123",
            wmiMac: "001122334455",
            regMac: "001122334455",
            apiMac: "001122334455",
            smbiosSerial: "ValidSerial456"
        );

        var session = new AgentSession("P1", "M1", new SessionToken("T1", "P1", "M1", DateTime.UtcNow, DateTime.UtcNow.AddHours(1), "SIG"), "HASH");
        var result = await detector.ScanAsync(session, CancellationToken.None);

        Assert.Null(result);
    }
}
