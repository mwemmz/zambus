import express, { Response } from "express";
import { AuthenticatedRequest } from '../middleware/auth';
import { BusCompany, User, Trip, Booking, CommissionSettings, Bus, Route } from '../models';
import { sequelize } from '../config/database';
import { config } from '../config';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '../utils/response';
import { Op } from 'sequelize';

export const adminController = {
  async getPendingCompanies(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      if (!isAdmin) {
        forbiddenResponse(res, 'Only admins can view pending companies');
        return;
      }

      const companies = await BusCompany.findAll({
        where: { isApproved: false },
        include: [
          { model: BusCompany.sequelize?.models?.User, as: 'operator', attributes: ['userId', 'fullName', 'email', 'phoneNumber'] },
        ],
        order: [['createdAt', 'DESC']],
      });

      successResponse(res, 200, companies);
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async approveCompany(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      if (!isAdmin) {
        forbiddenResponse(res, 'Only admins can approve companies');
        return;
      }

      const { id } = req.params as any;

      const company = await BusCompany.findByPk(id);
      if (!company) {
        notFoundResponse(res, 'Company');
        return;
      }

      company.isApproved = true;
      await company.save();

      successResponse(res, 200, company, 'Company approved successfully');
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async rejectCompany(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      if (!isAdmin) {
        forbiddenResponse(res, 'Only admins can reject companies');
        return;
      }

      const { id } = req.params as any;

      const company = await BusCompany.findByPk(id);
      if (!company) {
        notFoundResponse(res, 'Company');
        return;
      }

      await company.destroy();

      successResponse(res, 200, null, 'Company rejected and removed');
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  /**
   * GET /api/admin/buses
   * Lists all buses with their approval status, newest first.
   * Optional query: ?status=PENDING|APPROVED|REJECTED
   */
  async getBuses(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        forbiddenResponse(res, 'Only admins can review buses');
        return;
      }

      const { status } = req.query as { status?: string };
      const whereClause: any = {};
      if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
        whereClause.approvalStatus = status;
      }

      const buses = await Bus.findAll({
        where: whereClause,
        include: [{ model: Bus.sequelize?.models?.BusCompany, as: 'company', attributes: ['companyId', 'companyName'] }],
        order: [['createdAt', 'DESC']],
      });

      successResponse(res, 200, buses);
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  /**
   * POST /api/admin/buses/:id/approve
   */
  async approveBus(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        forbiddenResponse(res, 'Only admins can approve buses');
        return;
      }

      const bus = await Bus.findByPk(req.params?.id);
      if (!bus) {
        notFoundResponse(res, 'Bus');
        return;
      }

      bus.approvalStatus = 'APPROVED';
      bus.rejectionReason = null;
      await bus.save();

      successResponse(res, 200, bus, 'Bus approved successfully');
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  /**
   * POST /api/admin/buses/:id/reject
   * Body: { reason?: string }
   */
  async rejectBus(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        forbiddenResponse(res, 'Only admins can reject buses');
        return;
      }

      const bus = await Bus.findByPk(req.params?.id);
      if (!bus) {
        notFoundResponse(res, 'Bus');
        return;
      }

      const reason = (req.body as any)?.reason;
      bus.approvalStatus = 'REJECTED';
      bus.rejectionReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;
      await bus.save();

      successResponse(res, 200, bus, 'Bus rejected');
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  /**
   * GET /api/admin/routes
   * Lists all routes with their approval status, newest first.
   * Optional query: ?status=PENDING|APPROVED|REJECTED
   */
  async getRoutes(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        forbiddenResponse(res, 'Only admins can review routes');
        return;
      }

      const { status } = req.query as { status?: string };
      const whereClause: any = {};
      if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
        whereClause.approvalStatus = status;
      }

      const routes = await Route.findAll({
        where: whereClause,
        include: [{ model: Route.sequelize?.models?.BusCompany, as: 'company', attributes: ['companyId', 'companyName'] }],
        order: [['createdAt', 'DESC']],
      });

      successResponse(res, 200, routes);
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  /**
   * POST /api/admin/routes/:id/approve
   */
  async approveRoute(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        forbiddenResponse(res, 'Only admins can approve routes');
        return;
      }

      const route = await Route.findByPk(req.params?.id);
      if (!route) {
        notFoundResponse(res, 'Route');
        return;
      }

      route.approvalStatus = 'APPROVED';
      route.rejectionReason = null;
      await route.save();

      successResponse(res, 200, route, 'Route approved successfully');
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  /**
   * POST /api/admin/routes/:id/reject
   * Body: { reason?: string }
   */
  async rejectRoute(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        forbiddenResponse(res, 'Only admins can reject routes');
        return;
      }

      const route = await Route.findByPk(req.params?.id);
      if (!route) {
        notFoundResponse(res, 'Route');
        return;
      }

      const reason = (req.body as any)?.reason;
      route.approvalStatus = 'REJECTED';
      route.rejectionReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;
      await route.save();

      successResponse(res, 200, route, 'Route rejected');
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async getAllUsers(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      if (!isAdmin) {
        forbiddenResponse(res, 'Only admins can view all users');
        return;
      }

      const { role, page = 1, limit = 50 } = req.query as any;

      const whereClause: any = {};
      if (role) whereClause.role = role;

      const { count, rows } = await User.findAndCountAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit as string, 10),
        offset: (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10),
      });

      successResponse(res, 200, {
        users: rows.map((u) => ({
          userId: u.userId,
          fullName: u.fullName,
          email: u.email,
          phoneNumber: u.phoneNumber,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt,
        })),
        total: count,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      });
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async updateUserRole(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      if (!isAdmin) {
        forbiddenResponse(res, 'Only admins can update user roles');
        return;
      }

      const { id } = req.params as any;
      const { role } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        notFoundResponse(res, 'User');
        return;
      }

      user.role = role;
      await user.save();

      successResponse(res, 200, user, 'User role updated successfully');
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async getAnalytics(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      // Admins see platform-wide metrics; operators get the same shape but
      // scoped to their own company for their revenue dashboard.
      const role = req.user?.role;
      if (role !== 'ADMIN' && role !== 'OPERATOR') {
        forbiddenResponse(res, 'Not authorized to view analytics');
        return;
      }

      // Operator branch: everything scoped to the operator's company.
      if (role === 'OPERATOR') {
        const operatorId = req.user?.userId;
        const company = await BusCompany.findOne({ where: { operatorId } });

        // No company yet is an empty state, not an error: report zeroed
        // company metrics so the revenue dashboard still renders and the
        // operator can act (register a company) instead of hitting a 400.
        if (!company) {
          let commissionRate = config.app.commissionRate;
          try {
            const settings = await CommissionSettings.findOne();
            if (settings) commissionRate = Number(settings.commissionRate);
          } catch { /* table may not exist yet */ }

          successResponse(res, 200, {
            totalUsers: 0,
            totalOperators: 1,
            totalBuses: 0,
            totalRoutes: 0,
            totalActiveTrips: 0,
            totalBookings: 0,
            totalRevenue: 0,
            commissionRate,
            commissionAmount: 0,
            netPayout: 0,
            hasCompany: false,
          });
          return;
        }

        const companyId = company.companyId;

        const totalBuses = await Bus.count({ where: { companyId } });
        const totalRoutes = await Route.count({ where: { companyId } });
        const totalActiveTrips = await Trip.count({
          where: { status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] } },
          include: [{
            model: (await import('../models')).Bus,
            as: 'bus',
            attributes: [],
            required: true,
          }],
        });
        const totalBookings = await Booking.count({
          where: { paymentStatus: 'CONFIRMED' },
          include: [{
            model: (await import('../models')).Trip,
            as: 'trip',
            attributes: [],
            required: true,
            include: [{
              model: (await import('../models')).Bus,
              as: 'bus',
              attributes: [],
              required: true,
            }],
          }],
        });

        // fareAmount lives on Trip, not Booking - join through the trip association.
        const revenueResult = await Booking.findAll({
          attributes: [[sequelize.fn('SUM', sequelize.col('trip.fareAmount')), 'totalRevenue']],
          where: { paymentStatus: 'CONFIRMED' },
          include: [
            {
              model: (await import('../models')).Trip,
              as: 'trip',
              attributes: [],
              required: true,
              include: [{
                model: (await import('../models')).Bus,
                as: 'bus',
                attributes: [],
                required: true,
              }],
            },
          ],
          raw: true,
        });

        const totalRevenueNum =
          revenueResult.length > 0 && revenueResult[0]
            ? Number((revenueResult[0] as any).totalRevenue) || 0
            : 0;

        // Read commission rate from DB (persisted), fallback to config
        let commissionRate = config.app.commissionRate;
        try {
          const settings = await CommissionSettings.findOne();
          if (settings) commissionRate = Number(settings.commissionRate);
        } catch { /* table may not exist yet */ }

        const commissionAmount = totalRevenueNum * commissionRate;

        successResponse(res, 200, {
          totalUsers: 0,
          totalOperators: 1,
          totalBuses,
          totalRoutes,
          totalActiveTrips,
          totalBookings,
          totalRevenue: totalRevenueNum,
          commissionRate,
          commissionAmount,
          netPayout: totalRevenueNum - commissionAmount,
          hasCompany: true,
        });
        return;
      }

      const totalUsers = await User.count();
      const totalOperators = await User.count({ where: { role: 'OPERATOR' } });
      const totalActiveTrips = await Trip.count({ where: { status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] } } });
      const totalBookings = await Booking.count({ where: { paymentStatus: 'CONFIRMED' } });

      // fareAmount lives on Trip, not Booking - join through the trip association.
      const revenueResult = await Booking.findAll({
        attributes: [[sequelize.fn('SUM', sequelize.col('trip.fareAmount')), 'totalRevenue']],
        where: { paymentStatus: 'CONFIRMED' },
        include: [
          {
            model: (await import('../models')).Trip,
            as: 'trip',
            attributes: [],
            required: true,
          },
        ],
        raw: true,
      });

      const totalRevenueNum =
        revenueResult.length > 0 && revenueResult[0]
          ? Number((revenueResult[0] as any).totalRevenue) || 0
          : 0;

      // Read commission rate from DB (persisted), fallback to config
      let commissionRate = config.app.commissionRate;
      try {
        const settings = await CommissionSettings.findOne();
        if (settings) commissionRate = Number(settings.commissionRate);
      } catch { /* table may not exist yet */ }

      const commissionAmount = totalRevenueNum * commissionRate;

      successResponse(res, 200, {
        totalUsers,
        totalOperators,
        totalActiveTrips,
        totalBookings,
        totalRevenue: totalRevenueNum,
        commissionRate,
        commissionAmount,
        netPayout: totalRevenueNum - commissionAmount,
      });
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async updateCommission(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      if (!isAdmin) {
        forbiddenResponse(res, 'Only admins can update commission rate');
        return;
      }

      const { commissionRate } = req.body as any;

      if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 1) {
        errorResponse(res, 400, 'Commission rate must be a number between 0 and 1');
        return;
      }

      // Persist to database
      let settings = await CommissionSettings.findOne();
      if (settings) {
        settings.commissionRate = commissionRate;
        await settings.save();
      } else {
        settings = await CommissionSettings.create({ commissionRate });
      }

      // Also update in-memory config as fallback
      config.app.commissionRate = commissionRate;

      successResponse(res, 200, {
        commissionRate: Number(settings.commissionRate),
        seatLockDurationMinutes: settings.seatLockDurationMinutes,
      }, 'Commission rate updated');
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  /**
   * GET /api/admin/settings
   * Returns all platform settings (admin only).
   */
  async getSettings(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      if (!isAdmin) {
        forbiddenResponse(res, 'Only admins can view settings');
        return;
      }

      let settings = await CommissionSettings.findOne();
      if (!settings) {
        settings = await CommissionSettings.create({
          commissionRate: config.app.commissionRate,
        });
      }

      successResponse(res, 200, {
        commissionRate: Number(settings.commissionRate),
        platformName: settings.platformName,
        currency: settings.currency,
        seatLockDurationMinutes: settings.seatLockDurationMinutes,
      });
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  /**
   * PUT /api/admin/settings
   * Update platform settings (admin only).
   */
  async updateSettings(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      if (!isAdmin) {
        forbiddenResponse(res, 'Only admins can update settings');
        return;
      }

      const { commissionRate, platformName, currency, seatLockDurationMinutes } = req.body as any;

      let settings = await CommissionSettings.findOne();
      if (!settings) {
        settings = await CommissionSettings.create({
          commissionRate: config.app.commissionRate,
        });
      }

      if (commissionRate !== undefined) settings.commissionRate = commissionRate;
      if (platformName !== undefined) settings.platformName = platformName;
      if (currency !== undefined) settings.currency = currency;
      if (seatLockDurationMinutes !== undefined) settings.seatLockDurationMinutes = seatLockDurationMinutes;

      await settings.save();

      // Sync in-memory config
      config.app.commissionRate = Number(settings.commissionRate);

      successResponse(res, 200, {
        commissionRate: Number(settings.commissionRate),
        platformName: settings.platformName,
        currency: settings.currency,
        seatLockDurationMinutes: settings.seatLockDurationMinutes,
      }, 'Settings updated');
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },
};
