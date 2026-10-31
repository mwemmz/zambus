import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { randomToken, sha256 } from '../../common/utils/crypto.util';
import { JwtAccessPayload, JwtRefreshPayload } from '../../common/types/auth-user';
import { ApiException } from '../../common/errors/api-exception';

export interface TokenSubject {
  id: string;
  email: string;
  roles: RoleName[];
  permissions: string[];
  operatorId: string | null;
}

type JwtExpiresIn = `${number}${'s' | 'm' | 'h' | 'd'}`;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresAt: Date;
}

/** Parses a duration such as "15m", "2h", "7d" or "900" (seconds) into seconds. */
export function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)([smhd])?$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration value: ${value}`);
  }
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit as 's' | 'm' | 'h' | 'd'];
  return amount * multiplier;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async issueTokens(subject: TokenSubject, ip?: string): Promise<IssuedTokens> {
    const refreshTtlDays = this.config.get<number>('JWT_REFRESH_TTL_DAYS', 7);
    const refreshExpiresAt = new Date(Date.now() + refreshTtlDays * 86_400_000);
    const tokenId = randomToken(16);

    const accessPayload: JwtAccessPayload = {
      sub: subject.id,
      email: subject.email,
      roles: subject.roles,
      permissions: subject.permissions,
      operatorId: subject.operatorId,
      type: 'access',
    };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m') as JwtExpiresIn,
    });

    const refreshPayload: JwtRefreshPayload = {
      sub: subject.id,
      jti: tokenId,
      type: 'refresh',
    };

    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: `${refreshTtlDays}d` as JwtExpiresIn,
    });

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId: subject.id,
        tokenHash: sha256(refreshToken),
        expiresAt: refreshExpiresAt,
        createdByIp: ip ?? null,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: parseDurationToSeconds(this.config.get<string>('JWT_ACCESS_TTL', '15m')),
      refreshExpiresAt,
    };
  }

  /**
   * Validates a refresh token, revokes it and issues a new pair (rotation).
   * Presenting an already-revoked token is treated as theft: every session for
   * that user is revoked.
   */
  async rotate(
    token: string,
    subjectFromUser: (userId: string) => Promise<TokenSubject>,
    ip?: string,
  ): Promise<{ userId: string; tokens: IssuedTokens }> {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtRefreshPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw ApiException.unauthorized('The refresh token is invalid or has expired.');
    }

    if (payload.type !== 'refresh') {
      throw ApiException.unauthorized('The supplied token is not a refresh token.');
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!stored || stored.userId !== payload.sub) {
      throw ApiException.unauthorized('The refresh token is not recognised.');
    }

    if (stored.revokedAt) {
      // Reuse of a revoked token: assume compromise, drop every session.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw ApiException.unauthorized('This refresh token has already been used. Please log in again.');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw ApiException.unauthorized('The refresh token has expired. Please log in again.');
    }

    if (stored.tokenHash !== sha256(token)) {
      throw ApiException.unauthorized('The refresh token is not recognised.');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const subject = await subjectFromUser(stored.userId);
    const tokens = await this.issueTokens(subject, ip);
    return { userId: stored.userId, tokens };
  }

  async revoke(token: string): Promise<void> {
    try {
      const payload = await this.jwt.verifyAsync<JwtRefreshPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        ignoreExpiration: true,
      });
      await this.prisma.refreshToken.updateMany({
        where: { id: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Logging out with an invalid token is a no-op, not an error.
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
