import { useState } from 'react';
import clsx from 'clsx';
import { Button } from '../r2/Button';
import { Modal } from '../r2/Modal';
import { TextArea, k } from '../r2/kit';
import { MASQUERADE_REASON_MAX } from '@ai/core';
import { MASQ_COPY, reasonCheck } from '../../routes/console/masquerade.vm';
import s from './Masquerade.module.css';

// The reason dialog (D-162 3b): the mockup's `ReasonModal` on the R2 `Modal` (R2-1c part 2's Tab trap).
// Start ("Masquerade as {name}") and Extend ("Extend masquerade by 15 minutes") each need a reason of
// 10 to 500 characters (D7; the mockup's 8 is the spec's 10 here). It is `lock`ed, as the mockup's
// is: no Close, and neither Escape nor the scrim dismisses it; Cancel does. A refusal from the API
// (an active session, a staff target, the cap, the flag off, a reason it refuses) shows inside it.

const C = MASQ_COPY.reason;

export interface ReasonDialogProps {
  mode: 'start' | 'extend';
  /** Start's person and workspace, for the title and the sentence. */
  target?: { name: string; workspace: string | null };
  onCancel: () => void;
  /** Resolves when done (the page moves on); a rejection's message is shown here. */
  onSubmit: (reason: string) => Promise<void>;
}

export function ReasonDialog({ mode, target, onCancel, onSubmit }: ReasonDialogProps) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const check = reasonCheck(text);
  const start = mode === 'start';

  const go = () => {
    if (!check.ok || busy) return;
    setBusy(true);
    setError(null);
    onSubmit(text.trim()).then(
      () => setBusy(false),
      (e: unknown) => {
        setError(e instanceof Error ? e.message : 'The request failed. Nothing was changed.');
        setBusy(false);
      },
    );
  };

  return (
    <Modal
      lock
      title={start && target ? C.startTitle(target.name) : C.extendTitle}
      onClose={onCancel}
      foot={
        <>
          <Button onClick={onCancel}>{C.cancel}</Button>
          <Button kind="primary" className={s.primary} disabled={!check.ok || busy} onClick={go}>
            {start ? C.start : C.extend}
          </Button>
        </>
      }
    >
      {start && target ? <p className={clsx(k.p, k.s2)}>{C.body(target.name, target.workspace)}</p> : null}
      <label className={s.lab}>
        {start ? C.label : C.extendLabel}
        <TextArea
          rows={3}
          autoFocus
          value={text}
          maxLength={MASQUERADE_REASON_MAX}
          placeholder={C.placeholder}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <p className={clsx(k.p, k.me)}>{check.help}</p>
      {error ? (
        <p role="alert" className={clsx(k.p, s.err)}>
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
