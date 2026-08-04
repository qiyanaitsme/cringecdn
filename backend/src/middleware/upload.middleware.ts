import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req: Request, _file: Express.Multer.File, cb: (error: null | Error, destination: string) => void) => {
    cb(null, UPLOAD_PATH);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: null | Error, filename: string) => void) => {
    const ext = path.extname(file.originalname);
    const filename = `${nanoid(8)}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: (error: null | Error, accept: boolean) => void
): void => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(new Error(`Недопустимый тип файла: ${file.mimetype}`), false);
    return;
  }
  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_SIZE || '20971520', 10), // 20MB
    files: 10, // Maximum 10 files per request
  },
  fileFilter,
});

export const handleUpload = (req: Request, res: Response, next: NextFunction): void => {
  const upload = uploadMiddleware.single('image');

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          error: 'File too large',
          message: 'Размер файла превышает 20MB',
        });
        return;
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        res.status(400).json({
          error: 'Too many files',
          message: 'Слишком много файлов',
        });
        return;
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        res.status(400).json({
          error: 'Unexpected file',
          message: 'Неожиданный файл',
        });
        return;
      }
    }

    if (err) {
      res.status(400).json({
        error: 'Upload Error',
        message: err.message,
      });
      return;
    }

    next();
  });
};