import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { generateQrCodeData } from './qr.service';
import { releaseExpiredSeatLocks } from './seat-lock.service';

interface CreateBookingInput {
  tripId: string;
  passengerId: string;
  seatNumber: number;
}

interface BookingResult {
  booking: any;
  trip: any;
  passenger: any;
}

export async function createBooking(input: CreateBookingInput): Promise<any> {
  // Release any expired seat locks before creating a new booking
  await releaseExpiredSeatLocks();

  const Transaction = sequelize as any;
  const Sequelize = sequelize; const transaction = await sequelize.transaction();

  try {
    const Trip = (await import('../models')).Trip;
    const Booking = (await import('../models')).Booking;
    const Bus = (await import('../models')).Bus;

    const trip = await Trip.findOne({
      where: { tripId: input.tripId },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!trip) {
      throw new Error('Trip not found');
    }

    if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
      throw new Error('This trip is no longer available for booking');
    }

    if (new Date(trip.departureTime).getTime() <= Date.now()) {
      throw new Error('This trip has already departed');
    }

    // Only live holds block a seat. Refunded/cancelled bookings keep their row
    // for the audit trail but must not stop the seat being sold again — the
    // seat map already treats them as free.
    const existingBooking = await Booking.findOne({
      where: {
        tripId: input.tripId,
        seatNumber: input.seatNumber,
        paymentStatus: { [Op.ne]: 'REFUNDED' },
      },
      transaction,
    });

    if (existingBooking) {
      throw new Error('Seat is already booked');
    }

    const tripWithBus = await Trip.findByPk(input.tripId, {
      include: [{ model: Bus, as: 'bus' }],
      transaction,
    });

    if (!tripWithBus) {
      throw new Error('Trip not found');
    }

    const busData = tripWithBus.bus;
    const busCapacity = busData ? busData.seatCapacity : 40;
    if (busData && input.seatNumber > busCapacity) {
      throw new Error(`Seat number exceeds bus capacity of ${busCapacity}`);
    }

    const qrData = await generateQrCodeData({
      bookingId: 'pending',
      passengerName: 'Pending',
      seatNumber: input.seatNumber,
      route: tripWithBus.route ? tripWithBus.route.routeName : 'Unknown Route',
      busReg: busData ? busData.registrationNumber : 'Unknown',
      departureTime: tripWithBus.departureTime.toISOString(),
      boardingStatus: 'NOT_BOARDED',
    });

    const booking = await Booking.create(
      {
        tripId: input.tripId,
        passengerId: input.passengerId,
        seatNumber: input.seatNumber,
        qrCodeData: qrData,
        paymentStatus: 'PENDING',
        boardingStatus: 'NOT_BOARDED',
      },
      { transaction }
    );

    await transaction.commit();
    return booking;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

interface ConfirmBookingInput {
  paymentMethod?: 'MOCK' | 'MOBILE_MONEY';
  /** Mobile money wallet the passenger paid from (E.164-ish, digits only). */
  mobileNumber?: string;
  /** The 4-digit PIN the passenger typed into the payment prompt. */
  pin?: string;
}

/**
 * Mock mobile-money payment reference. Real integrations would return the
 * network operator's transaction id here (e.g. MTN MoMo / Airtel Money).
 */
function createMobileMoneyReference(): string {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MM-${Date.now().toString(36).toUpperCase()}-${suffix}`;
}

export async function confirmBooking(
  bookingId: string,
  userId?: string,
  role?: string,
  payment: ConfirmBookingInput = {},
): Promise<any> {
  const { Trip, Booking, User, Bus, Route } = await import('../models');

  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  if (!userId) {
    throw new Error('Authentication required');
  }

  if (booking.passengerId !== userId && role !== 'ADMIN') {
    throw new Error('You can only confirm your own bookings');
  }

  if (booking.paymentStatus === 'REFUNDED') {
    throw new Error('This booking has been cancelled');
  }

  if (booking.paymentStatus === 'CONFIRMED') {
    throw new Error('Booking is already confirmed');
  }

  const trip = await Trip.findByPk(booking.tripId, {
    include: [{ model: Bus, as: 'bus' }, { model: Route, as: 'route' }],
  });

  if (!trip) {
    throw new Error('Trip not found');
  }

  if (trip.status === 'CANCELLED') {
    throw new Error('This trip has been cancelled');
  }

  if (trip.status === 'COMPLETED' || trip.status === 'IN_TRANSIT') {
    throw new Error('This trip is no longer available for payment');
  }

  if (new Date(trip.departureTime).getTime() <= Date.now()) {
    throw new Error('This trip has already departed');
  }

  const passenger = await User.findByPk(booking.passengerId);

  const paymentMethod = payment.paymentMethod ?? 'MOCK';

  if (paymentMethod === 'MOBILE_MONEY') {
    const mobileNumber = payment.mobileNumber?.replace(/\s+/g, '');

    if (!mobileNumber) {
      throw new Error('Mobile number is required for mobile money payments');
    }

    // The PIN is intentionally not verified: this is the mock payment step, so
    // any 4 digits approve the charge. The route schema already enforces /^\d{4}$/.
    if (!payment.pin || !/^\d{4}$/.test(payment.pin)) {
      throw new Error('Enter your 4-digit PIN to approve the payment');
    }

    booking.payerMobile = mobileNumber;
    booking.paymentReference = createMobileMoneyReference();
  }

  const qrData = await generateQrCodeData({
    bookingId: booking.bookingId,
    passengerName: passenger?.fullName || 'Unknown',
    seatNumber: booking.seatNumber,
    route: trip.route ? trip.route.routeName : 'Unknown Route',
    busReg: trip.bus ? trip.bus.registrationNumber : 'Unknown',
    departureTime: trip.departureTime.toISOString(),
    boardingStatus: booking.boardingStatus,
  });

  booking.paymentStatus = 'CONFIRMED';
  booking.paymentMethod = paymentMethod;
  booking.paidAt = new Date();
  booking.qrCodeData = qrData;
  await booking.save();

  return booking;
}

export async function getBookingById(bookingId: string): Promise<BookingResult | null> {
  const { Trip, Booking, User, Bus, Route } = await import('../models');

  const booking = await Booking.findByPk(bookingId);
  if (!booking) return null;

  const trip = await Trip.findByPk(booking.tripId, {
    include: [{ model: Bus, as: 'bus' }, { model: Route, as: 'route' }],
  });
  const passenger = await User.findByPk(booking.passengerId);

  return { booking, trip, passenger };
}

export async function getPassengerBookings(passengerId: string): Promise<BookingResult[]> {
  const { Trip, Booking, User, Bus, Route } = await import('../models');

  const bookings = await Booking.findAll({
    where: { passengerId },
    order: [['createdAt', 'DESC']],
  });

  const results: BookingResult[] = await Promise.all(
    bookings.map(async (b) => {
      const trip = await Trip.findByPk(b.tripId, {
        include: [{ model: Bus, as: 'bus' }, { model: Route, as: 'route' }],
      });
      const passenger = await User.findByPk(b.passengerId);
      return { booking: b, trip, passenger };
    })
  );

  return results;
}

export async function cancelBooking(
  bookingId: string,
  userId?: string,
  role?: string,
): Promise<any> {
  const { Booking, Trip } = await import('../models');

  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  if (!userId) {
    throw new Error('Authentication required');
  }

  if (booking.passengerId !== userId && role !== 'ADMIN') {
    throw new Error('You can only cancel your own bookings');
  }

  if (booking.paymentStatus === 'REFUNDED') {
    throw new Error('This booking has already been cancelled');
  }

  if (booking.boardingStatus !== 'NOT_BOARDED') {
    throw new Error('Cannot cancel a booking that has already been used for boarding');
  }

  const trip = await Trip.findByPk(booking.tripId);
  if (!trip) {
    throw new Error('Trip not found');
  }

  // Allow refunds for trips the operator cancelled, but not for a trip that
  // has already departed under its own schedule.
  if (trip.status !== 'CANCELLED' && new Date(trip.departureTime).getTime() <= Date.now()) {
    throw new Error('Cannot cancel a booking after the trip has departed');
  }

  booking.paymentStatus = 'REFUNDED';
  await booking.save();

  return booking;
}

export async function getAvailableSeats(tripId: string, busCapacity: number): Promise<number[]> {
  const { Booking } = await import('../models');

  const bookedSeats = await Booking.findAll({
    where: {
      tripId,
      paymentStatus: 'CONFIRMED',
    },
    attributes: ['seatNumber'],
    raw: true,
  });

  const bookedSeatNumbers = new Set(bookedSeats.map((b: any) => b.seatNumber));
  const availableSeats: number[] = [];

  for (let i = 1; i <= busCapacity; i++) {
    if (!bookedSeatNumbers.has(i)) {
      availableSeats.push(i);
    }
  }

  return availableSeats;
}

export async function searchTrips(options: {
  origin?: string;
  destination?: string;
  travelDate?: string;
  filter?: string;
  page?: number;
  limit?: number;
  includePast?: boolean;
}) {
  const { Trip, Booking, Bus, Route } = await import('../models');
  // Op is imported from 'sequelize' at the top of this file

  const {
    origin,
    destination,
    travelDate,
    filter,
    page = 1,
    limit = 20,
    includePast = false,
  } = options;

  // Trip-level filters
  const tripWhere: any = {};
  const now = new Date();

  if (travelDate) {
    const date = new Date(travelDate);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const start = includePast || startOfDay.getTime() >= now.getTime() ? startOfDay : now;

    tripWhere.departureTime = {
      [Op.between]: [start, endOfDay],
    };
  } else if (!includePast) {
    // Public search only shows trips that can still be booked.
    tripWhere.departureTime = { [Op.gte]: now };
  }

  tripWhere.status = { [Op.notIn]: ['CANCELLED'] };

  // Route-level filters (origin/destination live on the Route model)
  const routeWhere: any = {};
  if (origin) routeWhere.origin = { [Op.iLike]: `%${origin}%` };
  if (destination) routeWhere.destination = { [Op.iLike]: `%${destination}%` };

  const hasRouteFilter = Object.keys(routeWhere).length > 0;

  let order: any[] = [['departureTime', 'ASC']];
  if (filter === 'lowestPrice') {
    order = [['fareAmount', 'ASC']];
  }

  const include: any[] = [
    {
      model: Bus,
      as: 'bus',
      attributes: ['busId', 'registrationNumber', 'model', 'seatCapacity', 'maintenanceStatus', 'amenities'],
    },
    {
      model: Route,
      as: 'route',
      where: hasRouteFilter ? routeWhere : undefined,
      attributes: ['routeId', 'routeName', 'origin', 'destination'],
    },
  ];

  const { count, rows } = await Trip.findAndCountAll({
    where: tripWhere,
    include,
    order,
    limit,
    offset: (page - 1) * limit,
    distinct: true,
  });

  const tripsWithSeats = await Promise.all(
    rows.map(async (trip: any) => {
      // PENDING bookings hold a seat for the payment window, so they count as
      // unavailable just like confirmed bookings. Refunded ones do not.
      const bookedCount = await Booking.count({
        where: {
          tripId: trip.tripId,
          paymentStatus: { [Op.in]: ['PENDING', 'CONFIRMED'] },
        },
      });

      const busData = trip.bus;
      const busCapacity = busData ? busData.seatCapacity : 40;
      const remainingSeats = Math.max(0, busCapacity - bookedCount);

      return {
        ...trip.toJSON(),
        remainingSeats,
        busCategory: getBusCategory(busData ? busData.amenities : []),
      };
    })
  );

  return {
    trips: tripsWithSeats,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
}

function getBusCategory(amenities: any): string {
  if (!amenities || !Array.isArray(amenities)) return 'Standard';
  const safeAmenities = amenities.filter((a: any): a is string => typeof a === 'string');
  const luxuryAmenities = ['wifi', 'tv', 'toilet', 'ac'];
  const hasLuxury = luxuryAmenities.every((a) => safeAmenities.some((am) => am.toLowerCase().includes(a)));

  if (hasLuxury) return 'Luxury';

  const hasSome = safeAmenities.some((am) => am.toLowerCase().includes('ac') || am.toLowerCase().includes('wifi'));
  if (hasSome) return 'Semi-Luxury';

  return 'Standard';
}
