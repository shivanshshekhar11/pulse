import type { Condition, UserContext } from '@pulse/types';
import type { Segment } from './types';

/**
 * Evaluates a condition tree against a user context.
 * 
 * Supports:
 * - Logical operators: AND, OR, NOT
 * - Comparison operators: eq, neq, gt, gte, lt, lte
 * - Collection operators: in, nin
 * - String operators: contains, starts_with, ends_with, regex
 * - Segment resolution: segment (recursive evaluation)
 * 
 * @param condition - The condition tree to evaluate
 * @param context - User attributes (e.g., { userId, country, plan })
 * @param segments - Map of segment ID to segment definition
 * @returns true if the condition matches, false otherwise
 */
export function evaluateCondition(
  condition: Condition,
  context: UserContext,
  segments: Map<string, Segment>
): boolean {
  // Logical operators
  if ('operator' in condition) {
    switch (condition.operator) {
      case 'AND':
        return condition.conditions.every(c => evaluateCondition(c, context, segments));
      
      case 'OR':
        return condition.conditions.some(c => evaluateCondition(c, context, segments));
      
      case 'NOT':
        return !evaluateCondition(condition.condition, context, segments);
    }
  }

  // Leaf condition
  return evaluateLeaf(condition, context, segments);
}

/**
 * Evaluates a leaf condition (attribute-based comparison).
 */
function evaluateLeaf(
  condition: { attribute: string; op: string; value?: unknown },
  context: UserContext,
  segments: Map<string, Segment>
): boolean {
  const { attribute, op, value } = condition;
  const contextValue = context[attribute];

  switch (op) {
    case 'eq':
      return contextValue === value;
    
    case 'neq':
      return contextValue !== value;
    
    case 'gt':
      return typeof contextValue === 'number' && typeof value === 'number' && contextValue > value;
    
    case 'gte':
      return typeof contextValue === 'number' && typeof value === 'number' && contextValue >= value;
    
    case 'lt':
      return typeof contextValue === 'number' && typeof value === 'number' && contextValue < value;
    
    case 'lte':
      return typeof contextValue === 'number' && typeof value === 'number' && contextValue <= value;
    
    case 'in':
      return Array.isArray(value) && value.includes(contextValue);
    
    case 'nin':
      return Array.isArray(value) && !value.includes(contextValue);
    
    case 'contains':
      return typeof contextValue === 'string' && typeof value === 'string' && contextValue.includes(value);
    
    case 'starts_with':
      return typeof contextValue === 'string' && typeof value === 'string' && contextValue.startsWith(value);
    
    case 'ends_with':
      return typeof contextValue === 'string' && typeof value === 'string' && contextValue.endsWith(value);
    
    case 'regex':
      if (typeof contextValue === 'string' && typeof value === 'string') {
        try {
          return new RegExp(value).test(contextValue);
        } catch {
          return false;
        }
      }
      return false;
    
    case 'segment':
      // Segment resolution: value is segment ID
      if (typeof value === 'string') {
        const segment = segments.get(value);
        if (!segment) return false;
        return evaluateCondition(segment.conditions, context, segments);
      }
      return false;
    
    default:
      return false;
  }
}
