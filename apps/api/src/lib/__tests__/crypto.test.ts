import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, sha256, generateApiKey, generateRefreshToken } from '../crypto';

describe('crypto utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'test-password-123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'test-password-123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'test-password-123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'test-password-123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('wrong-password', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('sha256', () => {
    it('should generate consistent hash', () => {
      const input = 'test-input';
      const hash1 = sha256(input);
      const hash2 = sha256(input);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = sha256('input1');
      const hash2 = sha256('input2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateApiKey', () => {
    it('should generate production key with correct prefix', () => {
      const key = generateApiKey(true);
      
      expect(key).toMatch(/^ps_live_[a-f0-9]{60}$/);
    });

    it('should generate test key with correct prefix', () => {
      const key = generateApiKey(false);
      
      expect(key).toMatch(/^ps_test_[a-f0-9]{60}$/);
    });

    it('should generate unique keys', () => {
      const key1 = generateApiKey(true);
      const key2 = generateApiKey(true);
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate 64 character hex string', () => {
      const token = generateRefreshToken();
      
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();
      
      expect(token1).not.toBe(token2);
    });
  });
});
