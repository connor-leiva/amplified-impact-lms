// /learn/skills (D-179): the Skill Library inside the learner shell, the learner mockup's artboards 16/17.
// Start here (the free skills, the first larger with its sample output), the filter chips (they wrap on a
// desk and scroll edge to edge on a phone), and each group with one lock line for the whole group, its
// tinted icons and, on a phone, its first three skills and "Show all". Markup only: every string is
// computed in Library.vm.ts from `GET /api/skills` (and the first skill's sample from its guide).

import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { guidePageOf } from '@ai/core/skill-guides';
import { Icon } from '../../components/Icon';
import { COPY as LIBRARY, Component as SkillLibrary } from '../library/SkillLibrary';
import { useDb, useViewer } from '../../data/hooks';
import { isNoCourseLearner } from './audience';
import { HUE } from './learn.vm';
import { LIB, libraryVM, showAll, snipOf } from './Library.vm';
import type { CardVM, GroupKey, GroupVM, LibraryVM } from './Library.vm';
import { Tile } from './parts';
import { useGuide, useSkills } from './skills-data';
import s from './Learn.module.css';
import l from './Library.module.css';

/** The phone shows a group's first three skills, then "Show all". */
const CLIP = 3;

function Pill({ open }: { open: boolean }) {
  return open ? (
    <span className={s.pl} data-tone="open">
      {LIB.open}
    </span>
  ) : null;
}

/** The first Start here skill, larger: its one line, its apps and who it's for, and its sample output. */
function Featured({ card }: { card: CardVM }) {
  const guide = useGuide(guidePageOf(card.id));
  const snip = snipOf(guide.kind === 'ready' ? guide.answer.sample : null);
  return (
    <Link className={`${s.cd} ${l.feat}`} to={card.href} aria-label={card.aria}>
      <div className={l.top}>
        <Tile icon="bot" tone="solid" size={44} />
        <Pill open={card.open} />
      </div>
      <div className={s.col} style={{ gap: 4 }}>
        <span className={s.on1}>{card.title}</span>
        <span className={s.s2}>{card.summary}</span>
      </div>
      {card.meta ? <span className={s.dl}>{card.meta}</span> : null}
      {snip ? (
        <>
          <div className={l.snip} aria-label={LIB.sampleAria} role="note">
            <b>{snip.title}</b>
            {snip.text ? <span className={l.snipText}>{snip.text}</span> : null}
          </div>
          <span className={s.me}>{LIB.sampleOutput}</span>
        </>
      ) : null}
    </Link>
  );
}

function Small({ card }: { card: CardVM }) {
  return (
    <Link className={`${s.cd} ${l.sm}`} to={card.href} aria-label={card.aria}>
      <div className={l.top}>
        <Tile icon="bot" tone="solid" size={36} />
        <Pill open={card.open} />
      </div>
      <span className={s.on1}>{card.title}</span>
      <span className={`${s.s2} ${s.cl2}`}>{card.summary}</span>
      {card.meta ? <span className={`${s.dl} ${l.smMeta}`}>{card.meta}</span> : null}
    </Link>
  );
}

function Card({ card, more }: { card: CardVM; more: boolean }) {
  return (
    <Link className={`${s.oc} ${l.oc}`} to={card.href} aria-label={card.aria} data-more={more ? 'true' : undefined}>
      <Tile icon={card.icon} tone={card.tone} size={36} />
      <span className={`${s.on1} ${s.el}`}>{card.title}</span>
      <span className={`${s.on2} ${s.cl2}`}>{card.summary}</span>
      {card.meta ? (
        <span className={s.of}>
          <span className={s.el}>{card.meta}</span>
        </span>
      ) : null}
      {card.lock ? (
        <span className={s.cnr}>
          <Icon name="lvLock" size={13} strokeWidth={1.75} label={LIB.locked} />
        </span>
      ) : null}
    </Link>
  );
}

function Group({ g }: { g: GroupVM }) {
  const [all, setAll] = useState(false);
  const clip = !all && g.cards.length > CLIP;
  const id = `lv-g-${g.key}`;
  return (
    <section className={s.col} style={{ gap: 12 }} aria-labelledby={id}>
      <div className={l.sgh}>
        <Tile icon={g.icon} tone={g.tone} size={28} />
        <h2 id={id}>{g.label}</h2>
        <span className={s.me}>{g.count}</span>
        {g.lock ? (
          <span className={l.opn}>
            <Icon name="lvLock" size={13} strokeWidth={1.75} />
            {g.lock}
          </span>
        ) : null}
      </div>
      <div className={`${s.ocg} ${clip ? l.clip : ''}`}>
        {g.cards.map((c, i) => (
          <Card key={c.id} card={c} more={i >= CLIP} />
        ))}
      </div>
      {clip ? (
        <button type="button" className={`${s.b} ${l.morebtn}`} onClick={() => setAll(true)}>
          {showAll(g.cards.length)}
        </button>
      ) : null}
    </section>
  );
}

