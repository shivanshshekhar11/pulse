'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogBody, DialogFooter, DialogHeader } from '~/components/primitives/dialog';
import { Button, Field, Input } from '~/components/primitives/form';
import { clearStreamKey, setStreamKey, useStreamKey } from '~/lib/stream-keys';

export function LiveUpdatesDialog({
  open,
  onClose,
  envId,
  envName,
}: {
  open: boolean;
  onClose: () => void;
  envId?: string;
  envName?: string;
}) {
  const current = useStreamKey(envId);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!open) return;
    setValue('');
  }, [open]);

  const handleSave = () => {
    if (!envId) return;
    setStreamKey(envId, value, envName);
    onClose();
  };

  const handleClear = () => {
    if (!envId) return;
    clearStreamKey(envId);
    onClose();
  };

  const canSave = !!envId && value.trim().length > 0;
  const masked = current?.apiKey ? `${current.apiKey.slice(0, 12)}...` : null;

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogHeader
        crumb="live updates"
        title="connect live updates"
        subtitle={`Paste a read-scoped API key for ${envName ?? 'this environment'}. Stored in memory only.`}
        onClose={onClose}
      />
      <DialogBody className="space-y-4">
        <Field label="api key" required>
          <Input
            mono
            autoFocus
            placeholder="ps_test_..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        {masked && (
          <p className="font-mono text-[11.5px] text-muted-foreground">
            current key: {masked}
          </p>
        )}
        <p className="text-[12px] text-muted-foreground">
          Live updates use the SDK stream endpoint and keep the key in memory only.
        </p>
      </DialogBody>
      <DialogFooter>
        {current && (
          <Button variant="danger" onClick={handleClear}>
            clear key
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={!canSave}>
          connect
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
