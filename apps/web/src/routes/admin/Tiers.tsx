import { useCallback, useMemo } from 'react';

import { Icon } from '../../components/Icon';
import { Avatar } from '../../components/primitives/Avatar';
import { useToaster } from '../../components/primitives/Toaster';
import { useDb, useMutate, useNow } from '../../data/hooks';
import { tiersVM } from './Tiers.vm';
import type { MatrixRow, RequestAction } from './Tiers.vm';
import s from './Tiers.module.css';

// Admin Tiers & Upgrades `/admin/tiers`, ported from design-reference/Admin Tiers.dc.html.
// Contract: SCREENS § 4.8, phase 06 § 6.1-6.2.
//
// MARKUP ONLY: every string, count, tone and action comes from `tiersVM`, including the licence
// counts and revenue figures that add `db.base`. Nothing here reads the clock or multiplies a price.
//
// The persona is Casey Lin (st1, Owner), so `billing` and `curriculum` both pass — but the three
// controls still run @ai/core mutations rather than touching the snapshot, so the toast copy, the
// activity-log entry and `upgradeUser`'s side effects on the learner's portal are the same ones the
// API writes.

/** The `ago` on each request row moves on the minute. */
const TICK_MS = 15000;

export function Component() {
  const db = useDb();
  const now = useNow(TICK_MS);
  const mutate = useMutate();
  const { toast } = useToaster();

  const vm = useMemo(() => tiersVM(db, now), [db, now]);

  // `useMutate` already raises the success toast. None of these three has an inline error slot in
  // the reference, so a refusal is surfaced as a warning, exactly as on Admin Curriculum.
  const run = useCallback(
    async (p: Promise<{ error?: string }>) => {
      const r = await p;
      if (r.error) toast(r.error, 'warn');
    },
    [toast],
  );

  /** The reference ignores anything that is not a positive number, so the field cannot be cleared. */
  const setPrice = useCallback(
    (tierId: string, raw: string) => {
      const price = parseInt(raw, 10);
      if (price > 0) void run(mutate('setTierPrice', { tierId, price }));
    },
    [mutate, run],
  );

  const setTier = useCallback(
    (toggle: NonNullable<MatrixRow['toggle']>) => void run(mutate('setModuleTier', toggle)),
    [mutate, run],
  );

  const setStatus = useCallback(
    (id: string, status: RequestAction['status']) => void run(mutate('setRequestStatus', { id, status })),
    [mutate, run],
  );

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Tiers &amp; Upgrades</h1>
          <p className={s.sub}>{vm.summary}</p>
        </div>
      </div>

      <div className={s.cards} data-phone="stack">
        {vm.tiers.map((t) => (
          <section key={t.id} className={s.card} data-team={t.team ? 'true' : undefined}>
            <div className={s.cardTop}>
              <div className={s.title}>
                <span className={s.tierName}>{t.name} Tier</span>
                <span className={s.seats}>{t.seatsLabel}</span>
              </div>
              <span className={s.licenses}>{t.licenses}</span>
            </div>

            <div className={s.priceRow}>
              <div className={s.priceWrap}>
                <span className={s.currency}>$</span>
                <input
                  type="number"
                  className={s.price}
                  aria-label={`${t.name} Tier price`}
                  value={t.price}
                  onChange={(e) => setPrice(t.id, e.target.value)}
                />
              </div>
              <span className={s.per}>{t.per}</span>
            </div>

            <div className={s.blurb}>{t.blurb}</div>

            <div className={s.features}>
              {t.features.map((f) => (
                <div key={f} className={s.feature}>
                  <Icon name="check" size={14} strokeWidth={2.2} className={s.featureIcon} />
                  {f}
                </div>
              ))}
            </div>

            <div className={s.revenue}>
              <span>Cohort Revenue</span>
              <span className={s.revenueValue}>{t.revenue}</span>
            </div>
          </section>
        ))}
      </div>

      <div className={s.row}>
        <section aria-label="Access Matrix" className={`${s.panel} ${s.matrixPanel}`}>
          <div className={s.panelHead}>
            <div className={s.panelTitle}>Access Matrix</div>
            <div className={s.panelSub}>Click an Agent cell to include or gate a module</div>
          </div>

          <div className={s.colHead} data-phone="thead">
            <span>Included</span>
            <span className={s.center}>Agent</span>
            <span className={s.center}>Team</span>
          </div>

          {vm.matrix.map((m) => {
            // A fixed feature is not a module: the reference gives its cell no title and no
            // handler, so it is rendered as the plain box it behaves like.
            const toggle = m.toggle;
            return (
              <div key={m.key} className={s.matrixRow} data-phone="card-grid">
                <span className={s.matrixLabel} data-phone="cell">
                  {m.label}
                </span>
                <div className={s.cellWrap} data-phone="cell-inline" data-label="Agent">
                  {toggle ? (
                    <button
                      type="button"
                      title={m.title}
                      aria-label={m.title}
                      className={s.cell}
                      data-state={m.state}
                      onClick={() => setTier(toggle)}
                    >
                      <Icon name={m.icon} size={14} strokeWidth={2.4} />
                    </button>
                  ) : (
                    <span className={s.cell} data-state={m.state}>
                      <Icon name={m.icon} size={14} strokeWidth={2.4} />
                    </span>
                  )}
                </div>
                {/* Every row is included in the Team tier, so the third column never varies. */}
                <div className={s.cellWrap} data-phone="cell-inline" data-label="Team">
                  <span className={s.teamCell}>
                    <Icon name="check" size={14} strokeWidth={2.4} />
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        <section aria-label="Upgrade Requests" className={`${s.panel} ${s.requestsPanel}`}>
          <div className={s.requestsHead}>
            <div>
              <div className={s.panelTitle}>Upgrade Requests</div>
              <div className={s.panelSub}>From locked modules and the Executive Vault in the portal</div>
            </div>
            <span className={s.pipeline}>{vm.pipeline}</span>
          </div>

          {vm.noRequests ? <div className={s.empty}>No requests yet.</div> : null}

          {vm.requests.map((q) => (
            <div key={q.id} className={s.requestRow} data-new={q.isNew ? 'true' : undefined}>
              <Avatar id={q.avatarId} name={q.name} size={32} />
              <div className={s.requestMid}>
                <div className={s.nameLine} data-phone="wrap">
                  <span className={s.name}>{q.name}</span>
                  <span className={s.ago}>{q.ago}</span>
                </div>
                <div className={s.meta}>
                  {q.email} · {q.source}
                </div>
              </div>
              <span className={s.token} data-status={q.status}>
                {q.statusLabel}
              </span>
              <div className={s.actions} data-phone="wrap">
                {q.actions.map((a) => (
                  <button
                    key={a.status}
                    type="button"
                    className={s.action}
                    data-act={a.status}
                    onClick={() => setStatus(q.id, a.status)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export default Component;
