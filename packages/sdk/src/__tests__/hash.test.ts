import { describe, it, expect } from 'vitest';
import { getBucket } from '../hash';

describe('getBucket', () => {
  it('should return consistent bucket for same inputs', () => {
    const bucket1 = getBucket('new_feature', 'user-123');
    const bucket2 = getBucket('new_feature', 'user-123');
    
    expect(bucket1).toBe(bucket2);
  });

  it('should return bucket between 0 and 99', () => {
    const bucket = getBucket('new_feature', 'user-123');
    
    expect(bucket).toBeGreaterThanOrEqual(0);
    expect(bucket).toBeLessThanOrEqual(99);
  });

  it('should return different buckets for different users', () => {
    const bucket1 = getBucket('new_feature', 'user-123');
    const bucket2 = getBucket('new_feature', 'user-456');
    
    // Statistically very unlikely to be the same (1% chance)
    expect(bucket1).not.toBe(bucket2);
  });

  it('should return different buckets for different flags', () => {
    const bucket1 = getBucket('feature_a', 'user-123');
    const bucket2 = getBucket('feature_b', 'user-123');
    
    // Statistically very unlikely to be the same
    expect(bucket1).not.toBe(bucket2);
  });

  it('should distribute buckets relatively evenly', () => {
    const buckets = new Array(100).fill(0);
    
    // Generate 10,000 user IDs and count bucket distribution
    for (let i = 0; i < 10000; i++) {
      const bucket = getBucket('test_flag', `user-${i}`);
      buckets[bucket]++;
    }
    
    // Each bucket should have roughly 100 users (10000 / 100)
    // Allow 50-150 range (50% variance is acceptable for this test)
    const min = Math.min(...buckets);
    const max = Math.max(...buckets);
    
    expect(min).toBeGreaterThan(50);
    expect(max).toBeLessThan(150);
  });

  it('should handle edge case: empty strings', () => {
    const bucket = getBucket('', '');
    
    expect(bucket).toBeGreaterThanOrEqual(0);
    expect(bucket).toBeLessThanOrEqual(99);
  });

  it('should handle edge case: special characters', () => {
    const bucket = getBucket('flag-with-dashes', 'user@email.com');
    
    expect(bucket).toBeGreaterThanOrEqual(0);
    expect(bucket).toBeLessThanOrEqual(99);
  });

  // ── Boundary semantics ─────────────────────────────────────────────────────
  // These tests document the contract used by the percentage rollout evaluator:
  //   rule matches when getBucket(flagKey, userId) < rule.percentage
  // So bucket 0 is always included (any percentage > 0 includes it),
  // and bucket 99 is only included at percentage === 100.

  it('boundary: a user in bucket 0 is included at any percentage > 0', () => {
    // Find a user that lands in bucket 0
    let userId = '';
    for (let i = 0; i < 10000; i++) {
      if (getBucket('boundary_test', `user-${i}`) === 0) {
        userId = `user-${i}`;
        break;
      }
    }
    expect(userId).not.toBe(''); // sanity — bucket 0 must exist
    expect(getBucket('boundary_test', userId)).toBe(0);
    // bucket 0 < 1 → included at 1% rollout
    expect(getBucket('boundary_test', userId) < 1).toBe(true);
  });

  it('boundary: a user in bucket 99 is only included at 100% rollout', () => {
    // Find a user that lands in bucket 99
    let userId = '';
    for (let i = 0; i < 10000; i++) {
      if (getBucket('boundary_test', `user-${i}`) === 99) {
        userId = `user-${i}`;
        break;
      }
    }
    expect(userId).not.toBe(''); // sanity — bucket 99 must exist
    expect(getBucket('boundary_test', userId)).toBe(99);
    // bucket 99 < 99 → false (excluded at 99% rollout)
    expect(getBucket('boundary_test', userId) < 99).toBe(false);
    // bucket 99 < 100 → true (included at 100% rollout)
    expect(getBucket('boundary_test', userId) < 100).toBe(true);
  });
});
