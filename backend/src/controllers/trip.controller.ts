import express, { Response } from "express";
import { AuthenticatedRequest } from '../middleware/auth';
import { Trip } from '../models';
import { searchTrips, getAvailableSeats } from '../services/booking.service';
import { getManifest } from '../services/boarding.service';
import { successResponse, errorResponse, notFoundResponse } from '../utils/response';

/**
 * GET /api/trips/:id/seats
 * Returns the seat map for a trip: which seats are available and which are taken.
 * A seat is considered taken if it has ANY booking (pending or confirmed) so that
 * two passengers cannot select the same seat at the same time.
 */
export async function getTripSeats(req: AuthenticatedRequest, res: any): Promise<void> {
  try {
    const { id } = req.params as any;

    const Bus = (await import('../models')).Bus;
    const Booking = (await import('../models')).Booking;

    const trip = await Trip.findByPk(id, {
      include: [{ model: (await import('../models')).Bus, as: 'bus' }],
    });

    if (!trip) {
      notFoundResponse(res, 'Trip');
      return;
    }

    const bus = (trip as any).bus;
    const capacity = bus ? bus.seatCapacity : 40;

    // Any booking on the seat (pending or confirmed) blocks selection.
    const bookings = await Booking.findAll({
      where: { tripId: id } as any,
      attributes: ['seatNumber'],
      raw: true,
    });
    const takenSeats = bookings.map((b: any) => Number(b.seatNumber));

    const seats = Array.from({ length: capacity }, (_, i) => i + 1).map((n) => ({
      seatNumber: n,
      available: !takenSeats.includes(n),
    }));

    successResponse(res, 200, {
      tripId: id,
      busCapacity: capacity,
      availableSeats: seats.filter((s) => s.available).map((s) => s.seatNumber),
      takenSeats,
      seats,
    });
  } catch (error: any) {
    errorResponse(res, 500, error.message);
  }
}

/**
 * GET /api/trips/my/assigned
 * Lists trips assigned to the currently logged-in driver, newest first.
 * Used by the driver app so the driver can pick their trip instead of
 * typing a raw trip ID. Must be declared BEFORE the /:id route so 'my'
 * is not parsed as a trip id.
 */
export async function getMyAssignedTrips(req: AuthenticatedRequest, res: any): Promise<void> {
  try {
    const driverId = req.user?.userId;
    if (!driverId) {
      errorResponse(res, 401, 'Driver authentication required');
      return;
    }

    const trips = await Trip.findAll({
      where: { driverId } as any,
      include: [
        { model: (await import('../models')).Bus, as: 'bus', attributes: ['busId', 'registrationNumber', 'model', 'seatCapacity'] },
        { model: (await import('../models')).Route, as: 'route', attributes: ['routeId', 'routeName', 'origin', 'destination'] },
      ],
      order: [['departureTime', 'DESC']],
      limit: 50,
    });

    successResponse(res, 200, trips);
  } catch (error: any) {
    errorResponse(res, 500, error.message);
  }
}

/**
 * GET /api/trips/drivers
 * Lists all active DRIVER accounts. Used by operators when assigning a driver
 * to a new trip. Must be declared BEFORE the /:id route.
 */
export async function getDrivers(req: AuthenticatedRequest, res: any): Promise<void> {
  try {
    const User = (await import('../models')).User;
    const drivers = await User.findAll({
      where: { role: 'DRIVER', isActive: true } as any,
      attributes: ['userId', 'fullName', 'phoneNumber', 'email'],
      order: [['fullName', 'ASC']],
    });

    successResponse(res, 200, drivers);
  } catch (error: any) {
    errorResponse(res, 500, error.message);
  }
}

