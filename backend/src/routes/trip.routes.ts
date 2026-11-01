import { Router } from 'express';
import { tripController } from '../controllers';
import { getTripSeats, getDrivers, getMyAssignedTrips } from '../controllers/trip.controller';
import { validate, validateParams, validateQuery } from '../middleware/validation';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { createTripSchema, updateTripSchema, tripActionSchema, searchTripsSchema } from '../utils/schemas';
import { z } from 'zod';

const router = Router();

// Public route - search trips
router.get('/', tripController.searchPublic.bind(tripController));

// Driver list for trip assignment (before /:id so 'drivers' is not parsed as an id)
router.get('/drivers', getDrivers);

// Trips assigned to the logged-in driver (before /:id so 'my' is not parsed as an id)
router.get('/my/assigned', authenticate, authorize('DRIVER'), getMyAssignedTrips);

// Protected routes
router.get('/search', authenticate, validateQuery(searchTripsSchema), tripController.searchPublic.bind(tripController));
router.get('/:id', authenticate, validateParams(z.object({ id: z.string().uuid() })), tripController.getById.bind(tripController));
router.get('/:id/seats', authenticate, validateParams(z.object({ id: z.string().uuid() })), getTripSeats);
router.post('/', authenticate, authorize('OPERATOR', 'ADMIN'), validate(createTripSchema), tripController.create.bind(tripController));
router.put('/:id', authenticate, authorize('OPERATOR', 'ADMIN'), validate(updateTripSchema), tripController.update.bind(tripController));

// Trip actions (master overrides)
router.post('/:id/open', authenticate, authorize('OPERATOR', 'ADMIN'), tripController.openTrip.bind(tripController));
router.post('/:id/close', authenticate, authorize('OPERATOR', 'ADMIN'), tripController.closeTrip.bind(tripController));
router.post('/:id/delay', authenticate, authorize('OPERATOR', 'ADMIN'), validate(tripActionSchema), tripController.delayTrip.bind(tripController));
router.post('/:id/cancel', authenticate, authorize('OPERATOR', 'ADMIN'), tripController.cancelTrip.bind(tripController));

// Manifest endpoint
router.get('/:id/manifest', authenticate, authorize('DRIVER', 'OPERATOR', 'ADMIN'), tripController.getManifest.bind(tripController));

export default router;
