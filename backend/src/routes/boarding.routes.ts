import { Router } from 'express';
import { boardingController } from '../controllers';
import { validate } from '../middleware/validation';
import { authenticate, authorize } from '../middleware/auth';
import { scanTicketSchema, markBoardedSchema } from '../utils/schemas';

const router = Router();

// All boarding routes require authentication
router.post('/scan', authenticate, authorize('DRIVER'), validate(scanTicketSchema), boardingController.scan.bind(boardingController));
router.post('/board', authenticate, authorize('DRIVER'), validate(markBoardedSchema), boardingController.markBoarded.bind(boardingController));
router.post('/dropoff', authenticate, authorize('DRIVER'), validate(markBoardedSchema), boardingController.markDroppedOff.bind(boardingController));
router.get('/manifest', authenticate, authorize('DRIVER', 'OPERATOR', 'ADMIN'), boardingController.getManifest.bind(boardingController));

export default router;
