import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authLimiter } from '../middleware/rate-limit.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Login
router.post('/login', authLimiter, authController.login);

// Refresh token
router.post('/refresh', authController.refresh);

// Logout
router.post('/logout', authMiddleware, authController.logout);

// Change password
router.post('/change-password', authMiddleware, authController.changePassword);

// Get current user
router.get('/me', authMiddleware, authController.me);

export { router as authRoutes };