'use client';

import { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '~/components/primitives/dialog';
import {
  Field,
  Input,
  Textarea,
  Button,
  Select,
} from '~/components/primitives/form';

const OPERATORS = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'in', label: 'in' },
  { value: 'nin', label: 'not in' },
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'regex', label: 'matches regex' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
];

type Cond = { id: string; attr: string; op: string; val: string };

export function SegmentDialog({
  open,
  onClose,
  mode = 'create',
}: {
  open: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [match, setMatch] = useState<'AND' | 'OR'>('AND');
  const [conds, setConds] = useState<Cond[]>([
    { id: '1', attr: 'country', op: 'in', val: '["US","CA","UK"]' },
  ]);

  const addCond = () =>
    setConds([
      ...conds,
      { id: String(Date.now()), attr: '', op: 'eq', val: '' },
    ]);
  const removeCond = (id: string) =>
    setConds(conds.filter((c) => c.id !== id));
  const updateCond = (id: string, patch: Partial<Cond>) =>
    setConds(conds.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <DialogHeader
        crumb={mode === 'create' ? 'new segment' : 'edit segment'}
        title={mode === 'create' ? 'create segment' : 'edit segment'}
        subtitle="Reusable user groups, scoped to your org. Reference from any flag rule."
        onClose={onClose}
      />
      <DialogBody className="space-y-5">
        <div className="grid grid-cols-[1fr_220px] gap-4">
          <Field label="name" required>
            <Input
              mono
              autoFocus
              placeholder="Internal_Beta"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="match strategy">
            <Select
              value={match}
              onChange={(v) => setMatch(v as 'AND' | 'OR')}
              options={[
                { value: 'AND', label: 'AND — all must match' },
                { value: 'OR', label: 'OR — any may match' },
              ]}
            />
          </Field>
        </div>

        <Field label="description" hint="optional">
          <Textarea
            placeholder="Acme employees and trusted external testers"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              conditions <span className="text-destructive">*</span>
            </label>
            <Button size="sm" variant="ghost" icon={Plus} onClick={addCond}>
              add condition
            </Button>
          </div>
          <div className="space-y-2">
            {conds.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2">
                <span
                  className={`font-mono text-[10px] px-1.5 py-1 rounded border w-12 text-center shrink-0 ${
                    i === 0
                      ? 'border-dim text-dim'
                      : match === 'AND'
                        ? 'border-primary/40 text-primary bg-primary/10'
                        : 'border-magenta/40 text-magenta bg-magenta/10'
                  }`}
                >
                  {i === 0 ? 'if' : match}
                </span>
                <Input
                  mono
                  placeholder="attribute"
                  value={c.attr}
                  onChange={(e) => updateCond(c.id, { attr: e.target.value })}
                  className="flex-1"
                />
                <Select
                  className="w-32"
                  value={c.op}
                  onChange={(v) => updateCond(c.id, { op: v })}
                  options={OPERATORS}
                />
                <Input
                  mono
                  placeholder="value"
                  value={c.val}
                  onChange={(e) => updateCond(c.id, { val: e.target.value })}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeCond(c.id)}
                  disabled={conds.length === 1}
                  className="size-8 grid place-items-center rounded border border-border bg-surface-2 text-destructive hover:bg-destructive/10 shrink-0 disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </DialogBody>
      <DialogFooter
        hint={`${conds.length} condition${conds.length !== 1 ? 's' : ''} · ${match} match`}
      >
        <Button variant="ghost" onClick={onClose}>
          cancel
        </Button>
        <Button
          variant="primary"
          icon={mode === 'create' ? Plus : Save}
          onClick={onClose}
        >
          {mode === 'create' ? 'create segment' : 'save changes'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
