// /learn, Home (D-177): the learner mockup's artboards 01/02 (before launch) and 04/05 (live build).
// Markup only: every string and every time is computed in Home.vm.ts. One hero per page.

import { useMemo } from 'react';
import { Link } from 'react-router';
import { learnerOf } from '@ai/core/learner';
import { Icon } from '../../components/Icon';
import { useToaster } from '../../components/primitives/Toaster';
import { useJoin } from '../../data/join';
import { useLearn } from './data';
import { saveIcs } from './ics';
import { LABELS, weekRows } from './learn.vm';
import { homeVM } from './Home.vm';
import { learnSchedule } from './routes';
import type { CardVM, HeroRightVM, HeroVM, HomeVM } from './Home.vm';
import { Go, LiveDot, Mbar, Prog, SessionRows, Tile, nStyle } from './parts';
import s from './Learn.module.css';

function Right({ r }: { r: HeroRightVM }) {
  return (
    <div className={s.hr}>
      <span className={s.eyb}>
        <Icon name={r.icon} size={14} strokeWidth={1.75} />
        {r.label}
      </span>
      <div className={s.cdn} role="timer" aria-label={r.aria}>
        {r.parts.map((p) => (
          <span key={p.unit}>
            <b>{p.n}</b>
            <em>{p.unit}</em>
          </span>
        ))}
      </div>
      <span className={s.dl}>{r.foot}</span>
    </div>
  );
}

function Hero({ hero, now }: { hero: HeroVM; now: number }) {
  const join = useJoin();
  const { toast } = useToaster();
  if (hero.kind === 'opens')
    return (
      <section className={`${s.cd} ${s.hero} ${s.heroOne}`} aria-label={hero.right.label}>
        <Right r={hero.right} />
      </section>
    );
  const one = !hero.right;
  return (
    <section className={`${s.cd} ${s.hero} ${one ? s.heroOne : ''}`} aria-labelledby="lv-next-t">
      <div className={s.hl}>
        {hero.kind === 'next' ? (
          <div className={s.colZ}>
            <span className={s.eyb}>{hero.eyebrow}</span>
            <h2 className={s.ht} id="lv-next-t">
              {hero.title}
            </h2>
          </div>
        ) : (
          <div className={`${s.row} ${s.nw}`} style={{ gap: 14 }}>
            <Tile icon={hero.tile.icon} tone={hero.tile.tone} size={44} />
            <div className={s.colZ}>
              <span className={s.eyb}>
                {hero.kind === 'live' ? <LiveDot /> : null}
                {hero.eyebrow}
              </span>
              <h2 className={s.ht} id="lv-next-t">
                {hero.title}
              </h2>
            </div>
          </div>
        )}
        {hero.meta ? <span className={s.dl}>{hero.meta}</span> : null}
        {hero.kind === 'step' ? (
          <div className={s.pgl}>
            <Prog segs={hero.segs} aria={hero.progressAria} />
            <div className={s.progl} aria-hidden="true" style={nStyle(hero.labels.length)}>
              {hero.labels.map((l, i) => (
                <span key={i} data-s={hero.segs[i] || undefined}>
                  {l}
                </span>
              ))}
            </div>
            <span className={`${s.num} ${s.pgn}`}>{hero.doneText}</span>
          </div>
        ) : null}
        <div className={s.hb}>
          {hero.kind === 'step' ? (
            <>
              <Link className={`${s.b} ${s.bp}`} to={hero.primary.href}>
                {hero.primary.label}
                <Icon name="lvArrow" size={14} strokeWidth={1.75} className={s.ar} />
              </Link>
              <Link className={`${s.b} ${s.bq}`} to={hero.secondary.href}>
                {hero.secondary.label}
              </Link>
            </>
          ) : hero.kind === 'live' ? (
            <>
              <button type="button" className={`${s.b} ${s.bp}`} onClick={() => void join(hero.sessionId, () => toast(`Opening Zoom · ${hero.title}`, 'info'))}>
                <Icon name="lvVideo" size={14} strokeWidth={1.75} />
                {hero.joinLabel}
              </button>
              {hero.open ? (
                <Link className={`${s.b} ${s.bq}`} to={hero.open.href}>
                  {hero.open.label}
                </Link>
              ) : null}
            </>
          ) : (
            <button type="button" className={`${s.b} ${s.bp}`} onClick={() => saveIcs(hero.ics, now)}>
              <Icon name="lvCalAdd" size={14} strokeWidth={1.75} />
              {hero.addLabel}
            </button>
          )}
        </div>
      </div>
      {hero.right ? <Right r={hero.right} /> : null}
    </section>
  );
}

function Card({ c }: { c: CardVM }) {
  return (
    <Link className={s.oc} to={c.href} aria-label={c.aria} data-cur={c.current ? 'true' : undefined} data-live={c.live ? 'true' : undefined}>
      <Tile icon={c.icon} tone={c.tone} size={36} />
      <span className={`${s.on1} ${s.el}`}>{c.title}</span>
      <span className={`${s.on2} ${s.cl2}`}>{c.line}</span>
      <span className={s.of}>
        {c.foot?.kind === 'bar' ? (
          <>
            <Mbar segs={c.foot.segs} />
            <span className={`${s.ost} ${s.num}`} data-tone="ip">
              {c.foot.text}
            </span>
          </>
        ) : c.foot?.kind === 'built' ? (
          <span className={s.ost} data-tone="ok">
            <Icon name="r2Check" size={13} strokeWidth={2.2} />
            {c.foot.text}
          </span>
        ) : c.foot ? (
          <span>{c.foot.text}</span>
        ) : null}
        <span className={s.sp} />
        {c.live ? (
          <span className={s.ost} data-tone="ok">
            <LiveDot />
            {LABELS.liveBuildNow}
          </span>
        ) : (
          <span>{c.weekLabel}</span>
        )}
      </span>
      {c.locked ? (
        <span className={s.cnr} role="img" aria-label={LABELS.locked}>
          <Icon name="lvLock" size={13} strokeWidth={1.75} />
        </span>
      ) : null}
    </Link>
  );
}

