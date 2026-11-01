import express, { Response } from "express";
import { AuthenticatedRequest } from '../middleware/auth';
import { createBooking, confirmBooking, getBookingById, getPassengerBookings, cancelBooking } from '../services/booking.service';
import { successResponse, errorResponse, notFoundResponse } from '../utils/response';

export const bookingController = {
  async create(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 401, 'Authentication required');
        return;
      }

      const { tripId, seatNumber } = req.body;
      const passengerId = req.user.userId;

      const booking = await createBooking({ tripId, passengerId, seatNumber });

      successResponse(res, 201, booking, 'Seat reserved. Please confirm payment.');
    } catch (error: any) {
      errorResponse(res, 400, error.message);
    }
  },

  async confirm(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { id } = req.params as any;
      const { paymentMethod } = req.body as any;

      const booking = await confirmBooking(id);

      successResponse(res, 200, booking, 'Payment confirmed. Booking is now active.');
    } catch (error: any) {
      errorResponse(res, 400, error.message);
    }
  },

  async getById(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { id } = req.params as any;

      const bookingDetails = await getBookingById(id);

      if (!bookingDetails) {
        notFoundResponse(res, 'Booking');
        return;
      }

      const t = bookingDetails.trip as any;
      const p = bookingDetails.passenger as any;

      successResponse(res, 200, {
        booking: {
          bookingId: bookingDetails.booking.bookingId,
          tripId: bookingDetails.booking.tripId,
          passengerId: bookingDetails.booking.passengerId,
          seatNumber: bookingDetails.booking.seatNumber,
          qrCodeData: bookingDetails.booking.qrCodeData,
          paymentStatus: bookingDetails.booking.paymentStatus,
          boardingStatus: bookingDetails.booking.boardingStatus,
          createdAt: bookingDetails.booking.createdAt,
        },
        trip: t ? {
          tripId: t.tripId,
          routeName: t.route ? t.route.routeName : undefined,
          origin: t.route ? t.route.origin : undefined,
          destination: t.route ? t.route.destination : undefined,
          departureTime: t.departureTime,
          estimatedArrival: t.estimatedArrival,
          fareAmount: t.fareAmount,
          busReg: t.bus ? t.bus.registrationNumber : undefined,
          busModel: t.bus ? t.bus.model : undefined,
        } : null,
        passenger: p ? {
          fullName: p.fullName,
          phoneNumber: p.phoneNumber,
          email: p.email,
        } : null,
      });
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async getMyBookings(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 401, 'Authentication required');
        return;
      }

      const bookings = await getPassengerBookings(req.user.userId);

      const formattedBookings = bookings.map((b) => {
        const t = b.trip as any;
        return {
          bookingId: b.booking.bookingId,
          tripId: b.booking.tripId,
          seatNumber: b.booking.seatNumber,
          qrCodeData: b.booking.qrCodeData,
          paymentStatus: b.booking.paymentStatus,
          boardingStatus: b.booking.boardingStatus,
          createdAt: b.booking.createdAt,
          trip: t ? {
            tripId: t.tripId,
            routeName: t.route ? t.route.routeName : undefined,
            origin: t.route ? t.route.origin : undefined,
            destination: t.route ? t.route.destination : undefined,
            departureTime: t.departureTime,
            estimatedArrival: t.estimatedArrival,
            fareAmount: t.fareAmount,
            busReg: t.bus ? t.bus.registrationNumber : undefined,
            busModel: t.bus ? t.bus.model : undefined,
          } : null,
        };
      });

      successResponse(res, 200, formattedBookings);
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async cancel(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { id } = req.params as any;

      const booking = await cancelBooking(id);

      successResponse(res, 200, booking, 'Booking cancelled. Refund processed.');
    } catch (error: any) {
      errorResponse(res, 400, error.message);
    }
  },
};
