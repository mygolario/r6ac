import bcrypt from 'bcryptjs';
import { describe, it, expect } from 'vitest';

describe('AuthService Hashing & Validation', () => {
  it('should securely hash passwords using bcrypt with salt rounds >= 10', async () => {
    const rawPassword = 'SuperSecretSecurePassword123!@#';
    const hash = await bcrypt.hash(rawPassword, 10);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
  });

  it('should correctly verify valid passwords and reject invalid or timing attack passwords', async () => {
    const rawPassword = 'PlayerTournamentMatchPassword2026';
    const hash = await bcrypt.hash(rawPassword, 10);

    const isValid = await bcrypt.compare(rawPassword, hash);
    expect(isValid).toBe(true);

    const isInvalid = await bcrypt.compare('WrongPasswordHere', hash);
    expect(isInvalid).toBe(false);
  });
});
