export type Role = 'PASSENGER' | 'DRIVER' | 'OPERATOR' | 'ADMIN';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: Role;
  isActive: boolean;
  createdAt?: string;
}

export interface Company {
  companyId: string;
  operatorId: string;
  companyName: string;
  registrationNumber?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  isApproved: boolean;
  createdAt?: string;
  operator?: Pick<User, 'userId' | 'fullName' | 'email' | 'phoneNumber'>;
}

export interface Bus {
  busId: string;
  companyId: string;
  registrationNumber: string;
  model: string;
  seatCapacity: number;
  amenities: string[];
  maintenanceStatus: 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  approvalStatus: ApprovalStatus;
  rejectionReason?: string | null;
  company?: { companyId: string; companyName: string };
  createdAt?: string;
}

export interface Route {
  routeId: string;
  companyId: string;
  routeName: string;
  origin: string;
  destination: string;
  intermediateStops: string[];
  estimatedTravelTime?: number | null;
  approvalStatus: ApprovalStatus;
  rejectionReason?: string | null;
  company?: { companyId: string; companyName: string };
  createdAt?: string;
}

export type TripStatus = 'SCHEDULED' | 'BOARDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface Trip {
  tripId: string;
  busId: string;
  routeId: string;
  driverId: string;
  departureTime: string;
  estimatedArrival: string;
  fareAmount: string | number;
  status: TripStatus;
  isRecurring: boolean;
  recurrencePattern?: string | null;
  bus?: Bus;
  route?: Route;
  driver?: Pick<User, 'userId' | 'fullName' | 'phoneNumber'>;
  remainingSeats?: number;
  busCategory?: string;
  createdAt?: string;
}

export interface TripSearchResult {
  trips: Trip[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REFUNDED';
export type BoardingStatus = 'NOT_BOARDED' | 'BOARDED' | 'DROPPED_OFF';

export interface Booking {
  bookingId: string;
  tripId: string;
  passengerId: string;
  seatNumber: number;
  qrCodeData: string;
  paymentStatus: PaymentStatus;
  boardingStatus: BoardingStatus;
  paymentMethod?: 'MOCK' | 'MOBILE_MONEY' | null;
  payerMobile?: string | null;
  paymentReference?: string | null;
  paidAt?: string | null;
  createdAt?: string;
}

export interface BookingTripSummary {
  tripId: string;
  routeName?: string;
  origin?: string;
  destination?: string;
  departureTime?: string;
  estimatedArrival?: string;
  fareAmount?: string | number;
  busReg?: string;
  busModel?: string;
}

export interface BookingListItem extends Booking {
  trip: BookingTripSummary | null;
}

export interface BookingDetails {
  booking: Booking;
  trip: BookingTripSummary | null;
  passenger: { fullName: string; phoneNumber: string; email: string } | null;
}

export interface SeatMap {
  tripId: string;
  busCapacity: number;
  availableSeats: number[];
  takenSeats: number[];
  seats: { seatNumber: number; available: boolean }[];
}

export interface ManifestPassenger {
  bookingId: string;
  seatNumber: number;
  passengerName: string;
  passengerPhone: string;
  qrCodeData: string;
  boardingStatus: BoardingStatus;
  paymentStatus: PaymentStatus;
}

export interface Manifest {
  trip: {
    tripId: string;
    routeName?: string;
    origin?: string;
    destination?: string;
    departureTime: string;
    busReg?: string;
    busModel?: string;
  };
  passengers: ManifestPassenger[];
  totals: {
    totalPassengers: number;
    boarded: number;
    notBoarded: number;
    droppedOff: number;
  };
}

export interface ScanResult {
  valid: boolean;
  status: 'VALID' | 'DUPLICATE' | 'INVALID_ROUTE' | 'WRONG_DATE' | 'NOT_FOUND' | 'CANCELLED' | 'UNPAID';
  message: string;
  booking: {
    bookingId: string;
    seatNumber: number;
    passengerName?: string;
    boardingStatus: BoardingStatus;
  } | null;
}

export type EmergencyType = 'BREAKDOWN' | 'ACCIDENT' | 'SEVERE_DELAY';

export interface EmergencyReport {
  reportId: string;
  tripId?: string | null;
  driverId?: string | null;
  emergencyType: EmergencyType;
  description?: string | null;
  location?: string | null;
  createdAt?: string;
  driver?: Pick<User, 'userId' | 'fullName' | 'phoneNumber'>;
  trip?: Trip;
}

export interface Analytics {
  totalUsers: number;
  totalOperators: number;
  totalBuses?: number;
  totalRoutes?: number;
  totalActiveTrips: number;
  totalBookings: number;
  totalRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  netPayout: number;
  hasCompany?: boolean;
}

export interface PlatformSettings {
  commissionRate: number;
  platformName: string;
  currency: string;
  seatLockDurationMinutes: number;
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  limit: number;
}
