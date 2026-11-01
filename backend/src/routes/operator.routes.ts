import { Router } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { BusCompany, User } from '../models';
import { successResponse, errorResponse, forbiddenResponse } from '../utils/response';
import { z } from 'zod';
import { validate } from '../middleware/validation';

const registerCompanySchema = z.object({
  companyName: z.string().min(2).max(150),
  registrationNumber: z.string().max(50).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(15).optional(),
});

const router = Router();

/**
 * POST /api/operators/register-company
 * Allows an OPERATOR user to register their bus company.
 * The company starts as unapproved until an admin approves it.
 */
router.post(
  '/register-company',
  authenticate,
  authorize('OPERATOR'),
  validate(registerCompanySchema),
  async (req: AuthenticatedRequest, res: any) => {
    try {
      const operatorId = req.user?.userId;
      if (!operatorId) {
        errorResponse(res, 401, 'Not authenticated');
        return;
      }

      const { companyName, registrationNumber, contactEmail, contactPhone } = req.body;

      // Check if operator already has a company
      const existingCompany = await BusCompany.findOne({ where: { operatorId } });
      if (existingCompany) {
        errorResponse(res, 400, 'You already have a registered bus company. Only one company per operator is allowed.');
        return;
      }

      const company = await BusCompany.create({
        operatorId,
        companyName,
        registrationNumber,
        contactEmail,
        contactPhone,
        isApproved: false,
      });

      successResponse(res, 201, {
        companyId: company.companyId,
        companyName: company.companyName,
        registrationNumber: company.registrationNumber,
        contactEmail: company.contactEmail,
        contactPhone: company.contactPhone,
        isApproved: company.isApproved,
        createdAt: company.createdAt,
      }, 'Company registered. Awaiting admin approval.');
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  }
);

/**
 * GET /api/operators/my-company
 * Returns the operator's own bus company details.
 */
router.get(
  '/my-company',
  authenticate,
  authorize('OPERATOR'),
  async (req: AuthenticatedRequest, res: any) => {
    try {
      const operatorId = req.user?.userId;
      const company = await BusCompany.findOne({ where: { operatorId } });

      if (!company) {
        successResponse(res, 200, null, 'No company registered yet');
        return;
      }

      successResponse(res, 200, company);
    } catch (error: any) {
      errorResponse(res, 500, error.message);
    }
  }
);

export default router;
