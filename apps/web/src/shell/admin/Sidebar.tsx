import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Ref } from 'react';
import { Icon } from '../../components/Icon';
import { Menu } from '../../components/r2/Menu';
import { initials } from '../../data/admin-shell';
import type { AdminShellData } from '../../data/admin-shell';
import { programLogo } from '../../home/program-logo';
import { peekAfterClick } from './adminNav';
import type { AdminNavEntry, SystemGroup } from './adminNav';
import type { AdminCohort } from './chrome';
import { AcademyLogo } from './Wordmark';
import s from './AdminShell.module.css';

// The admin sidebar (D-160 R2-1b, BUILD-SPEC § 4; D-239, ADMIN-SIDEBAR-SPEC.md): the mockup's `Sidebar`
// (handoff/admin-mockup/AdminMock.jsx, "proposed"), in its three forms.
//   full    244px: the academy logo, the cohort switcher with the program's own tile, the single rows (D-253:
//           Overview, Program, Cohort, People, Revenue, each with what waits on it), a hairline, the groups that
//           open (Operations, Access; one open, its pages on a guide line), the rail toggle, the signed-in staff member.
//   rail    64px (768–1199px by default): the logo through a 26px window (its "ai"), the tile, one icon per row:
//           a single row's opens its page, a group's has a fly-out of its pages. The toggle, the avatar. Each on the
//           same centre line.
//   drawer  the phone's 300px drawer: the full sidebar's rows, a Close button, no toggle, no travel.
//
// THE COHORT SWITCHER (D-253, the mockup's `CtxSwitch`): the program and the cohort the admin is on; its menu lists
// every cohort that exists, a draft marked "· Draft", and picking one is the same choice as the Cohort page's title.
//
// THE TRAVEL (ADMIN-SIDEBAR-SPEC.md §4, the learner sidebar's move). Three things, so the width and the layout can
// change at different moments: `narrow` (the column is 64px wide), the layout (`data-mode` rail or full) and
// `anim` (collapsing, expanding). Closing: the column narrows (--aim-dur-move, --aim-ease) and the logo's window
// closes to "ai" with it; for the first --aim-dur-quick the full layout stays and its words fade; then the layout
// becomes the rail and the tile, each group's icon, the toggle's icon and the avatar glide to their places
// (--aim-dur-base, FLIP), arriving with the edge. Opening: the layout opens at once behind the edge, those glide
// back out (--aim-dur-move, no overshoot), the words fade in (--aim-dur-base) and the column springs open
// (--aim-dur-spring, --aim-ease-spring). Every duration and curve is read from the brand's tokens
// (components/motion/ai-motion.css), never written here. Only a click on the toggle travels: a resize across a
// band, the phone's drawer and reduced motion switch at once. A second click part-way turns it round.

export type SidebarMode = 'full' | 'rail' | 'drawer';

export interface SidebarProps {
  mode: SidebarMode;
  data: AdminShellData;
  entries: readonly AdminNavEntry[];
  /** D-253: the cohort the admin is on, and the switcher's list. */
  cohort: AdminCohort;
  go: (to: string) => void;
  /** D-239: a click on a group's row: open it (closing the rest), or close the open one (`null`). */
  onPeek: (group: SystemGroup | null) => void;
  onToggleRail: () => void;
  onProfile: () => void;
  profileOpen: boolean;
  onClose?: () => void;
  closeRef?: Ref<HTMLButtonElement>;
}

type Anim = 'collapsing' | 'expanding' | null;
interface Flip {
  before: Record<string, DOMRect>;
  dur: string;
}

/** The program's own tile (`programLogo`, variant "tile"), as an image. Never under 32px (that file's rule). */
const tileSrc = (data: AdminShellData): string =>
  `data:image/svg+xml,${encodeURIComponent(programLogo(data.programKey, { variant: 'tile', size: 32, title: '' }))}`;

