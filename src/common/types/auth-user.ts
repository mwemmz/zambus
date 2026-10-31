import { RoleName } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: RoleName[];
  permissions: string[];
  /** Operator the user is an active staff member of, if any. */
  operatorId: string | null;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  roles: RoleName[];
  permissions: string[];
  operatorId: string | null;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest {
  user: AuthUser;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  originalUrl: string;
  method: string;
}
