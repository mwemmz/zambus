import { parseQrCodeData } from './qr.service';

export interface ScanResult {
  valid: boolean;
  message: string;
  booking: any;
  status: 'VALID' | 'DUPLICATE' | 'INVALID_ROUTE' | 'WRONG_DATE' | 'NOT_FOUND';
}

export async function validateScannedTicket(qrData: string, tripId?: string): Promise<ScanResult> {
  const { Booking, Trip } = await import('../models');

  const ticketData = parseQrCodeData(qrData);

  if (!ticketData) {
    return {
      valid: false,
      message: 'Invalid QR code data',
      booking: null,
      status: 'NOT_FOUND',
    };
  }

  const booking = await Booking.findByPk(ticketData.bookingId);
  if (!booking) {
    return {
      valid: false,
      message: 'Booking not found',
      booking: null,
      status: 'NOT_FOUND',
    };
  }

  if (booking.boardingStatus === 'BOARDED') {
    return {
      valid: false,
      message: 'Ticket already used for boarding',
      booking,
      status: 'DUPLICATE',
    };
  }

  if (tripId && booking.tripId !== tripId) {
    return {
      valid: false,
      message: 'Ticket is for a different trip',
      booking,
      status: 'INVALID_ROUTE',
    };
  }

  const trip = await Trip.findByPk(booking.tripId);
  if (trip && trip.departureTime) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const departureDate = new Date(trip.departureTime);
    departureDate.setHours(0, 0, 0, 0);

    if (departureDate.getTime() !== today.getTime()) {
      return {
        valid: false,
        message: 'Ticket is not for today\'s travel',
        booking,
        status: 'WRONG_DATE',
      };
    }
  }

  return {
    valid: true,
    message: 'Valid ticket',
    booking,
    status: 'VALID',
  };
}

export async function markAsBoarded(bookingId: string): Promise<any> {
  const { Booking } = await import('../models');

  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.boardingStatus === 'BOARDED') {
    throw new Error('Passenger is already marked as boarded');
  }

  booking.boardingStatus = 'BOARDED';
  await booking.save();

  return booking;
}

export async function markAsDroppedOff(bookingId: string): Promise<any> {
  const { Booking, Trip, User } = await import('../models');

  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.boardingStatus !== 'BOARDED') {
    throw new Error('Passenger must be boarded before being marked as dropped off');
  }

  booking.boardingStatus = 'DROPPED_OFF';
  await booking.save();

  return booking;
}

export async function getManifest(tripId: string) {
  const { Trip, Booking, User, Bus, Route } = await import('../models');

  const trip = await Trip.findByPk(tripId, {
    include: [
      { model: Bus, as: 'bus' },
      { model: Route, as: 'route' },
    ],
  });

  if (!trip) {
    throw new Error('Trip not found');
  }

  const bookings = await Booking.findAll({
    where: { tripId },
    order: [['seatNumber', 'ASC']],
  });

  const passengers = await Promise.all(
    bookings.map(async (b) => {
      const passenger = await User.findByPk(b.passengerId);
      return {
        bookingId: b.bookingId,
        seatNumber: b.seatNumber,
        passengerName: passenger?.fullName || 'Unknown',
        passengerPhone: passenger?.phoneNumber || '',
        qrCodeData: b.qrCodeData,
        boardingStatus: b.boardingStatus,
        paymentStatus: b.paymentStatus,
      };
    })
  );

  return {
    trip: {
      tripId: trip.tripId,
      routeName: trip.route ? trip.route.routeName : undefined,
      origin: trip.route ? trip.route.origin : undefined,
      destination: trip.route ? trip.route.destination : undefined,
      departureTime: trip.departureTime,
      busReg: trip.bus ? trip.bus.registrationNumber : undefined,
      busModel: trip.bus ? trip.bus.model : undefined,
    },
    passengers,
    totals: {
      totalPassengers: bookings.length,
      boarded: bookings.filter((b: any) => b.boardingStatus === 'BOARDED').length,
      notBoarded: bookings.filter((b: any) => b.boardingStatus === 'NOT_BOARDED').length,
      droppedOff: bookings.filter((b: any) => b.boardingStatus === 'DROPPED_OFF').length,
    },
  };
}
