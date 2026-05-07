'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Save } from 'lucide-react';
import {
  Dialog, DialogHeader, DialogBody, DialogFooter,
} from '~/components/primitives/dialog';
import { Field, Input, Button } from '~/components/primitives/form';
import { CreateRuleSchema } from '@pulse-flags/types';
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
  const { register, handleSubmit, reset, setValue: setFormValue, watch } = useForm<z.input<typeof CreateRuleSchema>>({
    resolver: zodResolver(CreateRuleSchema),
    defaultValues: { name: '', percentage: 100, value: 'true', conditions: undefined },
  });
  const [conditions, setConditions] = useState<ConditionGroup>(() =>
    makeDefaultConditionNode(defaultOp),
  );

  // Reset / pre-populate when dialog opens
  useEffect(() => {
    if (!open) return;
    if (initial) {
      reset({
        name: initial.name ?? '',
        percentage: initial.percentage,
        value: JSON.stringify(initial.value),
        conditions: initial.conditions as any,
      });
      setConditions(wrapConditionRoot(initial.conditions as Condition, defaultOp));
    } else {
      reset({ name: '', percentage: 100, value: 'true', conditions: undefined });
      setConditions(makeDefaultConditionNode(defaultOp));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultOp, initial]);

  const canSubmit = isConditionNodeValid(conditions) && (watch('value') ?? '').toString().trim().length > 0;
  const leafCount = countLeaves(conditions);

  const onValid = (values: z.input<typeof CreateRuleSchema>) => {
    if (!isConditionNodeValid(conditions)) return;
    const rawValue = typeof values.value === 'string' ? values.value : String(values.value ?? '');
    let parsedValue: unknown = rawValue;
    try { parsedValue = JSON.parse(rawValue); } catch { /* leave as-is */ }
    onSubmit?.({
      name: values.name || undefined,
      conditions: nodeToCondition(conditions),
      percentage: values.percentage ?? 100,
      value: parsedValue,
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
            <Input placeholder="EU pro users" {...register('name')} />
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
            onChange={(node) => {
              setConditions(node);
              try { setFormValue('conditions', nodeToCondition(node)); } catch {}
            }}
            operators={OPERATORS}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="rollout %" hint="sha256(key:userId) % 100">
            <div className="space-y-2">
              <input
                type="range" min={0} max={100} {...register('percentage', { valueAsNumber: true })}
                className="w-full accent-[#8be36b]"
              />
              <div className="flex items-center justify-between font-mono text-[11.5px] text-muted-foreground">
                <span>0%</span>
                <span className="text-foreground">{watch('percentage') ?? 0}%</span>
                <span>100%</span>
              </div>
            </div>
          </Field>
          <Field label="return value" required hint="when rule matches">
            <Input mono {...register('value')} />
          </Field>
        </div>

          <pre className="font-mono text-[11.5px] p-3 rounded-md bg-surface-0 border border-border text-muted-foreground overflow-x-auto">
          <span className="text-dim">// preview</span>{'\n'}
          <span className="text-magenta">if</span> ({leafCount} conditions) <span className="text-magenta">and</span> bucket &lt; {watch('percentage') ?? 0}{'\n'}
          {'  '}<span className="text-muted-foreground">return</span>{' '}
          <span className="text-primary">{String(watch('value') ?? '')}</span>
        </pre>
      </DialogBody>
      <DialogFooter hint="audit logged · increments flag version">
        <Button variant="ghost" onClick={onClose}>cancel</Button>
        <Button
          variant="primary"
          icon={mode === 'create' ? Plus : Save}
          disabled={!canSubmit || loading}
          onClick={handleSubmit(onValid)}
        >
          {loading ? 'saving…' : mode === 'create' ? 'add rule' : 'save rule'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
