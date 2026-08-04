import { Router } from 'express';
import { albumController } from '../controllers/album.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', albumController.list);
router.get('/:id', albumController.get);
router.post('/', albumController.create);
router.put('/:id', albumController.update);
router.delete('/:id', albumController.delete);

export { router as albumRoutes };