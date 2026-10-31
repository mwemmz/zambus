import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RouteStopDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  stopName!: string;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  distanceFromOriginKm?: number;
}

export class CreateRouteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  origin!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  destination!: string;

  @Type(() => Number)
  @Min(1)
  @Max(3000)
  distanceKm!: number;

  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(2880)
  estimatedDurationMin!: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RouteStopDto)
  stops?: RouteStopDto[];
}

export class UpdateRouteDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(3000)
  distanceKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(2880)
  estimatedDurationMin?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RouteStopDto)
  stops?: RouteStopDto[];
}

export class ListRoutesQuery {
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
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class CreateScheduleDto {
  @IsString()
  @MinLength(1)
  routeId!: string;

  @IsString()
  @MinLength(1)
  busId!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'departureTime must be HH:mm (24-hour)' })
  departureTime!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek!: number[];

  @Type(() => Number)
  @IsInt()
  @Min(100, { message: 'baseFareNgwee must be at least 100 ngwee (1 ZMW)' })
  @Max(10_000_000)
  baseFareNgwee!: number;
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'departureTime must be HH:mm (24-hour)' })
  departureTime?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(10_000_000)
  baseFareNgwee?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListSchedulesQuery {
  @IsOptional()
  @IsString()
  routeId?: string;

  @IsOptional()
  @IsString()
  busId?: string;
}
