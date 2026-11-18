// /learn/week/:week (D-177): a week's overview, the learner mockup's artboards 06/07, and its locked
// preview, artboards 14/15. Markup only: every string and every time is computed in Week.vm.ts. A
// locked week draws its stub alone; nothing of its content is fetched or rendered.

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { learnerOf } from '@ai/core/learner';
import { Icon } from '../../components/Icon';
import { repo } from '../../data/boot';
import { useLearn } from './data';
import { saveIcs } from './ics';
import { weekRows } from './learn.vm';
import { weekParam, weekVM } from './Week.vm';
import type { LockedWeekVM, OpenWeekVM } from './Week.vm';
import { KitRows, Prog, SessionRows, Tile } from './parts';
import { learnHome } from './routes';
import s from './Learn.module.css';

const fileUrl = (id: string): string | null => repo.fileUrl({ kind: 'resource', id });

function Head({ vm, children }: { vm: OpenWeekVM | LockedWeekVM; children: ReactNode }) {
  return (
    <div className={s.phd}>
      <div className={s.pht}>
        <div className={s.pid}>
          <Tile icon={vm.tile.icon} tone={vm.tile.tone} size={52} />
          <h1 className={s.h0}>{vm.title}</h1>
        </div>
        <p className={s.lede}>{vm.lede}</p>
        {children}
      </div>
    </div>
  );
}

function Open({ vm }: { vm: OpenWeekVM }) {
  return (
    <div className={s.pg}>
      <Head vm={vm}>
        <span className={s.pk}>
          <span className={s.pl} data-tone={vm.pill.tone}>
            {vm.pill.label}
          </span>
          <span>{vm.pk}</span>
        </span>
      </Head>

      <section className={`${s.cd} ${s.hero}`} aria-labelledby="lv-next-t">
        <div className={s.hl}>
          <div className={s.colZ}>
            <span className={s.eyb}>{vm.hero.eyebrow}</span>
            <h2 className={s.ht} id="lv-next-t">
              {vm.hero.title}
            </h2>
          </div>
          {vm.hero.kind === 'step' ? (
            <>
              {vm.hero.meta ? <span className={s.dl}>{vm.hero.meta}</span> : null}
              {vm.hero.doneWhen ? (
                <p className={`${s.p} ${s.s2}`} style={{ maxWidth: 560 }}>
                  {vm.hero.doneWhen}
                </p>
              ) : null}
              <div className={s.hb}>
                <Link className={`${s.b} ${s.bp}`} to={vm.hero.cta.href}>
                  {vm.hero.cta.label}
                  <Icon name="lvArrow" size={14} strokeWidth={1.75} className={s.ar} />
                </Link>
              </div>
            </>
          ) : null}
        </div>
        <div className={s.hr}>
          <span className={s.eyb}>
            <Icon name="r2Check" size={14} strokeWidth={1.75} />
            {vm.right.label}
          </span>
          <div className={s.cdn}>
            <span>
              <b>{vm.right.done}</b>
              <em>{vm.right.ofTotal}</em>
            </span>
          </div>
          <Prog segs={vm.right.segs} aria={vm.right.aria} max={280} />
          {vm.right.foot ? <span className={s.dl}>{vm.right.foot}</span> : null}
        </div>
      </section>

      <div className={s.gms}>
        <section className={s.cd} aria-labelledby="lv-steps-t">
          <div className={s.cdh}>
            <h2 className={`${s.h2} ${s.grow}`} id="lv-steps-t">
              {vm.steps.heading}
            </h2>
            <span className={s.me}>{vm.steps.meta}</span>
          </div>
          {vm.steps.rows.map((r) => (
            <Link key={r.n} className={s.stp} to={r.href} aria-label={r.aria} data-cur={r.state === 'current' ? 'true' : undefined}>
              <span className={s.sti} data-s={r.state}>
                {r.state === 'done' ? <Icon name="r2Check" size={14} strokeWidth={2.2} /> : r.n}
              </span>
              <span className={s.colZ}>
                <span className={r.state === 'done' ? s.s2 : s.w5}>{r.title}</span>
                {r.meta ? <span className={s.me}>{r.meta}</span> : null}
              </span>
              <span className={s.sx}>
                {r.pill ? (
                  <span className={s.pl} data-tone={r.pill.tone}>
                    {r.pill.label}
                  </span>
                ) : null}
                <span className={s.mu}>
                  <Icon name="r2Chev" size={14} strokeWidth={1.75} />
                </span>
              </span>
            </Link>
          ))}
        </section>
        {vm.kit ? (
          <div className={s.col}>
            <section className={s.cd} aria-labelledby="lv-kit-t">
              <div className={s.cdh}>
                <h2 className={`${s.h2} ${s.grow}`} id="lv-kit-t">
                  {vm.kit.heading}
                </h2>
              </div>
              <KitRows rows={vm.kit.rows} />
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Locked({ vm, now }: { vm: LockedWeekVM; now: number }) {
  return (
    <div className={s.pg}>
      <Head vm={vm}>
        <span className={s.pk}>
          <Icon name="lvLock" size={14} strokeWidth={1.75} />
          <span>{vm.pk}</span>
        </span>
      </Head>
      <div className={s.gms}>
        <section className={`${s.cd} ${s.hero} ${s.heroBlock}`} aria-labelledby="lv-locked-t">
          <div className={s.emp}>
            <Tile icon="lvLock" tone={vm.tile.tone} size={44} />
            <h2 className={s.ht} id="lv-locked-t">
              {vm.headline}
            </h2>
            {vm.line ? <p className={`${s.p} ${s.s2}`}>{vm.line}</p> : null}
            {vm.question ? <p className={`${s.p} ${s.s2}`}>{vm.question}</p> : null}
          </div>
        </section>
        {vm.sessions ? (
          <div className={s.col}>
            <section className={s.cd} aria-labelledby="lv-live-t">
              <div className={s.cdh}>
                <h2 className={`${s.h2} ${s.grow}`} id="lv-live-t">
                  {vm.sessions.heading}
                </h2>
              </div>
              <SessionRows rows={vm.sessions.rows} link={null} />
              {vm.sessions.add ? (
                <div className={s.cdf}>
                  <button type="button" className={`${s.b} ${s.bp}`} style={{ flex: '1 1 0%' }} onClick={() => saveIcs(vm.sessions!.add!.ics, now)}>
                    <Icon name="lvCalAdd" size={14} strokeWidth={1.75} />
                    {vm.sessions.add.label}
                  </button>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Component() {
  const { course, db, viewer, now } = useLearn();
  const params = useParams();
  const me = learnerOf(db, viewer.actor.kind === 'learner' ? viewer.actor.userId : null);
  const rows = useMemo(() => (course.kind === 'ready' ? weekRows(course.payload, db, me) : []), [course, db, me]);
  if (course.kind !== 'ready') return <Navigate to={learnHome()} replace />;
  const vm = weekVM(course.payload, rows, weekParam(params.week), now, fileUrl);
  if (vm.kind === 'missing') return <Navigate to={vm.href} replace />;
  return vm.kind === 'open' ? <Open vm={vm} /> : <Locked vm={vm} now={now} />;
}

export default Component;
