import { Router } from 'express';
import { bookingController } from '../controllers';
import { validate, validateParams } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { createBookingSchema, confirmBookingSchema } from '../utils/schemas';
import { z } from 'zod';

const router = Router();

// All booking routes require authentication
router.post('/', authenticate, validate(createBookingSchema), bookingController.create.bind(bookingController));
router.get('/my', authenticate, bookingController.getMyBookings.bind(bookingController));
router.get('/:id', authenticate, validateParams(z.object({ id: z.string().uuid() })), bookingController.getById.bind(bookingController));
router.post('/:id/confirm', authenticate, validate(confirmBookingSchema), bookingController.confirm.bind(bookingController));
router.post('/:id/cancel', authenticate, validateParams(z.object({ id: z.string().uuid() })), bookingController.cancel.bind(bookingController));

export default router;
