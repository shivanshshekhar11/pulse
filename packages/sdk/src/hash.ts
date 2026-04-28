import { createHash } from 'crypto';

/**
 * Consistent hashing for percentage rollouts.
 * 
 * Given a flag key and user ID, returns a deterministic bucket (0-99).
 * The same flagKey:userId pair always returns the same bucket.
 * 
 * This enables sticky percentage rollouts without database lookups.
 * 
 * @param flagKey - The feature flag key
 * @param userId - The user identifier
 * @returns A bucket number between 0 and 99 (inclusive)
 * 
 * @example
 * getBucket('new_feature', 'user-123') // Always returns same number, e.g., 42
 * getBucket('new_feature', 'user-456') // Different user, different bucket, e.g., 17
 */
export function getBucket(flagKey: string, userId: string): number {
  const hash = createHash('sha256')
    .update(`${flagKey}:${userId}`)
    .digest('hex');
  
  // Take first 8 hex chars → 32-bit number → mod 100 → 0-99 bucket
  return parseInt(hash.slice(0, 8), 16) % 100;
}
