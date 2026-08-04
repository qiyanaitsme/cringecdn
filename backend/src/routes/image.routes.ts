import { Router } from 'express';
import { imageController } from '../controllers/image.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadMiddleware, handleUpload } from '../middleware/upload.middleware';
import { uploadLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

router.use(authMiddleware);

// All image routes require authentication
router.get('/', imageController.list);
router.get('/:id', imageController.getById);
router.post('/', uploadLimiter, uploadMiddleware, handleUpload, imageController.create);
router.put('/:id', imageController.update);
router.delete('/:id', imageController.delete);

export { router as imageRoutes };