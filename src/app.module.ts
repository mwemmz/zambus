import { Logger, MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import rateLimit from 'express-rate-limit';
import { validateEnvironment } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { HealthModule } from './modules/health/health.module';
import { NetworkModule } from './modules/network/network.module';
import { OperatorModule } from './modules/operator/operator.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnvironment,
      cache: true,
    }),
    PrismaModule,
    AuditModule,
    HealthModule,
    AuthModule,
    OperatorModule,
    FleetModule,
    NetworkModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly config: ConfigService) {}

  configure(consumer: MiddlewareConsumer): void {
    const windowMs =
      this.config.get<number>('RATE_LIMIT_WINDOW_MINUTES', 15) * 60 * 1000;
    const limit = this.config.get<number>('RATE_LIMIT_MAX_REQUESTS', 300);
    const authLimit = this.config.get<number>('AUTH_RATE_LIMIT_MAX_REQUESTS', 20);

    const globalLimiter = rateLimit({
      windowMs,
      limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please slow down and try again shortly.',
          details: [],
        },
      },
    });

    const authLimiter = rateLimit({
      windowMs,
      limit: authLimit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many authentication attempts. Try again later.',
          details: [],
        },
      },
    });

    consumer
      .apply(globalLimiter)
      // Named wildcard required by path-to-regexp v8 (Express 5).
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL })
      // Stricter limit on credential-handling endpoints.
      .apply(authLimiter)
      .forRoutes(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/forgot-password', method: RequestMethod.POST },
        { path: 'auth/reset-password', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
      );
  }
}
