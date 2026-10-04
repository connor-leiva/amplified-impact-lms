import { useEffect, useRef, useState } from 'react';
import {
  VARIANTS,
  cardVM,
  fmt,
  phaseNow,
  seed,
  sessionVM,
  setViewerZone,
  variantNow,
  type Variant,
} from '@ai/core';
import { StatusToken, type StatusTokenProps } from '../components/StatusToken';
import { JoinButton, type JoinMode } from '../components/JoinButton';
import { NavItem } from '../components/NavItem';
import { EmployeeCard } from '../components/EmployeeCard';
import { SessionCard } from '../components/SessionCard';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import { loadPrefs, savePrefs } from '../lib/prefs';
import s from './__states.module.css';

// Ported from design-reference/States.dc.html. Every component here is the same file the app
// imports, rendered with forced states — that is the point of the sheet.
//
// Phase 03's gate compares this route to the reference in light and dark: pixels within 1%,
// copy and typography exactly.

const COLS = ['Default', 'Hover', 'Focus', 'Disabled', 'Loading'] as const;
const FORCES = ['', 'hover', 'focus', 'disabled', 'loading'] as const;
type Force = (typeof FORCES)[number];

const RULES: Record<Variant, string> = {
  scheduled: '> 24 h · Add to calendar primary, Join disabled',
  starting_soon: '< 15 min · Join primary',
  live: 'LIVE badge · elapsed time',
  ended_processing: 'Replay processing note',
  replay_ready: 'Watch replay primary',
};

const TOKEN_STATES: { props: StatusTokenProps; tip: string; note: string }[] = [
  { props: { kind: 'build', state: 'in_progress', n: 3 }, tip: '', note: 'build · in_progress' },
  {
    props: { kind: 'build', state: 'in_progress', n: 3 },
    tip: 'In progress · 3 of 6 steps verified',
    note: 'Hover shows the full label as a tooltip',
  },
  {
    props: { kind: 'build', state: 'in_progress', n: 3 },
    tip: '',
    note: 'Static. Tokens are not focusable; the parent row or button takes focus.',
  },
  { props: { kind: 'runtime', state: 'not_deployed', n: 0 }, tip: '', note: 'Inactive states use status.neutral' },
  { props: { kind: 'build', state: 'in_progress', n: 3, force: 'loading' }, tip: '', note: 'Skeleton pill at the same height' },
];

const JOIN_STATES: { mode: JoinMode; hint: string; force: Force; note: string }[] = [
  { mode: 'ready', hint: '', force: '', note: 'Under 15 minutes to start' },
  { mode: 'ready', hint: '', force: 'hover', note: 'action.primary-hover' },
  { mode: 'ready', hint: '', force: 'focus', note: 'Focus ring' },
  { mode: 'disabled', hint: 'Opens 15 Min Before', force: '', note: 'More than 15 minutes out' },
  { mode: 'ready', hint: '', force: 'loading', note: 'Opening Zoom' },
];

interface NavVariant {
  note: string;
  label: string;
  icon?: 'grid' | 'bot' | 'megaphone';
  active: boolean;
  locked: boolean;
  depth: 0 | 1;
  collapsed: boolean;
  token: StatusTokenProps | null;
  badge: string;
  chev: 'open' | 'closed' | '';
  title: string;
  w: number;
}
const navVariant = (v: Partial<NavVariant> & { note: string; label: string; w: number }): NavVariant => ({
  active: false,
  locked: false,
  depth: 0,
  collapsed: false,
  token: null,
  badge: '',
  chev: '',
  title: v.label,
  ...v,
});

const NAV_VARIANTS: NavVariant[] = [
  navVariant({ note: 'Active', label: 'Dashboard', icon: 'grid', active: true, w: 248 }),
  navVariant({ note: 'Group with included count', label: 'AI Employees', icon: 'bot', badge: '3', chev: 'open', w: 248 }),
  navVariant({
    note: 'Child · in progress',
    label: 'Sales',
    depth: 1,
    token: { kind: 'build', state: 'in_progress', n: 3, total: 6 },
    title: 'Sales AI Employee · 3 of 6 steps verified',
    w: 248,
  }),
  navVariant({
    note: 'Child · built',
    label: 'Marketing',
    depth: 1,
    token: { kind: 'build', state: 'verified', n: 6, total: 6 },
    title: 'Marketing AI Employee · Built',
    w: 248,
  }),
  navVariant({ note: 'Child · locked', label: 'Meetings', depth: 1, locked: true, title: 'Meetings AI Employee · Team tier', w: 248 }),
  navVariant({ note: 'Icon rail (collapsed)', label: 'Marketing', icon: 'megaphone', collapsed: true, title: 'Marketing · Built', w: 64 }),
];

