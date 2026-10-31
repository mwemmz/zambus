import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, RoleName, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.module';
import { ApiException } from '../../common/errors/api-exception';
import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } from '../../common/utils/password.util';
import { randomToken, sha256 } from '../../common/utils/crypto.util';
import { TokenService, TokenSubject, IssuedTokens } from './token.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dto/auth.dto';
import { AuthUser } from '../../common/types/auth-user';

const USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  passwordHash: true,
  fullName: true,
  status: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  passengerProfile: true,
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
    select: {
      operatorId: true,
      staffRole: true,
      operator: { select: { id: true, name: true, status: true } },
    },
  },
} satisfies Prisma.UserSelect;

type UserWithRelations = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

export interface PublicUser {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  status: UserStatus;
  roles: RoleName[];
  operatorId: string | null;
  operatorName: string | null;
  staffRole: string | null;
  profile: {
    nationalId: string | null;
    dateOfBirth: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
  } | null;
  createdAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async register(
    dto: RegisterDto,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ user: PublicUser; tokens: IssuedTokens }> {
    const email = dto.email.toLowerCase().trim();

    const role = await this.prisma.role.findUnique({ where: { name: RoleName.PASSENGER } });
    if (!role) {
      throw new ApiException(
        'ROLE_SEED_MISSING',
        'The PASSENGER role has not been seeded. Run `npm run seed`.',
        500,
      );
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma
      .$transaction(async (tx) =>
        tx.user.create({
          data: {
            email,
            phone: dto.phone ?? null,
            fullName: dto.fullName,
            passwordHash,
            status: UserStatus.ACTIVE,
            userRoles: { create: { roleId: role.id } },
            passengerProfile: { create: {} },
          },
          select: USER_SELECT,
        }),
      )
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const target = String(error.meta?.target ?? '');
          const field = target.includes('phone') ? 'phone number' : 'email address';
          throw ApiException.conflict(
            'ACCOUNT_EXISTS',
            `An account with this ${field} already exists.`,
            [{ field: target.includes('phone') ? 'phone' : 'email', issue: 'already registered' }],
          );
        }
        throw error;
      });

    const subject = this.toSubject(user);
    const tokens = await this.tokens.issueTokens(subject, meta.ip);

    await this.audit.log({
      actorUserId: user.id,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user.id,
      metadata: { email, roles: subject.roles } as Prisma.InputJsonValue,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { user: this.toPublicUser(user), tokens };
  }

  async login(
    dto: LoginDto,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ user: PublicUser; tokens: IssuedTokens }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email }, select: USER_SELECT });

    // Always perform a hash comparison so response timing does not reveal
    // whether the email exists.
    const passwordMatches = await verifyPassword(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      await this.audit.log({
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user?.id ?? null,
        metadata: { email } as Prisma.InputJsonValue,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      throw ApiException.unauthorized('Incorrect email or password.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw ApiException.forbidden('This account has been suspended. Contact ZamBus support.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const subject = this.toSubject(user);
    const tokens = await this.tokens.issueTokens(subject, meta.ip);

    await this.audit.log({
      actorUserId: user.id,
      action: 'USER_LOGGED_IN',
      entityType: 'User',
      entityId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { user: this.toPublicUser(user), tokens };
  }

  async refresh(
    refreshToken: string,
    meta: { ip?: string },
  ): Promise<{ user: PublicUser; tokens: IssuedTokens }> {
    const { userId, tokens: issued } = await this.tokens.rotate(
      refreshToken,
      (id) => this.loadSubject(id),
      meta.ip,
    );
    const user = await this.getUserById(userId);
    return { user, tokens: issued };
  }

  async logout(refreshToken: string, actorId: string, meta: { ip?: string }): Promise<{ message: string }> {
    await this.tokens.revoke(refreshToken);
    await this.audit.log({
      actorUserId: actorId,
      action: 'USER_LOGGED_OUT',
      entityType: 'User',
      entityId: actorId,
      ip: meta.ip,
    });
    return { message: 'You have been logged out.' };
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
    meta: { ip?: string },
  ): Promise<{ message: string; resetToken?: string; expiresInMinutes?: number }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, status: true },
    });

    const genericResponse = {
      message: 'If that email address is registered, a password reset link has been sent.',
    };

    if (!user || user.status === UserStatus.SUSPENDED) {
      return genericResponse;
    }

    const token = randomToken(32);
    const ttlMinutes = this.config.get<number>('PASSWORD_RESET_TTL_MINUTES', 30);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
        },
      }),
    ]);

    await this.audit.log({
      actorUserId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user.id,
      ip: meta.ip,
    });

    // Prototype limitation: no email provider is configured, so the token is
    // surfaced only outside production to let the frontend complete the flow.
    if (this.config.get<string>('NODE_ENV') === 'production') {
      this.logger.log(`Password reset requested for user ${user.id}`);
      return genericResponse;
    }

    return { ...genericResponse, resetToken: token, expiresInMinutes: ttlMinutes };
  }

  async resetPassword(dto: ResetPasswordDto, meta: { ip?: string }): Promise<{ message: string }> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(dto.token) },
      select: { id: true, userId: true, expiresAt: true, usedAt: true, user: { select: { status: true } } },
    });

    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new ApiException(
        'INVALID_RESET_TOKEN',
        'This password reset link is invalid or has expired.',
        400,
      );
    }

    if (record.user.status === UserStatus.SUSPENDED) {
      throw ApiException.forbidden('This account has been suspended. Contact ZamBus support.');
    }

    const passwordHash = await hashPassword(dto.password);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.log({
      actorUserId: record.userId,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: record.userId,
      ip: meta.ip,
    });

    return { message: 'Your password has been reset. Please log in with the new password.' };
  }

  async getProfile(userId: string): Promise<{ user: PublicUser }> {
    return { user: await this.getUserById(userId) };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<{ user: PublicUser }> {
    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.phone !== undefined) data.phone = dto.phone;

    const profileData: Prisma.PassengerProfileUpdateInput = {};
    if (dto.nationalId !== undefined) profileData.nationalId = dto.nationalId;
    if (dto.emergencyContactName !== undefined) {
      profileData.emergencyContactName = dto.emergencyContactName;
    }
    if (dto.emergencyContactPhone !== undefined) {
      profileData.emergencyContactPhone = dto.emergencyContactPhone;
    }
    if (dto.dateOfBirth !== undefined) {
      const date = new Date(dto.dateOfBirth);
      if (Number.isNaN(date.getTime())) {
        throw new ApiException('VALIDATION_ERROR', 'dateOfBirth must be a valid ISO date.', 400, [
          { field: 'dateOfBirth', issue: 'invalid date' },
        ]);
      }
      profileData.dateOfBirth = date;
    }

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.user.update({ where: { id: userId }, data });
      }
      if (Object.keys(profileData).length > 0) {
        await tx.passengerProfile.upsert({
          where: { userId },
          create: {
            userId,
            nationalId: dto.nationalId ?? null,
            dateOfBirth: profileData.dateOfBirth as Date | null | undefined,
            emergencyContactName: dto.emergencyContactName ?? null,
            emergencyContactPhone: dto.emergencyContactPhone ?? null,
          },
          update: profileData,
        });
      }
    });

    return { user: await this.getUserById(userId) };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    meta: { ip?: string },
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      throw ApiException.notFound('User');
    }

    const matches = await verifyPassword(dto.currentPassword, user.passwordHash);
    if (!matches) {
      throw new ApiException('INVALID_CREDENTIALS', 'The current password is incorrect.', 400);
    }

    const passwordHash = await hashPassword(dto.password);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    // Keep the current session (if its refresh token was supplied), revoke all others.
    const presentedRefreshToken = dto.refreshToken;
    if (presentedRefreshToken) {
      const current = await this.prisma.refreshToken.findMany({
        where: { userId, revokedAt: null },
        select: { id: true, tokenHash: true },
      });
      const keepId = current.find(
        (token) => token.tokenHash === sha256(presentedRefreshToken),
      )?.id;
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null, ...(keepId ? { id: { not: keepId } } : {}) },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.tokens.revokeAllForUser(userId);
    }

    await this.audit.log({
      actorUserId: userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: userId,
      ip: meta.ip,
    });

    return { message: 'Your password has been changed.' };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async getUserById(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
    if (!user) {
      throw ApiException.notFound('User');
    }
    return this.toPublicUser(user);
  }

  private async loadSubject(userId: string): Promise<TokenSubject> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
    if (!user) {
      throw ApiException.unauthorized('The account for this token no longer exists.');
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw ApiException.forbidden('This account has been suspended.');
    }
    return this.toSubject(user);
  }

  private toSubject(user: UserWithRelations): TokenSubject {
    return {
      id: user.id,
      email: user.email,
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
  }

  private toPublicUser(user: UserWithRelations): PublicUser {
    const staff = user.staffProfiles[0];
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      status: user.status,
      roles: user.userRoles.map((entry) => entry.role.name),
      operatorId: staff?.operatorId ?? null,
      operatorName: staff?.operator?.name ?? null,
      staffRole: staff?.staffRole ?? null,
      profile: user.passengerProfile
        ? {
            nationalId: user.passengerProfile.nationalId,
            dateOfBirth: user.passengerProfile.dateOfBirth
              ? user.passengerProfile.dateOfBirth.toISOString().slice(0, 10)
              : null,
            emergencyContactName: user.passengerProfile.emergencyContactName,
            emergencyContactPhone: user.passengerProfile.emergencyContactPhone,
          }
        : null,
      createdAt: user.createdAt,
    };
  }
}
