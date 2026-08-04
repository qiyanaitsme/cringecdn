import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../utils/jwt.service';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: 'ADMIN' | 'MODERATOR' | 'USER';
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized', message: 'Токен не предоставлен' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const jwtService = JwtService.getInstance();
    const decoded = jwtService.verify(token);

    if (!decoded) {
      res.status(401).json({ error: 'Unauthorized', message: 'Недействительный или просроченный токен' });
      return;
    }

    // Check if user still exists and is not blocked
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, role: true, isBlocked: true },
    });

    if (!user || user.isBlocked) {
      res.status(403).json({ error: 'Forbidden', message: 'Доступ запрещен' });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка аутентификации' });
  }
};

export const optionalAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    const jwtService = JwtService.getInstance();
    const decoded = jwtService.verify(token);

    if (decoded) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, role: true, isBlocked: true },
      });

      if (user && !user.isBlocked) {
        req.user = {
          id: user.id,
          username: user.username,
          role: user.role,
        };
      }
    }

    next();
  } catch (error) {
    next();
  }
};

export const requireRole = (...roles: ('ADMIN' | 'MODERATOR' | 'USER')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Требуется аутентификация' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden', message: 'Недостаточно прав' });
      return;
    }

    next();
  };
};