import { useCallback } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router';

import { AnnouncementBanner } from '../../components/AnnouncementBanner';
import { EmployeeCard } from '../../components/EmployeeCard';
import { Icon } from '../../components/Icon';
import { SessionCard } from '../../components/SessionCard';
import { StatusToken } from '../../components/StatusToken';
import { useToaster } from '../../components/primitives/Toaster';
import { useDb, useMutate, useNow, useViewer } from '../../data/hooks';
import { useJoin } from '../../data/join';
import { useShell } from '../../shell/ShellContext';
import { cardAction, dashboardVM } from './Dashboard.vm';
import type { DashAction, DownloadSpec } from './Dashboard.vm';
import s from './Dashboard.module.css';

// Portal Dashboard `/`. Ported from design-reference/Portal Dashboard.dc.html.
// Contract: SCREENS § 3.1, phase 05 § 5.2.
//
// MARKUP ONLY. Every string, number, token and target comes from `dashboardVM` in Dashboard.vm.ts;
// nothing here reads the clock, recomputes status or decides where a row goes. A locked AI Employee
// can only ever yield a `locked` action, so this screen cannot navigate to one (SCREENS § 2.4).

/**
 * The reference's `act.download`: a Blob, a synthetic anchor click, then the toast.
 *
 * Phase 08 § 8.2 moves STORED files to `GET /api/files/...`. Nothing this screen downloads is
 * stored: all three payloads are `.ics` calendar files — the Session Card's Apple or Other option,
 * the moved-session banner's updated invite and the Office Hours quick link — and every one of them
 * is serialised in the browser by `ics()` from the snapshot. There is no object in the bucket to
 * presign, so this stays a Blob in both modes; routing it would answer 404.
 */
function saveFile(file: DownloadSpec): void {
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

/**
 * The 16-grid lock glyph, drawn at 12px beside `N More with Team Tier`.
 *
 * This is the StatusToken's own 16-viewBox path, not a 24-grid `ICONS` entry, so `<Icon>` (which is
 * fixed to the 24 grid) would render different pixels. NavItem inlines the same path for the same
 * reason.
 */
function LockGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={s.lockGlyph}>
      <path d="M4.5 7.5h7a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zM5.75 7.5V5.6a2.25 2.25 0 0 1 4.5 0v1.9" />
    </svg>
  );
}

