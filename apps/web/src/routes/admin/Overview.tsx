import { useCallback, useMemo } from 'react';
import clsx from 'clsx';

import { Button, ButtonLink } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Empty } from '../../components/r2/Empty';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Bar, PageHead, Stat, k } from '../../components/r2/kit';
import { useToaster } from '../../components/primitives/Toaster';
import { useDb, useNow } from '../../data/hooks';
import { useViewportWidth } from '../../shell/hooks';
import { overviewR2VM, overviewVM } from './Overview.vm';
import type { OverviewReport } from './Overview.vm';
import s from './Overview.module.css';

// Admin Overview `/admin` on the Admin redesign R2 (D-160 R2-3): the signed-off mockup's `Overview`
// (AdminRedesign.jsx), drawn from `overviewR2VM`. Markup only: every figure and word is the view-model's.
//
//   - Export report: the cohort report `overviewVM` makes, handed to the browser as a CSV.
//   - New AI Employee: the Module Builder's new AI Employee.
//   - Each tile goes where the mockup's does (Learners & Teams, Curriculum, Cohorts & Sessions, Tiers
//     & Upgrades); Build completion only shows its figure.
//   - The old Needs Attention list and Nudge All are not drawn: the mockup has no surface for them
//     (Needs Connor's call, D-160 R2-3a). Each learner's nudge is in their details drawer on Learners &
//     Teams.

/** Phase 08 § 8.2 does not touch this: the report is generated from the snapshot, never stored. */
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
    /* Download blocked: the toast still confirms, as before. */
  }
}

/** The feed's relative times move on the minute. */
const TICK_MS = 15000;

export function Component() {
  const db = useDb();
  const now = useNow(TICK_MS);
  const { toast } = useToaster();
  const phone = useViewportWidth() < 768;
  const vm = useMemo(() => overviewR2VM(db, now), [db, now]);

  const exportReport = useCallback(() => {
    const { report } = overviewVM(db, now);
    saveFile(report);
    toast(report.toast);
  }, [db, now, toast]);

  return (
    <Page>
      <PageHead
        title="Overview"
        description={vm.subline}
        right={
          <>
            <Button header icon="r2Download" onClick={exportReport}>
              Export report
            </Button>
            <ButtonLink header kind="primary" icon="r2Plus" to="/admin/curriculum/new">
              New AI Employee
            </ButtonLink>
          </>
        }
      />

      <div className={k.g5}>
        {vm.stats.map((t) => (
          <Stat
            key={t.key}
            label={phone ? t.labelPhone : t.label}
            value={t.value}
            sub={phone ? t.subPhone : t.sub}
            tone={t.tone}
            to={t.to}
          />
        ))}
      </div>

      <div className={k.gms}>
        <Card
          title="AI Employees deployed"
          sub="Cumulative, all learners"
          right={vm.chart ? <span className={clsx(k.w5, k.toneOk)}>{vm.chart.total}</span> : null}
        >
          {vm.chart ? (
            <div>
              <svg viewBox="0 0 600 200" preserveAspectRatio="none" className={s.chart} role="img" aria-label={vm.chart.label}>
                {[50, 100, 150].map((y) => (
                  <line key={y} x1="0" x2="600" y1={y} y2={y} className={s.grid} />
                ))}
                <polygon points={vm.chart.area} className={s.area} />
                <polyline points={vm.chart.line} className={s.line} />
              </svg>
              <div className={clsx(k.row, k.nw, k.me, s.days)}>
                {(phone ? vm.chart.labelsPhone : vm.chart.labels).map((d) => (
                  <span key={d} className={k.nowrap}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <Empty
              icon="r2Usage"
              title="Not started"
              body={vm.notStarted}
            />
          )}
        </Card>

        <Card title="Live activity" pad={false}>
          {vm.feed.length ? (
            vm.feed.map((e) => (
              <div key={e.key} className={clsx(k.li, s.top)}>
                <Status tone={e.tone} className={s.feedDot} />
                <span className={s.feedText}>
                  <span className={k.w5}>{e.who}</span> <span className={k.s2}>{e.what}</span>
                </span>
                <span className={clsx(k.me, s.ago)}>{e.ago}</span>
              </div>
            ))
          ) : (
            <Empty icon="r2Health" title="No activity yet" body="Learner activity appears here once the cohort opens." />
          )}
        </Card>
      </div>

      <div className={k.gms}>
        <Card
          title="Build funnel by AI Employee"
          pad={false}
          right={
            phone ? null : (
              <span className={clsx(k.row, k.me, s.legend)}>
                <Status tone="ok">Deployed</Status>
                <Status tone="info">In progress</Status>
                <Status className={s.notStarted}>Not started</Status>
              </span>
            )
          }
        >
          {vm.funnel.map((f) => {
            const nums = vm.started ? (
              <>
                <span className={k.w5}>{f.pct}</span> <span className={k.mu}>{f.of}</span>
              </>
            ) : (
              <span className={k.mu}>Not started</span>
            );
            const bar = <Bar pct={vm.started ? f.deployed : 0} pct2={vm.started ? f.progress : 0} />;
            return phone ? (
              <div key={f.key} className={clsx(k.li, s.stack)}>
                <div className={clsx(k.row, k.nw, s.stackTop)}>
                  <span className={clsx(k.w5, s.shrink)}>{f.name}</span>
                  <span className={clsx(k.tn, s.numsPhone)}>{nums}</span>
                </div>
                <div className={s.flex}>{bar}</div>
              </div>
            ) : (
              <div key={f.key} className={k.li}>
                <span className={clsx(k.w5, k.el, s.name)}>{f.name}</span>
                {bar}
                <span className={clsx(k.tn, s.nums)}>{nums}</span>
              </div>
            );
          })}
        </Card>

        <Card title="Live attendance" pad={false}>
          {vm.attendance.map((a) => (
            <div key={a.key} className={k.li}>
              <span className={clsx(s.session, !phone && k.el, phone && k.nowrap)}>{a.label}</span>
              {vm.started && a.pct !== null ? (
                <>
                  <Bar pct={a.pct} />
                  <span className={clsx(k.w5, k.tn)}>{a.pct}%</span>
                </>
              ) : (
                <span className={clsx(k.mu, k.sp, s.upcoming)}>Upcoming</span>
              )}
            </div>
          ))}
        </Card>
      </div>
    </Page>
  );
}

export default Component;
