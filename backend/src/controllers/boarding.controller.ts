import express, { Response } from "express";
import { AuthenticatedRequest } from '../middleware/auth';
import { validateScannedTicket, markAsBoarded, markAsDroppedOff, getManifest } from '../services/boarding.service';
import { successResponse, errorResponse, notFoundResponse } from '../utils/response';

export const boardingController = {
  async scan(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { qrCodeData, tripId } = req.body as any;

      const result = await validateScannedTicket(qrCodeData, tripId);

      successResponse(res, 200, {
        valid: result.valid,
        status: result.status,
        message: result.message,
        booking: result.booking ? {
          bookingId: result.booking.bookingId,
          seatNumber: result.booking.seatNumber,
          passengerName: (result.booking as any).passenger?.fullName,
          boardingStatus: result.booking.boardingStatus,
        } : null,
      });
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async markBoarded(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { bookingId } = req.body as any;

      const booking = await markAsBoarded(bookingId);

      successResponse(res, 200, booking, 'Passenger marked as boarded');
    } catch (error: any) {
      errorResponse(res, 400, error.message);
    }
  },

  async markDroppedOff(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { bookingId } = req.body as any;

      const booking = await markAsDroppedOff(bookingId);

      successResponse(res, 200, booking, 'Passenger marked as dropped off');
    } catch (error: any) {
      errorResponse(res, 400, error.message);
    }
  },

  async getManifest(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { tripId } = req.query as any;

      if (!tripId) {
        errorResponse(res, 400, 'Trip ID is required');
        return;
      }

      const manifest = await getManifest(tripId as string);

      successResponse(res, 200, manifest);
    } catch (error: any) {
      errorResponse(res, 400, error.message);
    }
  },
};
