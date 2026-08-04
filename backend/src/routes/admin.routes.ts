import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('ADMIN'));

// Stats
router.get('/stats', adminController.getStats);

// Settings
router.get('/settings', adminController.getSettings);

// Users
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.post('/users/:id/block', adminController.blockUser);
router.post('/users/:id/unblock', adminController.unblockUser);
router.post('/users/:id/reset-password', adminController.resetPassword);

// Images
router.get('/images', adminController.listAllImages);
router.delete('/images/:id', adminController.deleteAnyImage);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

// Blocked IPs
router.get('/blocked-ips', adminController.listBlockedIps);
router.post('/blocked-ips', adminController.blockIp);
router.delete('/blocked-ips/:ipAddress', adminController.unblockIp);

export { router as adminRoutes };