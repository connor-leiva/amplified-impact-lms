// /learn, Home (D-177): the learner mockup's artboards 01/02 (before launch) and 04/05 (live build).
// Markup only: every string and every time is computed in Home.vm.ts. One hero per page.

import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { learnerOf } from '@ai/core/learner';
import { Icon } from '../../components/Icon';
import { useToaster } from '../../components/primitives/Toaster';
import { useMutate } from '../../data/hooks';
import { useJoin } from '../../data/join';
import { useLearn } from './data';
import { saveIcs } from './ics';
import { LABELS, weekRows } from './learn.vm';
import { homeVM } from './Home.vm';
import { hireRows } from './Hire.vm';
import type { BannerVM, CardVM, HeroRightVM, HeroVM, HomeVM, PostVM, RecentVM } from './Home.vm';
import { CalLinks, Go, LiveDot, Mbar, Prog, SessionRows, Tile, nStyle } from './parts';
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

/**
 * D-183: the in-app announcement, as the current portal's Dashboard banner: a warning is an `alert` (a
 * session moved), an info a `status`. The icon and the words carry the meaning, never colour alone.
 */
function Banner({ b, now }: { b: BannerVM; now: number }) {
  const mutate = useMutate();
  const navigate = useNavigate();
  const { toast } = useToaster();
  const warn = b.severity === 'warning';
  return (
    <div className={`${s.cd} ${s.ban}`} role={warn ? 'alert' : 'status'} data-severity={b.severity}>
      <span className={s.bani} aria-hidden="true">
        <Icon name={warn ? 'alert' : 'megaphone'} size={17} strokeWidth={1.8} />
      </span>
      <div className={`${s.colZ} ${s.grow}`}>
        <span className={s.bant}>
          <span className={s.w5}>{b.title}</span>
          <span className={s.me} title={b.abs}>
            {b.when}
          </span>
        </span>
        {b.body ? <span className={s.s2}>{b.body}</span> : null}
      </div>
      {b.action ? (
        <button
          type="button"
          className={`${s.b} ${warn ? s.bp : ''}`}
          onClick={() => {
            const a = b.action!;
            if (a.kind === 'nav') navigate(a.href);
            else {
              saveIcs(a.ics, now, a.name);
              toast(a.toast, 'success');
            }
          }}
        >
          {b.action.label}
        </button>
      ) : null}
      <button type="button" className={`${s.b} ${s.bq} ${s.bx}`} aria-label={b.dismiss} title={b.dismiss} onClick={() => void mutate('dismissAnnouncement', { id: b.id })}>
        <Icon name="r2X" size={15} strokeWidth={2} />
      </button>
    </div>
  );
}

function Hero({ hero, now }: { hero: HeroVM; now: number }) {
  const join = useJoin();
  const { toast } = useToaster();
  if (hero.kind === 'opens')
    return (
      <section className={`${s.cd} ${s.hero}`} aria-labelledby="lv-pre-t">
        {/* D-183: the current portal's pre-launch welcome, beside the countdown. */}
        <div className={s.hl} data-pre-launch="">
          <h2 className={s.ht} id="lv-pre-t">
            {hero.welcome.title}
          </h2>
          <p className={`${s.p} ${s.s2}`}>{hero.welcome.starts}</p>
          <p className={`${s.p} ${s.s2}`}>
            {hero.welcome.support}{' '}
            <a className={s.txl} href={hero.welcome.href}>
              {hero.welcome.email}
            </a>
            .
          </p>
        </div>
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
                {hero.kind !== 'live' ? null : hero.state === 'live' ? <LiveDot /> : <Icon name="lvLive" size={14} strokeWidth={1.75} />}
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
            <>
              <button type="button" className={`${s.b} ${s.bp}`} onClick={() => saveIcs(hero.ics, now)}>
                <Icon name="lvCalAdd" size={14} strokeWidth={1.75} />
                {hero.addLabel}
              </button>
              <CalLinks event={hero.ics[0]} />
            </>
          )}
        </div>
      </div>
      {hero.right ? <Right r={hero.right} /> : null}
    </section>
  );
}

/** D-183: the current portal's post-cohort block: office hours continue, and every replay to rewatch. */
function Post({ p, now }: { p: PostVM; now: number }) {
  return (
    <section className={`${s.cd} ${s.jst}`} aria-labelledby="lv-post-t">
      <div className={`${s.colZ} ${s.grow}`}>
        <span className={s.eyb}>{p.kicker}</span>
        <h2 className={s.h2} id="lv-post-t">
          {p.title}
        </h2>
        <span className={s.me}>{p.meta}</span>
      </div>
      <div className={s.row}>
        {p.ics ? (
          <>
            <button type="button" className={`${s.b} ${s.bp}`} onClick={() => saveIcs(p.ics!, now, p.icsName)}>
              <Icon name="lvCalAdd" size={14} strokeWidth={1.75} />
              {p.addLabel}
            </button>
            <CalLinks event={p.ics[0]} />
          </>
        ) : null}
        <Link className={s.b} to={p.rewatch.href}>
          <Icon name="play" size={12} filled />
          {p.rewatch.label}
        </Link>
      </div>
    </section>
  );
}

/** D-183: the session that just ended: its replay to watch, or its kit while the replay processes. */
function Recent({ r }: { r: RecentVM }) {
  return (
    <section className={`${s.cd} ${s.jst}`} aria-label={r.badge}>
      <span className={s.ost} data-tone={r.state === 'replay' ? 'ok' : undefined}>
        <Icon name={r.state === 'replay' ? 'r2Check' : 'clock'} size={13} strokeWidth={2} />
        {r.badge}
      </span>
      <span className={`${s.colZ} ${s.grow}`}>
        <span className={s.w5}>{r.title}</span>
        <span className={s.me}>{r.note}</span>
      </span>
      <Link className={`${s.b} ${r.state === 'replay' ? s.bp : ''}`} to={r.action.href}>
        {r.state === 'replay' ? <Icon name="play" size={12} filled /> : null}
        {r.action.label}
      </Link>
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

      {vm.banner ? <Banner b={vm.banner} now={now} /> : null}

      {vm.hero ? <Hero hero={vm.hero} now={now} /> : null}

      {vm.post ? <Post p={vm.post} now={now} /> : null}

      {vm.recent ? <Recent r={vm.recent} /> : null}

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
              <Card key={c.key} c={c} />
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
              <SessionRows rows={vm.comingUp.rows} link="/sessions" />
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
              {vm.cohort.community ? (
                <a className={s.li} href={vm.cohort.community.href} target="_blank" rel="noopener" style={{ gap: 12 }}>
                  <Tile icon="chat" tone="amber" size={28} />
                  <div className={`${s.colZ} ${s.grow}`}>
                    <span className={s.w5}>{vm.cohort.community.label}</span>
                    <span className={s.me}>{vm.cohort.community.host}</span>
                  </div>
                  <span className={s.mu}>
                    <Icon name="lvExternal" size={14} strokeWidth={1.75} />
                  </span>
                </a>
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
  const hires = useMemo(() => hireRows(db, me, now), [db, me, now]);
  const vm = homeVM(course, rows, db.cohorts, me, me?.name ?? staff?.name ?? '', now, db, hires);
  return <Body vm={vm} now={now} />;
}

export default Component;