function Body({ vm, now }: { vm: HomeVM; now: number }) {
  return (
    <div className={s.pg}>
      <div className={s.phd}>
        <div className={s.pht}>
          <h1 className={s.h0}>{vm.greeting}</h1>
          {vm.lede ? <p className={s.lede}>{vm.lede}</p> : null}
        </div>
      </div>

      {vm.hero ? <Hero hero={vm.hero} now={now} /> : null}

      {vm.library ? (
        <section className={`${s.cd} ${s.cdb}`} aria-label={vm.library.label}>
          <div className={s.row} style={{ gap: 16 }}>
            <p className={`${s.p} ${s.s2} ${s.grow}`}>{vm.library.note}</p>
            <Go className={`${s.b} ${s.bp}`} href={vm.library.href}>
              {vm.library.label}
            </Go>
          </div>
        </section>
      ) : null}

      {vm.employees ? (
        <section className={s.col} aria-labelledby="lv-emp-t" style={{ gap: 12 }}>
          <div className={s.sech}>
            <h2 id="lv-emp-t">{vm.employees.heading}</h2>
            {vm.employees.meta ? <span className={s.me}>{vm.employees.meta}</span> : null}
            <span className={s.sp} />
            <Link className={`${s.lk} ${s.me}`} to={vm.employees.schedule.href}>
              {vm.employees.schedule.label}
              <Icon name="r2Chev" size={14} strokeWidth={1.75} />
            </Link>
          </div>
          <div className={s.ocg}>
            {vm.employees.cards.map((c) => (
              <Card key={c.week} c={c} />
            ))}
          </div>
        </section>
      ) : null}

      {vm.comingUp || vm.cohort ? (
        <div className={s.g2}>
          {vm.comingUp ? (
            <section className={s.cd} aria-labelledby="lv-up-t">
              <div className={s.cdh}>
                <h2 className={`${s.h2} ${s.grow}`} id="lv-up-t">
                  {vm.comingUp.heading}
                </h2>
                {vm.comingUp.add ? (
                  <button type="button" className={`${s.b} ${s.bq}`} style={{ marginRight: -8 }} onClick={() => saveIcs(vm.comingUp!.add!.ics, now)}>
                    <Icon name="lvCalAdd" size={14} strokeWidth={1.75} />
                    {vm.comingUp.add.label}
                  </button>
                ) : null}
              </div>
              <SessionRows rows={vm.comingUp.rows} link={learnSchedule()} />
            </section>
          ) : null}
          {vm.cohort ? (
            <section className={s.cd} aria-labelledby="lv-co-t">
              <div className={s.cdh}>
                <h2 className={`${s.h2} ${s.grow}`} id="lv-co-t">
                  {vm.cohort.heading}
                </h2>
                {vm.cohort.month ? <span className={s.me}>{vm.cohort.month}</span> : null}
              </div>
              {vm.cohort.stats.length ? (
                <div className={s.sol} style={nStyle(vm.cohort.stats.length)}>
                  {vm.cohort.stats.map((x) => (
                    <div key={x.label}>
                      <span className={s.sf}>{x.figure}</span>
                      <span className={s.me}>{x.label}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {vm.cohort.officeHours ? (
                <Link className={s.li} to={vm.cohort.officeHours.href} style={{ gap: 12 }}>
                  <Tile icon="lvLive" tone="blue" size={28} />
                  <div className={`${s.colZ} ${s.grow}`}>
                    <span className={s.w5}>{vm.cohort.officeHours.title}</span>
                    <span className={s.me}>{vm.cohort.officeHours.meta}</span>
                  </div>
                  <span className={s.mu}>
                    <Icon name="r2Chev" size={14} strokeWidth={1.75} />
                  </span>
                </Link>
              ) : null}
              <div className={s.li} style={{ gap: 12 }}>
                <Tile icon="r2Email" tone="forest" size={28} />
                <div className={s.colZ} style={{ flex: '1 1 200px' }}>
                  <span className={s.w5}>{vm.cohort.support.label}</span>
                  <a className={`${s.txl} ${s.el}`} href={vm.cohort.support.href}>
                    {vm.cohort.support.address}
                  </a>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function Component() {
  const { course, db, viewer, now } = useLearn();
  const me = learnerOf(db, viewer.actor.kind === 'learner' ? viewer.actor.userId : null);
  const staff = viewer.actor.kind === 'staff' ? db.staff.find((x) => viewer.actor.kind === 'staff' && x.id === viewer.actor.staffId) : undefined;
  const rows = useMemo(() => (course.kind === 'ready' ? weekRows(course.payload, db, me) : []), [course, db, me]);
  const vm = homeVM(course, rows, db.cohorts, me, me?.name ?? staff?.name ?? '', now);
  return <Body vm={vm} now={now} />;
}

export default Component;
