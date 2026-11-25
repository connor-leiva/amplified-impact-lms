// /learn/week/:week (D-177): a week's overview, the learner mockup's artboards 06/07, and its locked
// preview, artboards 14/15. Markup only: every string and every time is computed in Week.vm.ts. A
// locked week draws its stub alone; nothing of its content is fetched or rendered.

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { learnerOf } from '@ai/core/learner';
import type { AIEmployee, Learner } from '@ai/core';
import { LMS_TOUR_WEEK, tourVideoOf } from '@ai/core/lms-tour';
import type { VideoBlock } from '@ai/core/course-types';
import { Icon } from '../../components/Icon';
import { isFixture, repo } from '../../data/boot';
import { useLearn } from './data';
import { saveIcs } from './ics';
import { weekRows } from './learn.vm';
import { StartHereCard } from './StartHere';
import { WeekDone } from './WeekDone';
import { TourCard } from './tour/Tour';
import { WEEK, weekParam, weekVM } from './Week.vm';
import type { LockedWeekVM, OpenWeekVM } from './Week.vm';
import { KitRows, Prog, SessionRows, Tile } from './parts';
import { learnHome } from './routes';
import { WeekLive } from './Live';
import { DeployCard } from './Deploy';
import { BuildKit, Crumbs, Downloads, WeekContent, WeekMeta, moduleFileUrl, useTabTitle } from './WeekContent';
import { buildKitVM, crumbsVM, tabTitle, weekContentVM } from './WeekContent.vm';
import type { BuildKitVM, CrumbVM, WeekContentVM } from './WeekContent.vm';
import { V3Locked, V3Week } from './lms-v3/V3Week';
import { v3LockedDraws, v3WeekDraws } from './lms-v3/week.vm';
import { v3For } from './lms-v3/v3';
import s from './Learn.module.css';

const fileUrl = (id: string): string | null => repo.fileUrl({ kind: 'resource', id });

/** D-184: what an open week draws beyond its overview: the trail, its content, its build kit and downloads. */
interface WeekMore {
  crumbs: CrumbVM[];
  content: WeekContentVM | null;
  kit: BuildKitVM | null;
  /** A staff member's preview tab (D-138): a stored file says "Preview only". */
  previewing: boolean;
  /** The tab's title (X-2), or null in the builder's preview, which leaves the builder's alone. */
  title: string | null;
  /** D-186: the week's module and this learner, for the Your Deployment card; null without a module. */
  deploy: { m: AIEmployee; me: Learner | null; now: number } | null;
  /** D-199: the one-time Week 0 finish. Staff and fixture mode leave it off. */
  celebrate: boolean;
  onCelebrate: () => void;
  /** D-252: Week 0's LMS tour, pinned at the top of the week, or null. */
  tour: VideoBlock | null;
}

function Head({ vm, question, children }: { vm: OpenWeekVM | LockedWeekVM; question?: string | null; children: ReactNode }) {
  return (
    <div className={s.phd}>
      <div className={s.pht}>
        <div className={s.pid}>
          <Tile icon={vm.tile.icon} tone={vm.tile.tone} size={52} />
          <h1 className={s.h0}>{vm.title}</h1>
        </div>
        {question ? <p className={`${s.lede} ${s.q}`}>{question}</p> : null}
        <p className={s.lede}>{vm.lede}</p>
        {children}
      </div>
    </div>
  );
}

