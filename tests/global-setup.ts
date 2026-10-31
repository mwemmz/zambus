import { execFileSync } from 'child_process';
import { testDatabaseUrl, adminDatabaseUrl } from './env';

/**
 * Runs once before the test suite:
 *  1. Creates the dedicated test database if it does not exist.
 *  2. Applies all migrations.
 *  3. Seeds reference data (roles, permissions, emission factors).
 */
export default async function globalSetup(): Promise<void> {
  const testUrl = testDatabaseUrl();
  const adminUrl = adminDatabaseUrl();
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  try {
    execFileSync(npx, ['prisma', 'db', 'execute', '--stdin', '--url', adminUrl], {
      input: 'CREATE DATABASE zambus_test;',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });
  } catch {
    // Database already exists â€” expected on subsequent runs.
  }

  execFileSync(npx, ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'pipe',
    shell: true,
  });

  execFileSync(npx, ['ts-node', '--transpile-only', 'prisma/seed.ts'], {
    env: { ...process.env, DATABASE_URL: testUrl, NODE_ENV: 'test' },
    stdio: 'pipe',
    shell: true,
  });
}
