import express, { Response } from "express";
import { AuthenticatedRequest } from '../middleware/auth';
import { Route } from '../models';
import { successResponse, errorResponse, notFoundResponse } from '../utils/response';

export const routeController = {
  async getAll(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const routes = await Route.findAll({
        include: [{ model: Route.sequelize?.models?.BusCompany, as: 'company' }],
        order: [['createdAt', 'DESC']],
      });

      successResponse(res, 200, routes);
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async getById(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { id } = req.params as any;

      const route = await Route.findByPk(id, {
        include: [{ model: Route.sequelize?.models?.BusCompany, as: 'company' }],
      });

      if (!route) {
        notFoundResponse(res, 'Route');
        return;
      }

      successResponse(res, 200, route);
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async create(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { routeName, origin, destination, intermediateStops = [], estimatedTravelTime } = req.body as any;
      const operatorId = req.user?.userId;

      if (!operatorId) {
        errorResponse(res, 401, 'Operator authentication required');
        return;
      }

      const user = await (Route.sequelize?.models?.User as any).findByPk(operatorId);
      if (!user || user.role !== 'OPERATOR' && user.role !== 'ADMIN') {
        errorResponse(res, 403, 'Only operators can create routes');
        return;
      }

      const busCompany = await (Route.sequelize?.models?.BusCompany as any).findOne({
        where: { operatorId },
      });

      if (!busCompany) {
        errorResponse(res, 400, 'Operator must have a bus company registered first');
        return;
      }

      const route = await Route.create({
        companyId: busCompany.companyId,
        routeName,
        origin,
        destination,
        intermediateStops,
        estimatedTravelTime,
        // New routes require admin approval before trips can be scheduled.
        approvalStatus: 'PENDING',
      });

      successResponse(res, 201, route, 'Route created successfully and is pending admin approval');
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

      const route = await Route.findByPk(id);
      if (!route) {
        notFoundResponse(res, 'Route');
        return;
      }

      const user = await (Route.sequelize?.models?.User as any).findByPk(operatorId);
      const isAdmin = user?.role === 'ADMIN';

      if (!isAdmin) {
        errorResponse(res, 403, 'Not authorized to update this route');
        return;
      }

      // Operators cannot self-approve or change approval fields.
      delete updates.approvalStatus;
      delete updates.rejectionReason;

      await route.update(updates);
      await route.save();

      // An operator edit of a rejected route resubmits it for admin review.
      if (!isAdmin && route.approvalStatus === 'REJECTED') {
        route.approvalStatus = 'PENDING';
        route.rejectionReason = null;
        await route.save();
      }

      successResponse(res, 200, route, 'Route updated successfully');
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

      const route = await Route.findByPk(id);
      if (!route) {
        notFoundResponse(res, 'Route');
        return;
      }

      const Trip = Route.sequelize?.models?.Trip as any;
      const tripCount = await Trip.count({ where: { routeId: id } });
      if (tripCount > 0) {
        errorResponse(res, 400, 'Cannot delete route with scheduled trips');
        return;
      }

      await route.destroy();

      successResponse(res, 200, null, 'Route deleted successfully');
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },
};
