import { Injectable } from '@nestjs/common';
import { BusStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.module';
import { OperatorContextService } from '../operator/operator-context.service';
import { ApiException } from '../../common/errors/api-exception';
import { AuthUser } from '../../common/types/auth-user';
import { generateSeatLayout } from '../../common/utils/seat-layout';
import { pageOf, resolvePagination } from '../../common/utils/pagination';
import { CreateBusDto, ListBusesQuery, UpdateBusDto } from './dto/bus.dto';

@Injectable()
export class BusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operators: OperatorContextService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser, query: ListBusesQuery) {
    const operatorId = this.operators.requireOperatorId(user);
    const { skip, take, page, pageSize } = resolvePagination(query);

    const where = { operatorId, ...(query.status ? { status: query.status } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.bus.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { seats: true, trips: true } } },
      }),
      this.prisma.bus.count({ where }),
    ]);

    return pageOf(
      items.map((bus) => ({
        id: bus.id,
        registrationNo: bus.registrationNo,
        manufacturer: bus.manufacturer,
        model: bus.model,
        year: bus.year,
        capacity: bus.capacity,
        fuelType: bus.fuelType,
        status: bus.status,
        seatCount: bus._count.seats,
        tripCount: bus._count.trips,
      })),
      total,
      page,
      pageSize,
    );
  }

  async create(user: AuthUser, dto: CreateBusDto) {
    const operatorId = this.operators.requireOperatorId(user);
    const operator = await this.operators.getOperator(operatorId);
    this.operators.assertUsable(operator);

    const existing = await this.prisma.bus.findUnique({
      where: { registrationNo: dto.registrationNo },
    });
    if (existing) {
      throw ApiException.conflict(
        'BUS_ALREADY_REGISTERED',
        `A bus with registration ${dto.registrationNo} already exists.`,
      );
    }

    const seats = generateSeatLayout(dto.capacity);

    const bus = await this.prisma.bus.create({
      data: {
        operatorId,
        registrationNo: dto.registrationNo,
        capacity: dto.capacity,
        manufacturer: dto.manufacturer ?? null,
        model: dto.model ?? null,
        year: dto.year ?? null,
        fuelType: dto.fuelType ?? undefined,
        seats: {
          createMany: { data: seats },
        },
      },
      include: { seats: { orderBy: [{ row: 'asc' }, { column: 'asc' }] } },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'BUS_CREATED',
      entityType: 'Bus',
      entityId: bus.id,
      metadata: { registrationNo: bus.registrationNo, capacity: bus.capacity },
    });

    return {
      bus: {
        id: bus.id,
        registrationNo: bus.registrationNo,
        capacity: bus.capacity,
        fuelType: bus.fuelType,
        status: bus.status,
        seats: bus.seats.map((seat) => ({
          seatNumber: seat.seatNumber,
          seatType: seat.seatType,
        })),
      },
    };
  }

  async detail(user: AuthUser, busId: string) {
    const operatorId = this.operators.requireOperatorId(user);
    const bus = await this.prisma.bus.findFirst({
      where: { id: busId, operatorId },
      include: {
        seats: { orderBy: [{ row: 'asc' }, { column: 'asc' }] },
        _count: { select: { trips: true } },
      },
    });
    // Cross-operator probing returns 404, never 403, so IDs cannot be enumerated.
    if (!bus) {
      throw ApiException.notFound('Bus');
    }

    return {
      bus: {
        ...bus,
        tripCount: bus._count.trips,
        _count: undefined,
      },
    };
  }

  async update(user: AuthUser, busId: string, dto: UpdateBusDto) {
    const operatorId = this.operators.requireOperatorId(user);
    const operator = await this.operators.getOperator(operatorId);
    this.operators.assertUsable(operator);

    const bus = await this.prisma.bus.findFirst({ where: { id: busId, operatorId } });
    if (!bus) {
      throw ApiException.notFound('Bus');
    }

    if (dto.status && dto.status !== BusStatus.ACTIVE) {
      const upcoming = await this.prisma.trip.count({
        where: {
          busId,
          status: { in: ['SCHEDULED', 'BOARDING', 'DELAYED'] },
          departureAt: { gte: new Date() },
        },
      });
      if (upcoming > 0) {
        throw ApiException.conflict(
          'BUS_HAS_UPCOMING_TRIPS',
          'This bus still has upcoming trips. Reassign or cancel them before deactivating it.',
        );
      }
    }

    const updated = await this.prisma.bus.update({
      where: { id: busId },
      data: {
        ...(dto.manufacturer !== undefined ? { manufacturer: dto.manufacturer } : {}),
        ...(dto.model !== undefined ? { model: dto.model } : {}),
        ...(dto.year !== undefined ? { year: dto.year } : {}),
        ...(dto.fuelType !== undefined ? { fuelType: dto.fuelType } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'BUS_UPDATED',
      entityType: 'Bus',
      entityId: busId,
      metadata: { fields: Object.keys(dto) },
    });

    return { bus: updated };
  }
}
