import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ApiException } from '../errors/api-exception';
import { AuthenticatedRequest, AuthUser } from '../types/auth-user';

/** Enforces @Roles(...) metadata. Assumes JwtAuthGuard has already run. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user: AuthUser | undefined = request.user;

    if (!user) {
      throw ApiException.unauthorized();
    }

    // Administrators may access any role-protected route.
    if (user.roles.includes(RoleName.ADMIN)) {
      return true;
    }

    const allowed = requiredRoles.some((role) => user.roles.includes(role));
    if (!allowed) {
      throw ApiException.forbidden(
        `This action requires one of the following roles: ${requiredRoles.join(', ')}.`,
      );
    }

    return true;
  }
}
