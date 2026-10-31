import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController, MeController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

type JwtExpiresIn = `${number}${'s' | 'm' | 'h' | 'd'}`;

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_TTL', '15m') as JwtExpiresIn,
        },
      }),
    }),
  ],
  controllers: [AuthController, MeController],
  providers: [AuthService, TokenService],
  exports: [AuthService, TokenService, JwtModule],
})
export class AuthModule {}
