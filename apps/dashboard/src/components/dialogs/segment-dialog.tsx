
'use client';

import { useEffect, useMemo, useState } from 'react';
import { CreateSegmentSchema } from '@pulse-flags/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Save } from 'lucide-react';
import {
  Dialog, DialogHeader, DialogBody, DialogFooter,
} from '~/components/primitives/dialog';
import { Field, Input, Textarea, Button } from '~/components/primitives/form';
import type { Condition, Operator } from '@pulse-flags/types';
import {
  ConditionBuilder,
  isConditionNodeValid,
  makeDefaultConditionNode,
  nodeToCondition,
  wrapConditionRoot,
} from '~/components/primitives/condition-builder';
import type { ConditionGroup } from '~/components/primitives/condition-builder';

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
];

export interface SegmentFormValues {
  name: string;
  description?: string;
  conditions: Condition;
}

export interface SegmentInitial {
  name?: string;
  description?: string | null;
  conditions?: unknown;
}

export function SegmentDialog({
  open,
  onClose,
  onSubmit,
  mode = 'create',
  loading,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (values: SegmentFormValues) => void;
  mode?: 'create' | 'edit';
  loading?: boolean;
  initial?: SegmentInitial;
}) {
  const { register, handleSubmit, reset, setValue, watch } = useForm<z.input<typeof CreateSegmentSchema>>({
    resolver: zodResolver(CreateSegmentSchema),
    defaultValues: { name: '', description: '', conditions: undefined as any },
  });
  const defaultOp = useMemo(() => OPERATORS[0]?.value ?? 'eq', []);
  const [conditions, setConditions] = useState<ConditionGroup>(() =>
    makeDefaultConditionNode(defaultOp),
  );

  

  // Reset / pre-populate when dialog opens
  useEffect(() => {
    if (!open) return;
    reset({
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      conditions: initial?.conditions as any,
    });
    if (initial?.conditions) {
      setConditions(wrapConditionRoot(initial.conditions as Condition, defaultOp));
    } else {
      setConditions(makeDefaultConditionNode(defaultOp));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultOp, initial]);

  const canSubmit = isConditionNodeValid(conditions) && !!watch('name');

  const onValid = (values: z.input<typeof CreateSegmentSchema>) => {
    if (!isConditionNodeValid(conditions)) return;
    onSubmit?.({
      name: values.name,
      description: values.description || undefined,
      conditions: nodeToCondition(conditions),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <DialogHeader
        crumb={mode === 'create' ? 'new segment' : 'edit segment'}
        title={mode === 'create' ? 'create segment' : 'edit segment'}
        subtitle="Reusable user groups, scoped to your org. Reference from any flag rule."
        onClose={onClose}
      />
      <DialogBody className="space-y-5">
        <div className="grid grid-cols-[1fr] gap-4">
          <Field label="name" required>
            <Input mono autoFocus placeholder="Internal_Beta" {...register('name')} />
          </Field>
        </div>
        <Field label="description" hint="optional">
          <Textarea placeholder="Acme employees and trusted external testers" {...register('description')} />
        </Field>

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
              // keep form in sync for potential consumers
              try {
                setValue('conditions', nodeToCondition(node) as any);
              } catch {
                // ignore
              }
            }}
            operators={OPERATORS}
          />
        </div>
      </DialogBody>
      <DialogFooter hint="segment conditions">
        <Button variant="ghost" onClick={onClose}>cancel</Button>
        <Button variant="primary" icon={mode === 'create' ? Plus : Save} disabled={!canSubmit || loading} onClick={handleSubmit(onValid)}>
          {loading ? 'saving…' : mode === 'create' ? 'create segment' : 'save changes'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
