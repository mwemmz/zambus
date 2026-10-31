import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { CrewRole, TripStatus } from '@prisma/client';

/** Statuses an operator may move a trip into. SCHEDULED is only the initial state. */
export const TRIP_STATUS_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  [TripStatus.SCHEDULED]: [TripStatus.BOARDING, TripStatus.DELAYED, TripStatus.CANCELLED],
  [TripStatus.BOARDING]: [TripStatus.DEPARTED, TripStatus.DELAYED, TripStatus.CANCELLED],
  [TripStatus.DELAYED]: [TripStatus.BOARDING, TripStatus.DEPARTED, TripStatus.CANCELLED],
  [TripStatus.DEPARTED]: [TripStatus.COMPLETED, TripStatus.DELAYED],
  [TripStatus.COMPLETED]: [],
  [TripStatus.CANCELLED]: [],
};

export const OPERATOR_SETTABLE_STATUSES: TripStatus[] = [
  TripStatus.BOARDING,
  TripStatus.DEPARTED,
  TripStatus.DELAYED,
  TripStatus.COMPLETED,
  TripStatus.CANCELLED,
];

export class PublishTripDto {
  /** Publish from an existing schedule. routeId/busId/fare are inherited. */
  @IsOptional()
  @IsString()
  scheduleId?: string;

  /** Required when scheduleId is omitted. */
  @IsOptional()
  @IsString()
  routeId?: string;

  /** Required when scheduleId is omitted. */
  @IsOptional()
  @IsString()
  busId?: string;

  @IsISO8601({ strict: true }, { message: 'departureAt must be an ISO-8601 date-time' })
  departureAt!: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'arrivalAt must be an ISO-8601 date-time' })
  arrivalAt?: string;

  /** Required when the trip is not published from a schedule. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100, { message: 'fareNgwee must be at least 100 ngwee (1 ZMW)' })
  @Max(10_000_000)
  fareNgwee?: number;
}

export class ListTripsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @IsOptional()
  @IsString()
  routeId?: string;

  @IsOptional()
  @IsString()
  busId?: string;

  /** Zambia-local calendar day, YYYY-MM-DD. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class UpdateTripStatusDto {
  @IsIn(OPERATOR_SETTABLE_STATUSES, {
    message: `status must be one of: ${OPERATOR_SETTABLE_STATUSES.join(', ')}`,
  })
  status!: TripStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2880)
  delayMinutes?: number;

  @IsOptional()
  @IsISO8601()
  actualDepartureAt?: string;

  @IsOptional()
  @IsISO8601()
  actualArrivalAt?: string;

  /**
   * Cancelling a trip that already has confirmed bookings requires
   * `force: true`. Those bookings and their tickets are then cancelled.
   */
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class AssignCrewDto {
  @IsString()
  userId!: string;

  @IsEnum(CrewRole)
  crewRole!: CrewRole;
}
