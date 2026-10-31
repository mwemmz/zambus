import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A real hash compared against when the email does not exist, so account
 * enumeration by response timing is not possible.
 */
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  randomBytes(32).toString('hex'),
  ROUNDS,
);
