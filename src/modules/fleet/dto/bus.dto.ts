import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BusStatus, FuelType } from '@prisma/client';

export class CreateBusDto {
  @IsString()
  @Matches(/^[A-Z0-9-]{4,16}$/, {
    message: 'registrationNo must be 4-16 characters, letters, digits and hyphens only',
  })
  registrationNo!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(80)
  capacity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1980)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;
}

export class UpdateBusDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1980)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @IsEnum(BusStatus)
  status?: BusStatus;
}

export class ListBusesQuery {
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
  @IsEnum(BusStatus)
  status?: BusStatus;
}
