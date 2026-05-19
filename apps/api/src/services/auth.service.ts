import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { FastifyInstance } from 'fastify';
import { AuthRepository } from '../repositories/auth.repository';
import { UserRole } from '../types';

export class AuthService {
  static async register(data: { username: string; usernameFA?: string; email: string; password: string }) {
    const existingEmail = await AuthRepository.findUserByEmail(data.email);
    if (existingEmail) {
      throw { statusCode: 400, message: 'Email is already registered.', messageFA: 'ایمیل قبلاً ثبت شده است.' };
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await AuthRepository.createUser({
      username: data.username,
      usernameFa: data.usernameFA,
      email: data.email,
      passwordHash,
      role: 'player',
      banStatus: 'clean',
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      banStatus: user.banStatus,
    };
  }

  static async login(fastify: FastifyInstance, data: { email: string; password: string }) {
    const user = await AuthRepository.findUserByEmail(data.email);
    if (!user) {
      throw { statusCode: 401, message: 'Invalid credentials.', messageFA: 'اطلاعات ورود نادرست است.' };
    }

    if (user.banStatus === 'banned') {
      throw { statusCode: 403, message: 'Your account is permanently banned.', messageFA: 'حساب کاربری شما مسدود شده است.' };
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw { statusCode: 401, message: 'Invalid credentials.', messageFA: 'اطلاعات ورود نادرست است.' };
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      banStatus: user.banStatus,
    };

    const accessToken = fastify.jwt.sign(payload, { expiresIn: '15m' });

    const tokenRaw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await AuthRepository.createRefreshToken(user.id, tokenHash, expiresAt);

    return {
      user: payload,
      accessToken,
      refreshToken: tokenRaw,
    };
  }

  static async refresh(fastify: FastifyInstance, refreshTokenRaw: string) {
    if (!refreshTokenRaw) {
      throw { statusCode: 401, message: 'Refresh token missing.', messageFA: 'توکن بازیابی موجود نیست.' };
    }

    const tokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
    const rt = await AuthRepository.findRefreshToken(tokenHash);

    if (!rt || new Date(rt.expiresAt) < new Date()) {
      throw { statusCode: 401, message: 'Refresh token expired or revoked.', messageFA: 'توکن بازیابی منقضی یا باطل شده است.' };
    }

    const user = await AuthRepository.findUserById(rt.playerId);
    if (!user || user.banStatus === 'banned') {
      throw { statusCode: 403, message: 'Account banned or inactive.', messageFA: 'حساب کاربری مسدود یا غیرفعال است.' };
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      banStatus: user.banStatus,
    };

    const accessToken = fastify.jwt.sign(payload, { expiresIn: '15m' });

    return {
      accessToken,
      user: payload,
    };
  }

  static async logout(refreshTokenRaw: string) {
    if (refreshTokenRaw) {
      const tokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
      await AuthRepository.revokeRefreshToken(tokenHash);
    }
  }
}
