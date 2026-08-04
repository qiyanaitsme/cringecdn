import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

class AlbumController {
  async list(req: Request, res: Response): Promise<void> {
    const userId = req.userId;

    try {
      const albums = await prisma.album.findMany({
        where: {
          OR: [
            { userId: String(userId) },
            { isPublic: true },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { images: true },
          },
        },
      });

      res.json({
        success: true,
        data: albums,
      });
    } catch (error) {
      logger.error('Album list error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка получения альбомов' });
    }
  }

  async get(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.userId;

    try {
      const album = await prisma.album.findUnique({
        where: { id },
        include: {
          images: {
            orderBy: { createdAt: 'desc' },
          },
          user: {
            select: { username: true, email: true },
          },
        },
      });

      if (!album) {
        res.status(404).json({ error: 'Not Found', message: 'Альбом не найден' });
        return;
      }

      // Check access
      if (
        album.userId !== String(userId) &&
        !album.isPublic
      ) {
        res.status(403).json({ error: 'Forbidden', message: 'Доступ запрещен' });
        return;
      }

      res.json({ success: true, data: album });
    } catch (error) {
      logger.error('Album get error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка получения альбома' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    const { name, description } = req.body;
    const userId = req.userId;

    try {
      const album = await prisma.album.create({
        data: {
          name,
          description,
          userId: String(userId),
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: String(userId),
          action: 'create_album',
          metadata: { albumId: album.id, albumName: album.name },
          ipAddress: req.ip || 'unknown',
        },
      });

      res.status(201).json({ success: true, data: album });
    } catch (error) {
      logger.error('Album create error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка создания альбома' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, description, isPublic } = req.body;
    const userId = req.userId;

    try {
      const album = await prisma.album.findUnique({ where: { id } });

      if (!album) {
        res.status(404).json({ error: 'Not Found', message: 'Альбом не найден' });
        return;
      }

      if (album.userId !== String(userId)) {
        res.status(403).json({ error: 'Forbidden', message: 'Недостаточно прав' });
        return;
      }

      const updated = await prisma.album.update({
        where: { id },
        data: {
          name: name !== undefined ? name : undefined,
          description: description !== undefined ? description : undefined,
          isPublic: isPublic !== undefined ? isPublic : undefined,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: String(userId),
          action: 'update_album',
          metadata: { albumId: id, changes: { name, description, isPublic } },
          ipAddress: req.ip || 'unknown',
        },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      logger.error('Album update error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка обновления альбома' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.userId;

    try {
      const album = await prisma.album.findUnique({ where: { id } });

      if (!album) {
        res.status(404).json({ error: 'Not Found', message: 'Альбом не найден' });
        return;
      }

      if (album.userId !== String(userId)) {
        res.status(403).json({ error: 'Forbidden', message: 'Недостаточно прав' });
        return;
      }

      await prisma.album.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          actorId: String(userId),
          action: 'delete_album',
          metadata: { albumId: id },
          ipAddress: req.ip || 'unknown',
        },
      });

      res.json({ success: true, message: 'Альбом удален' });
    } catch (error) {
      logger.error('Album delete error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка удаления альбома' });
    }
  }
}

export const albumController = new AlbumController();