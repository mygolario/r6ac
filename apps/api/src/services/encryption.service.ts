import crypto from 'crypto';

export class EncryptionService {
  private static getAlgorithm(): string {
    return 'aes-256-cbc';
  }

  private static getKey(): Buffer {
    const keyString = process.env.ENCRYPTION_KEY || 'r6ac_secure_aes_encryption_key_32_bytes_len!';
    return crypto.createHash('sha256').update(keyString).digest();
  }

  static hashSha256(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  static encryptEvidence(evidence: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.getAlgorithm(), this.getKey(), iv);
      let encrypted = cipher.update(evidence, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (err) {
      return '';
    }
  }

  static decryptEvidence(encryptedEvidence: string): string {
    try {
      if (!encryptedEvidence || !encryptedEvidence.includes(':')) return encryptedEvidence;
      const [ivHex, cipherHex] = encryptedEvidence.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(this.getAlgorithm(), this.getKey(), iv);
      let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      return '[Decryption Failed - Evidence corrupted or key mismatch]';
    }
  }
}
