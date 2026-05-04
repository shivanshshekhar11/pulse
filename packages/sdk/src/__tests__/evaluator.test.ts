import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../evaluator';
import type { Condition, UserContext } from '@pulse-flags/types';
import type { Segment } from '../types';

describe('evaluateCondition', () => {
  const context: UserContext = {
    userId: 'user-123',
    email: 'alice@example.com',
    country: 'US',
    plan: 'pro',
    age: 25,
    tags: ['beta', 'early-adopter'],
  };

  const segments = new Map<string, Segment>([
    [
      'segment-1',
      {
        id: 'segment-1',
        name: 'Pro Users',
        conditions: { attribute: 'plan', op: 'eq', value: 'pro' },
      },
    ],
    [
      'segment-2',
      {
        id: 'segment-2',
        name: 'US Users',
        conditions: { attribute: 'country', op: 'eq', value: 'US' },
      },
    ],
  ]);

  describe('Logical operators', () => {
    it('evaluates AND with all true conditions', () => {
      const condition: Condition = {
        operator: 'AND',
        conditions: [
          { attribute: 'country', op: 'eq', value: 'US' },
          { attribute: 'plan', op: 'eq', value: 'pro' },
        ],
      };
      expect(evaluateCondition(condition, context, segments)).toBe(true);
    });

    it('evaluates AND with one false condition', () => {
      const condition: Condition = {
        operator: 'AND',
        conditions: [
          { attribute: 'country', op: 'eq', value: 'US' },
          { attribute: 'plan', op: 'eq', value: 'free' },
        ],
      };
      expect(evaluateCondition(condition, context, segments)).toBe(false);
    });

    it('evaluates OR with at least one true condition', () => {
      const condition: Condition = {
        operator: 'OR',
        conditions: [
          { attribute: 'country', op: 'eq', value: 'CA' },
          { attribute: 'plan', op: 'eq', value: 'pro' },
        ],
      };
      expect(evaluateCondition(condition, context, segments)).toBe(true);
    });

    it('evaluates OR with all false conditions', () => {
      const condition: Condition = {
        operator: 'OR',
        conditions: [
          { attribute: 'country', op: 'eq', value: 'CA' },
          { attribute: 'plan', op: 'eq', value: 'free' },
        ],
      };
      expect(evaluateCondition(condition, context, segments)).toBe(false);
    });

    it('evaluates NOT with true condition', () => {
      const condition: Condition = {
        operator: 'NOT',
        condition: { attribute: 'plan', op: 'eq', value: 'pro' },
      };
      expect(evaluateCondition(condition, context, segments)).toBe(false);
    });

    it('evaluates NOT with false condition', () => {
      const condition: Condition = {
        operator: 'NOT',
        condition: { attribute: 'plan', op: 'eq', value: 'free' },
      };
      expect(evaluateCondition(condition, context, segments)).toBe(true);
    });

    it('evaluates nested AND/OR/NOT', () => {
      const condition: Condition = {
        operator: 'AND',
        conditions: [
          {
            operator: 'OR',
            conditions: [
              { attribute: 'country', op: 'eq', value: 'US' },
              { attribute: 'country', op: 'eq', value: 'CA' },
            ],
          },
          {
            operator: 'NOT',
            condition: { attribute: 'plan', op: 'eq', value: 'free' },
          },
        ],
      };
      expect(evaluateCondition(condition, context, segments)).toBe(true);
    });
  });

  describe('Comparison operators', () => {
    it('evaluates eq (equal)', () => {
      expect(
        evaluateCondition({ attribute: 'plan', op: 'eq', value: 'pro' }, context, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'plan', op: 'eq', value: 'free' }, context, segments)
      ).toBe(false);
    });

    it('evaluates neq (not equal)', () => {
      expect(
        evaluateCondition({ attribute: 'plan', op: 'neq', value: 'free' }, context, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'plan', op: 'neq', value: 'pro' }, context, segments)
      ).toBe(false);
    });

    it('evaluates gt (greater than)', () => {
      expect(
        evaluateCondition({ attribute: 'age', op: 'gt', value: 20 }, context, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'age', op: 'gt', value: 25 }, context, segments)
      ).toBe(false);
      expect(
        evaluateCondition({ attribute: 'age', op: 'gt', value: 30 }, context, segments)
      ).toBe(false);
    });

    it('evaluates gte (greater than or equal)', () => {
      expect(
        evaluateCondition({ attribute: 'age', op: 'gte', value: 25 }, context, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'age', op: 'gte', value: 20 }, context, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'age', op: 'gte', value: 30 }, context, segments)
      ).toBe(false);
    });

    it('evaluates lt (less than)', () => {
      expect(
        evaluateCondition({ attribute: 'age', op: 'lt', value: 30 }, context, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'age', op: 'lt', value: 25 }, context, segments)
      ).toBe(false);
      expect(
        evaluateCondition({ attribute: 'age', op: 'lt', value: 20 }, context, segments)
      ).toBe(false);
    });

    it('evaluates lte (less than or equal)', () => {
      expect(
        evaluateCondition({ attribute: 'age', op: 'lte', value: 25 }, context, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'age', op: 'lte', value: 30 }, context, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'age', op: 'lte', value: 20 }, context, segments)
      ).toBe(false);
    });

    it('returns false for numeric operators with non-numeric values', () => {
      expect(
        evaluateCondition({ attribute: 'plan', op: 'gt', value: 10 }, context, segments)
      ).toBe(false);
      expect(
        evaluateCondition({ attribute: 'age', op: 'gt', value: 'string' }, context, segments)
      ).toBe(false);
    });
  });

  describe('Collection operators', () => {
    it('evaluates in (value in array)', () => {
      expect(
        evaluateCondition({ attribute: 'country', op: 'in', value: ['US', 'CA', 'UK'] }, context, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'country', op: 'in', value: ['CA', 'UK'] }, context, segments)
      ).toBe(false);
    });

    it('evaluates nin (value not in array)', () => {
      expect(
        evaluateCondition({ attribute: 'country', op: 'nin', value: ['CA', 'UK'] }, context, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'country', op: 'nin', value: ['US', 'CA'] }, context, segments)
      ).toBe(false);
    });

    it('returns false for in/nin with non-array values', () => {
      expect(
        evaluateCondition({ attribute: 'country', op: 'in', value: 'US' }, context, segments)
      ).toBe(false);
      expect(
        evaluateCondition({ attribute: 'country', op: 'nin', value: 'CA' }, context, segments)
      ).toBe(false);
    });
  });

  describe('String operators', () => {
    it('evaluates contains', () => {
      expect(
        evaluateCondition({ attribute: 'email', op: 'contains', value: 'alice' }, context, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'email', op: 'contains', value: 'example.com' }, context, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'email', op: 'contains', value: 'bob' }, context, segments)
      ).toBe(false);
    });

    it('evaluates starts_with', () => {
      expect(
        evaluateCondition({ attribute: 'email', op: 'starts_with', value: 'alice' }, context, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'email', op: 'starts_with', value: 'bob' }, context, segments)
      ).toBe(false);
    });

    it('evaluates ends_with', () => {
      expect(
        evaluateCondition({ attribute: 'email', op: 'ends_with', value: 'example.com' }, context, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'email', op: 'ends_with', value: 'test.com' }, context, segments)
      ).toBe(false);
    });

    it('returns false for string operators with non-string values', () => {
      expect(
        evaluateCondition({ attribute: 'age', op: 'contains', value: '25' }, context, segments)
      ).toBe(false);
      expect(
        evaluateCondition({ attribute: 'email', op: 'starts_with', value: 123 }, context, segments)
      ).toBe(false);
    });
  });

  describe('Regex operator', () => {
    it('evaluates regex with valid pattern', () => {
      expect(
        evaluateCondition({ attribute: 'email', op: 'regex', value: '^alice.*\\.com$' }, context, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'email', op: 'regex', value: '^bob' }, context, segments)
      ).toBe(false);
    });

    it('returns false for invalid regex pattern', () => {
      expect(
        evaluateCondition({ attribute: 'email', op: 'regex', value: '[invalid(' }, context, segments)
      ).toBe(false);
    });

    it('returns false for regex with non-string context value', () => {
      expect(
        evaluateCondition({ attribute: 'age', op: 'regex', value: '\\d+' }, context, segments)
      ).toBe(false);
    });

    it('returns false for regex with non-string pattern', () => {
      expect(
        evaluateCondition({ attribute: 'email', op: 'regex', value: 123 }, context, segments)
      ).toBe(false);
    });
  });

  describe('Segment operator', () => {
    it('evaluates segment with matching conditions', () => {
      expect(
        evaluateCondition({ attribute: 'segment', op: 'segment', value: 'segment-1' }, context, segments)
      ).toBe(true);
    });

    it('evaluates segment with non-matching conditions', () => {
      const nonProContext: UserContext = { ...context, plan: 'free' };
      expect(
        evaluateCondition({ attribute: 'segment', op: 'segment', value: 'segment-1' }, nonProContext, segments)
      ).toBe(false);
    });

    it('returns false for non-existent segment', () => {
      expect(
        evaluateCondition({ attribute: 'segment', op: 'segment', value: 'non-existent' }, context, segments)
      ).toBe(false);
    });

    it('returns false for segment with non-string value', () => {
      expect(
        evaluateCondition({ attribute: 'segment', op: 'segment', value: 123 }, context, segments)
      ).toBe(false);
    });

    it('evaluates nested segment conditions', () => {
      const nestedSegments = new Map<string, Segment>([
        [
          'segment-nested',
          {
            id: 'segment-nested',
            name: 'Nested Segment',
            conditions: {
              operator: 'AND',
              conditions: [
                { attribute: 'segment', op: 'segment', value: 'segment-1' },
                { attribute: 'segment', op: 'segment', value: 'segment-2' },
              ],
            },
          },
        ],
        ...segments,
      ]);

      expect(
        evaluateCondition(
          { attribute: 'segment', op: 'segment', value: 'segment-nested' },
          context,
          nestedSegments
        )
      ).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('handles missing attribute in context', () => {
      expect(
        evaluateCondition({ attribute: 'nonExistent', op: 'eq', value: 'test' }, context, segments)
      ).toBe(false);
    });

    it('handles empty AND conditions', () => {
      const condition: Condition = {
        operator: 'AND',
        conditions: [],
      };
      expect(evaluateCondition(condition, context, segments)).toBe(true);
    });

    it('handles empty OR conditions', () => {
      const condition: Condition = {
        operator: 'OR',
        conditions: [],
      };
      expect(evaluateCondition(condition, context, segments)).toBe(false);
    });

    it('handles unknown operator', () => {
      expect(
        evaluateCondition({ attribute: 'plan', op: 'unknown' as any, value: 'pro' }, context, segments)
      ).toBe(false);
    });

    it('handles null context values', () => {
      const nullContext: UserContext = { ...context, plan: null };
      expect(
        evaluateCondition({ attribute: 'plan', op: 'eq', value: null }, nullContext, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'plan', op: 'eq', value: 'pro' }, nullContext, segments)
      ).toBe(false);
    });

    it('handles undefined context values', () => {
      const undefinedContext: UserContext = { ...context, plan: undefined };
      expect(
        evaluateCondition({ attribute: 'plan', op: 'eq', value: undefined }, undefinedContext, segments)
      ).toBe(true);
      expect(
        evaluateCondition({ attribute: 'plan', op: 'eq', value: 'pro' }, undefinedContext, segments)
      ).toBe(false);
    });

    it('handles deeply nested conditions', () => {
      const condition: Condition = {
        operator: 'AND',
        conditions: [
          {
            operator: 'OR',
            conditions: [
              {
                operator: 'NOT',
                condition: { attribute: 'plan', op: 'eq', value: 'free' },
              },
              { attribute: 'country', op: 'in', value: ['US', 'CA'] },
            ],
          },
          {
            operator: 'AND',
            conditions: [
              { attribute: 'age', op: 'gte', value: 18 },
              { attribute: 'email', op: 'contains', value: '@' },
            ],
          },
        ],
      };
      expect(evaluateCondition(condition, context, segments)).toBe(true);
    });
  });
});
