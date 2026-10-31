import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.service';

export async function createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter(app.get(HttpAdapterHost).httpAdapter));

  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma };
}

/** Removes users created by tests (and everything cascading from them). */
export async function cleanupTestUsers(prisma: PrismaService): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@test.zambus' } } });
}

let counter = 0;

export function testEmail(label = 'user'): string {
  counter += 1;
  return `${label}.${Date.now()}.${counter}@test.zambus`;
}
