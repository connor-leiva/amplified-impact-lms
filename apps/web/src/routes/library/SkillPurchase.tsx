// The choice before a skill is paid for (Connor, 2026-11-23): this skill for $37, or every skill
// with Amplified Insiders. An access group's member never mounts it. The $37 button starts a
// Checkout Session; Insiders reuses the monthly Payment Link. Nothing here is credited from one to
// the other.

import { useEffect, useRef, useState } from 'react';
import { AGENT_TRAINING, SKILL_PURCHASE, skillUpsell, type SkillSet } from '@ai/core/offer';
import { useDialogA11y } from '../../components/primitives/Modal';
import s from './SkillPurchase.module.css';

export { SKILL_PURCHASE };

/** The cart Payment Links, from `GET /api/offer`, which reads them from Railway. */
export function paymentLinks(): Promise<Record<string, string | null>> {
  return fetch('/api/offer', { headers: { accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : { carts: [] }))
    .then((body: { carts?: { id: string; paymentLink: string | null }[] }) =>
      Object.fromEntries((body.carts ?? []).map((c) => [c.id, c.paymentLink])),
    )
    .catch(() => ({}));
}

/**
 * Starts a $37 Checkout Session for a signed-in learner and goes to it. Resolves false when it didn't start (the caller
 * says "Checkout didn’t start. Try again."). The dialog below and the $37 buyer's locked skill page (D-241) both use it.
 */
export async function startSkillCheckout(skillId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/skills/${encodeURIComponent(skillId)}/checkout`, {
      method: 'POST',
      credentials: 'include',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: '{}',
    });
    const body = (await res.json().catch(() => null)) as { url?: string } | null;
    if (!res.ok || !body?.url) return false;
    window.location.assign(body.url);
    return true;
  } catch {
    return false;
  }
}

export function GetSkillButton({ skillId, sets, className }: { skillId: string; sets: SkillSet; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {SKILL_PURCHASE.get}
      </button>
      {open ? <SkillPurchaseDialog skillId={skillId} sets={sets} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function SkillPurchaseDialog({ skillId, sets, onClose }: { skillId: string; sets: SkillSet; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [href, setHref] = useState<string | null>(null);
  const upsell = skillUpsell(sets);
  useDialogA11y(panel, true, onClose);
  useEffect(() => {
    let alive = true;
    void paymentLinks().then((links) => {
      if (alive) setHref(links[upsell.cart] ?? null);
    });
    return () => {
      alive = false;
    };
  }, [upsell.cart]);

  const buy = async () => {
    setBusy(true);
    setFailed(false);
    if (!(await startSkillCheckout(skillId))) {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <div
      className={s.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={panel} className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="skill-purchase-title" tabIndex={-1}>
        <h2 className={s.title} id="skill-purchase-title">
          {SKILL_PURCHASE.title}
        </h2>
        <p className={s.body}>{SKILL_PURCHASE.body}</p>
        <div className={s.actions}>
          <button type="button" className={s.primary} onClick={() => void buy()} disabled={busy}>
            {busy ? SKILL_PURCHASE.starting : SKILL_PURCHASE.get}
          </button>
          <a className={s.secondary} href={href ?? undefined} aria-disabled={href === null}>
            {upsell.label}
          </a>
        </div>
        {failed ? (
          <p className={s.failed} role="alert">
            {SKILL_PURCHASE.failed}
          </p>
        ) : null}
        <button type="button" className={s.close} onClick={onClose}>
          {SKILL_PURCHASE.close}
        </button>
      </div>
    </div>
  );
}

/** The weekly live training upgrade, in the same dialog as a skill purchase. */
export function AgentPlanUpgrade({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const [href, setHref] = useState<string | null>(null);
  useDialogA11y(panel, true, onClose);
  useEffect(() => {
    let alive = true;
    void paymentLinks().then((links) => {
      if (alive) setHref(links[AGENT_TRAINING.cart] ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div
      className={s.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={panel} className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="agent-training-title" tabIndex={-1}>
        <h2 className={s.title} id="agent-training-title">
          {AGENT_TRAINING.title}
        </h2>
        <p className={s.body}>{AGENT_TRAINING.body}</p>
        <div className={s.actions}>
          <a className={s.primary} href={href ?? undefined}>
            {AGENT_TRAINING.upgrade}
          </a>
        </div>
        <button type="button" className={s.close} onClick={onClose}>
          {SKILL_PURCHASE.close}
        </button>
      </div>
    </div>
  );
}
