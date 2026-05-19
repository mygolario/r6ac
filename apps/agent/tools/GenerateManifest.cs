using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace R6AC.Tools;

public record ManifestFileInfo(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("sha256")] string Sha256,
    [property: JsonPropertyName("size")] long Size
);

public record IntegrityManifest(
    [property: JsonPropertyName("version")] string Version,
    [property: JsonPropertyName("timestamp")] DateTime Timestamp,
    [property: JsonPropertyName("files")] List<ManifestFileInfo> Files,
    [property: JsonPropertyName("signature")] string Signature
);

public static class GenerateManifest
{
    private static readonly byte[] ManifestKey = new byte[] {
        0x52, 0x36, 0x41, 0x43, 0x5F, 0x4D, 0x41, 0x4E, 0x49, 0x46, 0x45, 0x53, 0x54, 0x5F, 0x53, 0x45,
        0x43, 0x52, 0x45, 0x54, 0x5F, 0x4B, 0x45, 0x59, 0x5F, 0x33, 0x32, 0x42, 0x59, 0x54, 0x45, 0x53
    };

    public static int Main(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Usage: GenerateManifest <target_directory>");
            return 1;
        }

        var targetDir = args[0];
        if (!Directory.Exists(targetDir))
        {
            Console.WriteLine($"Error: Directory not found: {targetDir}");
            return 1;
        }

        return RunGeneration(targetDir);
    }

    public static int RunGeneration(string targetDir)
    {
        Console.WriteLine($"Generating integrity-manifest.json for directory: {targetDir}");

        var targetFiles = new[] { "R6AC.Agent.dll", "R6AC.Agent.exe", "R6AC.TrayApp.dll", "R6AC.TrayApp.exe" };
        var fileInfos = new List<ManifestFileInfo>();

        foreach (var fileName in targetFiles)
        {
            var filePath = Path.Combine(targetDir, fileName);
            if (File.Exists(filePath))
            {
                var hash = ComputeSha256(filePath);
                var size = new FileInfo(filePath).Length;
                fileInfos.Add(new ManifestFileInfo(fileName, hash, size));
                Console.WriteLine($"Added {fileName} -> SHA256: {hash} ({size} bytes)");
            }
        }

        if (fileInfos.Count == 0)
        {
            Console.WriteLine("No target agent binaries found in directory.");
        }

        var filesJson = JsonSerializer.Serialize(fileInfos, new JsonSerializerOptions { WriteIndented = false });
        using var hmac = new HMACSHA256(ManifestKey);
        var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(filesJson));
        var signature = Convert.ToHexString(hashBytes).ToLowerInvariant();

        var manifest = new IntegrityManifest("1.0.0", DateTime.UtcNow, fileInfos, signature);
        var manifestJson = JsonSerializer.Serialize(manifest, new JsonSerializerOptions { WriteIndented = true });

        var outputPath = Path.Combine(targetDir, "integrity-manifest.json");
        File.WriteAllText(outputPath, manifestJson);

        Console.WriteLine($"SUCCESS: Saved integrity-manifest.json to {outputPath}");
        Console.WriteLine($"HMAC Signature: {signature}");
        return 0;
    }

    private static string ComputeSha256(string filePath)
    {
        using var sha = SHA256.Create();
        using var stream = File.OpenRead(filePath);
        var hash = sha.ComputeHash(stream);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
