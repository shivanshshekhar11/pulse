import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function generateApiKey(isProduction: boolean): string {
  const prefix = isProduction ? 'ps_live_' : 'ps_test_';
  // 20 random bytes → 40 hex chars, matching the spec: ps_live_<40 random chars>
  const random = randomBytes(20).toString('hex');
  return prefix + random;
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}
