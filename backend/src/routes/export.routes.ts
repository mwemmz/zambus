import { Router } from 'express';
import { exportController } from '../controllers';
import { authenticate, authorize } from '../middleware/auth';
import { validateParams } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

router.get('/manifest/:tripId/pdf', authenticate, authorize('OPERATOR', 'ADMIN'), validateParams(z.object({ tripId: z.string().uuid() })), exportController.downloadPdf.bind(exportController));
router.get('/manifest/:tripId/excel', authenticate, authorize('OPERATOR', 'ADMIN'), validateParams(z.object({ tripId: z.string().uuid() })), exportController.downloadExcel.bind(exportController));

export default router;
