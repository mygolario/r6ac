using System.Text;

namespace R6AC.Agent.Security;

public enum VaultKey
{
    ApiBaseUrl,
    DeviceDriverPath,       // \\.\R6ACDriver
    ProcessBlocklistKey,    // used to decrypt the blocklist
    ManifestHmacKey,
    UpdateHmacKey
}

/// <summary>
/// ذخیره‌سازی امن رشته‌های حساس به صورت رمزنگاری شده در فایل باینری (XOR).
/// Encrypted storage of sensitive strings at rest, decrypted only on demand and zeroed out on clear.
/// </summary>
public static class StringVault
{
    private const byte Salt = 0x77;

    private static byte[] Xor(string s) => Encoding.UTF8.GetBytes(s).Select(b => (byte)(b ^ Salt)).ToArray();

    private static readonly Dictionary<VaultKey, byte[]> Vault = new()
    {
        [VaultKey.ApiBaseUrl] = Xor("https://r6ac-api.liara.run"),
        [VaultKey.DeviceDriverPath] = Xor(@"\\.\R6ACDriver"),
        [VaultKey.ProcessBlocklistKey] = Xor("R6AC_BLOCKLIST_KEY_2026"),
        [VaultKey.ManifestHmacKey] = Xor("R6AC_MANIFEST_SECRET_KEY_32BYTES"),
        [VaultKey.UpdateHmacKey] = Xor("R6AC_UPDATE_SECURE_SECRET_KEY_32")
    };

    private static readonly Dictionary<VaultKey, string> DecryptedCache = new();

    public static string Get(VaultKey key)
    {
        lock (DecryptedCache)
        {
            if (DecryptedCache.TryGetValue(key, out var cached) && !string.IsNullOrEmpty(cached) && cached[0] != '\0')
            {
                return cached;
            }

            if (!Vault.TryGetValue(key, out var encryptedBytes))
            {
                throw new KeyNotFoundException($"Vault key {key} not found.");
            }

            var decrypted = new byte[encryptedBytes.Length];
            for (int i = 0; i < encryptedBytes.Length; i++)
            {
                decrypted[i] = (byte)(encryptedBytes[i] ^ Salt);
            }

            var resultStr = Encoding.UTF8.GetString(decrypted);
            Array.Clear(decrypted, 0, decrypted.Length);

            DecryptedCache[key] = resultStr;
            return resultStr;
        }
    }

    public static void Clear(VaultKey key)
    {
        lock (DecryptedCache)
        {
            if (DecryptedCache.TryGetValue(key, out var str) && str != null)
            {
                unsafe
                {
                    fixed (char* ptr = str)
                    {
                        for (int i = 0; i < str.Length; i++)
                        {
                            ptr[i] = '\0';
                        }
                    }
                }
                DecryptedCache.Remove(key);
            }
        }
    }
}
