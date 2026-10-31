import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanupTestUsers, createTestApp, testEmail } from './helpers/app';

const PASSWORD = 'Passw0rd123';

describe('Operator and fleet routes (Stage 2)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await cleanupTestUsers(prisma);
    await app.close();
  });

  it('registers an operator and exposes the fleet and route APIs', async () => {
    const email = testEmail('operator-route');

    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: PASSWORD, fullName: 'Operator Route User' })
      .expect(201);

    const token = register.body.data.tokens.accessToken;
    const registrationNo = `ZM-${Date.now().toString().slice(-6)}`;

    const operatorProfile = await request(app.getHttpServer())
      .post('/api/v1/operator/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Lusaka City Coaches',
        registrationNo: `ZM-OP-${Date.now().toString().slice(-6)}`,
        email: `ops.${Date.now()}@example.com`,
        phone: '0971234567',
        address: 'Great East Road, Lusaka',
      })
      .expect(201);

    expect(operatorProfile.body.data.operator.name).toBe('Lusaka City Coaches');

    const profile = await request(app.getHttpServer())
      .get('/api/v1/operator/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(profile.body.data.operator.status).toBe('PENDING');

    const createdBus = await request(app.getHttpServer())
      .post('/api/v1/operator/buses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        registrationNo,
        capacity: 40,
        manufacturer: 'Hino',
        model: 'RM2',
        year: 2024,
        fuelType: 'DIESEL',
      })
      .expect(201);

    expect(createdBus.body.data.bus.registrationNo).toBe(registrationNo);

    const createdRoute = await request(app.getHttpServer())
      .post('/api/v1/operator/routes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        origin: 'Lusaka',
        destination: 'Livingstone',
        distanceKm: 380,
        estimatedDurationMin: 480,
        stops: [
          { stopName: 'Kabwe', distanceFromOriginKm: 150 },
          { stopName: 'Livingstone', distanceFromOriginKm: 380 },
        ],
      })
      .expect(201);

    expect(createdRoute.body.data.route.origin).toBe('Lusaka');
    expect(createdRoute.body.data.route.destination).toBe('Livingstone');
  });
});
