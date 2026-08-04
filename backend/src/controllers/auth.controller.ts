import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { BcryptService } from '../utils/bcrypt.service';
import { JwtService } from '../utils/jwt.service';
import { logger } from '../utils/logger';
import {
  bruteforceMiddleware,
  recordFailedAttempt,
  recordSuccessfulLogin,
} from '../middleware/bruteforce.middleware';
import { Role } from '@prisma/client';

class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const { usernameOrEmail, password, rememberMe = false } = req.body;
    const ip = req.ip || 'unknown';

    try {
      // Validate input
      if (!usernameOrEmail || !password) {
        res.status(400).json({ error: 'Bad Request', message: 'Имя пользователя и пароль обязательны' });
        return;
      }

      // Find user by username or email
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: usernameOrEmail },
            { email: usernameOrEmail },
          ],
        },
      });

      // Generic error message for security
      if (!user) {
        await recordFailedAttempt(ip);
        res.status(401).json({ error: 'Unauthorized', message: 'Неверное имя пользователя или пароль' });
        return;
      }

      // Check if user is blocked
      if (user.isBlocked) {
        res.status(403).json({
          error: 'Forbidden',
          message: `Ваш аккаунт заблокирован. Причина: ${user.blockedReason || 'Не указана'}`,
        });
        return;
      }

      // Verify password
      const bcryptService = BcryptService.getInstance();
      const isValid = await bcryptService.compare(password, user.passwordHash);

      if (!isValid) {
        await recordFailedAttempt(ip);
        res.status(401).json({ error: 'Unauthorized', message: 'Неверное имя пользователя или пароль' });
        return;
      }

      // Record successful login
      await recordSuccessfulLogin(ip);

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate tokens
      const jwtService = JwtService.getInstance();
      const tokenPair = jwtService.sign(
        { userId: user.id, username: user.username, role: user.role },
        rememberMe
      );

      // Log audit
      await prisma.auditLog.create({
        data: {
          actorId: user.id.toString(),
          action: 'login',
          metadata: { rememberMe },
          ipAddress: ip,
        },
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
            avatar: user.avatar,
          },
          tokens: tokenPair,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка при входе' });
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Bad Request', message: 'Refresh token is required' });
      return;
    }

    try {
      const jwtService = JwtService.getInstance();
      const decoded = jwtService.verifyRefresh(refreshToken);

      if (!decoded) {
        res.status(401).json({ error: 'Unauthorized', message: 'Недействительный refresh token' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || user.isBlocked) {
        res.status(403).json({ error: 'Forbidden', message: 'Доступ запрещен' });
        return;
      }

      const tokenPair = jwtService.sign(
        { userId: user.id, username: user.username, role: user.role }
      );

      res.json({
        success: true,
        data: { tokens: tokenPair },
      });
    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    const ip = req.ip || 'unknown';
    const userId = req.user?.id;

    try {
      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: userId?.toString(),
          action: 'logout',
          ipAddress: ip,
        },
      });

      res.json({ success: true, message: 'Вы успешно вышли из системы' });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка при выходе' });
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user?.id;

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ error: 'Bad Request', message: 'Все поля обязательны' });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'Bad Request', message: 'Пароли не совпадают' });
      return;
    }

    // Validate password strength
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Bad Request', message: 'Пароль должен быть минимум 8 символов' });
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      res.status(400).json({ error: 'Bad Request', message: 'Пароль должен содержать заглавную букву' });
      return;
    }

    if (!/\d/.test(newPassword)) {
      res.status(400).json({ error: 'Bad Request', message: 'Пароль должен содержать цифру' });
      return;
    }

    if (!/[!@#$%^&*()_+=]/.test(newPassword)) {
      res.status(400).json({ error: 'Bad Request', message: 'Пароль должен содержать специальный символ' });
      return;
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        res.status(404).json({ error: 'Not Found', message: 'Пользователь не найден' });
        return;
      }

      const bcryptService = BcryptService.getInstance();
      const isCurrentPasswordValid = await bcryptService.compare(currentPassword, user.passwordHash);

      if (!isCurrentPasswordValid) {
        res.status(400).json({ error: 'Bad Request', message: 'Неверный текущий пароль' });
        return;
      }

      const newHash = await bcryptService.hash(newPassword);

      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newHash,
          mustChangePassword: false,
        },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          actorId: userId.toString(),
          action: 'change_password',
          ipAddress: req.ip || 'unknown',
        },
      });

      res.json({ success: true, message: 'Пароль успешно изменен' });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка смены пароля' });
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          avatar: true,
          groupName: true,
          totalUploads: true,
          isBlocked: true,
          mustChangePassword: true,
          createdAt: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'Not Found', message: 'Пользователь не найден' });
        return;
      }

      res.json({ success: true, data: user });
    } catch (error) {
      logger.error('Me error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка' });
    }
  }
}

export const authController = new AuthController();