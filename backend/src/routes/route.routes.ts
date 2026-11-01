import { Router } from 'express';
import { routeController } from '../controllers';
import { validate, validateParams } from '../middleware/validation';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { createRouteSchema, updateRouteSchema } from '../utils/schemas';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.get('/', authenticate, routeController.getAll.bind(routeController));
router.get('/:id', authenticate, validateParams(z.object({ id: z.string().uuid() })), routeController.getById.bind(routeController));
router.post('/', authenticate, authorize('OPERATOR', 'ADMIN'), validate(createRouteSchema), routeController.create.bind(routeController));
router.put('/:id', authenticate, authorize('OPERATOR', 'ADMIN'), validate(updateRouteSchema), routeController.update.bind(routeController));
router.delete('/:id', authenticate, authorize('OPERATOR', 'ADMIN'), routeController.delete.bind(routeController));

export default router;
