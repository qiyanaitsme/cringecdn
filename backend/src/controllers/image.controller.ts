import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

class ImageController {
  async create(req: Request, res: Response): Promise<void> {
    const file = req.file;
    const userId = req.user?.id;

    if (!file) {
      res.status(400).json({ error: 'Bad Request', message: 'Файл не загружен' });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Требуется аутентификация' });
      return;
    }

    try {
      const filePath = path.join(UPLOAD_PATH, file.filename);

      // Get image dimensions
      let metadata: sharp.Metadata;
      let width: number | null = null;
      let height: number | null = null;

      try {
        metadata = await sharp(filePath).metadata();
        width = metadata.width || null;
        height = metadata.height || null;
      } catch (err) {
        // Not an image that sharp can process
        width = null;
        height = null;
      }

      // Generate thumbnail
      const thumbnailFilename = `${path.parse(file.filename).name}-thumb.webp`;
      const thumbnailPath = path.join(UPLOAD_PATH, thumbnailFilename);

      try {
        await sharp(filePath)
          .resize(300, 300, {
            fit: 'cover',
            position: 'centre',
          })
          .webp({ quality: 80 })
          .toFile(thumbnailPath);
      } catch (err) {
        // If thumbnail creation fails, skip thumbnail
        logger.warn('Thumbnail creation failed:', err);
        thumbnailFilename = undefined;
      }

      // Resize original if too large
      if (width && width > 1920) {
        const resizedPath = path.join(UPLOAD_PATH, `${file.filename}-temp`);
        await sharp(filePath)
          .resize(1920, 1920, { fit: 'inside' })
          .jpeg({ quality: 85 })
          .toFile(resizedPath);
        fs.unlinkSync(filePath);
        fs.renameSync(resizedPath, filePath);
      }

      // Create image record in database
      const image = await prisma.image.create({
        data: {
          userId: userId.toString(),
          fileName: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          width,
          height,
          thumbnailUrl: thumbnailFilename || null,
          isPublic: true,
        },
      });

      // Increment user upload count
      await prisma.user.update({
        where: { id: userId },
        data: { totalUploads: { increment: 1 } },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          actorId: userId.toString(),
          action: 'upload',
          metadata: {
            imageId: image.id,
            fileName: image.fileName,
            fileSize: image.fileSize,
          },
          ipAddress: req.ip || 'unknown',
        },
      });

      res.status(201).json({
        success: true,
        data: {
          ...image,
          url: `/uploads/${image.fileName}`,
          thumbnailUrl: image.thumbnailUrl ? `/uploads/${image.thumbnailUrl}` : null,
        },
      });
    } catch (error) {
      logger.error('Image create error:', error);
      // Clean up uploaded file on error
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка загрузки изображения' });
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 20, orderBy = 'createdAt', order = 'desc' } = req.query;
    const userId = req.userId;

    const skip = (Number(page) - 1) * Number(limit);

    try {
      const where: any = {};

      // Admin sees all, user sees only their own
      if (req.user?.role !== 'ADMIN') {
        where.userId = userId?.toString();
      }

      const [images, total] = await Promise.all([
        prisma.image.findMany({
          where,
          orderBy: { [orderBy as string]: order === 'asc' ? 'asc' : 'desc' },
          skip,
          take: Number(limit),
          include: {
            user: {
              select: { username: true, avatar: true },
            },
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
      logger.error('Image list error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка получения списка' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const image = await prisma.image.findUnique({
        where: { id },
        include: {
          user: {
            select: { username: true, avatar: true },
          },
        },
      });

      if (!image) {
        res.status(404).json({ error: 'Not Found', message: 'Изображение не найдено' });
        return;
      }

      res.json({
        success: true,
        data: {
          ...image,
          url: `/uploads/${image.fileName}`,
          thumbnailUrl: image.thumbnailUrl ? `/uploads/${image.thumbnailUrl}` : null,
          directUrl: `https://${req.get('host')}/uploads/${image.fileName}`,
          html: `<img src="https://${req.get('host')}/uploads/${image.fileName}" alt="${image.originalName}" />`,
          bbcode: `[img]https://${req.get('host')}/uploads/${image.fileName}[/img]`,
          markdown: `![${image.originalName}](https://${req.get('host')}/uploads/${image.fileName})`,
        },
      });
    } catch (error) {
      logger.error('Image get error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка получения изображения' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.userId;

    try {
      const image = await prisma.image.findUnique({ where: { id } });

      if (!image) {
        res.status(404).json({ error: 'Not Found', message: 'Изображение не найдено' });
        return;
      }

      // Only owner or admin can delete
      if (String(image.userId) !== String(userId) && req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Forbidden', message: 'Недостаточно прав' });
        return;
      }

      // Delete files
      const filePath = path.join(UPLOAD_PATH, image.fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      if (image.thumbnailUrl) {
        const thumbPath = path.join(UPLOAD_PATH, image.thumbnailUrl);
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
        }
      }

      await prisma.image.delete({ where: { id } });

      // Log audit
      await prisma.auditLog.create({
        data: {
          actorId: userId?.toString(),
          action: 'delete_image',
          metadata: { imageId: id },
          ipAddress: req.ip || 'unknown',
        },
      });

      res.json({ success: true, message: 'Изображение удалено' });
    } catch (error) {
      logger.error('Image delete error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка удаления' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { isPublic } = req.body;

    try {
      const image = await prisma.image.findUnique({ where: { id } });

      if (!image) {
        res.status(404).json({ error: 'Not Found', message: 'Изображение не найдено' });
        return;
      }

      if (String(image.userId) !== String(req.userId)) {
        res.status(403).json({ error: 'Forbidden', message: 'Недостаточно прав' });
        return;
      }

      const updated = await prisma.image.update({
        where: { id },
        data: { isPublic: isPublic !== undefined ? isPublic : image.isPublic },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      logger.error('Image update error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Ошибка обновления' });
    }
  }
}

export const imageController = new ImageController();