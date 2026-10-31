/**
 * Loads .env without adding a dependency, and derives the test database URL.
 * Used by both the Jest global setup and the per-worker environment setup.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export function loadEnvFile(): Record<string, string> {
  const path = join(__dirname, '..', '.env');
  if (!existsSync(path)) return {};

  const result: Record<string, string> = {};
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    result[key] = value;
  }
  return result;
}

export function testDatabaseUrl(): string {
  const env = loadEnvFile();
  const base =
    process.env.DATABASE_URL ??
    env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/zambus?schema=public';

  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;

  const url = new URL(base);
  url.pathname = '/zambus_test';
  return url.toString();
}

export function adminDatabaseUrl(): string {
  const url = new URL(testDatabaseUrl());
  url.pathname = '/postgres';
  return url.toString();
}