function Dashboard() {
  const db = useDb();
  const viewer = useViewer();
  const now = useNow();
  const navigate = useNavigate();
  const mutate = useMutate();
  const { toast } = useToaster();
  const { openLocked } = useShell();
  const openJoin = useJoin();

  const run = useCallback(
    (action: DashAction) => {
      if (action.kind === 'nav') navigate(action.to);
      else if (action.kind === 'locked') openLocked(action.moduleId);
      else if (action.kind === 'toast') toast(action.msg, action.tone);
      else {
        saveFile(action.file);
        toast(action.file.toast, 'success');
      }
    },
    [navigate, openLocked, toast],
  );

  const actor = viewer.actor;
  const user = actor.kind === 'learner' ? (db.users.find((u) => u.id === actor.userId) ?? null) : null;
  // Staff never see this screen; the shell is already redirecting them to /admin.
  if (!user) return null;

  const vm = dashboardVM(db, user, now);
  const { ann, session, cal, join, watch, post, pg } = vm;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.h1}>Dashboard</h1>
        <p className={s.subline}>{vm.subline}</p>
      </div>

      {ann ? (
        <AnnouncementBanner
          severity={ann.severity}
          title={ann.title}
          body={ann.body}
          when={ann.when}
          abs={ann.abs}
          actionLabel={ann.actionLabel}
          onAction={() => {
            if (ann.action) run(ann.action);
          }}
          onDismiss={() => {
            void mutate('dismissAnnouncement', { id: ann.id });
          }}
        />
      ) : null}

      {session ? (
        <SessionCard
          vm={session}
          // § 8.4: http mode resolves the Zoom URL from `GET /api/sessions/:id/join` and opens it;
          // fixture mode runs `join`, the prototype's `Opening Zoom · …` toast.
          onJoin={() => {
            if (join) void openJoin(session.sessionId, () => run(join));
          }}
          onCal={(kind) => {
            if (!cal) return;
            if (kind === 'google') window.open(cal.google, '_blank');
            else if (kind === 'outlook') window.open(cal.outlook, '_blank');
            else run({ kind: 'download', file: cal.ics });
          }}
          onWatch={() => {
            if (watch) run(watch);
          }}
          onKit={() => {
            if (watch) run(watch);
          }}
        />
      ) : null}

      {post ? (
        <section className={s.post}>
          <div className={s.postMain}>
            <span className={s.postKicker}>Your Cohort Wrapped on {post.ended}</span>
            <div className={s.postTitle}>Office Hours Continue Wednesdays</div>
            <div className={s.postMeta}>
              Drop-In Build Help with {post.host} · Next: {post.next}
            </div>
          </div>
          <div className={s.postActions}>
            <button type="button" className={s.primaryBtn} onClick={() => run({ kind: 'download', file: post.cal })}>
              Add Office Hours to Calendar
            </button>
            <button type="button" className={s.secondaryBtn} onClick={() => run(post.rewatch)}>
              Rewatch Any Session
            </button>
          </div>
        </section>
      ) : null}

      <div className={s.body}>
        <div className={s.main}>
          <section className={s.progress}>
            <div className={s.pgHead}>
              <div className={s.pgHeadText}>
                <span className={s.pgLabel}>Progress</span>
                <div className={s.pgCount}>
                  <span className={s.pgBig}>
                    {pg.done} of {pg.total}
                  </span>
                  <span className={s.pgBuilt}>AI Employees Built</span>
                </div>
              </div>
              {pg.next ? (
                <button
                  type="button"
                  className={s.nextUp}
                  onClick={() => {
                    if (pg.next) run(pg.next.action);
                  }}
                >
                  <span className={s.nextUpKicker}>Next Up</span>
                  {pg.next.name}
                  <Icon name="arrowR" size={14} strokeWidth={2} />
                </button>
              ) : null}
            </div>

            <div role="img" aria-label={pg.aria} className={s.bar}>
              {pg.segs.map((sg) => (
                <div key={sg.key} title={sg.tip} className={s.seg}>
                  <div className={s.segFill} data-state={sg.state} style={{ '--w': sg.w } as CSSProperties} />
                </div>
              ))}
            </div>

            <div className={s.legend}>
              {pg.segs.map((sg) => (
                <span key={sg.key} className={s.legendItem}>
                  {sg.label}
                  <StatusToken kind="build" state={sg.state} n={sg.n} total={sg.total} />
                </span>
              ))}
              {pg.lockedNote && pg.lockedAction ? (
                <button
                  type="button"
                  className={s.lockedLink}
                  onClick={() => {
                    if (pg.lockedAction) run(pg.lockedAction);
                  }}
                >
                  <LockGlyph />
                  {pg.lockedNote}
                </button>
              ) : null}
            </div>

            {pg.week0 ? (
              <div className={s.week0}>
                <span>Your First Build Is Session 1 on {pg.week0.date}</span>
                <span aria-hidden="true" className={s.week0Dot}>
                  ·
                </span>
                <button
                  type="button"
                  className={s.week0Watch}
                  onClick={() => {
                    if (pg.week0) run(pg.week0.watch);
                  }}
                >
                  <Icon name="play" size={12} filled />
                  Watch the 5-Min Orientation
                </button>
              </div>
            ) : null}
          </section>

          <section className={s.employees}>
            <div className={s.empHead}>
              <h2 className={s.h2}>Your AI Employees</h2>
              <span className={s.empNote}>One live build each · Replays post within 2 hours</span>
            </div>
            <div className={s.grid}>
              {vm.cards.map((c) => (
                <EmployeeCard key={c.id} card={c} onOpen={(card) => run(cardAction(card))} />
              ))}
            </div>
          </section>
        </div>

        <aside className={s.aside}>
          <section className={s.asideCard}>
            <div className={s.asideTitle}>Quick Links</div>
            {vm.links.map((l) => (
              <button key={l.key} type="button" className={s.linkRow} onClick={() => run(l.action)}>
                <span className={s.linkTile}>
                  <Icon name={l.icon} size={15} strokeWidth={1.8} />
                </span>
                <span className={s.linkText}>
                  <span className={s.linkTitle}>{l.title}</span>
                  <span className={s.linkSub}>{l.sub}</span>
                </span>
                <Icon name={l.arrow} size={14} strokeWidth={2} className={s.linkArrow} />
              </button>
            ))}
          </section>

          <section className={s.asideCard}>
            <div className={s.schedHead}>
              <span className={s.schedHeadLabel}>Cohort Schedule</span>
              <button type="button" className={s.allSessions} onClick={() => run(vm.allSessions)}>
                All Sessions
              </button>
            </div>
            {vm.sched.map((x) => (
              <button key={x.key} type="button" className={s.schedRow} onClick={() => run(x.action)}>
                <span className={s.schedNum}>{x.n}</span>
                <span className={s.schedText}>
                  <span className={s.schedTitle} data-locked={x.locked ? 'true' : undefined}>
                    {x.title}
                  </span>
                  <span className={s.schedSub}>{x.sub}</span>
                </span>
                {x.token ? <StatusToken {...x.token} compact /> : null}
              </button>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}

/** The route module React Router lazy-loads (`lazy: () => import('./routes/portal/Dashboard')`). */
export function Component() {
  return <Dashboard />;
}

export default Component;
