import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'ioredis';

const redis = new createClient(process.env.REDIS_URL || 'redis://localhost:6379');

const redisStore = new RedisStore({
  sendCommand: (...args: string[]) => redis.call(...args),
  prefix: 'rl:',
});

export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore,
  keyGenerator: (req) => req.ip || 'unknown',
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Слишком много запросов. Попробуйте позже.',
    });
  },
});

export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore,
  keyGenerator: (req) => req.ip || 'unknown',
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Превышен лимит попыток. Попробуйте через 15 минут.',
    });
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore,
  keyGenerator: (req) => req.ip || 'unknown',
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Слишком много загрузок. Подождите немного.',
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore,
  keyGenerator: (req) => req.ip || 'unknown',
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Слишком много попыток входа. Попробуйте через 15 минут.',
    });
  },
});

export const rateLimiter = {
  api: apiLimiter,
  strict: strictLimiter,
  upload: uploadLimiter,
  auth: authLimiter,
};