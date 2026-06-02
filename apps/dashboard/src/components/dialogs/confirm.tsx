'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@pulse-flags/ui';
import { Button, Input } from '@pulse-flags/ui';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'delete',
  confirmType,
  consequences = [],
  variant = 'danger',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmType?: string;
  consequences?: string[];
  variant?: 'danger' | 'warning';
}) {
  const ConfirmSchema = z.object({
    typed: z.string().optional(),
  }).superRefine((values, context) => {
    if (confirmType && values.typed !== confirmType) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['typed'],
        message: 'type the confirmation text exactly',
      });
    }
  });

  const { register, handleSubmit, reset, watch } = useForm<z.infer<typeof ConfirmSchema>>({
    resolver: zodResolver(ConfirmSchema),
    defaultValues: { typed: '' },
  });

  const typed = watch('typed') ?? '';
  const canConfirm = !confirmType || typed === confirmType;

  useEffect(() => {
    if (open) reset({ typed: '' });
  }, [open, reset]);

  return (
    <Dialog open={open} onClose={onClose} size="sm">
      <DialogHeader
        crumb={variant === 'danger' ? 'destructive' : 'confirm'}
        title={title}
        subtitle={description}
        onClose={onClose}
        tone={variant === 'danger' ? 'danger' : 'default'}
      />
      <DialogBody className="space-y-4">
        {consequences.length > 0 && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3.5">
            <div className="flex items-center gap-2 mb-2 text-destructive">
              <AlertTriangle className="size-3.5" />
              <span className="font-mono text-[11px] uppercase tracking-widest">
                consequences
              </span>
            </div>
            <ul className="space-y-1.5 text-[12.5px] text-muted-foreground">
              {consequences.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <span className="text-destructive mt-1">·</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {confirmType && (
          <div>
            <p className="text-[12.5px] text-muted-foreground mb-2">
              Type{' '}
              <code className="font-mono text-foreground bg-surface-0 px-1.5 py-0.5 rounded border border-border">
                {confirmType}
              </code>{' '}
              to confirm.
            </p>
            <Input
              mono
              autoFocus
              placeholder={confirmType}
              {...register('typed')}
            />
          </div>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          cancel
        </Button>
        <Button
          variant="danger"
          disabled={!canConfirm}
          onClick={handleSubmit(() => {
            onConfirm?.();
            reset({ typed: '' });
            onClose();
          })}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
