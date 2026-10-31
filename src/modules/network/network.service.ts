import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.module';
import { OperatorContextService } from '../operator/operator-context.service';
import { ApiException } from '../../common/errors/api-exception';
import { AuthUser } from '../../common/types/auth-user';
import { pageOf, resolvePagination } from '../../common/utils/pagination';
import {
  CreateRouteDto,
  CreateScheduleDto,
  ListRoutesQuery,
  ListSchedulesQuery,
  UpdateRouteDto,
  UpdateScheduleDto,
} from './dto/network.dto';

@Injectable()
export class RouteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operators: OperatorContextService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser, query: ListRoutesQuery) {
    const operatorId = this.operators.requireOperatorId(user);
    const { skip, take, page, pageSize } = resolvePagination(query);
    const where = {
      operatorId,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.route.findMany({
        where,
        skip,
        take,
        orderBy: [{ origin: 'asc' }, { destination: 'asc' }],
        include: { stops: { orderBy: { sequenceNo: 'asc' } }, _count: { select: { schedules: true } } },
      }),
      this.prisma.route.count({ where }),
    ]);

    return pageOf(
      items.map((route) => ({
        ...route,
        scheduleCount: route._count.schedules,
        _count: undefined,
      })),
      total,
      page,
      pageSize,
    );
  }

  async create(user: AuthUser, dto: CreateRouteDto) {
    const operatorId = this.operators.requireOperatorId(user);
    this.operators.assertUsable(await this.operators.getOperator(operatorId));

    if (dto.origin.trim().toLowerCase() === dto.destination.trim().toLowerCase()) {
      throw new ApiException('INVALID_ROUTE', 'Origin and destination must differ.', 400);
    }

    const duplicate = await this.prisma.route.findFirst({
      where: { operatorId, origin: dto.origin, destination: dto.destination },
    });
    if (duplicate) {
      throw ApiException.conflict(
        'ROUTE_EXISTS',
        'A route between these towns already exists for your operator.',
      );
    }

    const stops = this.normaliseStops(dto, dto.stops);

    const route = await this.prisma.route.create({
      data: {
        operatorId,
        origin: dto.origin.trim(),
        destination: dto.destination.trim(),
        distanceKm: dto.distanceKm,
        estimatedDurationMin: dto.estimatedDurationMin,
        stops: stops ? { createMany: { data: stops } } : undefined,
      },
      include: { stops: { orderBy: { sequenceNo: 'asc' } } },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'ROUTE_CREATED',
      entityType: 'Route',
      entityId: route.id,
      metadata: { origin: route.origin, destination: route.destination },
    });

    return { route };
  }

  async detail(user: AuthUser, routeId: string) {
    const operatorId = this.operators.requireOperatorId(user);
    const route = await this.prisma.route.findFirst({
      where: { id: routeId, operatorId },
      include: { stops: { orderBy: { sequenceNo: 'asc' } }, _count: { select: { trips: true } } },
    });
    if (!route) {
      throw ApiException.notFound('Route');
    }
    return { route: { ...route, tripCount: route._count.trips, _count: undefined } };
  }

  async update(user: AuthUser, routeId: string, dto: UpdateRouteDto) {
    const operatorId = this.operators.requireOperatorId(user);
    this.operators.assertUsable(await this.operators.getOperator(operatorId));

    const route = await this.prisma.route.findFirst({
      where: { id: routeId, operatorId },
      include: { stops: { orderBy: { sequenceNo: 'asc' } } },
    });
    if (!route) {
      throw ApiException.notFound('Route');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.route.update({
        where: { id: routeId },
        data: {
          ...(dto.distanceKm !== undefined ? { distanceKm: dto.distanceKm } : {}),
          ...(dto.estimatedDurationMin !== undefined
            ? { estimatedDurationMin: dto.estimatedDurationMin }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });

      if (dto.stops) {
        await tx.routeStop.deleteMany({ where: { routeId } });
        await tx.routeStop.createMany({
          data: this.normaliseStops({ origin: route.origin, destination: route.destination }, dto.stops)!.map(
            (stop) => ({ ...stop, routeId }),
          ),
        });
      }
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'ROUTE_UPDATED',
      entityType: 'Route',
      entityId: routeId,
      metadata: { fields: Object.keys(dto) },
    });

    const updated = await this.prisma.route.findUnique({
      where: { id: routeId },
      include: { stops: { orderBy: { sequenceNo: 'asc' } } },
    });
    return { route: updated };
  }

  private normaliseStops(
    route: { origin: string; destination: string },
    stops?: Array<{ stopName: string; distanceFromOriginKm?: number }>,
  ): Array<{ stopName: string; sequenceNo: number; distanceFromOriginKm: number | null }> | null {
    if (!stops || stops.length === 0) {
      return [
        { stopName: route.origin, sequenceNo: 1, distanceFromOriginKm: 0 },
        { stopName: route.destination, sequenceNo: 2, distanceFromOriginKm: null },
      ];
    }
    return stops.map((stop, index) => ({
      stopName: stop.stopName.trim(),
      sequenceNo: index + 1,
      distanceFromOriginKm: stop.distanceFromOriginKm ?? null,
    }));
  }
}

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operators: OperatorContextService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser, query: ListSchedulesQuery) {
    const operatorId = this.operators.requireOperatorId(user);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        route: { operatorId },
        ...(query.routeId ? { routeId: query.routeId } : {}),
        ...(query.busId ? { busId: query.busId } : {}),
      },
      orderBy: [{ departureTime: 'asc' }],
      include: {
        route: { select: { id: true, origin: true, destination: true, distanceKm: true } },
        bus: { select: { id: true, registrationNo: true, capacity: true, status: true } },
      },
    });

    return { items: schedules };
  }

  async create(user: AuthUser, dto: CreateScheduleDto) {
    const operatorId = this.operators.requireOperatorId(user);
    this.operators.assertUsable(await this.operators.getOperator(operatorId));

    const [route, bus] = await Promise.all([
      this.prisma.route.findFirst({ where: { id: dto.routeId, operatorId } }),
      this.prisma.bus.findFirst({ where: { id: dto.busId, operatorId } }),
    ]);
    if (!route) throw ApiException.notFound('Route');
    if (!bus) throw ApiException.notFound('Bus');
    if (bus.status !== 'ACTIVE') {
      throw new ApiException('BUS_NOT_ACTIVE', 'Only active buses can be scheduled.', 422);
    }

    const duplicate = await this.prisma.schedule.findFirst({
      where: { routeId: dto.routeId, busId: dto.busId, departureTime: dto.departureTime },
    });
    if (duplicate) {
      throw ApiException.conflict(
        'SCHEDULE_EXISTS',
        'This bus already has a schedule at that time on this route.',
      );
    }

    const schedule = await this.prisma.schedule.create({
      data: {
        routeId: dto.routeId,
        busId: dto.busId,
        departureTime: dto.departureTime,
        daysOfWeek: [...new Set(dto.daysOfWeek)].sort((a, b) => a - b),
        baseFareNgwee: dto.baseFareNgwee,
      },
      include: {
        route: { select: { origin: true, destination: true } },
        bus: { select: { registrationNo: true } },
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'SCHEDULE_CREATED',
      entityType: 'Schedule',
      entityId: schedule.id,
      metadata: { departureTime: schedule.departureTime },
    });

    return { schedule };
  }

  async update(user: AuthUser, scheduleId: string, dto: UpdateScheduleDto) {
    const operatorId = this.operators.requireOperatorId(user);
    this.operators.assertUsable(await this.operators.getOperator(operatorId));

    const schedule = await this.prisma.schedule.findFirst({
      where: { id: scheduleId, route: { operatorId } },
    });
    if (!schedule) {
      throw ApiException.notFound('Schedule');
    }

    const updated = await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        ...(dto.departureTime !== undefined ? { departureTime: dto.departureTime } : {}),
        ...(dto.daysOfWeek !== undefined
          ? { daysOfWeek: [...new Set(dto.daysOfWeek)].sort((a, b) => a - b) }
          : {}),
        ...(dto.baseFareNgwee !== undefined ? { baseFareNgwee: dto.baseFareNgwee } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'SCHEDULE_UPDATED',
      entityType: 'Schedule',
      entityId: scheduleId,
      metadata: { fields: Object.keys(dto) },
    });

    return { schedule: updated };
  }
}
