import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { CryptoPasswordGenerator } from '../utils/password-generator';
import { BcryptService } from '../utils/bcrypt.service';

class AdminController {
  // ============ USERS ============
  async listUsers(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 20, search, role, blocked } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    try {
      const where: any = {};

      if (search) {
        where.OR = [
          { username: { contains: String(search), mode: 'insensitive' } },
          { email: { contains: String(search), mode: 'insensitive' } },
        ];
      }

      if (role) where.role = role;
      if (blocked !== undefined) where.isBlocked = blocked === 'true';

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            avatar: true,
            groupName: true,
            totalUploads: true,
            isBlocked: true,
            blockedAt: true,
            blockedReason: true,
            mustChangePassword: true,
            lastLoginAt: true,
            createdAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      logger.error('List users error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка получения пользователей' });
    }
  }

  async getUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(id) },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          avatar: true,
          groupName: true,
          totalUploads: true,
          isBlocked: true,
          blockedAt: true,
          blockedReason: true,
          mustChangePassword: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'Not Found', message: 'Пользователь не найден' });
        return;
      }

      // Get user's images count
      const imagesCount = await prisma.image.count({ where: { userId: user.id.toString() } });
      const albumsCount = await prisma.album.count({ where: { userId: user.id.toString() } });

      res.json({
        success: true,
        data: { ...user, imagesCount, albumsCount },
      });
    } catch (error) {
      logger.error('Get user error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка получения пользователя' });
    }
  }

  async createUser(req: Request, res: Response): Promise<void> {
    const { username, email, role = 'USER', groupName } = req.body;
    const adminId = req.user?.id;

    try {
      const existing = await prisma.user.findFirst({
        where: { OR: [{ username }, { email }] },
      });

      if (existing) {
        res.status(400).json({ error: 'Bad Request', message: 'Пользователь уже существует' });
        return;
      }

      const passwordGenerator = CryptoPasswordGenerator.getInstance();
      const tempPassword = passwordGenerator.generate(12);

      const bcryptService = BcryptService.getInstance();
      const passwordHash = await bcryptService.hash(tempPassword);

      const user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
          role,
          groupName,
          mustChangePassword: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: adminId?.toString(),
          action: 'create_user',
          metadata: { userId: user.id, username: user.username, role: user.role, groupName: user.groupName },
          ipAddress: req.ip || 'unknown',
        },
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            groupName: user.groupName,
            mustChangePassword: user.mustChangePassword,
          },
          temporaryPassword: tempPassword,
        },
      });
    } catch (error) {
      logger.error('Create user error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка создания пользователя' });
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { username, email, role, groupName } = req.body;
    const adminId = req.user?.id;

    try {
      // Prevent self-demotion
      if (Number(id) === adminId && role && role !== 'ADMIN') {
        res.status(400).json({ error: 'Bad Request', message: 'Нельзя понизить свою роль' });
        return;
      }

      // Check uniqueness
      if (username || email) {
        const existing = await prisma.user.findFirst({
          where: {
            OR: [{ username: username || '' }, { email: email || '' }],
            NOT: { id: Number(id) },
          },
        });
        if (existing) {
          res.status(400).json({ error: 'Bad Request', message: 'Имя пользователя или email уже заняты' });
          return;
        }
      }

      const user = await prisma.user.update({
        where: { id: Number(id) },
        data: {
          username,
          email,
          role,
          groupName,
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          avatar: true,
          groupName: true,
          isBlocked: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: adminId?.toString(),
          action: 'update_user',
          metadata: { userId: user.id, changes: { username, email, role, groupName } },
          ipAddress: req.ip || 'unknown',
        },
      });

      res.json({ success: true, data: user });
    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка обновления пользователя' });
    }
  }

  async blockUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id;

    try {
      if (Number(id) === adminId) {
        res.status(400).json({ error: 'Bad Request', message: 'Нельзя заблокировать самого себя' });
        return;
      }

      const user = await prisma.user.update({
        where: { id: Number(id) },
        data: {
          isBlocked: true,
          blockedAt: new Date(),
          blockedBy: adminId,
          blockedReason: reason || 'Заблокирован администратором',
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: adminId?.toString(),
          action: 'block_user',
          metadata: { userId: user.id, username: user.username, reason },
          ipAddress: req.ip || 'unknown',
        },
      });

      res.json({ success: true, message: 'Пользователь заблокирован', data: { isBlocked: true } });
    } catch (error) {
      logger.error('Block user error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка блокировки' });
    }
  }

  async unblockUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const adminId = req.user?.id;

    try {
      const user = await prisma.user.update({
        where: { id: Number(id) },
        data: {
          isBlocked: false,
          blockedAt: null,
          blockedBy: null,
          blockedReason: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: adminId?.toString(),
          action: 'unblock_user',
          metadata: { userId: user.id, username: user.username },
          ipAddress: req.ip || 'unknown',
        },
      });

      res.json({ success: true, message: 'Пользователь разблокирован', data: { isBlocked: false } });
    } catch (error) {
      logger.error('Unblock user error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка разблокировки' });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const adminId = req.user?.id;

    try {
      const passwordGenerator = CryptoPasswordGenerator.getInstance();
      const tempPassword = passwordGenerator.generate(12);

      const bcryptService = BcryptService.getInstance();
      const passwordHash = await bcryptService.hash(tempPassword);

      const user = await prisma.user.update({
        where: { id: Number(id) },
        data: {
          passwordHash,
          mustChangePassword: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: adminId?.toString(),
          action: 'reset_password',
          metadata: { userId: user.id, username: user.username },
          ipAddress: req.ip || 'unknown',
        },
      });

      res.json({
        success: true,
        message: 'Пароль сброшен',
        data: { temporaryPassword: tempPassword },
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка сброса пароля' });
    }
  }

  // ============ IMAGES ============
  async listAllImages(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 20, search, userId, isPublic } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    try {
      const where: any = {};

      if (search) {
        where.originalName = { contains: String(search), mode: 'insensitive' };
      }
      if (userId) where.userId = String(userId);
      if (isPublic !== undefined) where.isPublic = isPublic === 'true';

      const [images, total] = await Promise.all([
        prisma.image.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
          include: {
            user: { select: { username: true, email: true } },
          },
        }),
        prisma.image.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          images: images.map((img) => ({
            ...img,
            url: `/uploads/${img.fileName}`,
            thumbnailUrl: img.thumbnailUrl ? `/uploads/${img.thumbnailUrl}` : null,
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      logger.error('Admin list images error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка получения изображений' });
    }
  }

  async deleteAnyImage(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const adminId = req.user?.id;

    try {
      const image = await prisma.image.findUnique({
        where: { id },
        include: { user: { select: { username: true } } },
      });

      if (!image) {
        res.status(404).json({ error: 'Not Found', message: 'Изображение не найдено' });
        return;
      }

      // Delete files
      const fs = await import('fs');
      const path = await import('path');
      const uploadPath = process.env.UPLOAD_PATH || './uploads';

      const filePath = path.join(uploadPath, image.fileName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      if (image.thumbnailUrl) {
        const thumbPath = path.join(uploadPath, image.thumbnailUrl);
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      }

      await prisma.image.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          actorId: adminId?.toString(),
          action: 'admin_delete_image',
          metadata: { imageId: id, ownerUsername: image.user.username },
          ipAddress: req.ip || 'unknown',
        },
      });

      res.json({ success: true, message: 'Изображение удалено администратором' });
    } catch (error) {
      logger.error('Admin delete image error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка удаления' });
    }
  }

  // ============ AUDIT LOGS ============
  async getAuditLogs(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 50, action, actorId, from, to } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    try {
      const where: any = {};

      if (action) where.action = action;
      if (actorId) where.actorId = actorId;
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(String(from));
        if (to) where.createdAt.lte = new Date(String(to));
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
          include: {
            actor: {
              select: { username: true, email: true },
            },
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      logger.error('Get audit logs error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка получения логов' });
    }
  }

  // ============ BLOCKED IPS ============
  async listBlockedIps(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    try {
      const [ips, total] = await Promise.all([
        prisma.blockedIp.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.blockedIp.count(),
      ]);

      res.json({
        success: true,
        data: {
          blockedIps: ips,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      logger.error('List blocked IPs error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка получения списка IP' });
    }
  }

  async blockIp(req: Request, res: Response): Promise<void> {
    const { ipAddress, reason, expiresAt } = req.body;
    const adminId = req.user?.id;

    try {
      const blocked = await prisma.blockedIp.create({
        data: {
          ipAddress,
          reason,
          blockedBy: String(adminId),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });

      // Also add to login_attempts as blocked
      await prisma.loginAttempt.upsert({
        where: { ipAddress },
        update: { isBlocked: true, blockedUntil: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
        create: {
          ipAddress,
          attemptCount: 0,
          isBlocked: true,
          blockedUntil: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: adminId?.toString(),
          action: 'block_ip',
          metadata: { ipAddress, reason, expiresAt },
          ipAddress: req.ip || 'unknown',
        },
      });

      res.status(201).json({ success: true, message: 'IP заблокирован', data: blocked });
    } catch (error) {
      logger.error('Block IP error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка блокировки IP' });
    }
  }

  async unblockIp(req: Request, res: Response): Promise<void> {
    const { ipAddress } = req.params;
    const adminId = req.user?.id;

    try {
      await prisma.blockedIp.delete({ where: { ipAddress } });

      await prisma.loginAttempt.update({
        where: { ipAddress },
        data: { isBlocked: false, blockedUntil: null, attemptCount: 0 },
      }).catch(() => {}); // Ignore if not exists

      await prisma.auditLog.create({
        data: {
          actorId: adminId?.toString(),
          action: 'unblock_ip',
          metadata: { ipAddress },
          ipAddress: req.ip || 'unknown',
        },
      });

      res.json({ success: true, message: 'IP разблокирован' });
    } catch (error) {
      logger.error('Unblock IP error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка разблокировки IP' });
    }
  }

  // ============ SETTINGS ============
  async getSettings(req: Request, res: Response): Promise<void> {
    try {
      // Return current env-based settings
      res.json({
        success: true,
        data: {
          maxFileSize: parseInt(process.env.UPLOAD_MAX_SIZE || '20971520', 10),
          allowedFormats: process.env.UPLOAD_ALLOWED_FORMATS?.split(',') || ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          registrationEnabled: process.env.REGISTRATION_ENABLED === 'true',
          jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
          rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
          rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
        },
      });
    } catch (error) {
      logger.error('Get settings error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка получения настроек' });
    }
  }

  // ============ STATS ============
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const [totalUsers, totalImages, totalAlbums, blockedUsers, blockedIps, recentUploads] = await Promise.all([
        prisma.user.count(),
        prisma.image.count(),
        prisma.album.count(),
        prisma.user.count({ where: { isBlocked: true } }),
        prisma.blockedIp.count(),
        prisma.image.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      // Storage stats
      const imagesWithSize = await prisma.image.findMany({
        select: { fileSize: true },
      });
      const totalStorage = imagesWithSize.reduce((sum, img) => sum + img.fileSize, 0);

      res.json({
        success: true,
        data: {
          totalUsers,
          totalImages,
          totalAlbums,
          blockedUsers,
          blockedIps,
          recentUploads,
          totalStorageBytes: totalStorage,
          totalStorageMB: Math.round(totalStorage / 1024 / 1024 * 100) / 100,
        },
      });
    } catch (error) {
      logger.error('Get stats error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка получения статистики' });
    }
  }
}

export const adminController = new AdminController();