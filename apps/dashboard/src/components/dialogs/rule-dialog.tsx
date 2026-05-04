'use client';

import { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '~/components/primitives/dialog';
import { Field, Input, Button, Select } from '~/components/primitives/form';

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
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'segment', label: 'in segment' },
];

type Cond = { id: string; attr: string; op: string; val: string };

export function RuleDialog({
  open,
  onClose,
  mode = 'create',
}: {
  open: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
}) {
  const [name, setName] = useState('');
  const [match, setMatch] = useState<'AND' | 'OR'>('AND');
  const [conds, setConds] = useState<Cond[]>([
    { id: '1', attr: 'country', op: 'in', val: '["US"]' },
  ]);
  const [pct, setPct] = useState(100);
  const [value, setValue] = useState('true');

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
        crumb={mode === 'create' ? 'new rule' : 'edit rule'}
        title={
          mode === 'create' ? 'add targeting rule' : 'edit rule'
        }
        subtitle="Rules evaluate top-to-bottom. The first match wins. Reorder by drag in the rule list."
        onClose={onClose}
      />
      <DialogBody className="space-y-5">
        <div className="grid grid-cols-[1fr_220px] gap-4">
          <Field label="name" hint="optional">
            <Input
              placeholder="EU pro users"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="match strategy">
            <Select
              value={match}
              onChange={(v) => setMatch(v as 'AND' | 'OR')}
              options={[
                { value: 'AND', label: 'AND — match all' },
                { value: 'OR', label: 'OR — match any' },
              ]}
            />
          </Field>
        </div>

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

        <div className="grid grid-cols-2 gap-4">
          <Field label="rollout %" hint="sha256(key:userId) % 100">
            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={100}
                value={pct}
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
            <Input
              mono
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
        </div>

        <pre className="font-mono text-[11.5px] p-3 rounded-md bg-surface-0 border border-border text-muted-foreground overflow-x-auto">
          <span className="text-dim">// preview</span>
          {'\n'}
          <span className="text-magenta">if</span> (
          {match === 'AND' ? 'all' : 'any'} of {conds.length} match){' '}
          <span className="text-magenta">and</span> bucket &lt; {pct}
          {'\n'}
          {'  '}
          <span className="text-muted-foreground">return</span>{' '}
          <span className="text-primary">{value}</span>
        </pre>
      </DialogBody>
      <DialogFooter hint="audit logged · increments flag version">
        <Button variant="ghost" onClick={onClose}>
          cancel
        </Button>
        <Button
          variant="primary"
          icon={mode === 'create' ? Plus : Save}
          onClick={onClose}
        >
          {mode === 'create' ? 'add rule' : 'save rule'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
