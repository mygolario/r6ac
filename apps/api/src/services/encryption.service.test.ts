import { describe, it, expect } from 'vitest';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  it('should hash hardware fingerprints securely using SHA-256', () => {
    const rawHwid = 'CPU:Intel_i9_GPU:RTX4090_MAC:00:1A:2B:3C';
    const hash1 = EncryptionService.hashSha256(rawHwid);
    const hash2 = EncryptionService.hashSha256(rawHwid);

    expect(hash1).toBeDefined();
    expect(hash1.length).toBe(64); // hex SHA-256 string length is 64
    expect(hash1).toBe(hash2); // deterministic hashing
    expect(hash1).not.toBe(rawHwid);
  });

  it('should encrypt and decrypt detection evidence securely using AES-256-CBC', () => {
    const sensitiveEvidence = JSON.stringify({
      processName: 'dma_cheat.exe',
      memoryOffset: '0x7FFF0011',
      injectedDll: 'aimbot.dll',
    });

    const encrypted = EncryptionService.encryptEvidence(sensitiveEvidence);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toContain('dma_cheat');

    const decrypted = EncryptionService.decryptEvidence(encrypted);
    expect(decrypted).toBe(sensitiveEvidence);
  });

  it('should handle invalid encrypted payloads gracefully on decryption', () => {
    const invalidCipher = 'invalid_hex_string_without_iv:some_corrupted_data';
    const result = EncryptionService.decryptEvidence(invalidCipher);
    expect(result).toBe('[Decryption Failed - Evidence corrupted or key mismatch]');
  });
});
