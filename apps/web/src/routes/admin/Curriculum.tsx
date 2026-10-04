import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';

import { Icon } from '../../components/Icon';
import { useToaster } from '../../components/primitives/Toaster';
import { isFixture } from '../../data/boot';
import { useDb, useMutate, useNow } from '../../data/hooks';
import { curriculumVM, type CurriculumRow } from './Curriculum.vm';
import s from './Curriculum.module.css';

// Admin Curriculum `/admin/curriculum`, ported from design-reference/Admin Curriculum.dc.html.
// Contract: SCREENS § 4.2, phase 06 § 6.1-6.4.
//
// MARKUP ONLY: every string, flag and percentage comes from `curriculumVM`, including the
// `db.base`-adjusted Deployed figures. The screen's own jobs are the three things a pure model
// cannot do — run a mutation, navigate, and switch persona for the learner preview.
//
// Reordering, gating and publishing all go through @ai/core mutations rather than touching the
// snapshot, so the toast copy and the activity-log entry are the same ones the API writes. The
// reference's no-op clicks are preserved: the active tier option and the chevron at either end of
// the list do nothing at all.

/** Demo params a persona switch must keep, so a pinned clock survives the preview navigation. */
const CARRY_PARAMS = ['phase', 'now', 'demo'] as const;

function Curriculum() {
  const db = useDb();
  const now = useNow();
  const mutate = useMutate();
  const navigate = useNavigate();
  const { toast } = useToaster();

  const vm = useMemo(() => curriculumVM(db, now), [db, now]);

  // `useMutate` already raises the success toast; a refused mutation has nowhere to render
  // inline on this screen, so it is surfaced as a warning.
  const move = useCallback(
    async (id: string, dir: number) => {
      const r = await mutate('moveModule', { id, dir });
      if (r.error) toast(r.error, 'warn');
    },
    [mutate, toast],
  );

  const setTier = useCallback(
    async (id: string, tier: 'agent' | 'team') => {
      const r = await mutate('setModuleTier', { id, tier });
      if (r.error) toast(r.error, 'warn');
    },
    [mutate, toast],
  );

  const setPublished = useCallback(
    async (id: string, publishes: boolean) => {
      const r = await mutate(publishes ? 'publishModule' : 'unpublishModule', { id });
      if (r.error) toast(r.error, 'warn');
    },
    [mutate, toast],
  );

  /**
   * Preview as a learner. In fixture mode the prototype switches persona, and `?as=` is resolved
   * once at boot, so this is a real navigation that carries the timeline params along. In http
   * mode there is no persona to switch: the portal route opens in a second tab.
   */
  const preview = useCallback((r: CurriculumRow) => {
    const path = `/employees/${r.id}`;
    if (!isFixture) {
      window.open(path, '_blank', 'noopener');
      return;
    }
    const url = new URL(path, window.location.href);
    const current = new URLSearchParams(window.location.search);
    for (const k of CARRY_PARAMS) {
      const v = current.get(k);
      if (v !== null) url.searchParams.set(k, v);
    }
    url.searchParams.set('as', r.previewAs);
    window.location.assign(url.toString());
  }, []);

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Curriculum</h1>
          <p className={s.sub}>{vm.summary}</p>
        </div>
        <button
          type="button"
          className={s.create}
          onClick={() => void navigate('/admin/curriculum/new')}
        >
          <Icon name="plus" size={15} strokeWidth={2} />
          New AI Employee
        </button>
      </div>

      <section aria-label="AI Employees" className={s.card}>
        <div className={s.scroll}>
          <div className={s.table}>
            <div className={s.headRow}>
              <span>Order</span>
              <span>AI Employee</span>
              <span>Tier Access</span>
              <span>Live Session</span>
              <span>Status</span>
              <span>Deployed</span>
              <span className={s.right}>Actions</span>
            </div>

            {vm.rows.map((r) => (
              <div key={r.id} className={s.row}>
                <div className={s.orderCell}>
                  <span className={s.orderNum}>{r.order}</span>
                  <div className={s.chevs}>
                    <button
                      type="button"
                      title="Move up"
                      className={s.chev}
                      data-off={r.canMoveUp ? undefined : 'true'}
                      aria-disabled={r.canMoveUp ? undefined : true}
                      onClick={r.canMoveUp ? () => void move(r.id, -1) : undefined}
                    >
                      <Icon name="chevU" size={13} strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      title="Move down"
                      className={s.chev}
                      data-off={r.canMoveDown ? undefined : 'true'}
                      aria-disabled={r.canMoveDown ? undefined : true}
                      onClick={r.canMoveDown ? () => void move(r.id, 1) : undefined}
                    >
                      <Icon name="chevD" size={13} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>

                <div className={s.who}>
                  <div className={s.tile}>
                    <Icon name={r.icon} size={17} strokeWidth={1.8} color="var(--text-link)" />
                  </div>
                  <div className={s.whoText}>
                    <div className={s.name}>{r.name}</div>
                    <div className={s.outcome}>{r.sub}</div>
                  </div>
                </div>

                <div role="group" aria-label={`Tier access · ${r.name}`} className={s.seg}>
                  <button
                    type="button"
                    className={s.segOpt}
                    data-opt="agent"
                    data-on={r.tier === 'agent' ? 'true' : undefined}
                    aria-pressed={r.tier === 'agent'}
                    onClick={r.tier === 'team' ? () => void setTier(r.id, 'agent') : undefined}
                  >
                    Agent + Team
                  </button>
                  <button
                    type="button"
                    className={s.segOpt}
                    data-opt="team"
                    data-on={r.tier === 'team' ? 'true' : undefined}
                    aria-pressed={r.tier === 'team'}
                    onClick={r.tier === 'agent' ? () => void setTier(r.id, 'team') : undefined}
                  >
                    Team Only
                  </button>
                </div>

                <div className={s.sess}>
                  {r.sess}
                  <div className={s.sessSub}>{r.sessSub}</div>
                </div>

                <div className={s.statusCell}>
                  <span className={s.pill} data-status={r.status}>
                    <span aria-hidden="true" className={s.dot} />
                    {r.statusLabel}
                  </span>
                  <span className={s.stSub}>{r.stSub}</span>
                </div>

                <div className={s.depCell}>
                  <div className={s.bar}>
                    <div className={s.fill} style={{ '--dep': r.dep } as React.CSSProperties} />
                  </div>
                  <span className={s.depNum}>{r.dep}</span>
                </div>

                <div className={s.actions}>
                  <button
                    type="button"
                    title="Preview as learner"
                    aria-label="Preview as learner"
                    className={s.iconBtn}
                    onClick={() => preview(r)}
                  >
                    <Icon name="eye" size={14} strokeWidth={1.9} />
                  </button>
                  <button
                    type="button"
                    title="Edit in builder"
                    aria-label="Edit in builder"
                    className={s.iconBtn}
                    onClick={() => void navigate(`/admin/curriculum/${r.id}`)}
                  >
                    <Icon name="pencil" size={14} strokeWidth={1.9} />
                  </button>
                  <button
                    type="button"
                    className={s.act}
                    data-variant={r.publishes ? 'publish' : 'unpublish'}
                    onClick={() => void setPublished(r.id, r.publishes)}
                  >
                    {r.actLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <p className={s.note}>
        Tier access and publish status update the learner portal immediately. Open the portal in a
        second tab to watch it change.
      </p>
    </div>
  );
}

export function Component() {
  return <Curriculum />;
}

export default Component;
