using R6AC.Agent.Hardware;
using Xunit;

namespace R6AC.Agent.Tests;

public class MockHardwareFingerprinter : HardwareFingerprinter
{
    private readonly string _cpu;
    private readonly string _mb;
    private readonly string _bios;
    private readonly string _disk;
    private readonly string _mac;

    public MockHardwareFingerprinter(string cpu, string mb, string bios, string disk, string mac)
    {
        _cpu = cpu;
        _mb = mb;
        _bios = bios;
        _disk = disk;
        _mac = mac;
    }

    protected override string GetWmiValue(string className, string property)
    {
        if (className.Contains("Processor")) return _cpu;
        if (className.Contains("BaseBoard")) return _mb;
        if (className.Contains("BIOS")) return _bios;
        if (className.Contains("DiskDrive")) return _disk;
        return "UNKNOWN";
    }

    protected override string GetPrimaryMac() => _mac;
}

public class HardwareFingerprinterTests
{
    [Fact]
    public void GetFingerprintHash_ShouldReturn64CharHex()
    {
        var fp = new MockHardwareFingerprinter("CPU123", "MB456", "BIOS789", "DISK101", "00:11:22:33:44:55");
        var hash = fp.GetFingerprintHash();

        Assert.NotNull(hash);
        Assert.Equal(64, hash.Length);
    }

    [Fact]
    public void GetFingerprintHash_ShouldBeConsistentAcrossCalls()
    {
        var fp = new MockHardwareFingerprinter("CPU123", "MB456", "BIOS789", "DISK101", "00:11:22:33:44:55");
        var hash1 = fp.GetFingerprintHash();
        var hash2 = fp.GetFingerprintHash();

        Assert.Equal(hash1, hash2);
    }

    [Fact]
    public void GetFingerprintHash_ShouldDifferIfInputsChange()
    {
        var fp1 = new MockHardwareFingerprinter("CPU123", "MB456", "BIOS789", "DISK101", "00:11:22:33:44:55");
        var fp2 = new MockHardwareFingerprinter("CPU999", "MB456", "BIOS789", "DISK101", "00:11:22:33:44:55");

        var hash1 = fp1.GetFingerprintHash();
        var hash2 = fp2.GetFingerprintHash();

        Assert.NotEqual(hash1, hash2);
    }
}
