import { Router } from 'express';
import { busController } from '../controllers';
import { validate, validateParams } from '../middleware/validation';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { createBusSchema, updateBusSchema } from '../utils/schemas';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.get('/', authenticate, busController.getAll.bind(busController));
router.get('/:id', authenticate, validateParams(z.object({ id: z.string().uuid() })), busController.getById.bind(busController));
router.post('/', authenticate, authorize('OPERATOR', 'ADMIN'), validate(createBusSchema), busController.create.bind(busController));
router.put('/:id', authenticate, authorize('OPERATOR', 'ADMIN'), validate(updateBusSchema), busController.update.bind(busController));
router.delete('/:id', authenticate, authorize('OPERATOR', 'ADMIN'), busController.delete.bind(busController));

export default router;
