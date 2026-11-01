import express, { Response } from "express";
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import { registerUser, loginUser, getUserById, updateUserProfile } from '../services/auth.service';
import { successResponse, errorResponse } from '../utils/response';
import { User } from '../models';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { fullName, email, phoneNumber, password, role } = req.body as any;

      const result = await registerUser({
        fullName,
        email,
        phoneNumber,
        password,
        role: role as any || 'PASSENGER',
      });

      successResponse(res, 201, {
        user: {
          userId: result.user.userId,
          fullName: result.user.fullName,
          email: result.user.email,
          phoneNumber: result.user.phoneNumber,
          role: result.user.role,
          isActive: result.user.isActive,
          createdAt: result.user.createdAt,
        },
        token: result.token,
      }, 'Registration successful');
    } catch (error: any) {
      errorResponse(res, 400, error.message);
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as any;

      const result = await loginUser({ email, password });

      successResponse(res, 200, {
        user: {
          userId: result.user.userId,
          fullName: result.user.fullName,
          email: result.user.email,
          phoneNumber: result.user.phoneNumber,
          role: result.user.role,
          isActive: result.user.isActive,
          createdAt: result.user.createdAt,
        },
        token: result.token,
      }, 'Login successful');
    } catch (error: any) {
      errorResponse(res, 401, error.message);
    }
  },

  async me(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 401, 'Not authenticated');
        return;
      }

      const user = await getUserById(req.user.userId);
      if (!user) {
        errorResponse(res, 404, 'User not found');
        return;
      }

      successResponse(res, 200, {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      });
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  },

  async updateProfile(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 401, 'Not authenticated');
        return;
      }

      const { fullName, phoneNumber } = req.body as any;

      const user = await updateUserProfile(req.user.userId, { fullName, phoneNumber });

      successResponse(res, 200, {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      }, 'Profile updated successfully');
    } catch (error: any) {
      errorResponse(res, 400, error.message);
    }
  },
};
