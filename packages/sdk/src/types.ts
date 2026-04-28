import type { Condition } from '@pulse/types';

export interface Segment {
  id: string;
  name: string;
  conditions: Condition;
}

export interface Rule {
  id: string;
  name: string | null;
  priority: number;
  conditions: Condition;
  percentage: number;
  value: unknown;
  enabled: boolean;
}

export interface Flag {
  id: string;
  key: string;
  name: string;
  type: 'boolean' | 'string' | 'number' | 'json';
  defaultValue: unknown;
  enabled: boolean;
  rules: Rule[];
}

export interface Ruleset {
  flags: Flag[];
  segments: Segment[];
}
