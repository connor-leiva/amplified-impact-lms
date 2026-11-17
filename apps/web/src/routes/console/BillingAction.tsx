import { useEffect, useId, useState } from 'react';
import clsx from 'clsx';
import { CONSOLE_REASON_MAX } from '@ai/core';
import type { BillingActionPreview, BillingActionResult } from '@ai/core';
import { Button } from '../../components/r2/Button';
import { AUDITED, Modal } from '../../components/r2/Modal';
import { Skel, k } from '../../components/r2/kit';
import type { ConsoleApi } from '../../data/console';
import { BILLING_COPY, actionDialogVM, actionErrorOf, canConfirm } from './billing.vm';
import type { ActionTarget } from './billing.vm';
import s from './BillingAction.module.css';

// The refund and void dialogs (D-164, spec § 7.6): the mockup's `Confirm` for `refund` and `voidI` on
// the R2 `Modal` (its title, its sentence, "Reason" with "Required", "This action is audit-logged.",
// Cancel and the danger action), plus what the spec adds inside the same dialog: the preview's
// consequences (what Stripe and then the LMS will do), the reason's 10-character minimum, typing the
// amount or the invoice id to confirm, and the server's refusal in words (403, 409, 410, 503) with
// "Start again" where the confirmation can't be sent again. It previews as it opens; nothing reaches
// Stripe until the action is pressed.

const C = BILLING_COPY.action;

export function BillingActionDialog({
  api,
  target,
  onClose,
  onDone,
}: {
  api: ConsoleApi;
  target: ActionTarget;
  onClose: () => void;
  onDone: (r: BillingActionResult) => void;
}) {
  const [preview, setPreview] = useState<BillingActionPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; restart: boolean } | null>(null);
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const [attempt, setAttempt] = useState(0);
  const ids = useId();

  useEffect(() => {
    let alive = true;
    setPreview(null);
    setTyped('');
    setError(null);
    api.billingPreview(target.action, { invoiceId: target.invoiceId }).then(
      (p) => alive && setPreview(p),
      (e: unknown) => alive && setError({ ...actionErrorOf(e), restart: true }),
    );
    return () => {
      alive = false;
    };
  }, [api, target, attempt]);

  const vm = actionDialogVM(target, preview);
  const ready = canConfirm(target.action, reason, typed, preview) && !busy;
  // No preview to send, or a refusal the same confirmation can't get past: read Stripe again.
  const restart = error !== null && (error.restart || preview === null);
  const loading = preview === null && error === null;

  const send = () => {
    if (!preview || !ready) return;
    setBusy(true);
    setError(null);
    api.billingExecute(target.action, { confirmToken: preview.confirmToken, reason: reason.trim(), typed }).then(
      (r) => onDone(r),
      (e: unknown) => {
        setError(actionErrorOf(e));
        setBusy(false);
      },
    );
  };

  return (
    <Modal
      title={vm.title}
      onClose={onClose}
      foot={
        <>
          <Button onClick={onClose}>{C.cancel}</Button>
          {restart ? (
            <Button kind="primary" className={s.primary} onClick={() => setAttempt((n) => n + 1)}>
              {C.again}
            </Button>
          ) : (
            <Button kind="primary-danger" className={s.primary} disabled={!ready} onClick={send}>
              {vm.cta}
            </Button>
          )}
        </>
      }
    >
      <p className={clsx(k.p, k.s2)}>{vm.body}</p>
      <div className={s.what} aria-busy={loading || undefined}>
        <p className={clsx(k.p, k.w5)} id={`${ids}-what`}>
          {C.what}
        </p>
        {vm.consequences ? (
          <ul className={s.list} aria-labelledby={`${ids}-what`}>
            {vm.consequences.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        ) : loading ? (
          <Skel lines={2} />
        ) : null}
      </div>
      <label className={s.lab}>
        {C.reason}
        <input
          className={k.in}
          autoFocus
          value={reason}
          maxLength={CONSOLE_REASON_MAX}
          placeholder={C.placeholder}
          aria-describedby={`${ids}-why`}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <p className={clsx(k.p, k.me)} id={`${ids}-why`}>
        {C.reasonHelp}
      </p>
      <label className={s.lab}>
        {vm.typedLabel}
        <input
          className={clsx(k.in, k.mo)}
          value={typed}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
        />
      </label>
      <p className={clsx(k.p, k.me)}>{AUDITED}</p>
      {error ? (
        <p role="alert" className={clsx(k.p, s.err)}>
          {error.message}
        </p>
      ) : null}
    </Modal>
  );
}
