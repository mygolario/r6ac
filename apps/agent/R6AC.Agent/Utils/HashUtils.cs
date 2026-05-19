using System.Security.Cryptography;
using System.Text;

namespace R6AC.Agent.Utils;

/// <summary>
/// ابزارهای رمزنگاری و هشینگ (SHA-256).
/// Cryptographic and hashing utilities (SHA-256).
/// </summary>
public static class HashUtils
{
    /// <summary>
    /// محاسبه هش SHA-256 برای رشته ورودی.
    /// Compute SHA-256 hash for input string.
    /// </summary>
    public static string Sha256(string input)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    /// <summary>
    /// محاسبه هش SHA-256 برای یک فایل در سیستم.
    /// Compute SHA-256 hash for a file.
    /// </summary>
    public static string Sha256File(string filePath)
    {
        if (!File.Exists(filePath)) return string.Empty;
        try
        {
            using var stream = File.OpenRead(filePath);
            using var sha = SHA256.Create();
            var hash = sha.ComputeHash(stream);
            return Convert.ToHexString(hash).ToLowerInvariant();
        }
        catch
        {
            return string.Empty;
        }
    }
}
