using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using R6AC.Agent.Core;
using R6AC.Agent.Detectors;
using R6AC.Agent.Integrity;
using R6AC.Agent.Reporting;
using R6AC.Agent.Security;
using R6AC.Agent.Update;
using R6AC.Agent.Utils;
using Xunit;

namespace R6AC.Agent.Tests;

public class SecurityHardeningTests
{
    public SecurityHardeningTests()
    {
        SelfIntegrityCheck.IgnoreExitForTests = true;
        UpdateService.IgnoreExitForTests = true;
    }

    [Fact]
    public void StringVault_StoresAndDecrypts_SensitiveStrings()
    {
        var url = StringVault.Get(VaultKey.ApiBaseUrl);
        Assert.NotNull(url);

        var manifestKey = StringVault.Get(VaultKey.ManifestHmacKey);
        Assert.Equal("R6AC_MANIFEST_SECRET_KEY_32BYTES", manifestKey);
    }

    [Fact]
    public unsafe void StringVault_Clear_ZerosOutMemory()
    {
        var url = StringVault.Get(VaultKey.ApiBaseUrl);
        Assert.NotNull(url);

        fixed (char* ptr = url)
        {
            Assert.NotEqual('\0', ptr[0]);
            StringVault.Clear(VaultKey.ApiBaseUrl);
            Assert.Equal('\0', ptr[0]);
        }
    }

    [Fact]
    public void MemoryProtection_CheckAllCriticalMethods_PassesForCleanMethods()
    {
        bool isClean = MemoryProtection.CheckAllCriticalMethods(out string failedMethod);
        Assert.True(isClean, $"Expected all critical methods to be intact, but failed on {failedMethod}");
    }

    [Fact]
    public void AntiDebug_MockDebugger_TriggersSilentFailureMode()
    {
        AntiDebug.SetMockDebuggerPresent(true);

        var res = AntiDebug.RunAllChecks();
        Assert.True(res.IsDebuggerPresent);
        Assert.True(AntiDebug.IsSilentModeActive);
    }

    [Fact]
    public void AntiVm_MockVmDetected_ReturnsVmEnvironmentResult()
    {
        AntiVm.SetMockVmDetected(true);

        var res = AntiVm.RunAllChecks();
        Assert.True(res.IsVmDetected);
        Assert.Equal("MockVM", res.DetectedArtifact);
        Assert.Equal(0.80f, res.Confidence);
    }

    [Fact]
    public void UpdateService_VerifyUpdatePackage_FailsOnMismatchedHash()
    {
        var config = new AgentConfig();
        var updateSvc = new UpdateService(config);

        var tempFile = Path.GetTempFileName();
        File.WriteAllText(tempFile, "SampleUpdateContent");

        bool isValid = updateSvc.VerifyUpdatePackage(tempFile, "1.0.1", "INVALID_HASH_123", "INVALID_SIG");
        Assert.False(isValid);

        if (File.Exists(tempFile)) File.Delete(tempFile);
    }
}