type CatalogItem = StatusTokenProps & { code: string };
const T = (kind: StatusTokenProps['kind'], state: string, n = 0, extra: Partial<CatalogItem> = {}): CatalogItem => ({
  kind,
  state,
  n,
  compact: false,
  size: 'sm',
  label: '',
  code: `${kind}.${state}${kind === 'build' && state === 'in_progress' ? ` (${n}/6)` : ''}`,
  ...extra,
});

const CATALOG: { label: string; items: CatalogItem[] }[] = [
  {
    label: 'Access',
    items: [
      T('access', 'included'),
      T('access', 'locked'),
      T('access', 'locked', 0, { label: 'Included in Team Tier', code: 'access.locked · preview label' }),
    ],
  },
  {
    label: 'Build',
    items: [T('build', 'not_started'), T('build', 'in_progress', 1), T('build', 'in_progress', 3), T('build', 'in_progress', 5), T('build', 'verified', 6)],
  },
  {
    label: 'Build · Compact',
    items: [
      T('build', 'not_started', 0, { compact: true }),
      T('build', 'in_progress', 3, { compact: true }),
      T('build', 'verified', 6, { compact: true }),
    ],
  },
  {
    label: 'Runtime',
    items: [
      T('runtime', 'deployed'),
      T('runtime', 'paused'),
      T('runtime', 'needs_attention'),
      T('runtime', 'not_deployed'),
      T('runtime', 'deployed', 0, { size: 'md', code: 'runtime.deployed · md (header)' }),
    ],
  },
  { label: 'Step', items: [T('step', 'verified'), T('step', 'pending')] },
];

const noop = () => {};

