import { Injectable } from '@nestjs/common';
import { Operator, OperatorStatus, RoleName } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.module';
import { ApiException } from '../../common/errors/api-exception';
import { AuthUser } from '../../common/types/auth-user';
import { RegisterOperatorDto, UpdateOperatorDto } from './dto/operator.dto';

@Injectable()
export class OperatorContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Resolves the caller's operator membership or fails with 403. */
  requireOperatorId(user: AuthUser): string {
    if (!user.operatorId) {
      throw new ApiException(
        'NO_OPERATOR_CONTEXT',
        'This account is not linked to an operator. Register or join an operator first.',
        403,
      );
    }
    return user.operatorId;
  }

  async getOperator(operatorId: string): Promise<Operator> {
    const operator = await this.prisma.operator.findUnique({ where: { id: operatorId } });
    if (!operator) {
      throw ApiException.notFound('Operator');
    }
    return operator;
  }

  /** Suspended or rejected operators cannot perform any operational write. */
  assertUsable(operator: Operator): void {
    if (operator.status === OperatorStatus.SUSPENDED) {
      throw new ApiException(
        'OPERATOR_SUSPENDED',
        'This operator account is suspended. Contact ZamBus support.',
        403,
      );
    }
    if (operator.status === OperatorStatus.REJECTED) {
      throw new ApiException(
        'OPERATOR_REJECTED',
        'This operator application was rejected. Contact ZamBus support.',
        403,
      );
    }
  }

  /** Publishing trips requires an approved operator. */
  assertApproved(operator: Operator): void {
    this.assertUsable(operator);
    if (operator.status !== OperatorStatus.APPROVED) {
      throw new ApiException(
        'OPERATOR_NOT_APPROVED',
        'Your operator profile is awaiting ZamBus approval. Trips cannot be published yet.',
        403,
      );
    }
  }

  async registerCompany(
    user: AuthUser,
    dto: RegisterOperatorDto,
    meta: { ip?: string; userAgent?: string },
  ): Promise<Operator> {
    const existing = await this.prisma.operatorStaff.findFirst({ where: { userId: user.id, isActive: true } });
    if (existing) {
      throw ApiException.conflict(
        'ALREADY_OPERATOR_STAFF',
        'This account already belongs to an operator.',
      );
    }

    const role = await this.prisma.role.findUnique({ where: { name: RoleName.OPERATOR } });

    const operator = await this.prisma.$transaction(async (tx) => {
      const created = await tx.operator.create({
        data: {
          name: dto.name,
          registrationNo: dto.registrationNo,
          email: dto.email,
          phone: dto.phone,
          address: dto.address ?? null,
          logoUrl: dto.logoUrl ?? null,
          status: OperatorStatus.PENDING,
        },
      });

      await tx.operatorStaff.create({
        data: {
          operatorId: created.id,
          userId: user.id,
          staffRole: 'OPERATOR_ADMIN',
        },
      });

      if (role) {
        await tx.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: role.id } },
          create: { userId: user.id, roleId: role.id },
          update: {},
        });
      }

      return created;
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'OPERATOR_REGISTERED',
      entityType: 'Operator',
      entityId: operator.id,
      metadata: { name: operator.name, registrationNo: operator.registrationNo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return operator;
  }

  async updateCompany(
    operatorId: string,
    actorId: string,
    dto: UpdateOperatorDto,
    meta: { ip?: string },
  ): Promise<Operator> {
    const operator = await this.getOperator(operatorId);
    this.assertUsable(operator);

    const updated = await this.prisma.operator.update({
      where: { id: operatorId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
      },
    });

    await this.audit.log({
      actorUserId: actorId,
      action: 'OPERATOR_UPDATED',
      entityType: 'Operator',
      entityId: operatorId,
      metadata: { fields: Object.keys(dto) },
      ip: meta.ip,
    });

    return updated;
  }
}
