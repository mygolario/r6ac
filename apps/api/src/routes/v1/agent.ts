import crypto from 'crypto';
import { FastifyInstance } from 'fastify';

export async function agentRoutes(fastify: FastifyInstance): Promise<void> {
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
