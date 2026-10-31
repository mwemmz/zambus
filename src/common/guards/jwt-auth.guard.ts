import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ApiException } from '../errors/api-exception';
import { AuthenticatedRequest, AuthUser, JwtAccessPayload } from '../types/auth-user';

/**
 * Global authentication guard.
 *
 * Verifies the bearer access token, then reloads the user so that role changes,
 * suspensions and staff removals take effect immediately instead of waiting
 * for token expiry.
 *
 * Routes decorated with @Public() skip authentication entirely.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw ApiException.unauthorized('A bearer access token is required.');
    }

    let payload: JwtAccessPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtAccessPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw ApiException.unauthorized('The access token is invalid or has expired.');
    }

    if (payload.type !== 'access') {
      throw ApiException.unauthorized('The supplied token is not an access token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                permissions: { select: { permission: { select: { code: true } } } },
              },
            },
          },
        },
        staffProfiles: {
          where: { isActive: true },
          select: { operatorId: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw ApiException.unauthorized('The account for this token no longer exists.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw ApiException.forbidden('This account has been suspended. Contact ZamBus support.');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      roles: user.userRoles.map((entry) => entry.role.name),
      permissions: [
        ...new Set(
          user.userRoles.flatMap((entry) =>
            entry.role.permissions.map((permission) => permission.permission.code),
          ),
        ),
      ],
      operatorId: user.staffProfiles[0]?.operatorId ?? null,
    };

    request.user = authUser;
    return true;
  }

  private extractBearerToken(request: AuthenticatedRequest): string | null {
    const header = request.headers.authorization;
    const value = Array.isArray(header) ? header[0] : header;
    if (!value) {
      return null;
    }
    const [scheme, token] = value.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
