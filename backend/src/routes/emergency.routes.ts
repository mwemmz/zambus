import { Router } from 'express';
import { emergencyController } from '../controllers';
import { validate } from '../middleware/validation';
import { authenticate, authorize } from '../middleware/auth';
import { createEmergencySchema } from '../utils/schemas';

const router = Router();

router.post('/', authenticate, authorize('DRIVER'), validate(createEmergencySchema), emergencyController.report.bind(emergencyController));
router.get('/', authenticate, authorize('DRIVER', 'OPERATOR', 'ADMIN'), emergencyController.getReports.bind(emergencyController));

export default router;
