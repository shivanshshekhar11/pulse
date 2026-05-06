'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Save } from 'lucide-react';
import {
  Dialog, DialogHeader, DialogBody, DialogFooter,
} from '~/components/primitives/dialog';
import { Field, Input, Button } from '~/components/primitives/form';
import type { Condition, Operator } from '@pulse-flags/types';
import {
  ConditionBuilder,
  isConditionNodeValid,
  makeDefaultConditionNode,
  nodeToCondition,
  wrapConditionRoot,
} from '~/components/primitives/condition-builder';
import type { ConditionGroup, ConditionNode } from '~/components/primitives/condition-builder';

const OPERATORS: { value: Operator; label: string }[] = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'in', label: 'in' },
  { value: 'nin', label: 'not in' },
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'regex', label: 'matches regex' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'segment', label: 'in segment' },
];

export interface RuleFormValues {
  name?: string;
  conditions: Condition;
  percentage: number;
  value: unknown;
  priority: number;
  enabled: boolean;
}

export interface RuleInitial {
  name?: string | null;
  percentage: number;
  value: unknown;
  conditions: unknown;
  priority: number;
}

function countLeaves(node: ConditionNode): number {
  if (node.type === 'leaf') return 1;
  if (node.operator === 'NOT') {
    return node.children[0] ? countLeaves(node.children[0]) : 0;
  }
  return node.children.reduce((acc, child) => acc + countLeaves(child), 0);
}

export function RuleDialog({
  open,
  onClose,
  onSubmit,
  mode = 'create',
  loading,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (values: RuleFormValues) => void;
  mode?: 'create' | 'edit';
  loading?: boolean;
  initial?: RuleInitial;
}) {
  const defaultOp = useMemo(() => OPERATORS[0]?.value ?? 'eq', []);
  const [name, setName] = useState('');
  const [pct, setPct] = useState(100);
  const [value, setValue] = useState('true');
  const [conditions, setConditions] = useState<ConditionGroup>(() =>
    makeDefaultConditionNode(defaultOp),
  );

  // Reset / pre-populate when dialog opens
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name ?? '');
      setPct(initial.percentage);
      setValue(JSON.stringify(initial.value));
      setConditions(wrapConditionRoot(initial.conditions as Condition, defaultOp));
    } else {
      setName('');
      setPct(100);
      setValue('true');
      setConditions(makeDefaultConditionNode(defaultOp));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultOp, initial]);

  const canSubmit = isConditionNodeValid(conditions) && value.trim().length > 0;
  const leafCount = countLeaves(conditions);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.({
      name: name || undefined,
      conditions: nodeToCondition(conditions),
      percentage: pct,
      value: (() => { try { return JSON.parse(value); } catch { return value; } })(),
      priority: initial?.priority ?? 0,
      enabled: true,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <DialogHeader
        crumb={mode === 'create' ? 'new rule' : 'edit rule'}
        title={mode === 'create' ? 'add targeting rule' : 'edit rule'}
        subtitle="Rules evaluate top-to-bottom. The first match wins."
        onClose={onClose}
      />
      <DialogBody className="space-y-5">
        <div className="grid grid-cols-[1fr] gap-4">
          <Field label="name" hint="optional">
            <Input placeholder="EU pro users" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              conditions <span className="text-destructive">*</span>
            </label>
            <span className="text-[11px] text-dim">drag to reorder</span>
          </div>
          <ConditionBuilder
            root={conditions}
            onChange={setConditions}
            operators={OPERATORS}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="rollout %" hint="sha256(key:userId) % 100">
            <div className="space-y-2">
              <input
                type="range" min={0} max={100} value={pct}
                onChange={(e) => setPct(parseInt(e.target.value))}
                className="w-full accent-[#8be36b]"
              />
              <div className="flex items-center justify-between font-mono text-[11.5px] text-muted-foreground">
                <span>0%</span>
                <span className="text-foreground">{pct}%</span>
                <span>100%</span>
              </div>
            </div>
          </Field>
          <Field label="return value" required hint="when rule matches">
            <Input mono value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
        </div>

        <pre className="font-mono text-[11.5px] p-3 rounded-md bg-surface-0 border border-border text-muted-foreground overflow-x-auto">
          <span className="text-dim">// preview</span>{'\n'}
          <span className="text-magenta">if</span> ({leafCount} conditions) <span className="text-magenta">and</span> bucket &lt; {pct}{'\n'}
          {'  '}<span className="text-muted-foreground">return</span>{' '}
          <span className="text-primary">{value}</span>
        </pre>
      </DialogBody>
      <DialogFooter hint="audit logged · increments flag version">
        <Button variant="ghost" onClick={onClose}>cancel</Button>
        <Button
          variant="primary"
          icon={mode === 'create' ? Plus : Save}
          disabled={!canSubmit || loading}
          onClick={handleSubmit}
        >
          {loading ? 'saving…' : mode === 'create' ? 'add rule' : 'save rule'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
