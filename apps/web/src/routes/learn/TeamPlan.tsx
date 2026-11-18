// The Team Plan window (D-187): a preview of what comes with the Team Plan, over the page, for an Agent Plan
// learner who opened something gated to it. A real dialog (the R2 modal: focus moves in and back, Escape
// and the scrim close it, Tab stays inside). Markup only: every string is TeamPlan.vm.ts's, and the plan's
// words are the builder's copy strings.

import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/r2/Modal';
import { useMutate } from '../../data/hooks';
import { Tile } from './parts';
import type { PlanPreviewVM, TeamPlanVM } from './TeamPlan.vm';
import s from './Learn.module.css';

function Preview({ p }: { p: PlanPreviewVM }) {
  return (
    <div className={`${s.row} ${s.nw}`} style={{ gap: 12, alignItems: 'flex-start' }}>
      <Tile icon={p.icon} tone={p.tone} size={36} />
      <div className={s.colZ} style={{ gap: 6 }}>
        {p.line ? <p className={`${s.p} ${s.s2}`}>{p.line}</p> : null}
        {p.outputs.length ? (
          <ul className={`${s.ul} ${s.colZ}`} style={{ gap: 4 }}>
            {p.outputs.map((o) => (
              <li key={o} className={`${s.row} ${s.nw} ${s.me}`} style={{ alignItems: 'flex-start' }}>
                <Icon name="r2Check" size={14} strokeWidth={2.2} />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function TeamPlanWindow({ vm, onClose }: { vm: TeamPlanVM; onClose: () => void }) {
  const mutate = useMutate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ask = vm.kind === 'offer' ? vm.ask : null;
  const request = async () => {
    if (!ask) return;
    setBusy(true);
    setError('');
    const out = await mutate('requestUpgrade', { source: ask.source });
    setBusy(false);
    if (out.error) setError(out.error);
  };
  return (
    <Modal
      title={vm.title}
      onClose={onClose}
      foot={
        ask ? (
          <button type="button" className={`${s.b} ${s.bp}`} disabled={busy} onClick={() => void request()}>
            {ask.label}
          </button>
        ) : undefined
      }
    >
      <div className={s.col} data-team-plan={vm.kind}>
        {vm.preview && (vm.preview.line || vm.preview.outputs.length) ? <Preview p={vm.preview} /> : null}
        {vm.kind === 'wait' ? (
          vm.loading ? (
            <p className={`${s.p} ${s.me}`} role="status">
              {vm.loading}
            </p>
          ) : null
        ) : vm.kind === 'group' ? (
          <p className={`${s.p} ${s.ost}`}>
            <Icon name="lvLock" size={13} strokeWidth={1.9} />
            {vm.line}
          </p>
        ) : (
          <>
            {vm.heading ? (
              <p className={`${s.p} ${s.ost}`}>
                <Icon name="lvLock" size={13} strokeWidth={1.9} />
                {vm.heading}
              </p>
            ) : null}
            {vm.lines.map((l) => (
              <p key={l} className={`${s.p} ${s.s2}`}>
                {l}
              </p>
            ))}
            {vm.asked ? (
              <p className={`${s.p} ${s.ost}`} data-tone="ok" role="status">
                <Icon name="r2Check" size={13} strokeWidth={2.2} />
                {vm.asked}
              </p>
            ) : null}
            {error ? (
              <p className={`${s.p} ${s.me}`} role="alert">
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}
