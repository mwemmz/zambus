import express, { Response } from "express";
import { AuthenticatedRequest } from '../middleware/auth';
import { Bus, BusCompany } from '../models';
import { successResponse, errorResponse, notFoundResponse } from '../utils/response';

export const busController = {
  async getAll(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const operatorId = req.user?.userId;
      const companyId = req.query.companyId as string;

      const whereClause: any = {};
      if (operatorId) {
        const company = await BusCompany.findOne({ where: { operatorId } });
        if (company) {
          whereClause.companyId = company.companyId;
        }
      }
      if (companyId) {
        whereClause.companyId = companyId;
      }

      const buses = await Bus.findAll({
        where: whereClause,
        include: [{ model: Bus.sequelize?.models?.BusCompany, as: 'company' }],
        order: [['createdAt', 'DESC']],
      });

      successResponse(res, 200, buses);
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async getById(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { id } = req.params as any;

      const bus = await Bus.findByPk(id, {
        include: [{ model: Bus.sequelize?.models?.BusCompany, as: 'company' }],
      });

      if (!bus) {
        notFoundResponse(res, 'Bus');
        return;
      }

      successResponse(res, 200, bus);
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async create(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { registrationNumber, model, seatCapacity, amenities = [], maintenanceStatus = "OPERATIONAL" } = req.body as any;
      const operatorId = req.user?.userId;

      if (!operatorId) {
        errorResponse(res, 401, 'Operator authentication required');
        return;
      }

      const user = await (Bus.sequelize?.models?.User as any).findByPk(operatorId);
      if (!user || user.role !== 'OPERATOR' && user.role !== 'ADMIN') {
        errorResponse(res, 403, 'Only operators can register buses');
        return;
      }

      const busCompany = await BusCompany.findOne({ where: { operatorId } });
      if (!busCompany) {
        errorResponse(res, 400, 'Operator must have a bus company registered first');
        return;
      }

      const bus = await Bus.create({
        companyId: busCompany.companyId,
        registrationNumber,
        model,
        seatCapacity,
        amenities,
        maintenanceStatus,
        // New buses require admin approval before they can be scheduled.
        approvalStatus: 'PENDING',
      });

      successResponse(res, 201, bus, 'Bus registered successfully and is pending admin approval');
    } catch (error: any) {
      errorResponse(res, 400, error.message);
    }
  },

  async update(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { id } = req.params as any;
      const updates = req.body;
      const operatorId = req.user?.userId;

      if (!operatorId) {
        errorResponse(res, 401, 'Authentication required');
        return;
      }

      const bus = await Bus.findByPk(id);
      if (!bus) {
        notFoundResponse(res, 'Bus');
        return;
      }

      // Check ownership
      const busCompany = await BusCompany.findOne({ where: { operatorId } });
      const isAdmin = (await (Bus.sequelize?.models?.User as any).findByPk(operatorId))?.role === 'ADMIN';

      if (!isAdmin && bus.companyId !== busCompany?.companyId) {
        errorResponse(res, 403, 'Not authorized to update this bus');
        return;
      }

      // Operators cannot self-approve or change approval fields.
      delete updates.approvalStatus;
      delete updates.rejectionReason;

      await bus.update(updates);
      await bus.save();

      // An operator edit of a rejected bus resubmits it for admin review.
      if (!isAdmin && bus.approvalStatus === 'REJECTED') {
        bus.approvalStatus = 'PENDING';
        bus.rejectionReason = null;
        await bus.save();
      }

      successResponse(res, 200, bus, 'Bus updated successfully');
    } catch (error: any) {
      errorResponse(res, 400, error.message);
    }
  },

  async delete(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { id } = req.params as any;
      const operatorId = req.user?.userId;

      if (!operatorId) {
        errorResponse(res, 401, 'Authentication required');
        return;
      }

      const bus = await Bus.findByPk(id);
      if (!bus) {
        notFoundResponse(res, 'Bus');
        return;
      }

      // Check ownership
      const busCompany = await BusCompany.findOne({ where: { operatorId } });
      const isAdmin = (await (Bus.sequelize?.models?.User as any).findByPk(operatorId))?.role === 'ADMIN';

      if (!isAdmin && bus.companyId !== busCompany?.companyId) {
        errorResponse(res, 403, 'Not authorized to delete this bus');
        return;
      }

      // Check if trip exists for this bus
      const Trip = Bus.sequelize?.models?.Trip as any;
      const tripCount = await Trip.count({ where: { busId: id } });
      if (tripCount > 0) {
        errorResponse(res, 400, 'Cannot delete bus with scheduled trips');
        return;
      }

      await bus.destroy();

      successResponse(res, 200, null, 'Bus deleted successfully');
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },
};
