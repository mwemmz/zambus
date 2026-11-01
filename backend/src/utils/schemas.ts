import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phoneNumber: z.string().min(10).optional(),
});

// Route schemas
export const createRouteSchema = z.object({
  routeName: z.string().min(3, 'Route name must be at least 3 characters'),
  origin: z.string().min(2, 'Origin is required'),
  destination: z.string().min(2, 'Destination is required'),
  intermediateStops: z.array(z.string()).optional(),
  estimatedTravelTime: z.number().optional(),
});

export const updateRouteSchema = createRouteSchema.partial();

// Bus schemas
export const createBusSchema = z.object({
  registrationNumber: z.string().min(1, 'Registration number is required'),
  model: z.string().min(2, 'Model is required'),
  seatCapacity: z.number().min(1, 'Seat capacity must be at least 1'),
  amenities: z.array(z.string()).optional(),
  maintenanceStatus: z.enum(['OPERATIONAL', 'MAINTENANCE', 'OUT_OF_SERVICE']).optional(),
});

export const updateBusSchema = createBusSchema.partial();

// Trip schemas
export const createTripSchema = z.object({
  routeId: z.string().uuid('Invalid route ID'),
  busId: z.string().uuid('Invalid bus ID'),
  driverId: z.string().uuid('Invalid driver ID'),
  departureTime: z.string().transform((s) => new Date(s)),
  estimatedArrival: z.string().transform((s) => new Date(s)),
  fareAmount: z.number().min(0, 'Fare must be positive'),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.string().optional(),
});

export const updateTripSchema = createTripSchema.partial();

export const tripActionSchema = z.object({
  newDepartureTime: z.string().transform((s) => new Date(s)).optional(),
});

// Booking schemas
export const createBookingSchema = z.object({
  tripId: z.string().uuid('Invalid trip ID'),
  seatNumber: z.number().min(1, 'Seat number must be positive'),
});

export const confirmBookingSchema = z.object({
  paymentMethod: z.string().optional(),
});

// Boarding schemas
export const scanTicketSchema = z.object({
  qrCodeData: z.string(),
});

export const markBoardedSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
});

// Emergency schemas
export const createEmergencySchema = z.object({
  emergencyType: z.enum(['BREAKDOWN', 'ACCIDENT', 'SEVERE_DELAY']),
  description: z.string().optional(),
  location: z.string().optional(),
  tripId: z.string().uuid().optional(),
});

// Admin schemas
export const updateUserRoleSchema = z.object({
  role: z.enum(['PASSENGER', 'DRIVER', 'OPERATOR', 'ADMIN']),
});

// Optional reason sent when an admin rejects a bus/route/company
export const reviewSchema = z.object({
  reason: z.string().max(255).optional(),
});

export const updateCommissionSchema = z.object({
  commissionRate: z.number().min(0).max(1),
});

// Search/Query schemas
export const searchTripsSchema = z.object({
  origin: z.string().optional(),
  destination: z.string().optional(),
  travelDate: z.string().optional(),
  filter: z.enum(['lowestPrice', 'earliestDeparture', 'luxury', 'semiLuxury', 'standard']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const manifestQuerySchema = z.object({
  tripId: z.string().uuid('Invalid trip ID'),
});