function Open({ vm, more }: { vm: OpenWeekVM; more: WeekMore }) {
  const side = !!(more.deploy || vm.kit || more.kit || more.content?.downloads.length);
  useTabTitle(more.title);
  return (
    <div className={s.pg}>
      {more.celebrate ? <WeekDone onDone={more.onCelebrate} /> : null}
      <Crumbs crumbs={more.crumbs} />
      <Head vm={vm} question={more.content?.question}>
        <span className={s.pk}>
          <span className={s.pl} data-tone={vm.pill.tone}>
            {vm.pill.label}
          </span>
          <span>{vm.pk}</span>
        </span>
        {more.content ? <WeekMeta vm={more.content.meta} /> : null}
      </Head>
      {more.tour ? <TourCard video={more.tour} /> : null}
      {vm.startHere ? <StartHereCard card={vm.startHere} /> : null}
      <WeekLive week={vm.week} />

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
          ) : (
            <>
              {/* D-218: what the week built, and the action to use it. */}
              {vm.hero.outputs.length ? (
                <ul className={`${s.ul} ${s.s2}`} aria-label={WEEK.built}>
                  {vm.hero.outputs.map((o, i) => (
                    <li key={i} className={s.row}>
                      <Icon name="r2Check" size={14} strokeWidth={1.75} />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {vm.hero.cta ? (
                <div className={s.hb}>
                  {vm.hero.cta.external ? (
                    <a className={`${s.b} ${s.bp}`} href={vm.hero.cta.href} target="_blank" rel="noreferrer">
                      {vm.hero.cta.label}
                      <Icon name="lvArrow" size={14} strokeWidth={1.75} className={s.ar} />
                    </a>
                  ) : (
                    <Link className={`${s.b} ${s.bp}`} to={vm.hero.cta.href}>
                      {vm.hero.cta.label}
                      <Icon name="lvArrow" size={14} strokeWidth={1.75} className={s.ar} />
                    </Link>
                  )}
                </div>
              ) : null}
            </>
          )}
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
        {side ? (
          <div className={s.col}>
            {more.deploy ? <DeployCard m={more.deploy.m} me={more.deploy.me} now={more.deploy.now} /> : null}
            {vm.kit ? (
              <section className={s.cd} aria-labelledby="lv-kit-t">
                <div className={s.cdh}>
                  <h2 className={`${s.h2} ${s.grow}`} id="lv-kit-t">
                    {vm.kit.heading}
                  </h2>
                </div>
                <KitRows rows={vm.kit.rows} />
                {vm.kit.library ? (
                  <div className={s.cdf}>
                    <Link className={`${s.b} ${s.bi}`} to={vm.kit.library.href}>
                      <Icon name="r2Download" size={14} strokeWidth={1.75} />
                      {vm.kit.library.label}
                    </Link>
                  </div>
                ) : null}
              </section>
            ) : null}
            {more.kit ? <BuildKit vm={more.kit} previewing={more.previewing} /> : null}
            {more.content ? <Downloads items={more.content.downloads} /> : null}
          </div>
        ) : null}
      </div>
      {more.content ? <WeekContent vm={more.content} /> : null}
    </div>
  );
}

function Locked({ vm, now, crumbs, title }: { vm: LockedWeekVM; now: number; crumbs: CrumbVM[]; title: string | null }) {
  useTabTitle(title);
  return (
    <div className={s.pg}>
      <Crumbs crumbs={crumbs} />
      <Head vm={vm}>
        <span className={s.pk}>
          <Icon name="lvLock" size={14} strokeWidth={1.75} />
          <span>{vm.pk}</span>
        </span>
      </Head>
      <WeekLive week={vm.week} />
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

/**
 * D-184: a week's page from what the shell hands every screen (`useLearn`), for one week. The curriculum
 * builder's live preview draws it too, inside a `LearnProvider` with the unsaved draft's course, and then
 * (`preview`) a week it can't show draws nothing rather than moving the builder's page.
 */
export function WeekPage({ week, preview = false }: { week: number | null; preview?: boolean }) {
  const { course, db, viewer, now } = useLearn();
  const [hid, setHid] = useState(false);
  const me = learnerOf(db, viewer.actor.kind === 'learner' ? viewer.actor.userId : null);
  const rows = useMemo(() => (course.kind === 'ready' ? weekRows(course.payload, db, me) : []), [course, db, me]);
  if (course.kind !== 'ready') return preview ? null : <Navigate to={learnHome()} replace />;
  const vm = weekVM(course.payload, rows, week, now, fileUrl, me?.checks ?? []);
  if (vm.kind === 'missing') return preview ? null : <Navigate to={vm.href} replace />;
  const crumbs = crumbsVM(vm.title, vm.week);
  const title = preview ? null : tabTitle(vm.week, vm.title);
  const row = rows.find((r) => r.week === vm.week);
  // D-228: the v3 week page for a learner v3 draws for (never in the builder's preview), when the week needs nothing
  // the mockup doesn't draw (`v3WeekDraws`, `v3LockedDraws`); otherwise today's page whole.
  if (!preview && row && v3For(viewer, me)) {
    if (vm.kind === 'locked' && v3LockedDraws(vm, row)) return <V3Locked p={course.payload} rows={rows} r={row} vm={vm} now={now} />;
    if (vm.kind === 'open' && v3WeekDraws(row))
      return <V3Week p={course.payload} rows={rows} r={row} me={me} checks={me?.checks ?? []} build={buildKitVM(row.module, moduleFileUrl)} fileUrl={fileUrl} now={now} />;
  }
  if (vm.kind === 'locked') return <Locked vm={vm} now={now} crumbs={crumbs} title={title} />;
  const mod = row?.module;
  const more: WeekMore = {
    crumbs,
    content: weekContentVM(course.payload, vm.week, mod),
    kit: buildKitVM(mod, moduleFileUrl),
    previewing: viewer.preview !== undefined,
    title,
    deploy: mod ? { m: mod, me, now } : null,
    celebrate: !hid && !isFixture && !preview && viewer.actor.kind === 'learner' && vm.week === 0 && vm.right.total > 0 && vm.right.done === vm.right.total && !me?.coursePrefs?.some((p) => p.key === 'week0-done'),
    onCelebrate: () => setHid(true),
    tour: vm.week === LMS_TOUR_WEEK ? tourVideoOf(course.payload.course) : null,
  };
  return <Open vm={vm} more={more} />;
}

export function Component() {
  const params = useParams();
  return <WeekPage week={weekParam(params.week)} />;
}

export default Component;