export function Sidebar({ mode, data, entries, cohort, go, onPeek, onToggleRail, onProfile, profileOpen, onClose, closeRef }: SidebarProps) {
  const drawer = mode === 'drawer';
  const want = mode === 'rail';
  const [rail, setLayout] = useState(want);
  const [narrow, setNarrow] = useState(want);
  const [anim, setAnim] = useState<Anim>(null);
  const el = useRef<HTMLElement | null>(null);
  const flipFrom = useRef<Flip | null>(null);
  const byHand = useRef(false);
  const was = useRef(want);
  const t1 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const t2 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const switcherName = `${data.program} · ${cohort.label}`;

  // The brand's tokens, read where they apply: a duration in ms, a curve as written.
  const ms = (v: string): number => (el.current ? parseFloat(getComputedStyle(el.current).getPropertyValue(v)) || 0 : 0);
  const curve = (v: string): string => (el.current ? getComputedStyle(el.current).getPropertyValue(v).trim() : '');
  const rects = (): Record<string, DOMRect> => {
    const m: Record<string, DOMRect> = {};
    el.current?.querySelectorAll<HTMLElement>('[data-fl]').forEach((x) => {
      if (x.dataset.fl) m[x.dataset.fl] = x.getBoundingClientRect();
    });
    return m;
  };

  useEffect(() => {
    if (was.current === want) return;
    was.current = want;
    clearTimeout(t1.current);
    clearTimeout(t2.current);
    const hand = byHand.current;
    byHand.current = false;
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!hand || reduced) {
      flipFrom.current = null;
      setAnim(null);
      setNarrow(want);
      setLayout(want);
      return;
    }
    if (want) {
      setNarrow(true);
      setAnim('collapsing');
      t1.current = setTimeout(() => {
        flipFrom.current = { before: rects(), dur: '--aim-dur-base' };
        setLayout(true);
      }, ms('--aim-dur-quick'));
      t2.current = setTimeout(() => setAnim(null), ms('--aim-dur-move') + 80);
    } else {
      flipFrom.current = rail ? { before: rects(), dur: '--aim-dur-move' } : null;
      setLayout(false);
      setNarrow(false);
      setAnim('expanding');
      t2.current = setTimeout(() => setAnim(null), ms('--aim-dur-spring') + 80);
    }
    // `rail`, `rects` and `ms` are read at the moment of the change, as the mockup's are.
  }, [want]);

  // The glide: each mover from where it was to where it now is, by identity (`data-fl`), never by position.
  useLayoutEffect(() => {
    const f = flipFrom.current;
    if (!f) return;
    flipFrom.current = null;
    el.current?.querySelectorAll<HTMLElement>('[data-fl]').forEach((x) => {
      x.getAnimations?.().forEach((a) => a.cancel());
      const a = x.dataset.fl ? f.before[x.dataset.fl] : undefined;
      const b = x.getBoundingClientRect();
      if (!a || !a.width || !b.width) return;
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      if (!dx && !dy) return;
      try {
        x.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: ms(f.dur), easing: curve('--aim-ease') });
      } catch {
        /* no Web Animations: the layout is already right */
      }
    });
  }, [rail]);

  useEffect(
    () => () => {
      clearTimeout(t1.current);
      clearTimeout(t2.current);
    },
    [],
  );

  const layout: SidebarMode = drawer ? 'drawer' : rail ? 'rail' : 'full';
  const toggle = () => {
    byHand.current = true;
    onToggleRail();
  };

  return (
    <aside
      ref={el}
      aria-label="Primary"
      className={s.sidebar}
      data-mode={layout}
      data-narrow={narrow && !drawer ? 'true' : undefined}
      data-anim={anim ?? undefined}
    >
      <div className={s.top}>
        <AcademyLogo short={narrow && !drawer} />
        {drawer ? (
          <>
            <span className={s.spacer} />
            <button ref={closeRef} type="button" className={s.iconButton} aria-label="Close menu" onClick={onClose}>
              <Icon name="r2X" size={20} strokeWidth={1.75} />
            </button>
          </>
        ) : null}
      </div>

      <Menu
        label="Cohorts"
        placement="below-left"
        className={s.switchMenu}
        items={cohort.choices.map((c) => ({ label: c.label, checked: c.current, onSelect: () => cohort.pick(c.id) }))}
        trigger={(t) => (
          <button
            type="button"
            className={s.switcher}
            aria-label={`Switch cohort. ${data.program}, ${cohort.label}`}
            title={rail ? switcherName : undefined}
            onClick={t.toggle}
            {...t.props}
          >
            <img className={s.tile} data-fl="tile" src={tileSrc(data)} width={32} height={32} alt="" />
            {rail ? null : (
              <>
                <span className={s.switcherText}>
                  <span className={`${s.program} ${s.ellipsis}`}>{data.program}</span>
                  <span className={`${s.cohort} ${s.ellipsis}`}>{cohort.label}</span>
                </span>
                <span className={s.muted}>
                  <Icon name="r2Updown" size={14} strokeWidth={1.75} />
                </span>
              </>
            )}
          </button>
        )}
      />

      <nav className={s.nav} aria-label="Admin">
        {entries.map((g) =>
          g.kind === 'page' ? (
            rail ? (
              // D-253: a single row in the rail is one icon that opens its page, with no fly-out.
              <button
                key={g.label}
                type="button"
                className={s.row}
                data-on={g.active ? 'true' : undefined}
                title={g.label}
                aria-label={g.label}
                aria-current={g.active ? 'page' : undefined}
                onClick={() => go(g.to)}
              >
                <span className={s.fl} data-fl={g.label}>
                  <Icon name={g.icon} size={16} strokeWidth={1.75} />
                </span>
              </button>
            ) : (
              // D-253: a single row (`.gx.solo`): it opens its page; what waits on it is beside its name.
              <button
                key={g.label}
                type="button"
                className={s.group}
                data-solo="true"
                data-has={g.active ? 'true' : undefined}
                aria-current={g.active ? 'page' : undefined}
                onClick={() => go(g.to)}
              >
                <span className={s.fl} data-fl={g.label}>
                  <Icon name={g.icon} size={16} strokeWidth={1.75} />
                </span>
                <span className={s.groupName}>{g.label}</span>
                {g.roll ? (
                  <span className={s.roll} data-draft={g.roll.draft ? 'true' : undefined}>
                    {g.roll.text}
                  </span>
                ) : null}
              </button>
            )
          ) : rail ? (
            <Menu
              key={g.label}
              label={g.label}
              placement="right"
              className={s.railMenu}
              items={g.rows.map((r) => ({ label: r.label, icon: r.icon, checked: r.active, onSelect: () => go(r.to) }))}
              trigger={(t) => (
                <button
                  type="button"
                  className={s.row}
                  data-on={g.active ? 'true' : undefined}
                  title={g.label}
                  aria-label={`${g.label} menu`}
                  onClick={t.toggle}
                  {...t.props}
                >
                  <span className={s.fl} data-fl={g.label}>
                    <Icon name={g.icon} size={16} strokeWidth={1.75} />
                  </span>
                </button>
              )}
            />
          ) : (
            <div key={g.label} className={g.sep ? s.sep : undefined}>
              <button
                type="button"
                className={s.group}
                data-has={g.active ? 'true' : undefined}
                data-open={g.open ? 'true' : undefined}
                aria-expanded={g.open}
                onClick={() => onPeek(peekAfterClick(g.label, g.open))}
              >
                <span className={s.fl} data-fl={g.label}>
                  <Icon name={g.icon} size={16} strokeWidth={1.75} />
                </span>
                <span className={s.groupName}>{g.label}</span>
                {g.roll ? (
                  <span className={s.roll} data-alert={g.roll.alert ? 'true' : undefined}>
                    {g.roll.text}
                  </span>
                ) : null}
                <span className={s.chev}>
                  <Icon name="r2Chev" size={12} strokeWidth={2.2} />
                </span>
              </button>
              <div className={s.pages} data-open={g.open ? 'true' : undefined}>
                <div className={s.pagesIn}>
                  <div className={s.kids}>
                    {g.rows.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        tabIndex={g.open ? 0 : -1}
                        className={s.page}
                        data-on={r.active ? 'true' : undefined}
                        aria-current={r.active ? 'page' : undefined}
                        onClick={() => go(r.to)}
                      >
                        <span className={s.pageName}>{r.label}</span>
                        {r.badge ? (
                          <span className={s.count} data-alert={r.alert ? 'true' : undefined}>
                            {r.badge}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ),
        )}
      </nav>

      <div className={s.footer}>
        {drawer ? null : (
          <button
            type="button"
            className={s.row}
            title={rail ? 'Expand sidebar' : undefined}
            aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggle}
          >
            <span className={s.fl} data-fl="panel">
              <Icon name="r2Panel" size={16} strokeWidth={1.75} />
            </span>
            {rail ? null : <span className={s.toggleLabel}>Collapse sidebar</span>}
          </button>
        )}
        <button
          type="button"
          className={s.user}
          title={rail ? `${data.viewer.name} · ${data.viewer.role}` : undefined}
          aria-label={`${data.viewer.name}, ${data.viewer.role}. Profile and settings`}
          aria-haspopup="dialog"
          aria-expanded={profileOpen}
          onClick={onProfile}
        >
          <span className={s.avatar} data-fl="av">
            {initials(data.viewer.name)}
          </span>
          {rail ? null : (
            <span className={s.who}>
              <span className={s.name}>{data.viewer.name}</span>
              <span className={s.role}>{data.viewer.role}</span>
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
