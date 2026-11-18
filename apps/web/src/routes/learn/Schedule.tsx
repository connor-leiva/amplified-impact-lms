// /learn/schedule, the Schedule (D-180): the learner mockup's artboards 10/11 (weeks) and 12/13
// (calendar). Markup only: every string and every time is computed in Schedule.vm.ts. One hero per page.
//
// The two views are one page: `?view=calendar` picks the month, as the mockup's switch links between its
// two artboards. "Add all to calendar" downloads the whole schedule from the API's calendar route
// (`/calendar/schedule.ics`, the welcome page's route); "Add to calendar" on the next session writes that
// one session's .ics in the browser, as the shell's bar does.

import { Fragment, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { ACCELERATOR_COHORT_ID } from '@ai/core/accelerator';
import { learnerOf } from '@ai/core/learner';
import { Icon } from '../../components/Icon';
import { useLearn } from './data';
import { saveIcs } from './ics';
import { LABELS, weekRows } from './learn.vm';
import { learnHome } from './routes';
import { scheduleVM, viewOf } from './Schedule.vm';
import type { AgendaGroupVM, GroupVM, HeroVM, MonthVM, ScheduleVM, WeekItemVM } from './Schedule.vm';
import type { DateTileVM } from './learn.vm';
import { Tile } from './parts';
import l from './Learn.module.css';
import s from './Schedule.module.css';

function DateTile({ t, lg, on }: { t: DateTileVM; lg?: boolean; on?: boolean }) {
  return (
    <span className={[s.dt, lg ? s.lg : '', on ? s.on : ''].join(' ')}>
      <span className={s.dw}>{t.dw}</span>
      <span className={s.dd}>{t.dd}</span>
    </span>
  );
}

function Hero({ hero, now }: { hero: HeroVM; now: number }) {
  return (
    <section className={`${l.cd} ${l.hero}`} aria-labelledby="lv-sch-next">
      <div className={l.hl}>
        <div className={`${l.row} ${l.nw}`} style={{ gap: 16 }}>
          <DateTile t={hero.tile} lg on />
          <div className={l.colZ} style={{ minWidth: 0 }}>
            <span className={l.eyb}>{hero.eyebrow}</span>
            <h2 className={l.ht} id="lv-sch-next">
              {hero.title}
            </h2>
          </div>
        </div>
        <span className={l.dl}>{hero.meta}</span>
        <div className={l.hb}>
          <button type="button" className={`${l.b} ${l.bp}`} onClick={() => saveIcs(hero.ics, now)}>
            <Icon name="lvCalAdd" size={14} strokeWidth={1.75} />
            {hero.addLabel}
          </button>
          {hero.see ? (
            <Link className={`${l.b} ${l.bq}`} to={hero.see.href}>
              {hero.see.label}
            </Link>
          ) : null}
        </div>
      </div>
      <div className={l.hr}>
        <span className={l.eyb}>
          <Icon name={hero.right.icon} size={14} strokeWidth={1.75} />
          {hero.right.label}
        </span>
        <div className={l.cdn} role="timer" aria-label={hero.right.aria}>
          {hero.right.parts.map((p) => (
            <span key={p.unit}>
              <b>{p.n}</b>
              <em>{p.unit}</em>
            </span>
          ))}
        </div>
        {hero.right.foot ? <span className={l.dl}>{hero.right.foot}</span> : null}
      </div>
    </section>
  );
}

function WeekRowLink({ w }: { w: WeekItemVM }) {
  return (
    <Link className={s.wr} to={w.href} aria-label={w.aria} data-now={w.now ? 'true' : undefined}>
      <DateTile t={w.tile} lg on={w.now} />
      <span className={s.who}>
        <span className={s.tw}>
          <Tile icon={w.icon} tone={w.tone} size={36} />
        </span>
        <span className={s.wt}>
          {w.pill ? (
            <span className={`${l.row} ${l.nw}`} style={{ gap: 8 }}>
              <b>{w.title}</b>
              <span className={l.pl} data-tone={w.pill.tone}>
                {w.pill.label}
              </span>
            </span>
          ) : (
            <b>{w.title}</b>
          )}
          <span className={l.s2}>{w.line}</span>
        </span>
      </span>
      <span className={s.ses}>
        {w.lines.map((x) => (
          <span key={x.key}>
            <i data-dot={x.dot} />
            <span>{x.text}</span>
          </span>
        ))}
      </span>
      {w.locked ? (
        <span className={s.cnr} role="img" aria-label={LABELS.locked}>
          <Icon name="lvLock" size={12} strokeWidth={1.75} />
        </span>
      ) : null}
    </Link>
  );
}

function Weeks({ weeks }: { weeks: { heading: string; groups: GroupVM[] } }) {
  return (
    <section className={`${l.cd} ${s.wkl}`} aria-labelledby="lv-sch-weeks">
      <div className={l.cdh}>
        <h2 className={`${l.h2} ${l.grow}`} id="lv-sch-weeks">
          {weeks.heading}
        </h2>
      </div>
      {weeks.groups.map((g, i) => (
        <Fragment key={g.key}>
          <div className={`${s.mth} ${i === 0 ? s.first : ''}`}>
            {g.label}
            {g.meta ? <span className={l.me}>{g.meta}</span> : null}
          </div>
          {g.items.map((it) =>
            it.kind === 'week' ? (
              <WeekRowLink key={it.key} w={it} />
            ) : (
              <div key={it.key} className={`${s.wr} ${s.brk}`} role="note">
                <span className={s.brkt}>
                  <Icon name="moon" size={16} strokeWidth={1.75} />
                </span>
                <span className={s.who}>
                  <span className={s.wt}>
                    <b>{it.title}</b>
                    <span className={l.s2}>{it.line}</span>
                  </span>
                </span>
                <span className={s.ses} />
              </div>
            ),
          )}
        </Fragment>
      ))}
    </section>
  );
}

function Month({
  cal,
  month,
  index,
  count,
  go,
}: {
  cal: ScheduleVM['calendar'];
  month: MonthVM;
  index: number;
  count: number;
  go: (i: number) => void;
}) {
  const last = month.rows.length - 1;
  return (
    <section className={`${l.cd} ${s.calDt}`} aria-labelledby="lv-sch-month">
      <div className={l.cdh}>
        <h2 className={`${l.h2} ${l.grow}`} id="lv-sch-month" aria-live="polite">
          {month.label}
        </h2>
        <span className={s.leg}>
          <i />
          {cal.legend.build}
        </span>
        <span className={`${s.leg} ${s.legLast}`}>
          <i data-dot="oh" />
          {cal.legend.oh}
        </span>
        <div className={`${l.row} ${l.nw}`} style={{ gap: 2 }}>
          <button
            type="button"
            className={s.ib}
            aria-label={cal.prev}
            disabled={index <= 0}
            onClick={() => go(index - 1)}
          >
            <Icon name="r2Back" size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={s.ib}
            aria-label={cal.next}
            disabled={index >= count - 1}
            onClick={() => go(index + 1)}
          >
            <Icon name="r2Chev" size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <div className={s.calg} role="table" aria-label={month.label}>
        <div className={s.calr} role="row">
          {cal.days.map((d) => (
            <div key={d} className={s.calh} role="columnheader">
              {d}
            </div>
          ))}
        </div>
        {month.rows.map((row, ri) => (
          <div key={row[0]!.key} className={s.calr} role="row">
            {row.map((c) => (
              <div
                key={c.key}
                className={s.cald}
                role="cell"
                data-out={c.out ? 'true' : undefined}
                data-last={ri === last ? 'true' : undefined}
                data-today={c.today ? 'true' : undefined}
              >
                <span className={s.dn}>{c.day}</span>
                {c.events.map((e) =>
                  e.kind === 'session' ? (
                    <Link key={e.id} className={s.ev} data-dot={e.dot} to={e.href} aria-label={e.aria}>
                      <b>{e.label}</b>
                      <span>{e.title}</span>
                    </Link>
                  ) : (
                    <span key={e.key} className={`${s.ev} ${s.evBrk}`}>
                      <b>{e.label}</b>
                      <span>{e.line}</span>
                    </span>
                  ),
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function Agenda({ label, groups }: { label: string; groups: AgendaGroupVM[] }) {
  return (
    <section className={`${l.cd} ${s.calPh}`} aria-label={label}>
      {groups.map((g, i) => (
        <Fragment key={g.key}>
          <div className={`${s.mth} ${i === 0 ? s.first : ''}`}>{g.label}</div>
          {g.items.map((it) =>
            it.kind === 'session' ? (
              <Link key={it.id} className={`${l.li} ${s.ali}`} to={it.href} style={{ gap: 12 }}>
                <DateTile t={it.tile} />
                <div className={`${l.colZ} ${l.grow}`} style={{ minWidth: 0 }}>
                  <span className={l.w5}>{it.title}</span>
                  <span className={l.me}>{it.meta}</span>
                </div>
              </Link>
            ) : (
              <div key={it.key} className={`${l.li} ${s.abrk}`} style={{ gap: 12 }}>
                <span className={s.brkt}>
                  <Icon name="moon" size={16} strokeWidth={1.75} />
                </span>
                <div className={l.colZ}>
                  <span className={l.w5}>{it.title}</span>
                  <span className={l.me}>{it.line}</span>
                </div>
              </div>
            ),
          )}
        </Fragment>
      ))}
    </section>
  );
}

function Calendar({ cal }: { cal: ScheduleVM['calendar'] }) {
  const [index, setIndex] = useState(cal.start);
  const month = cal.months[Math.min(index, cal.months.length - 1)];
  return (
    <>
      {month ? <Month cal={cal} month={month} index={index} count={cal.months.length} go={setIndex} /> : null}
      <Agenda label={cal.agendaLabel} groups={cal.agenda} />
    </>
  );
}

export function Body({ vm, now }: { vm: ScheduleVM; now: number }) {
  return (
    <div className={l.pg}>
      <div className={l.phd}>
        <div className={l.pht}>
          <h1 className={l.h0}>{vm.title}</h1>
          {vm.lede ? <p className={l.lede}>{vm.lede}</p> : null}
        </div>
        <div className={s.pha}>
          <nav className={s.seg} aria-label={vm.views.label}>
            {vm.views.items.map((v) => (
              <Link key={v.key} to={v.href} aria-current={v.on ? 'page' : undefined}>
                {v.label}
              </Link>
            ))}
          </nav>
          {vm.addAll ? (
            <a className={`${l.b} ${l.bi}`} href={vm.addAll.href} download>
              <Icon name="lvCalAdd" size={14} strokeWidth={1.75} />
              {vm.addAll.label}
            </a>
          ) : null}
        </div>
      </div>

      {vm.hero ? <Hero hero={vm.hero} now={now} /> : null}

      {vm.view === 'weeks' ? <Weeks weeks={vm.weeks} /> : <Calendar cal={vm.calendar} />}
    </div>
  );
}

export function Component() {
  const { course, db, viewer, now } = useLearn();
  const [params] = useSearchParams();
  const me = learnerOf(db, viewer.actor.kind === 'learner' ? viewer.actor.userId : null);
  const payload = course.kind === 'ready' ? course.payload : null;
  const rows = useMemo(() => (payload ? weekRows(payload, db, me) : []), [payload, db, me]);
  // The schedule is a cohort piece: a plan without the course has none, and goes Home.
  if (!payload) return <Navigate to={learnHome()} replace />;
  const cohort = db.cohorts.find((c) => c.id === (me?.cohortId ?? ACCELERATOR_COHORT_ID));
  const vm = scheduleVM(payload, rows, cohort, viewOf(params.get('view')), now);
  return <Body vm={vm} now={now} />;
}

export default Component;
