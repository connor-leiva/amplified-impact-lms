// The choice before a skill is paid for (Connor, 2026-11-23): this skill for $37, or every skill
// with Amplified Insiders. An access group's member never mounts it. The $37 button starts a
// Checkout Session; Insiders reuses the monthly Payment Link. Nothing here is credited from one to
// the other.

import { useRef, useState } from 'react';
import { SKILL_PURCHASE } from '@ai/core/offer';
import { useDialogA11y } from '../../components/primitives/Modal';
import s from './SkillPurchase.module.css';

export { SKILL_PURCHASE };

export function GetSkillButton({ skillId, className }: { skillId: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {SKILL_PURCHASE.get}
      </button>
      {open ? <SkillPurchaseDialog skillId={skillId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function SkillPurchaseDialog({ skillId, onClose }: { skillId: string; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useDialogA11y(panel, true, onClose);

  const buy = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/skills/${encodeURIComponent(skillId)}/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: '{}',
      });
      const body = (await res.json().catch(() => null)) as { url?: string } | null;
      if (!res.ok || !body?.url) {
        setFailed(true);
        setBusy(false);
        return;
      }
      window.location.assign(body.url);
    } catch {
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
          <a className={s.secondary} href={SKILL_PURCHASE.insidersHref}>
            {SKILL_PURCHASE.insiders}
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
