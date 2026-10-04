import { useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router';

import { Icon } from '../../components/Icon';
import { Avatar } from '../../components/primitives/Avatar';
import { useToaster } from '../../components/primitives/Toaster';
import { useDb, useMutate, useNow } from '../../data/hooks';
import { overviewVM } from './Overview.vm';
import type { OverviewReport } from './Overview.vm';
import s from './Overview.module.css';

// Admin Overview `/admin`. Ported from design-reference/Admin Overview.dc.html.
// Contract: SCREENS § 4.1, phase 06 § 6.1.
//
// MARKUP ONLY. Every number, string and tone comes from `overviewVM`; nothing here reads the clock,
// aggregates a learner or decides what counts as at-risk. The three things a pure model cannot do
// are all this file adds: write a Blob, navigate, and call a mutation.
//
// The persona is Casey Lin (st1, Owner), so every staff permission passes — but the nudges still go
// through the `nudgeLearners` mutation rather than touching the snapshot, so the activity log, the
// toast and the learner portal all see them.

/**
 * The reference's `act.download`: a Blob, a synthetic anchor click, then the toast.
 *
 * Phase 08 § 8.2 does not touch this. Export Report is GENERATED — `overviewVM` renders it from the
 * snapshot — so there is no object in the bucket to presign.
 */
function saveFile(file: OverviewReport): void {
  try {
    const url = URL.createObjectURL(new Blob([file.content], { type: file.mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch {
    /* Download blocked. The reference toasts regardless, so the confirmation still appears. */
  }
}

/** The relative times in the feed and the Needs Attention subs move on the minute. */
const TICK_MS = 15000;

export function Component() {
  const db = useDb();
  const now = useNow(TICK_MS);
  const navigate = useNavigate();
  const mutate = useMutate();
  const { toast } = useToaster();

  const vm = useMemo(() => overviewVM(db, now), [db, now]);

  const exportReport = useCallback(() => {
    saveFile(vm.report);
    toast(vm.report.toast);
  }, [toast, vm.report]);

  const nudge = useCallback(
    (userIds: string[]) => {
      if (userIds.length) void mutate('nudgeLearners', { userIds });
    },
    [mutate],
  );

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Overview</h1>
          <p className={s.sub}>{vm.subline}</p>
        </div>
        <div className={s.headActions}>
          <button type="button" className={s.export} onClick={exportReport}>
            <Icon name="download" size={15} strokeWidth={1.8} />
            Export Report
          </button>
          <button type="button" className={s.create} onClick={() => navigate(vm.newEmployeeTo)}>
            <Icon name="plus" size={15} strokeWidth={2} />
            New AI Employee
          </button>
        </div>
      </div>

      <div className={s.kpis}>
        {vm.kpis.map((k) => (
          <section key={k.key} className={s.kpi}>
            <div className={s.kpiLabel}>{k.label}</div>
            <div className={s.kpiValue}>{k.value}</div>
            <div className={s.kpiSub} data-tone={k.subTone}>
              {k.sub}
            </div>
          </section>
        ))}
      </div>

      <div className={s.row}>
        <section className={`${s.wide} ${s.chartCard}`}>
          <div className={s.chartHead}>
            <div>
              <div className={s.cardTitle}>AI Employees Deployed</div>
              <div className={s.cardSub}>Cumulative, All Learners</div>
            </div>
            <span className={s.delta}>{vm.chart.delta}</span>
          </div>
          {/* 600 × 200 user space stretched to the card: the line keeps its 2px through
              `vector-effect: non-scaling-stroke`. */}
          <svg viewBox="0 0 600 200" preserveAspectRatio="none" className={s.chart} aria-hidden="true">
            {vm.chart.grid.map((y) => (
              <line key={y} x1="0" x2="600" y1={y} y2={y} className={s.grid} />
            ))}
            <path d={vm.chart.area} className={s.area} />
            <path d={vm.chart.line} className={s.line} />
          </svg>
          <div className={s.chartLabels}>
            {vm.chart.labels.map((l, i) => (
              <span key={`${l}-${i}`}>{l}</span>
            ))}
          </div>
        </section>

        <section className={`${s.narrow} ${s.feedCard}`}>
          <div className={s.feedTitle}>Live Activity</div>
          {/* A scroll container with no focusable children needs its own tab stop to stay
              keyboard-reachable (CLAUDE.md › Accessibility). No pixels change. */}
          <div className={s.feedScroll} role="group" aria-label="Live Activity" tabIndex={0}>
            {vm.feed.map((e) => (
              <div key={e.key} className={s.feedRow}>
                <span className={s.dot} data-tone={e.tone} />
                <div className={s.feedText}>
                  <span className={s.who}>{e.who}</span> {e.what}
                </div>
                <span className={s.ago}>{e.ago}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className={s.row}>
        <section className={`${s.wide} ${s.funnelCard}`}>
          <div className={s.funnelHead}>
            <div className={s.cardTitle}>Build Funnel by AI Employee</div>
            <div className={s.legend}>
              <span className={s.legendItem}>
                <span className={s.swatch} data-seg="deployed" />
                Deployed
              </span>
              <span className={s.legendItem}>
                <span className={s.swatch} data-seg="progress" />
                In Progress
              </span>
              <span className={s.legendItem}>
                <span className={s.swatch} data-seg="none" />
                Not Started
              </span>
            </div>
          </div>
          {vm.funnel.map((f) => (
            <div key={f.key} className={s.funnelRow}>
              <div className={s.funnelLabel}>
                <Icon name={f.icon} size={15} strokeWidth={1.8} color="var(--text-tertiary)" />
                <span className={s.funnelName}>{f.name}</span>
                {f.team ? <span className={s.teamTag}>Team</span> : null}
              </div>
              <div className={s.bar}>
                <div title="Deployed" className={s.segDeployed} style={{ '--w': f.wd } as CSSProperties} />
                <div title="In progress" className={s.segProgress} style={{ '--w': f.wp } as CSSProperties} />
                <div className={s.segRest} />
              </div>
              <span className={s.funnelMeta}>
                <span className={s.pct}>{f.pct}</span> · {f.d} of {f.n}
              </span>
            </div>
          ))}
        </section>

        <section className={`${s.narrow} ${s.attCard}`}>
          <div className={s.cardTitle}>Live Attendance</div>
          <div className={s.attBars}>
            {vm.att.map((a) => (
              <div key={a.key} title={a.title} className={s.attCol}>
                <span className={s.attLabel}>{a.label}</span>
                <div
                  className={s.attBar}
                  data-held={a.held ? 'true' : undefined}
                  style={{ '--h': a.h } as CSSProperties}
                />
              </div>
            ))}
          </div>
          <div className={s.attAxis}>
            {vm.att.map((a) => (
              <span key={a.key} className={s.attTick}>
                S{a.n}
              </span>
            ))}
          </div>
          <div className={s.attFoot}>Replay Views: {vm.replayViews}</div>
        </section>
      </div>

      <section className={s.riskCard}>
        <div className={s.riskHead}>
          <div>
            <div className={s.cardTitle}>Needs Attention</div>
            <div className={s.cardSub}>No build progress or inactive for 5+ days</div>
          </div>
          {vm.risk.length ? (
            <button type="button" className={s.nudgeAll} onClick={() => nudge(vm.nudgeAllIds)}>
              <Icon name="bell" size={14} strokeWidth={1.9} />
              Nudge All
            </button>
          ) : null}
        </div>
        {vm.noRisk ? <div className={s.riskEmpty}>Everyone is moving. Nice.</div> : null}
        {vm.risk.map((r) => (
          <div key={r.id} className={s.riskRow} data-first={r.first ? 'true' : undefined}>
            <Avatar id={r.id} name={r.name} size={30} />
            <div className={s.riskMid}>
              <div className={s.riskName}>{r.name}</div>
              <div className={s.riskSub}>{r.sub}</div>
            </div>
            <span className={s.riskReason}>{r.reason}</span>
            <button
              type="button"
              className={s.nudge}
              data-nudged={r.nudged ? 'true' : undefined}
              onClick={() => nudge([r.id])}
            >
              {r.btn}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}

export default Component;
