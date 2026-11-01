import express, { Response } from "express";
import { AuthenticatedRequest } from '../middleware/auth';
import { EmergencyReport } from '../models';
import { successResponse, errorResponse } from '../utils/response';

export const emergencyController = {
  async report(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 401, 'Authentication required');
        return;
      }

      const { emergencyType, description, location, tripId } = req.body as any;
      const driverId = req.user.userId;

      const User = (await import('../models')).User;
      const driver = await User.findByPk(driverId);
      if (!driver || driver.role !== 'DRIVER') {
        errorResponse(res, 403, 'Only drivers can report emergencies');
        return;
      }

      const report = await EmergencyReport.create({
        tripId: tripId || null,
        driverId,
        emergencyType: emergencyType as any,
        description: description || null,
        location: location || null,
      });

      successResponse(res, 201, report, 'Emergency reported successfully');
    } catch (error: any) {
      errorResponse(res, 400, error.message);
    }
  },

  async getReports(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { tripId, limit = 50, offset = 0 } = req.query;

      const whereClause: any = {};
      if (tripId) whereClause.tripId = tripId;

      const reports = await EmergencyReport.findAll({
        where: whereClause,
        include: [
          { model: (await import('../models')).User, as: 'driver', attributes: ['userId', 'fullName', 'phoneNumber'] },
          { model: (await import('../models')).Trip, as: 'trip' },
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      });

      successResponse(res, 200, reports);
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },
};
