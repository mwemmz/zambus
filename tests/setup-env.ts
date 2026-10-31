import { loadEnvFile, testDatabaseUrl } from './env';

const fileEnv = loadEnvFile();

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl();

// Deterministic test secrets (never used outside the test database).
process.env.JWT_ACCESS_SECRET = 'test-access-secret-value-that-is-long-enough-01';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-value-that-is-long-enough-2';
process.env.TICKET_QR_SECRET = 'test-qr-secret-value-that-is-long-enough-0003';
process.env.JWT_ACCESS_TTL = '15m';
process.env.JWT_REFRESH_TTL_DAYS = '7';
process.env.API_PREFIX = 'api/v1';
process.env.SEAT_HOLD_TTL_MINUTES = '5';
process.env.MAX_SEATS_PER_BOOKING = '6';
process.env.CORS_ORIGINS = 'http://localhost:5173';

// Keep the rate limiter out of the way; rate limiting has its own test.
process.env.RATE_LIMIT_MAX_REQUESTS = '10000';
process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = '10000';

for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}
