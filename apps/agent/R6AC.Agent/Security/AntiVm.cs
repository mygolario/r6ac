using System.Diagnostics;
using System.Management;
using System.Net.NetworkInformation;
using Microsoft.Win32;
using R6AC.Agent.Core;
using R6AC.Agent.Detectors;

namespace R6AC.Agent.Security;

public record AntiVmResult(bool IsVmDetected, string DetectedArtifact, float Confidence);

/// <summary>
/// تشخیص محیط‌های ماشین مجازی نظیر VMware، VirtualBox و QEMU.
/// VM Environment detection via registry, running processes, WMI hardware strings, and MAC addresses.
/// </summary>
public static class AntiVm
{
    private static bool _mockVmDetected = false;

    public static void SetMockVmDetected(bool detected)
    {
        _mockVmDetected = detected;
    }

    public static AntiVmResult RunAllChecks()
    {
        if (_mockVmDetected)
        {
            return new AntiVmResult(true, "MockVM", 0.80f);
        }

        if (HasVmRegistryArtifacts())
        {
            return new AntiVmResult(true, "RegistryArtifacts", 0.80f);
        }

        if (HasVmProcesses())
        {
            return new AntiVmResult(true, "GuestProcesses", 0.80f);
        }

        if (HasVmHardwareStrings())
        {
            return new AntiVmResult(true, "HardwareStrings", 0.80f);
        }

        if (HasVmMacAddress())
        {
            return new AntiVmResult(true, "MacAddressPrefix", 0.80f);
        }

        return new AntiVmResult(false, "CLEAN", 0.0f);
    }

    // Check registry artifacts
    public static bool HasVmRegistryArtifacts()
    {
        if (!OperatingSystem.IsWindows()) return false;

        var keys = new[]
        {
            @"SOFTWARE\VMware, Inc.\VMware Tools",
            @"SOFTWARE\Oracle\VirtualBox Guest Additions",
            @"SYSTEM\CurrentControlSet\Services\VBoxGuest"
        };

        foreach (var k in keys)
        {
            try
            {
                using var reg = Registry.LocalMachine.OpenSubKey(k);
                if (reg != null) return true;
            }
            catch { }
        }

        return false;
    }

    // Check running processes
    public static bool HasVmProcesses()
    {
        if (!OperatingSystem.IsWindows()) return false;

        var vmProcs = new[] { "vmtoolsd", "vmwaretray", "vboxservice", "vboxtray", "qemu-ga", "prl_tools" };
        try
        {
            var procs = Process.GetProcesses();
            foreach (var p in procs)
            {
                var name = p.ProcessName.ToLowerInvariant();
                foreach (var v in vmProcs)
                {
                    if (name.Contains(v)) return true;
                }
            }
        }
        catch { }

        return false;
    }

    // Check hardware strings via WMI
    public static bool HasVmHardwareStrings()
    {
        if (!OperatingSystem.IsWindows()) return false;

        try
        {
            using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_BIOS"))
            {
                foreach (var item in searcher.Get())
                {
                    var bios = (item["SerialNumber"]?.ToString() ?? "") + " " + (item["Version"]?.ToString() ?? "");
                    bios = bios.ToUpperInvariant();
                    if (bios.Contains("VBOX") || bios.Contains("VMWARE") || bios.Contains("QEMU") || bios.Contains("BOCHS") || bios.Contains("VIRTUAL"))
                    {
                        return true;
                    }
                }
            }

            using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_BaseBoard"))
            {
                foreach (var item in searcher.Get())
                {
                    var mfr = (item["Manufacturer"]?.ToString() ?? "") + " " + (item["Product"]?.ToString() ?? "");
                    mfr = mfr.ToUpperInvariant();
                    if (mfr.Contains("VIRTUAL") || mfr.Contains("VMWARE"))
                    {
                        return true;
                    }
                }
            }
        }
        catch { }

        return false;
    }

    // Check MAC address prefixes
    public static bool HasVmMacAddress()
    {
        try
        {
            foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
            {
                var mac = nic.GetPhysicalAddress().ToString().ToUpperInvariant();
                // VMware: 00:0C:29, 00:50:56 | VirtualBox: 08:00:27 | QEMU: 52:54:00
                if (mac.StartsWith("000C29") || mac.StartsWith("005056") || mac.StartsWith("080027") || mac.StartsWith("525400"))
                {
                    return true;
                }
            }
        }
        catch { }

        return false;
    }
}

/// <summary>
/// ماژول اسکنر محیط ماشین مجازی جهت افزودن به لیست دتکتورهای فعال ایجنت.
/// </summary>
public class AntiVmDetector : IDetector
{
    public string DetectorName => "AntiVmDetector";
    public DetectionType DetectionType => DetectionType.VM_ENVIRONMENT;

    public Task<DetectionResult?> ScanAsync(AgentSession session, CancellationToken ct)
    {
        var res = AntiVm.RunAllChecks();
        if (res.IsVmDetected)
        {
            var evidence = new Dictionary<string, object>
            {
                { "DetectedArtifact", res.DetectedArtifact },
                { "ConfidenceScore", res.Confidence }
            };

            var dRes = new DetectionResult(
                Type: DetectionType.VM_ENVIRONMENT,
                Confidence: res.Confidence,
                ReasonCode: "VM_ENVIRONMENT_" + res.DetectedArtifact.ToUpperInvariant(),
                Description: $"Virtual Machine environment detected ({res.DetectedArtifact}). Requires human review.",
                DescriptionFA: $"محیط ماشین مجازی تشخیص داده شد ({res.DetectedArtifact}). نیازمند بررسی توسط ناظر.",
                Evidence: evidence
            );

            return Task.FromResult<DetectionResult?>(dRes);
        }

        return Task.FromResult<DetectionResult?>(null);
    }
}