export const tripController = {
  async searchPublic(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { origin, destination, travelDate, filter, page, limit } = req.query as any;

      const result = await searchTrips({
        origin: origin as string,
        destination: destination as string,
        travelDate: travelDate as string,
        filter: filter as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      successResponse(res, 200, result);
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async getById(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { id } = req.params as any;

      const trip = await Trip.findByPk(id, {
        include: [
          { model: (await import('../models')).Bus, as: 'bus' },
          { model: (await import('../models')).Route, as: 'route' },
          { model: (await import('../models')).User, as: 'driver', attributes: ['userId', 'fullName', 'phoneNumber'] },
        ],
      });

      if (!trip) {
        notFoundResponse(res, 'Trip');
        return;
      }

      successResponse(res, 200, trip);
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async create(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { routeId, busId, driverId, departureTime, estimatedArrival, fareAmount, isRecurring = false, recurrencePattern } = req.body as any;
      const operatorId = req.user?.userId;

      if (!operatorId) {
        errorResponse(res, 401, 'Operator authentication required');
        return;
      }

      const User = (await import('../models')).User;
      const user = await User.findByPk(operatorId);
      if (!user || user.role !== 'OPERATOR' && user.role !== 'ADMIN') {
        errorResponse(res, 403, 'Only operators can create trips');
        return;
      }

      const BusCompany = (await import('../models')).BusCompany;
      const busCompany = await BusCompany.findOne({ where: { operatorId } });
      if (!busCompany) {
        errorResponse(res, 400, 'Operator must have a bus company');
        return;
      }

      const Bus = (await import('../models')).Bus;
      const bus = await Bus.findOne({ where: { busId, companyId: busCompany.companyId } });
      if (!bus) {
        errorResponse(res, 400, 'Bus not found or not owned by operator');
        return;
      }

      // Only admin-approved buses can be scheduled.
      if (bus.approvalStatus !== 'APPROVED') {
        errorResponse(res, 400, 'This bus is awaiting admin approval and cannot be scheduled yet');
        return;
      }

      const Route = (await import('../models')).Route;
      const route = await Route.findOne({ where: { routeId, companyId: busCompany.companyId } });
      if (!route) {
        errorResponse(res, 400, 'Route not found or not owned by operator');
        return;
      }

      // Only admin-approved routes can be scheduled.
      if (route.approvalStatus !== 'APPROVED') {
        errorResponse(res, 400, 'This route is awaiting admin approval and cannot be scheduled yet');
        return;
      }

      const Driver = (await import('../models')).User;
      const driver = await Driver.findOne({ where: { userId: driverId, role: 'DRIVER' } });
      if (!driver) {
        errorResponse(res, 400, 'Driver not found or invalid role');
        return;
      }

      const trip = await Trip.create({
        routeId,
        busId,
        driverId,
        departureTime: new Date(departureTime),
        estimatedArrival: new Date(estimatedArrival),
        fareAmount,
        isRecurring,
        recurrencePattern,
        status: 'SCHEDULED',
      });

      successResponse(res, 201, trip, 'Trip created successfully');
    } catch (error: any) {
      errorResponse(res, 400, error.message);
    }
  },

  async update(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { id } = req.params as any;
      const updates = req.body;

      const trip = await Trip.findByPk(id);
      if (!trip) {
        notFoundResponse(res, 'Trip');
        return;
      }

      await trip.update(updates);

      successResponse(res, 200, trip, 'Trip updated successfully');
    } catch (error: any) {
      errorResponse(res, 400, error.message);
    }
  },

  async openTrip(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { id } = req.params as any;

      const trip = await Trip.findByPk(id);
      if (!trip) {
        notFoundResponse(res, 'Trip');
        return;
      }

      trip.status = 'BOARDING';
      await trip.save();

      successResponse(res, 200, trip, 'Trip opened for boarding');
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async closeTrip(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { id } = req.params as any;

      const trip = await Trip.findByPk(id);
      if (!trip) {
        notFoundResponse(res, 'Trip');
        return;
      }

      trip.status = 'COMPLETED';
      await trip.save();

      successResponse(res, 200, trip, 'Trip closed');
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async delayTrip(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { id } = req.params as any;
      const { newDepartureTime } = req.body as any;

      if (!newDepartureTime) {
        errorResponse(res, 400, 'New departure time is required');
        return;
      }

      const trip = await Trip.findByPk(id);
      if (!trip) {
        notFoundResponse(res, 'Trip');
        return;
      }

      trip.departureTime = new Date(newDepartureTime);
      await trip.save();

      successResponse(res, 200, trip, 'Trip delayed');
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async cancelTrip(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { id } = req.params as any;

      const trip = await Trip.findByPk(id);
      if (!trip) {
        notFoundResponse(res, 'Trip');
        return;
      }

      trip.status = 'CANCELLED';
      await trip.save();

      successResponse(res, 200, trip, 'Trip cancelled');
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async getManifest(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { id } = req.params as any;

      const manifest = await getManifest(id);

      successResponse(res, 200, manifest);
    } catch (error: any) {
      errorResponse(res, 400, error.message);
    }
  },
};
