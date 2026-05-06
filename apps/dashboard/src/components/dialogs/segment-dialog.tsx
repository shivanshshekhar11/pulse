'use client';

import { useState, useEffect, useMemo } from 'react';
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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const defaultOp = useMemo(() => OPERATORS[0]?.value ?? 'eq', []);
  const [conditions, setConditions] = useState<ConditionGroup>(() =>
    makeDefaultConditionNode(defaultOp),
  );

  // Reset / pre-populate when dialog opens
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    if (initial?.conditions) {
      setConditions(wrapConditionRoot(initial.conditions as Condition, defaultOp));
    } else {
      setConditions(makeDefaultConditionNode(defaultOp));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultOp, initial]);

  const canSubmit = !!name && isConditionNodeValid(conditions);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.({
      name,
      description: description || undefined,
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
            <Input mono autoFocus placeholder="Internal_Beta" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <Field label="description" hint="optional">
          <Textarea placeholder="Acme employees and trusted external testers" value={description} onChange={(e) => setDescription(e.target.value)} />
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
            onChange={setConditions}
            operators={OPERATORS}
          />
        </div>
      </DialogBody>
      <DialogFooter hint="segment conditions">
        <Button variant="ghost" onClick={onClose}>cancel</Button>
        <Button variant="primary" icon={mode === 'create' ? Plus : Save} disabled={!canSubmit || loading} onClick={handleSubmit}>
          {loading ? 'saving…' : mode === 'create' ? 'create segment' : 'save changes'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
