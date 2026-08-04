import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

class UserController {
  async getProfile(req: Request, res: Response): Promise<void> {
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
      logger.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка' });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    const { email, groupName } = req.body;

    try {
      // Check if email is already taken
      if (email) {
        const existing = await prisma.user.findFirst({
          where: { email, NOT: { id: userId } },
        });
        if (existing) {
          res.status(400).json({ error: 'Bad Request', message: 'Email уже используется' });
          return;
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          email: email || undefined,
          groupName: groupName || null,
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          avatar: true,
          groupName: true,
        },
      });

      res.json({ success: true, data: user });
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка обновления' });
    }
  }
}

export const userController = new UserController();