import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanupTestUsers, createTestApp, testEmail } from './helpers/app';

const PASSWORD = 'Passw0rd123';

describe('Authentication (Stage 1)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await cleanupTestUsers(prisma);
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('registers a passenger and returns an access and refresh token', async () => {
      const email = testEmail('register');

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: PASSWORD, fullName: 'Registered Passenger' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(email);
      expect(response.body.data.user.roles).toEqual(['PASSENGER']);
      expect(response.body.data.tokens.accessToken).toEqual(expect.any(String));
      expect(response.body.data.tokens.refreshToken).toEqual(expect.any(String));
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('rejects a duplicate email with 409 ACCOUNT_EXISTS', async () => {
      const email = testEmail('duplicate');
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: PASSWORD, fullName: 'First Owner' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: PASSWORD, fullName: 'Second Owner' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCOUNT_EXISTS');
    });

    it('rejects a weak password with a validation envelope', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: testEmail('weak'), password: 'short', fullName: 'Weak Password' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.length).toBeGreaterThan(0);
    });

    it('rejects unknown fields instead of silently ignoring them', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail('extra'),
          password: PASSWORD,
          fullName: 'Extra Field',
          role: 'ADMIN', // privilege escalation attempt
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/login', () => {
    it('logs in an existing seeded passenger', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'passenger@zambus.zm', password: 'Passenger123!' })
        .expect(200);

      expect(response.body.data.user.roles).toContain('PASSENGER');
      expect(response.body.data.tokens.accessToken.split('.')).toHaveLength(3);
    });

    it('returns the same 401 for a wrong password and an unknown email', async () => {
      const wrongPassword = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'passenger@zambus.zm', password: 'WrongPassword1' })
        .expect(401);

      const unknownEmail = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail('nobody'), password: 'WrongPassword1' })
        .expect(401);

      expect(wrongPassword.body.error.code).toBe('UNAUTHENTICATED');
      expect(unknownEmail.body.error.message).toBe(wrongPassword.body.error.message);
    });

    it('blocks a suspended account with 403', async () => {
      const email = testEmail('suspended');
      const registration = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: PASSWORD, fullName: 'Suspended User' })
        .expect(201);

      await prisma.user.update({
        where: { id: registration.body.data.user.id },
        data: { status: 'SUSPENDED' },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD })
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /me', () => {
    it('requires a bearer token', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/me').expect(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects a malformed token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
    });

    it('returns the authenticated profile', async () => {
      const email = testEmail('profile');
      const registration = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: PASSWORD, fullName: 'Profile Owner' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${registration.body.data.tokens.accessToken}`)
        .expect(200);

      expect(response.body.data.user.id).toBe(registration.body.data.user.id);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the refresh token and invalidates the previous one', async () => {
      const registration = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: testEmail('refresh'), password: PASSWORD, fullName: 'Refresh User' })
        .expect(201);

      const firstRefresh = registration.body.data.tokens.refreshToken;

      const rotated = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: firstRefresh })
        .expect(200);

      expect(rotated.body.data.tokens.refreshToken).not.toBe(firstRefresh);

      // Replaying the old token is treated as compromise.
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: firstRefresh })
        .expect(401);

      // ...and the whole session family is revoked.
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rotated.body.data.tokens.refreshToken })
        .expect(401);
    });
  });

  describe('password reset', () => {
    it('does not reveal whether an email exists', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: testEmail('ghost') })
        .expect(200);

      expect(response.body.data.resetToken).toBeUndefined();
      expect(response.body.data.message).toContain('If that email address is registered');
    });

    it('resets the password once and rejects token reuse', async () => {
      const email = testEmail('reset');
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: PASSWORD, fullName: 'Reset User' })
        .expect(201);

      const forgot = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email })
        .expect(200);

      expect(forgot.body.data.resetToken).toEqual(expect.any(String));

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: forgot.body.data.resetToken, password: 'BrandNew123' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'BrandNew123' })
        .expect(200);

      const reuse = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: forgot.body.data.resetToken, password: 'Another123' })
        .expect(400);

      expect(reuse.body.error.code).toBe('INVALID_RESET_TOKEN');
    });
  });

  describe('PATCH /me/password', () => {
    it('rejects a wrong current password and accepts the correct one', async () => {
      const email = testEmail('change');
      const registration = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: PASSWORD, fullName: 'Change Password' })
        .expect(201);

      const token = registration.body.data.tokens.accessToken;

      await request(app.getHttpServer())
        .patch('/api/v1/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'WrongPassword1', password: 'Changed123' })
        .expect(400);

      await request(app.getHttpServer())
        .patch('/api/v1/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD, password: 'Changed123' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Changed123' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD })
        .expect(401);
    });
  });

  describe('PATCH /me', () => {
    it('updates the profile without allowing self-promotion', async () => {
      const email = testEmail('edit');
      const registration = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: PASSWORD, fullName: 'Old Name' })
        .expect(201);

      const token = registration.body.data.tokens.accessToken;

      const response = await request(app.getHttpServer())
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ fullName: 'New Name', phone: '0977654321', roles: ['ADMIN'] })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');

      const updated = await request(app.getHttpServer())
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ fullName: 'New Name', phone: '0977654321' })
        .expect(200);

      expect(updated.body.data.user.fullName).toBe('New Name');
      expect(updated.body.data.user.roles).toEqual(['PASSENGER']);
    });
  });
});
