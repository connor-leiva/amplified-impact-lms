import { useEffect, useId, useState } from 'react';
import { Button } from '../primitives/Button';
import { Modal } from '../primitives/Modal';
import s from './ConfirmDialog.module.css';

// The Console's confirm (D-158, spec § 8 "ConfirmDialog"): a modal that names what it will do, with an
// optional required reason, Cancel, and one primary that runs the action. Every Console action is
// audited, and it says so. While the action runs, both buttons wait and the dialog stays open; a
// failure keeps it open with the reason kept, so nothing typed is lost.

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirm: string;
  busyLabel: string;
  cancel: string;
  footnote: string;
  /** A destructive action's primary is the danger style. */
  danger?: boolean;
  /** A required reason: its label, its help line, and whether the text is enough. */
  reason?: { label: string; help: string; ready: (text: string) => boolean };
  busy: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, body, confirm, busyLabel, cancel, footnote, danger, reason, busy, onConfirm, onClose }: ConfirmDialogProps) {
  const [text, setText] = useState('');
  const titleId = useId();
  const fieldId = useId();
  const helpId = useId();
  useEffect(() => {
    if (open) setText('');
  }, [open]);
  const ready = !reason || reason.ready(text);
  const close = () => {
    if (!busy) onClose();
  };
  return (
    <Modal open={open} label={title} width={480} onClose={close}>
      <form
        className={s.body}
        aria-labelledby={titleId}
        onSubmit={(e) => {
          e.preventDefault();
          if (ready && !busy) onConfirm(text.trim());
        }}
      >
        <h2 id={titleId} className={s.title}>
          {title}
        </h2>
        <p className={s.text}>{body}</p>
        {reason ? (
          <div className={s.field}>
            <label htmlFor={fieldId} className={s.label}>
              {reason.label}
            </label>
            <textarea id={fieldId} className={s.input} rows={3} value={text} aria-describedby={helpId} onChange={(e) => setText(e.target.value)} />
            <span id={helpId} className={s.help}>
              {reason.help}
            </span>
          </div>
        ) : null}
        <p className={s.foot}>{footnote}</p>
        <div className={s.actions}>
          <Button type="button" variant="secondary" onClick={close} disabled={busy}>
            {cancel}
          </Button>
          <Button type="submit" variant={danger ? 'destructive' : 'primary'} disabled={!ready || busy} aria-busy={busy || undefined}>
            {busy ? busyLabel : confirm}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
