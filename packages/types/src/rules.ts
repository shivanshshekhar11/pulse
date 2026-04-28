import { z } from 'zod';

// ============================================================================
// Rule Engine Types - Used by SDK and API
// ============================================================================

// Operator types
export const OperatorSchema = z.enum([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'nin',
  'contains',
  'starts_with',
  'ends_with',
  'regex',
  'segment',
]);

export type Operator = z.infer<typeof OperatorSchema>;

// Leaf condition (attribute-based)
export const LeafConditionSchema = z.object({
  attribute: z.string(),
  op: OperatorSchema,
  value: z.unknown(),
});

// Recursive condition type
export type Condition =
  | { operator: 'AND'; conditions: Condition[] }
  | { operator: 'OR'; conditions: Condition[] }
  | { operator: 'NOT'; condition: Condition }
  | z.infer<typeof LeafConditionSchema>;

// Zod schema for recursive condition
export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({
      operator: z.literal('AND'),
      conditions: z.array(ConditionSchema),
    }),
    z.object({
      operator: z.literal('OR'),
      conditions: z.array(ConditionSchema),
    }),
    z.object({
      operator: z.literal('NOT'),
      condition: ConditionSchema,
    }),
    LeafConditionSchema,
  ])
);

// User context for evaluation
export const UserContextSchema = z.record(z.string(), z.unknown());

export type UserContext = z.infer<typeof UserContextSchema>;
