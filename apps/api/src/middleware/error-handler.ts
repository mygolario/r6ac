import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

export const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  const timestamp = new Date().toISOString();
  request.log.error({ err: error }, 'Global Error Handler');

  if (error instanceof ZodError) {
    const issues = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return reply.status(400).send({
      success: false,
      data: null,
      meta: { timestamp },
      error: {
        code: 'VALIDATION_ERROR',
        message: `Validation failed: ${issues}`,
        messageFA: 'خطای اعتبارسنجی ورودی‌ها.',
      },
    });
  }

  if (error.statusCode === 429) {
    return reply.status(429).send({
      success: false,
      data: null,
      meta: { timestamp },
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
        messageFA: 'درخواست‌های بیش از حد، لطفاً بعداً تلاش کنید.',
      },
    });
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  return reply.status(statusCode).send({
    success: false,
    data: null,
    meta: { timestamp },
    error: {
      code: statusCode === 404 ? 'NOT_FOUND' : statusCode === 400 ? 'BAD_REQUEST' : 'SERVER_ERROR',
      message,
      messageFA: statusCode === 404 ? 'مورد یافت نشد.' : 'خطای داخلی سرور رخ داده است.',
    },
  });
};