function Chips({ vm, on, set }: { vm: LibraryVM; on: GroupKey | 'all'; set: (k: GroupKey | 'all') => void }) {
  return (
    <div className={l.chips} role="toolbar" aria-label={LIB.filter}>
      {vm.chips.map((c) => (
        <button key={c.key} type="button" className={l.chip} aria-pressed={on === c.key} onClick={() => set(c.key)}>
          {c.tone ? <span className={l.dotc} data-hue={HUE[c.tone]} aria-hidden="true" /> : null}
          {c.label}
          <span className={l.cc}>{c.count}</span>
        </button>
      ))}
    </div>
  );
}

export function LibraryPage({ vm, query, setQuery, chip, setChip }: { vm: LibraryVM; query: string; setQuery: (q: string) => void; chip: GroupKey | 'all'; setChip: (k: GroupKey | 'all') => void }) {
  const [first, ...rest] = vm.start;
  return (
    <div className={s.pg}>
      <div className={s.phd}>
        <div className={s.pht}>
          <h1 className={s.h0}>{vm.title}</h1>
          <p className={s.lede}>{vm.lede}</p>
        </div>
        <div className={l.pha}>
          <label className={l.srchf}>
            <Icon name="search" size={16} strokeWidth={1.75} />
            <input className={l.in} type="search" placeholder={LIB.search} aria-label={LIB.search} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>
      </div>
      {vm.paused ? (
        <p className={`${s.p} ${s.s2} ${l.note}`} role="status">
          <Icon name="lvLock" size={14} strokeWidth={1.75} />
          {vm.paused}
        </p>
      ) : null}

      {first ? (
        <section className={s.col} style={{ gap: 12 }} aria-labelledby="lv-st-t">
          <div className={s.sech}>
            <h2 id="lv-st-t">{LIB.startHere}</h2>
            <span className={s.me}>{LIB.openNow}</span>
          </div>
          <div className={l.start}>
            <Featured card={first} />
            {rest.length ? (
              <div className={l.smg}>
                {rest.map((c) => (
                  <Small key={c.id} card={c} />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className={s.col} style={{ gap: 20 }}>
        <Chips vm={vm} on={chip} set={setChip} />
        {vm.groups.map((g) => (
          <Group key={`${g.key}:${query}`} g={g} />
        ))}
      </div>
    </div>
  );
}

/**
 * D-257: a learner without the course (in the v3 frame once v3 is on) gets the Skill Library they have today inside it:
 * the access group's welcome and its Dismiss, the "Included with your … team" line, Weekly Live Training, Manage
 * Billing, each skill's Download and Setup Guide, and the pre-launch or paused panel. Its own logo and ground are left
 * out, since the frame draws them (`framed`, Q-B2). The course's learner gets the members' library below.
 */
export function Component() {
  const db = useDb();
  const viewer = useViewer();
  return isNoCourseLearner(viewer, db) ? <SkillLibrary framed /> : <Members />;
}

function Members() {
  const load = useSkills();
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<GroupKey | 'all'>('all');
  const vm = useMemo(() => (load.kind === 'ready' ? libraryVM(load.payload, query, chip) : null), [load, query, chip]);

  if (load.kind === 'loading')
    return (
      <div className={s.pg}>
        <h1 className={s.h0}>{LIB.title}</h1>
        <div className={l.status} role="status" aria-busy="true">
          <Icon name="spinner" size={20} strokeWidth={2.2} className={l.spin} label={LIB.loading} />
        </div>
      </div>
    );
  if (!vm)
    return (
      <div className={s.pg}>
        <h1 className={s.h0}>{LIB.title}</h1>
        {load.kind === 'signed-out' ? (
          <div className={l.status}>
            <p className={s.p}>{LIBRARY.unavailable}</p>
            <a className={`${s.b} ${s.bp}`} href="/sign-in">
              {LIBRARY.signIn}
            </a>
          </div>
        ) : (
          <p className={`${s.p} ${l.status}`} role="alert">
            {LIBRARY.failed}
          </p>
        )}
      </div>
    );
  return <LibraryPage vm={vm} query={query} setQuery={setQuery} chip={chip} setChip={setChip} />;
}

export default Component;
