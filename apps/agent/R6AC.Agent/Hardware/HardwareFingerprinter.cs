using System.Management;
using System.Net.NetworkInformation;
using R6AC.Agent.Utils;

namespace R6AC.Agent.Hardware;

/// <summary>
/// جمع‌آوری مشخصات سخت‌افزاری و تولید اثرانگشت رمزنگاری‌شده (عدم ذخیره‌سازی مقادیر خام).
/// Collects hardware identifiers and generates a cryptographic fingerprint hash (never stores raw values).
/// </summary>
public class HardwareFingerprinter
{
    /// <summary>
    /// تولید هش SHA-256 از ترکیب شناسه‌های پردازنده، مادربورد، بایوس، دیسک و مک‌آدرس.
    /// Generate SHA-256 hash from combined CPU, MB, BIOS, Disk, and MAC IDs.
    /// </summary>
    public virtual string GetFingerprintHash()
    {
        var cpu = Sanitize(GetWmiValue("Win32_Processor", "ProcessorId"));
        var mb = Sanitize(GetWmiValue("Win32_BaseBoard", "SerialNumber"));
        var bios = Sanitize(GetWmiValue("Win32_BIOS", "SerialNumber"));
        var disk = Sanitize(GetWmiValue("Win32_DiskDrive", "SerialNumber"));
        var mac = Sanitize(GetPrimaryMac());

        var raw = $"{cpu}|{mb}|{bios}|{disk}|{mac}";
        return HashUtils.Sha256(raw);
    }

    protected virtual string GetWmiValue(string className, string property)
    {
        if (!OperatingSystem.IsWindows()) return "UNKNOWN";

        try
        {
            using var searcher = new ManagementObjectSearcher($"SELECT {property} FROM {className}");
            foreach (var obj in searcher.Get())
            {
                var val = obj[property]?.ToString();
                if (!string.IsNullOrWhiteSpace(val)) return val.Trim();
            }
        }
        catch
        {
            // Ignore WMI query errors if service is disabled or permissions restricted
        }
        return "UNKNOWN";
    }

    protected virtual string GetPrimaryMac()
    {
        try
        {
            foreach (var adapter in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (adapter.NetworkInterfaceType == NetworkInterfaceType.Ethernet ||
                    adapter.NetworkInterfaceType == NetworkInterfaceType.Wireless80211)
                {
                    if (adapter.OperationalStatus == OperationalStatus.Up)
                    {
                        var name = adapter.Name.ToLowerInvariant();
                        var desc = adapter.Description.ToLowerInvariant();
                        if (name.Contains("virtual") || desc.Contains("virtual") ||
                            name.Contains("vmware") || desc.Contains("vmware") ||
                            name.Contains("vbox") || desc.Contains("vbox") ||
                            name.Contains("electro") || desc.Contains("electro"))
                        {
                            continue;
                        }

                        var mac = adapter.GetPhysicalAddress().ToString();
                        if (!string.IsNullOrWhiteSpace(mac)) return mac;
                    }
                }
            }
        }
        catch
        {
            // Ignore access errors
        }
        return "UNKNOWN";
    }

    private static string Sanitize(string val)
    {
        return string.IsNullOrWhiteSpace(val) || val == "UNKNOWN" ? "DEFAULT_HW_VAL" : val.Trim();
    }
}
