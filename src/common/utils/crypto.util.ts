import { createHash, randomBytes, randomInt } from 'crypto';

/** URL-safe opaque token, used for refresh and password-reset tokens. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Deterministic hash used to store bearer-style tokens at rest. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1

/** Human-readable booking reference, e.g. ZB-7K4M9Q. */
export function generateReference(prefix = 'ZB', length = 6): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  }
  return `${prefix}-${code}`;
}
