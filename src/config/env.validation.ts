import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnvironment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

/**
 * Every environment variable the API reads is declared here.
 * The application refuses to boot if a value is missing or invalid, so a
 * misconfigured deployment fails immediately instead of at request time.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment = NodeEnvironment.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsString()
  @IsNotEmpty()
  API_PREFIX = 'api/v1';

  @IsString()
  @IsNotEmpty()
  APP_NAME = 'ZamBus API';

  @IsString()
  CORS_ORIGINS = 'http://localhost:3001,http://localhost:5173,http://localhost:8081';

  @IsString()
  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL must be a PostgreSQL connection string',
  })
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters' })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_TTL = '15m';

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters' })
  JWT_REFRESH_SECRET!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  JWT_REFRESH_TTL_DAYS = 7;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  PASSWORD_RESET_TTL_MINUTES = 30;

  @IsString()
  @IsNotEmpty()
  FRONTEND_URL = 'http://localhost:5173';

  @IsString()
  @MinLength(32, { message: 'TICKET_QR_SECRET must be at least 32 characters' })
  TICKET_QR_SECRET!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  SEAT_HOLD_TTL_MINUTES = 5;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  MAX_SEATS_PER_BOOKING = 6;

  @IsString()
  @IsNotEmpty()
  BOOKING_REFERENCE_PREFIX = 'ZB';

  @IsString()
  @IsNotEmpty()
  GREENTRACK_METHODOLOGY_VERSION = '1.0.0';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  RATE_LIMIT_WINDOW_MINUTES = 15;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  RATE_LIMIT_MAX_REQUESTS = 300;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  AUTH_RATE_LIMIT_MAX_REQUESTS = 20;

  @IsOptional()
  @IsString()
  LOG_LEVEL = 'info';
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
    exposeDefaultValues: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    const details = errors
      .map((error) => `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`)
      .join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${details}`);
  }

  return validated;
}
