import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthRepository } from '../../repositories/auth.repository';
import { PlayerService } from '../../services/player.service';

const agentAuthSchema = z.object({
  username: z.string(),
  password: z.string(),
  hwid: z.string().min(1),
});

export async function agentRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/auth', async (request, reply) => {
    const data = agentAuthSchema.parse(request.body);
    
    let user: any;
    try {
      user = await AuthRepository.findUserByUsernameOrEmail(data.username);
    } catch (err) {
      return reply.status(401).send({ error: 'Invalid credentials or database offline.' });
    }

    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials.' });
    }

    if (user.banStatus === 'banned') {
      return reply.status(403).send({ error: 'Account banned.' });
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid credentials.' });
    }

    if (!user.hwid) {
      // First time login, bind HWID
      await PlayerService.updateHwid(user.id, data.hwid);
    } else if (user.hwid !== data.hwid) {
      return reply.status(403).send({ error: 'HWID mismatch. Contact administrator to reset HWID.' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      hwid: data.hwid,
    };

    const token = fastify.jwt.sign(payload, { expiresIn: '4h' });

    return reply.status(200).send({
      success: true,
      token,
      playerId: user.id,
    });
  });

  fastify.get('/latest-version', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            minVersion: { type: 'string' },
            downloadUrl: { type: 'string' },
            sha256: { type: 'string' },
            signature: { type: 'string' },
            releaseNotes: { type: 'string' },
            forceUpdate: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const version = '1.0.1';
    const minVersion = '1.0.0';
    const downloadUrl = 'https://r6ac-storage.s3.ir-thr-at1.arvanstorage.ir/releases/R6AC-Setup-v1.0.1.exe';
    const sha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    const secretKey = 'R6AC_UPDATE_SECURE_SECRET_KEY_32';
    const signature = crypto.createHmac('sha256', secretKey)
      .update(version + sha256)
      .digest('hex')
      .toLowerCase();

    return reply.send({
      version,
      minVersion,
      downloadUrl,
      sha256,
      signature,
      releaseNotes: 'بهبود پایداری سیستم ضد تقلب و افزودن لایه‌های امنیتی پیشرفته (Phase 5).',
      forceUpdate: false,
    });
  });
}

