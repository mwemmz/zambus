import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { errorResponse, unauthorizedResponse } from '../utils/response';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    unauthorizedResponse(res, 'No token provided');
    return;
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    unauthorizedResponse(res, 'Invalid or expired token');
    return;
  }

  req.user = decoded;
  next();
}

export function authorize(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      unauthorizedResponse(res, 'Not authenticated');
      return;
    }

    if (!roles.includes(req.user.role)) {
      errorResponse(res, 403, 'Insufficient permissions');
      return;
    }

    next();
  };
}
