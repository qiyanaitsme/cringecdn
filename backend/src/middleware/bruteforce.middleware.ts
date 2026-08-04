import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

interface LoginAttemptData {
  ipAddress: string;
  attemptCount: number;
  isBlocked: boolean;
  firstAttempt: Date;
  lastAttempt: Date;
  blockedUntil?: Date;
}

const MAX_ATTEMPTS = 3;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BAN_DURATION_MS = 60 * 60 * 1000; // 1 hour

export const bruteforceMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const ip = req.ip || 'unknown';
  const now = new Date();

  try {
    let attempt = await prisma.loginAttempt.findUnique({
      where: { ipAddress: ip },
    });

    // If no record exists, create one
    if (!attempt) {
      await prisma.loginAttempt.create({
        data: {
          ipAddress: ip,
          attemptCount: 0,
          isBlocked: false,
          firstAttempt: now,
          lastAttempt: now,
        },
      });
      next();
      return;
    }

    // Check if IP is currently blocked
    if (attempt.isBlocked && attempt.blockedUntil && attempt.blockedUntil > now) {
      const retryAfter = Math.ceil((attempt.blockedUntil.getTime() - now.getTime()) / 1000);
      res.set('Retry-After', retryAfter.toString());
      res.status(429).json({
        error: 'Too Many Requests',
        message: `IP заблокирован. Попробуйте через ${Math.ceil(retryAfter / 60)} минут.`,
      });
      return;
    }

    // If ban expired, unblock
    if (attempt.isBlocked && attempt.blockedUntil && attempt.blockedUntil <= now) {
      await prisma.loginAttempt.update({
        where: { ipAddress: ip },
        data: {
          isBlocked: false,
          attemptCount: 0,
          blockedUntil: null,
          firstAttempt: now,
          lastAttempt: now,
        },
      });
      next();
      return;
    }

    // Check if window has expired
    const windowStart = new Date(now.getTime() - WINDOW_MS);
    if (attempt.firstAttempt < windowStart) {
      // Window expired, reset counter
      await prisma.loginAttempt.update({
        where: { ipAddress: ip },
        data: {
          attemptCount: 0,
          firstAttempt: now,
          lastAttempt: now,
        },
      });
      next();
      return;
    }

    // Within window - allow attempt
    next();
  } catch (error) {
    logger.error('Bruteforce middleware error:', error);
    // Fail open - allow request if there's an error
    next();
  }
};

export const recordFailedAttempt = async (ip: string): Promise<void> => {
  const now = new Date();

  try {
    const attempt = await prisma.loginAttempt.findUnique({
      where: { ipAddress: ip },
    });

    if (!attempt) {
      await prisma.loginAttempt.create({
        data: {
          ipAddress: ip,
          attemptCount: 1,
          isBlocked: false,
          firstAttempt: now,
          lastAttempt: now,
        },
      });
      return;
    }

    const newCount = attempt.attemptCount + 1;

    if (newCount >= MAX_ATTEMPTS) {
      const blockedUntil = new Date(now.getTime() + BAN_DURATION_MS);
      await prisma.loginAttempt.update({
        where: { ipAddress: ip },
        data: {
          attemptCount: newCount,
          isBlocked: true,
          blockedUntil,
          lastAttempt: now,
        },
      });

      // Also add to blocked_ips table
      await prisma.blockedIp.create({
        data: {
          ipAddress: ip,
          reason: 'Превышено количество неудачных попыток входа',
          blockedBy: 'system',
          expiresAt: blockedUntil,
        },
      }).catch(() => {}); // Ignore if already exists

      return;
    }

    await prisma.loginAttempt.update({
      where: { ipAddress: ip },
      data: {
        attemptCount: newCount,
        lastAttempt: now,
      },
    });
  } catch (error) {
    logger.error('Record failed attempt error:', error);
  }
};

export const recordSuccessfulLogin = async (ip: string): Promise<void> => {
  try {
    await prisma.loginAttempt.update({
      where: { ipAddress: ip },
      data: {
        attemptCount: 0,
        isBlocked: false,
        blockedUntil: null,
      },
    });

    // Also remove from blocked_ips
    await prisma.blockedIp.delete({
      where: { ipAddress: ip },
    }).catch(() => {}); // Ignore if not exists
  } catch (error) {
    logger.error('Record successful login error:', error);
  }
};