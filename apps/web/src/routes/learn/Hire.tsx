// /learn/employees/:id (D-186, E-22): a non-course AI Employee's page, for a published module that isn't a
// course week. The current portal's AI Employee page (`routes/portal/EmployeeDetail.tsx`) in the week page's
// own pieces: the trail, the header with its line (From Session N or Self-Paced, the build minutes, who it's
// for), the replay where it has one, the steps with Mark step done (`toggleStep`), the Your Deployment card,
// and the Build Kit (prompt, files, the module's resources) with the instructor notes. Markup only: every
// string is Hire.vm.ts's.

import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { learnerOf } from '@ai/core/learner';
import type { Learner } from '@ai/core';
import { Icon } from '../../components/Icon';
import { useMutate } from '../../data/hooks';
import { useLearn } from './data';
import { DeployCard } from './Deploy';
import { hireVM } from './Hire.vm';
import type { LockedHireVM, OpenHireVM } from './Hire.vm';
import { Prog, Tile } from './parts';
import { Replay } from './Replay';
import { weekSessionVM } from './Replay.vm';
import { BuildKit, Crumbs, WeekMeta, moduleFileUrl, useTabTitle } from './WeekContent';
import { buildKitVM } from './WeekContent.vm';
import s from './Learn.module.css';
import h from './Hire.module.css';

function Steps({ vm, moduleId }: { vm: OpenHireVM; moduleId: string }) {
  const mutate = useMutate();
  const [busy, setBusy] = useState<string | null>(null);
  const toggle = async (stepId: string) => {
    if (busy) return;
    setBusy(stepId);
    try {
      await mutate('toggleStep', { moduleId, stepId });
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className={s.cd} aria-labelledby="lv-hs-t">
      <div className={s.cdh}>
        <h2 className={`${s.h2} ${s.grow}`} id="lv-hs-t">
          {vm.steps.heading}
        </h2>
        {vm.steps.meta ? <span className={s.me}>{vm.steps.meta}</span> : null}
      </div>
      <ol className={h.list}>
        {vm.steps.rows.map((r) => (
          <li key={r.id} className={`${s.li} ${h.step}`} aria-label={r.aria} data-cur={r.state === 'current' ? 'true' : undefined}>
            <span className={s.sti} data-s={r.state} aria-hidden="true">
              {r.state === 'done' ? <Icon name="r2Check" size={14} strokeWidth={2.2} /> : r.n}
            </span>
            <span className={`${s.colZ} ${s.grow}`}>
              <span className={r.state === 'done' ? s.s2 : s.w5}>{r.title}</span>
              {r.hint ? <span className={`${s.me} ${h.pre}`}>{r.hint}</span> : null}
              {r.meta ? <span className={s.me}>{r.meta}</span> : null}
            </span>
            <button
              type="button"
              className={`${s.b} ${r.state === 'done' ? '' : s.bp} ${h.stepBtn}`}
              data-done={r.state === 'done' ? 'true' : undefined}
              disabled={busy !== null}
              onClick={() => void toggle(r.id)}
            >
              <Icon name={r.state === 'done' ? 'reset' : 'r2Check'} size={14} strokeWidth={r.state === 'done' ? 1.9 : 2.2} />
              {r.button}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Open({ vm }: { vm: OpenHireVM }) {
  const { db, viewer, now } = useLearn();
  const me = learnerOf(db, viewer.actor.kind === 'learner' ? viewer.actor.userId : null);
  const m = db.modules.find((x) => x.id === vm.id)!;
  useTabTitle(vm.tabTitle);
  const kit = buildKitVM(m, moduleFileUrl) ?? (vm.resources.length ? { prompt: null, files: [], notes: null } : null);
  const session = weekSessionVM([], m, { db, me }, now);
  return (
    <div className={s.pg}>
      <Crumbs crumbs={vm.crumbs} />
      <div className={s.phd}>
        <div className={s.pht}>
          <div className={s.pid}>
            <Tile icon={vm.tile.icon} tone={vm.tile.tone} size={52} />
            <h1 className={s.h0}>{vm.title}</h1>
          </div>
          {vm.lede ? <p className={s.lede}>{vm.lede}</p> : null}
          <span className={s.pk}>
            <span className={s.pl} data-tone={vm.pill.tone}>
              {vm.pill.label}
            </span>
            {vm.opens ? (
              <span>
                <Icon name="clock" size={13} strokeWidth={1.9} /> {vm.opens}
              </span>
            ) : null}
          </span>
          <WeekMeta vm={vm.meta} />
        </div>
      </div>
      {session?.kind === 'replay' ? <Replay key={m.id} who={{ db, me }} m={m} now={now} source={session.source} /> : null}
      <section className={`${s.cd} ${s.hero}`} aria-label={vm.progress.label}>
        <div className={s.hr}>
          <span className={s.eyb}>
            <Icon name="r2Check" size={14} strokeWidth={1.75} />
            {vm.progress.label}
          </span>
          <div className={s.cdn}>
            <span>
              <b>{vm.progress.done}</b>
              <em>{vm.progress.ofTotal}</em>
            </span>
          </div>
          <Prog segs={vm.progress.segs} aria={vm.progress.aria} max={280} />
        </div>
      </section>
      <div className={s.gms}>
        <Steps vm={vm} moduleId={m.id} />
        <div className={s.col}>
          <DeployCard m={m} me={me} now={now} />
          {kit ? <BuildKit vm={kit} previewing={viewer.preview !== undefined} more={vm.resources} /> : null}
        </div>
      </div>
    </div>
  );
}

function Locked({ vm }: { vm: LockedHireVM }) {
  useTabTitle(vm.tabTitle);
  return (
    <div className={s.pg}>
      <Crumbs crumbs={vm.crumbs} />
      <div className={s.phd}>
        <div className={s.pht}>
          <div className={s.pid}>
            <Tile icon={vm.tile.icon} tone={vm.tile.tone} size={52} />
            <h1 className={s.h0}>{vm.title}</h1>
          </div>
          {vm.lede ? <p className={s.lede}>{vm.lede}</p> : null}
        </div>
      </div>
      <section className={`${s.cd} ${s.hero} ${s.heroBlock}`} aria-labelledby="lv-hl-t">
        <div className={s.emp}>
          <Tile icon="lvLock" tone={vm.tile.tone} size={44} />
          <h2 className={s.ht} id="lv-hl-t">
            {vm.headline}
          </h2>
        </div>
      </section>
    </div>
  );
}

/** The page for one non-course AI Employee, from what the shell hands every screen. */
export function HirePage({ id }: { id: string | null }) {
  const { db, viewer, now } = useLearn();
  const me: Learner | null = learnerOf(db, viewer.actor.kind === 'learner' ? viewer.actor.userId : null);
  const vm = useMemo(() => hireVM(db, me, id, now, moduleFileUrl), [db, me, id, now]);
  if (vm.kind === 'missing') return <Navigate to={vm.href} replace />;
  return vm.kind === 'locked' ? <Locked vm={vm} /> : <Open vm={vm} />;
}

export function Component() {
  const params = useParams();
  return <HirePage id={params.id ?? null} />;
}

export default Component;