export function Component() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadPrefs().theme ?? 'light');
  // The reference ticks once a second so the countdowns advance. Under the compliance suite's
  // frozen clock `Date.now()` never moves, so every tick renders the same instant.
  const anchor = useRef(Date.now());
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    void document.fonts.ready.then(() => document.body.setAttribute('data-app-ready', 'true'));
  }, []);

  // The sheet renders times, so it honours the stored zone exactly as the reference does.
  setViewerZone(loadPrefs().tz ?? null);

  const db = seed('live');
  const tick = Date.now() - anchor.current;
  const session = db.sessions.find((x) => x.id === 'dec26-s3')!;
  const jamie = db.users.find((u) => u.id === 'u_jamie')!;
  const sales = db.modules.find((m) => m.id === 'sales')!;
  const card = cardVM(db, jamie, sales, phaseNow('live'));
  const bannerTitle = `Session 3 moved to ${fmt.dayPlain(session.start)} · ${fmt.time(session.start)}`;

  const pickTheme = (next: 'light' | 'dark') => {
    savePrefs({ theme: next });
    setTheme(next);
  };

  return (
    <div className={s.sheet}>
      <header className={s.header}>
        <div className={s.headerText}>
          <h1 className={s.h1}>States</h1>
          <p className={s.lede}>
            Component states for the Implementation Hub. Every component on this sheet is the same file the app imports,
            rendered with forced states.
          </p>
        </div>
        <div className={s.themeTrack}>
          {(
            [
              ['light', 'Light'],
              ['dark', 'Dark'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" className={s.themeBtn} aria-pressed={theme === k} onClick={() => pickTheme(k)}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <section className={s.section}>
        <div className={s.sectionHead}>
          <h2 className={s.h2}>Next Live Session · Five Variants</h2>
          <p className={s.sectionNote}>
            Seconds hide when more than an hour remains. The Join button is the only link to the session. The countdown is
            a timer region that announces at hour, 10-minute and 1-minute boundaries.
          </p>
        </div>
        <div className={s.variantRow}>
          {VARIANTS.map(([id]) => (
            <div key={id} className={s.variant}>
              <div className={s.variantHead}>
                <span className={s.variantId}>{id}</span>
                <span className={s.variantRule}>{RULES[id]}</span>
              </div>
              <SessionCard
                vm={sessionVM(db, session, id, variantNow(session, id, tick))}
                onJoin={noop}
                onCal={noop}
                onWatch={noop}
                onKit={noop}
              />
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <h2 className={s.h2}>Components × States</h2>
        <div className={s.grid}>
          <span />
          {COLS.map((c) => (
            <span key={c} className={s.colHead}>
              {c}
            </span>
          ))}

          <span className={s.rowLabel} style={{ paddingTop: 10 }}>
            Nav Item
          </span>
          {FORCES.map((force, i) => (
            <div key={`nav${i}`} className={s.navHost} style={{ width: 248 }}>
              <NavItem label="Sessions" icon="radio" force={force} onClick={noop} />
            </div>
          ))}

          <span className={s.rowLabel} style={{ paddingTop: 4 }}>
            Status Token
          </span>
          {TOKEN_STATES.map((t, i) => (
            <div key={`tok${i}`} className={`${s.cell} ${s.cellStart}`}>
              <StatusToken {...t.props} total={6} />
              {t.tip ? <span className={s.tooltip}>{t.tip}</span> : null}
              <span className={`${s.note} ${s.noteWide}`}>{t.note}</span>
            </div>
          ))}

          <span className={s.rowLabel} style={{ paddingTop: 8 }}>
            Join Button
          </span>
          {JOIN_STATES.map((j, i) => (
            <div key={`join${i}`} className={`${s.cell} ${s.cellStart}`}>
              <JoinButton mode={j.mode} hint={j.hint} stack force={j.force} onJoin={noop} />
              <span className={s.note}>{j.note}</span>
            </div>
          ))}

          <span className={s.rowLabel} style={{ paddingTop: 8 }}>
            Employee Card
          </span>
          {FORCES.map((force, i) => (
            <div key={`card${i}`} style={{ width: 290 }}>
              <EmployeeCard card={card} force={force} onOpen={noop} />
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <div className={s.sectionHead}>
          <h2 className={s.h2}>Nav Item Variants</h2>
          <p className={s.sectionNote}>
            Sidebar rows show access and build. Locked rows use text.disabled, open the locked preview on click and show
            “Team tier” on the lock tooltip.
          </p>
        </div>
        <div className={s.navVariantRow}>
          {NAV_VARIANTS.map((n) => (
            <div key={n.note} className={s.navVariant}>
              <span className={s.note}>{n.note}</span>
              <div className={s.navHost} style={{ width: n.w }}>
                <NavItem
                  label={n.label}
                  icon={n.icon}
                  active={n.active}
                  locked={n.locked}
                  depth={n.depth}
                  collapsed={n.collapsed}
                  token={n.token}
                  badge={n.badge}
                  chev={n.chev || undefined}
                  title={n.title}
                  onClick={noop}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <div className={s.sectionHead}>
          <h2 className={s.h2}>Status Token Catalog</h2>
          <p className={s.sectionNote}>
            Icon plus text label, never color alone. Access and build show in the sidebar; runtime shows in the detail
            header.
          </p>
        </div>
        <div className={s.catalog}>
          {CATALOG.map((row) => (
            <div key={row.label} className={s.catalogRow}>
              <span className={s.catalogLabel}>{row.label}</span>
              <div className={s.catalogItems}>
                {row.items.map((t, i) => (
                  <div key={`${row.label}${i}`} className={s.catalogItem}>
                    <StatusToken kind={t.kind} state={t.state} n={t.n} total={6} compact={t.compact} size={t.size} label={t.label} />
                    <span className={s.code}>{t.code}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`${s.section} ${s.bannerSection}`}>
        <h2 className={s.h2}>Announcement Banner</h2>
        <AnnouncementBanner severity="warning" title={bannerTitle} when="Yesterday" actionLabel="Update calendar" onDismiss={noop} />
        <AnnouncementBanner
          severity="info"
          title="Replay is up: Session 2 · Speed to Lead"
          body="The replay, chapters and transcript are on the Sales AI Employee page."
          when="4 days ago"
          onDismiss={noop}
        />
      </section>
    </div>
  );
}
