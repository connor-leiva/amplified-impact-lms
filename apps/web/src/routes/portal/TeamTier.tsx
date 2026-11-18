import type { Learner } from '@ai/core';
import { Icon } from '../../components/Icon';
import { StatusToken } from '../../components/StatusToken';
import { useDb, useMutate, useNow, useViewer } from '../../data/hooks';
import { teamTierVM } from './TeamTier.vm';
import s from './TeamTier.module.css';

// /team-tier — ported from design-reference/Portal Upgrade.dc.html (SCREENS § 3.6).
// Markup only: every string and number comes from the VM or is a literal copied from the reference.

export function Component() {
  const db = useDb();
  const viewer = useViewer();
  const now = useNow();
  const mutate = useMutate();

  const actor = viewer.actor;
  const user: Learner | null =
    actor.kind === 'learner' ? (db.users.find((u) => u.id === actor.userId) ?? null) : null;

  // Staff never reach this route — the shell sends them to /admin — and the reference renders
  // nothing without a learner.
  if (!user) return null;

  const vm = teamTierVM(db, user, now);

  // `requestUpgrade` answers an existing request with its own info toast, so the button stays live
  // in both states. Its only error path is a Team-tier viewer, whom the shell already redirected,
  // and the reference has no inline error slot here.
  const request = () => void mutate('requestUpgrade', { source: 'Team tier page' });

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.h1}>Team Tier</h1>
        <p className={s.lead}>
          All six AI Employees, seven seats and the leadership builds. Everything you’ve built on
          Agent tier comes with you.
        </p>
      </div>

      <div className={s.cols}>
        <div className={s.left}>
          <h2 className={s.h2}>What You Add</h2>

          {vm.adds.map((a) => (
            <section key={a.id} className={s.add}>
              <div className={s.tile}>
                <Icon name={a.icon} size={19} strokeWidth={1.8} className={s.tileGlyph} />
              </div>
              <div className={s.addBody}>
                <div className={s.addHead}>
                  <span className={s.addName}>{a.name}</span>
                  <span className={s.addSess}>{a.sessLine}</span>
                </div>
                <div className={s.addHeadline}>{a.headline}</div>
                <div className={s.outputs}>
                  {a.outputs.map((o) => (
                    <div key={o} className={s.output}>
                      <Icon name="check" size={14} strokeWidth={2.2} className={s.check} />
                      {o}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}

          <section className={s.compare}>
            <div className={s.compareHead}>
              <span>Compare Tiers</span>
              <span className={s.colHead}>Agent</span>
              <span className={s.colHead}>Team</span>
            </div>
            {vm.compare.map((r) => (
              <div key={r.label} className={s.compareRow}>
                <span className={s.rowLabel}>{r.label}</span>
                <span className={s.agentCell} data-muted={r.aMuted ? 'true' : undefined}>
                  {r.a}
                </span>
                <span className={s.teamCell}>{r.t}</span>
              </div>
            ))}
          </section>
        </div>

        <aside className={s.aside}>
          <section className={s.price}>
            <StatusToken kind="access" state="locked" label="Team tier" />

            <div className={s.priceRow}>
              <span className={s.priceValue}>{vm.price}</span>
              <span className={s.priceUnit}>{`per Team, per Cohort · ${vm.seats} Seats`}</span>
            </div>

            <div className={s.features}>
              {vm.features.map((ft) => (
                <div key={ft} className={s.feature}>
                  <Icon name="check" size={15} strokeWidth={2.2} className={s.check} />
                  {ft}
                </div>
              ))}
            </div>

            <button type="button" className={s.cta} data-state={vm.up.state} onClick={request}>
              <Icon name={vm.up.icon} size={16} strokeWidth={1.9} />
              {vm.up.label}
            </button>

            <div className={s.note}>{vm.up.note}</div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default Component;
