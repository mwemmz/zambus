import { Router } from 'express';
import { adminController } from '../controllers';
import { validate, validateParams } from '../middleware/validation';
import { authenticate, authorize } from '../middleware/auth';
import { updateUserRoleSchema, updateCommissionSchema, reviewSchema } from '../utils/schemas';
import { z } from 'zod';

const router = Router();

// All admin routes require admin role
// Bus & route approval review
router.get('/buses', authenticate, authorize('ADMIN'), adminController.getBuses.bind(adminController));
router.post('/buses/:id/approve', authenticate, authorize('ADMIN'), validateParams(z.object({ id: z.string().uuid() })), adminController.approveBus.bind(adminController));
router.post('/buses/:id/reject', authenticate, authorize('ADMIN'), validateParams(z.object({ id: z.string().uuid() })), validate(reviewSchema), adminController.rejectBus.bind(adminController));
router.get('/routes', authenticate, authorize('ADMIN'), adminController.getRoutes.bind(adminController));
router.post('/routes/:id/approve', authenticate, authorize('ADMIN'), validateParams(z.object({ id: z.string().uuid() })), adminController.approveRoute.bind(adminController));
router.post('/routes/:id/reject', authenticate, authorize('ADMIN'), validateParams(z.object({ id: z.string().uuid() })), validate(reviewSchema), adminController.rejectRoute.bind(adminController));

router.get('/companies/pending', authenticate, authorize('ADMIN'), adminController.getPendingCompanies.bind(adminController));
router.post('/companies/:id/approve', authenticate, authorize('ADMIN'), validateParams(z.object({ id: z.string().uuid() })), adminController.approveCompany.bind(adminController));
router.post('/companies/:id/reject', authenticate, authorize('ADMIN'), validateParams(z.object({ id: z.string().uuid() })), adminController.rejectCompany.bind(adminController));

router.get('/users', authenticate, authorize('ADMIN'), adminController.getAllUsers.bind(adminController));
router.put('/users/:id/role', authenticate, authorize('ADMIN'), validate(updateUserRoleSchema), adminController.updateUserRole.bind(adminController));

// Operators get company-scoped analytics for their revenue dashboard;
// admins get platform-wide metrics (the controller scopes by role).
router.get('/analytics', authenticate, authorize('ADMIN', 'OPERATOR'), adminController.getAnalytics.bind(adminController));
router.put('/settings/commission', authenticate, authorize('ADMIN'), validate(updateCommissionSchema), adminController.updateCommission.bind(adminController));

// Platform settings
router.get('/settings', authenticate, authorize('ADMIN'), adminController.getSettings.bind(adminController));
router.put('/settings', authenticate, authorize('ADMIN'), adminController.updateSettings.bind(adminController));

export default router;
