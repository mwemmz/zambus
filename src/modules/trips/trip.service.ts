import { Injectable } from '@nestjs/common';
import {
  BookingStatus,
  CrewRole,
  OperatorStaffRole,
  Prisma,
  TicketStatus,
  TripSeatStatus,
  TripStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.module';
import { OperatorContextService } from '../operator/operator-context.service';
import { ApiException } from '../../common/errors/api-exception';
import { AuthUser } from '../../common/types/auth-user';
import { pageOf, resolvePagination } from '../../common/utils/pagination';
import { generateSeatLayout, zambiaDayRange } from '../../common/utils/seat-layout';
import {
  AssignCrewDto,
  ListTripsQuery,
  PublishTripDto,
  TRIP_STATUS_TRANSITIONS,
  UpdateTripStatusDto,
} from './dto/trip.dto';

const TRIP_LIST_INCLUDE = {
  route: {
    select: { id: true, origin: true, destination: true, distanceKm: true },
  },
  bus: {
    select: { id: true, registrationNo: true, capacity: true, fuelType: true },
  },
  _count: { select: { crew: true, bookings: true } },
} satisfies Prisma.TripInclude;

@Injectable()
export class TripService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operators: OperatorContextService,
    private readonly audit: AuditService,
  ) {}

  // -------------------------------------------------------------------------
  // Publishing and listing
  // -------------------------------------------------------------------------

  async publish(user: AuthUser, dto: PublishTripDto) {
    const operatorId = this.operators.requireOperatorId(user);
    const operator = await this.operators.getOperator(operatorId);
    this.operators.assertApproved(operator);

    const schedule = dto.scheduleId
      ? await this.prisma.schedule.findFirst({
          where: { id: dto.scheduleId, route: { operatorId } },
          include: { route: true, bus: { include: { seats: true } } },
        })
      : null;

    if (dto.scheduleId && !schedule) {
      throw ApiException.notFound('Schedule');
    }
    if (schedule && !schedule.isActive) {
      throw ApiException.unprocessable(
        'SCHEDULE_INACTIVE',
        'This schedule is inactive. Reactivate it before publishing trips.',
      );
    }

    const routeId = schedule?.routeId ?? dto.routeId;
    const busId = schedule?.busId ?? dto.busId;
    if (!routeId || !busId) {
      throw new ApiException(
        'TRIP_TARGET_REQUIRED',
        'Provide scheduleId, or both routeId and busId.',
        400,
        [
          ...(routeId ? [] : [{ field: 'routeId', issue: 'required when scheduleId is omitted' }]),
          ...(busId ? [] : [{ field: 'busId', issue: 'required when scheduleId is omitted' }]),
        ],
      );
    }

    const [route, bus] = await Promise.all([
      schedule?.route
        ? Promise.resolve(schedule.route)
        : this.prisma.route.findFirst({
            where: { id: routeId, operatorId },
            include: { stops: { orderBy: { sequenceNo: 'asc' } } },
          }),
      schedule?.bus
        ? Promise.resolve(schedule.bus)
        : this.prisma.bus.findFirst({ where: { id: busId, operatorId }, include: { seats: true } }),
    ]);

    if (!route) throw ApiException.notFound('Route');
    if (!bus) throw ApiException.notFound('Bus');
    if (!route.isActive) {
      throw ApiException.unprocessable('ROUTE_INACTIVE', 'This route is inactive.');
    }
    if (bus.status !== 'ACTIVE') {
      throw ApiException.unprocessable(
        'BUS_NOT_ACTIVE',
        'Only active buses can be assigned to a trip.',
      );
    }

    const departureAt = new Date(dto.departureAt);
    if (Number.isNaN(departureAt.getTime())) {
      throw new ApiException('VALIDATION_ERROR', 'departureAt is not a valid date.', 400, [
        { field: 'departureAt', issue: 'invalid date' },
      ]);
    }
    if (departureAt.getTime() <= Date.now()) {
      throw ApiException.unprocessable('TRIP_IN_PAST', 'A trip cannot be published in the past.');
    }

    const arrivalAt = dto.arrivalAt
      ? new Date(dto.arrivalAt)
      : new Date(departureAt.getTime() + route.estimatedDurationMin * 60_000);
    if (Number.isNaN(arrivalAt.getTime()) || arrivalAt.getTime() <= departureAt.getTime()) {
      throw new ApiException(
        'INVALID_TRIP_WINDOW',
        'arrivalAt must be after departureAt.',
        400,
        [{ field: 'arrivalAt', issue: 'must be after departureAt' }],
      );
    }

    const fareNgwee = dto.fareNgwee ?? schedule?.baseFareNgwee;
    if (fareNgwee === undefined) {
      throw new ApiException(
        'FARE_REQUIRED',
        'fareNgwee is required when publishing without a schedule.',
        400,
        [{ field: 'fareNgwee', issue: 'required' }],
      );
    }

    // One bus cannot be in two places at once. Completed and cancelled trips do
    // not occupy the vehicle.
    const overlap = await this.prisma.trip.findFirst({
      where: {
        busId,
        status: { notIn: [TripStatus.CANCELLED, TripStatus.COMPLETED] },
        departureAt: { lt: arrivalAt },
        arrivalAt: { gt: departureAt },
      },
      select: { id: true, departureAt: true, arrivalAt: true },
    });
    if (overlap) {
      throw ApiException.conflict(
        'BUS_TRIP_OVERLAP',
        'This bus is already assigned to another trip in that time window.',
        [{ field: 'busId', issue: `overlaps trip ${overlap.id}` }],
      );
    }

    if (schedule) {
      const alreadyPublished = await this.prisma.trip.findFirst({
        where: { scheduleId: schedule.id, departureAt, status: { not: TripStatus.CANCELLED } },
        select: { id: true },
      });
      if (alreadyPublished) {
        throw ApiException.conflict(
          'TRIP_ALREADY_PUBLISHED',
          'This schedule has already been published for that departure time.',
          [{ field: 'scheduleId', issue: `trip ${alreadyPublished.id} exists` }],
        );
      }
    }

    const seatRows =
      bus.seats.length > 0
        ? bus.seats.map((seat) => ({ seatNumber: seat.seatNumber, seatType: seat.seatType }))
        : generateSeatLayout(bus.capacity).map((seat) => ({
            seatNumber: seat.seatNumber,
            seatType: seat.seatType,
          }));

    const trip = await this.prisma.trip.create({
      data: {
        scheduleId: schedule?.id ?? null,
        routeId,
        busId,
        operatorId,
        departureAt,
        arrivalAt,
        fareNgwee,
        status: TripStatus.SCHEDULED,
        availableSeatCount: seatRows.length,
        seats: { createMany: { data: seatRows } },
      },
      include: TRIP_LIST_INCLUDE,
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'TRIP_PUBLISHED',
      entityType: 'Trip',
      entityId: trip.id,
      metadata: {
        routeId,
        busId,
        departureAt: departureAt.toISOString(),
        fareNgwee,
        seats: seatRows.length,
      },
    });

    return { trip: this.toSummary(trip) };
  }

  async list(user: AuthUser, query: ListTripsQuery) {
    const operatorId = this.operators.requireOperatorId(user);
    const { skip, take, page, pageSize } = resolvePagination(query);

    const where: Prisma.TripWhereInput = {
      operatorId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.routeId ? { routeId: query.routeId } : {}),
      ...(query.busId ? { busId: query.busId } : {}),
    };

    if (query.date) {
      const range = zambiaDayRange(query.date);
      if (!range.valid) {
        throw new ApiException('INVALID_DATE', 'date must be a real calendar day.', 400, [
          { field: 'date', issue: 'invalid date' },
        ]);
      }
      where.departureAt = { gte: range.start, lt: range.end };
    } else if (query.from || query.to) {
      where.departureAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.trip.findMany({
        where,
        skip,
        take,
        orderBy: { departureAt: 'asc' },
        include: TRIP_LIST_INCLUDE,
      }),
      this.prisma.trip.count({ where }),
    ]);

    return pageOf(items.map((trip) => this.toSummary(trip)), total, page, pageSize);
  }

  async detail(user: AuthUser, tripId: string) {
    const operatorId = this.operators.requireOperatorId(user);

    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, operatorId },
      include: {
        route: { include: { stops: { orderBy: { sequenceNo: 'asc' } } } },
        bus: { select: { id: true, registrationNo: true, capacity: true, fuelType: true } },
        crew: {
          include: {
            user: { select: { id: true, fullName: true, email: true, phone: true } },
          },
          orderBy: { assignedAt: 'asc' },
        },
        _count: { select: { bookings: true, tickets: true } },
      },
    });
    if (!trip) {
      throw ApiException.notFound('Trip');
    }

    const seatCounts = await this.seatCounts(tripId);

    return {
      trip: {
        ...trip,
        seatSummary: seatCounts,
        bookingCount: trip._count.bookings,
        ticketCount: trip._count.tickets,
        _count: undefined,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Status transitions
  // -------------------------------------------------------------------------

  async updateStatus(user: AuthUser, tripId: string, dto: UpdateTripStatusDto) {
    const operatorId = this.operators.requireOperatorId(user);
    const operator = await this.operators.getOperator(operatorId);
    this.operators.assertUsable(operator);

    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, operatorId } });
    if (!trip) {
      throw ApiException.notFound('Trip');
    }

    if (trip.status === dto.status) {
      throw ApiException.conflict(
        'TRIP_STATUS_UNCHANGED',
        `This trip is already ${dto.status}.`,
      );
    }

    const allowed = TRIP_STATUS_TRANSITIONS[trip.status];
    if (!allowed.includes(dto.status)) {
      throw new ApiException(
        'INVALID_TRIP_TRANSITION',
        `A ${trip.status} trip cannot move to ${dto.status}. Allowed: ${
          allowed.length > 0 ? allowed.join(', ') : 'none'
        }.`,
        422,
        [{ field: 'status', issue: `invalid transition from ${trip.status}` }],
      );
    }

    const now = new Date();
    const data: Prisma.TripUpdateInput = { status: dto.status };

    if (dto.status === TripStatus.DELAYED) {
      data.delayMinutes = dto.delayMinutes ?? Math.max(trip.delayMinutes, 0);
    }
    if (dto.status === TripStatus.CANCELLED) {
      data.cancellationReason = dto.reason ?? 'Cancelled by operator';
    }
    if (dto.status === TripStatus.DEPARTED) {
      data.actualDepartureAt = dto.actualDepartureAt ? new Date(dto.actualDepartureAt) : now;
    }
    if (dto.status === TripStatus.COMPLETED) {
      data.actualArrivalAt = dto.actualArrivalAt ? new Date(dto.actualArrivalAt) : now;
      if (!trip.actualDepartureAt && !dto.actualDepartureAt) {
        data.actualDepartureAt = trip.departureAt;
      }
    }

    if (dto.status === TripStatus.CANCELLED) {
      const confirmed = await this.prisma.booking.count({
        where: { tripId, status: BookingStatus.CONFIRMED },
      });
      if (confirmed > 0 && !dto.force) {
        throw ApiException.conflict(
          'TRIP_HAS_CONFIRMED_BOOKINGS',
          `This trip has ${confirmed} confirmed booking(s). Cancelling it will cancel those bookings and tickets. Send force: true to proceed.`,
          [{ field: 'force', issue: 'required to cancel a trip with confirmed bookings' }],
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.trip.update({ where: { id: tripId }, data });

      if (dto.status === TripStatus.CANCELLED) {
        const reason = dto.reason ?? 'Trip cancelled by operator';
        const cancelledAt = now;

        await tx.tripSeat.updateMany({
          where: { tripId, status: TripSeatStatus.HELD },
          data: { status: TripSeatStatus.AVAILABLE, holdToken: null, holdExpiresAt: null },
        });
        await tx.booking.updateMany({
          where: { tripId, status: BookingStatus.PENDING_PAYMENT },
          data: { status: BookingStatus.EXPIRED, cancellationReason: reason },
        });
        await tx.booking.updateMany({
          where: { tripId, status: BookingStatus.CONFIRMED },
          data: { status: BookingStatus.CANCELLED, cancelledAt, cancellationReason: reason },
        });
        await tx.ticket.updateMany({
          where: { tripId, status: TicketStatus.VALID },
          data: { status: TicketStatus.CANCELLED, cancelledAt },
        });
        await tx.tripSeat.updateMany({
          where: { tripId, status: TripSeatStatus.BOOKED },
          data: { status: TripSeatStatus.AVAILABLE, bookingId: null },
        });
        await tx.trip.update({
          where: { id: tripId },
          data: { availableSeatCount: 0 },
        });
      }
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'TRIP_STATUS_CHANGED',
      entityType: 'Trip',
      entityId: tripId,
      metadata: {
        from: trip.status,
        to: dto.status,
        reason: dto.reason ?? null,
        delayMinutes: dto.delayMinutes ?? null,
        forced: dto.force === true,
      },
    });

    const updated = await this.prisma.trip.findUniqueOrThrow({
      where: { id: tripId },
      include: TRIP_LIST_INCLUDE,
    });
    return { trip: this.toSummary(updated) };
  }

  // -------------------------------------------------------------------------
  // Crew assignment
  // -------------------------------------------------------------------------

  async assignCrew(user: AuthUser, tripId: string, dto: AssignCrewDto) {
    const operatorId = this.operators.requireOperatorId(user);
    this.operators.assertUsable(await this.operators.getOperator(operatorId));

    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, operatorId },
      select: { id: true, status: true, departureAt: true },
    });
    if (!trip) {
      throw ApiException.notFound('Trip');
    }
    if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
      throw ApiException.conflict(
        'TRIP_FINISHED',
        `Crew cannot be assigned to a ${trip.status} trip.`,
      );
    }

    // Cross-operator staff lookups return 404 so user IDs cannot be probed.
    const staff = await this.prisma.operatorStaff.findFirst({
      where: { userId: dto.userId, operatorId, isActive: true },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
    });
    if (!staff) {
      throw ApiException.notFound('Crew member');
    }

    const expectedRole =
      dto.crewRole === CrewRole.DRIVER ? OperatorStaffRole.DRIVER : OperatorStaffRole.CONDUCTOR;
    if (staff.staffRole !== expectedRole) {
      throw ApiException.unprocessable(
        'CREW_ROLE_MISMATCH',
        `This staff member is registered as ${staff.staffRole}, not ${dto.crewRole}.`,
      );
    }

    const assignment = await this.prisma.tripCrew.upsert({
      where: { tripId_userId: { tripId, userId: dto.userId } },
      create: { tripId, userId: dto.userId, crewRole: dto.crewRole },
      update: { crewRole: dto.crewRole },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'TRIP_CREW_ASSIGNED',
      entityType: 'Trip',
      entityId: tripId,
      metadata: { userId: dto.userId, crewRole: dto.crewRole },
    });

    return { crew: assignment };
  }

  async removeCrew(user: AuthUser, tripId: string, userId: string) {
    const operatorId = this.operators.requireOperatorId(user);
    this.operators.assertUsable(await this.operators.getOperator(operatorId));

    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, operatorId },
      select: { id: true },
    });
    if (!trip) {
      throw ApiException.notFound('Trip');
    }

    const existing = await this.prisma.tripCrew.findUnique({
      where: { tripId_userId: { tripId, userId } },
    });
    if (!existing) {
      throw new ApiException(
        'CREW_NOT_ASSIGNED',
        'This user is not assigned to the trip.',
        404,
      );
    }

    await this.prisma.tripCrew.delete({ where: { tripId_userId: { tripId, userId } } });

    await this.audit.log({
      actorUserId: user.id,
      action: 'TRIP_CREW_REMOVED',
      entityType: 'Trip',
      entityId: tripId,
      metadata: { userId },
    });

    return { message: 'Crew member removed from the trip.' };
  }

  // -------------------------------------------------------------------------
  // Manifest
  // -------------------------------------------------------------------------

  async manifest(user: AuthUser, tripId: string) {
    const operatorId = this.operators.requireOperatorId(user);

    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, operatorId },
      include: {
        route: { select: { id: true, origin: true, destination: true, distanceKm: true } },
        bus: { select: { id: true, registrationNo: true, capacity: true } },
      },
    });
    if (!trip) {
      throw ApiException.notFound('Trip');
    }

    const bookings = await this.prisma.booking.findMany({
      where: { tripId, status: BookingStatus.CONFIRMED },
      orderBy: { confirmedAt: 'asc' },
      include: {
        passenger: { select: { id: true, fullName: true, phone: true } },
        seats: true,
        tickets: {
          select: {
            ticketNumber: true,
            seatNumber: true,
            status: true,
            usedAt: true,
          },
        },
      },
    });

    const entries = bookings
      .flatMap((booking) =>
        booking.seats.map((seat) => {
          const ticket = booking.tickets.find((item) => item.seatNumber === seat.seatNumber);
          return {
            bookingReference: booking.reference,
            passengerName: seat.passengerName,
            passengerIdNumber: seat.passengerIdNumber,
            passengerPhone: seat.passengerPhone ?? booking.passenger.phone,
            seatNumber: seat.seatNumber,
            ticketNumber: ticket?.ticketNumber ?? null,
            boardingStatus: ticket?.usedAt
              ? 'BOARDED'
              : ticket?.status === 'CANCELLED'
                ? 'CANCELLED'
                : 'PENDING',
            boardedAt: ticket?.usedAt ?? null,
          };
        }),
      )
      .sort((a, b) =>
        a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' }),
      );

    const boarded = entries.filter((entry) => entry.boardingStatus === 'BOARDED').length;

    return {
      trip: {
        id: trip.id,
        route: trip.route,
        bus: trip.bus,
        departureAt: trip.departureAt,
        arrivalAt: trip.arrivalAt,
        status: trip.status,
      },
      summary: {
        confirmedBookings: bookings.length,
        passengers: entries.length,
        boarded,
        remaining: entries.length - boarded,
        capacity: trip.bus.capacity,
      },
      entries,
      generatedAt: new Date().toISOString(),
      note:
        'Manifests are derived from confirmed bookings. Empty until the booking engine (Stage 3) is live.',
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async seatCounts(tripId: string): Promise<Record<string, number>> {
    const counts = await this.prisma.tripSeat.groupBy({
      by: ['status'],
      where: { tripId },
      _count: { _all: true },
    });
    return counts.reduce<Record<string, number>>((accumulator, row) => {
      accumulator[row.status] = row._count._all;
      return accumulator;
    }, {});
  }

  private toSummary(
    trip: Prisma.TripGetPayload<{ include: typeof TRIP_LIST_INCLUDE }>,
  ) {
    return {
      id: trip.id,
      scheduleId: trip.scheduleId,
      route: trip.route,
      bus: trip.bus,
      departureAt: trip.departureAt,
      arrivalAt: trip.arrivalAt,
      fareNgwee: trip.fareNgwee,
      status: trip.status,
      availableSeatCount: trip.availableSeatCount,
      capacity: trip.bus.capacity,
      crewCount: trip._count.crew,
      bookingCount: trip._count.bookings,
      actualDepartureAt: trip.actualDepartureAt,
      actualArrivalAt: trip.actualArrivalAt,
      delayMinutes: trip.delayMinutes,
      cancellationReason: trip.cancellationReason,
    };
  }
}
