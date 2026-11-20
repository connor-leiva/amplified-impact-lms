'use client';
/* ==========================================================================
   Amplified Impact Motion · ai-motion.tsx · v1
   Tiny hooks and thin components for ai-motion.css. React 18+, nothing else.
   The CSS does the moving. This file sets state attributes, keeps things
   mounted while they leave, counts numbers and looks after focus.
   ========================================================================== */
import * as React from 'react';

/** Inline style that also takes custom properties, e.g. { '--i': 2 }. */
export type MotionStyle = React.CSSProperties & Record<`--${string}`, string | number>;

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

const useIsoLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

/* ---------- Reduced motion ------------------------------------------------ */

const REDUCE = '(prefers-reduced-motion: reduce)';

/** True when the OS asks for less motion, or `el` (default: the page) sits inside `.aim-reduced`. */
export function isReducedMotion(el?: Element | null): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia(REDUCE).matches) return true;
  const node = el ?? document.body;
  return Boolean(node && node.closest('.aim-reduced'));
}

/** Re-renders when the OS setting changes. Use it for motion you drive from JavaScript. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(REDUCE);
    const update = () => setReduced(isReducedMotion());
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/* ---------- Presence: stay mounted while leaving ------------------------- */

export type Presence = 'open' | 'closing';

/** Keeps an element mounted for `exitMs` after `open` turns false, so its exit can play.
 *  Render while `mounted`; put `state` on data-state. */
export function usePresence(open: boolean, exitMs = 200): { mounted: boolean; state: Presence } {
  const [mounted, setMounted] = React.useState(open);
  React.useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const t = window.setTimeout(() => setMounted(false), isReducedMotion() ? 0 : exitMs);
    return () => window.clearTimeout(t);
  }, [open, mounted, exitMs]);
  return { mounted: open || mounted, state: open ? 'open' : 'closing' };
}

/* ---------- The brand curve, and numbers that ride it ---------------------- */

/** cubic-bezier(x1, y1, x2, y2) as a function of progress 0–1. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx1 = 3 * x1, bx = 3 * (x2 - x1) - cx1, ax = 1 - cx1 - bx;
  const cy1 = 3 * y1, by = 3 * (y2 - y1) - cy1, ay = 1 - cy1 - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx1) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy1) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx1;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-5) break;
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= err / slope;
    }
    return sampleY(Math.min(1, Math.max(0, t)));
  };
}

/** The system's curve, cubic-bezier(.2, .7, .2, 1). */
export const easeBrand = cubicBezier(0.2, 0.7, 0.2, 1);

/** Counts from the last shown value to `value` on the brand curve, in step with a filling bar.
 *  Returns a float: round it when you render. */
export function useCountUp(value: number, durationMs = 720): number {
  const [shown, setShown] = React.useState(value);
  const current = React.useRef(value);
  React.useEffect(() => {
    const from = current.current;
    if (from === value || isReducedMotion()) {
      current.current = value;
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const next = from + (value - from) * easeBrand(p);
      current.current = next;
      setShown(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);
  return shown;
}

/* ---------- Timer: pausable, for toasts ------------------------------------ */

/** Calls `onDone` after `ms` while `running`. Hover and focus call pause and resume. */
export function useTimer(ms: number, onDone: () => void, running = true): { pause: () => void; resume: () => void } {
  const done = React.useRef(onDone);
  useIsoLayoutEffect(() => {
    done.current = onDone;
  });
  const left = React.useRef(ms);
  const since = React.useRef(0);
  const id = React.useRef<number | null>(null);
  const live = React.useRef(false);

  const pause = React.useCallback(() => {
    if (id.current === null) return;
    window.clearTimeout(id.current);
    id.current = null;
    left.current -= performance.now() - since.current;
  }, []);

  const resume = React.useCallback(() => {
    if (!live.current || id.current !== null) return;
    since.current = performance.now();
    id.current = window.setTimeout(() => {
      id.current = null;
      live.current = false;
      done.current();
    }, Math.max(0, left.current));
  }, []);

  React.useEffect(() => {
    if (!running) return;
    left.current = ms;
    live.current = true;
    resume();
    return () => {
      live.current = false;
      if (id.current !== null) window.clearTimeout(id.current);
      id.current = null;
    };
  }, [ms, running, resume]);

  return { pause, resume };
}

/* ---------- Restart a CSS animation ---------------------------------------- */

/** Plays an element's CSS animation again, such as the shake on a second failed submit. */
export function restartAnimation(el: Element | null): void {
  if (!(el instanceof HTMLElement)) return;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}

/* ---------- Marker: the hairline that springs to the active item ----------- */

/** Measures the element with aria-current="page" inside `listRef`, for .aim-nav__marker. */
export function useMarker(listRef: React.RefObject<HTMLElement | null>, activeKey: unknown): MotionStyle {
  const [style, setStyle] = React.useState<MotionStyle>({});
  useIsoLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const item = list.querySelector<HTMLElement>('[aria-current="page"]');
      if (!item) return;
      const outer = list.getBoundingClientRect();
      const inner = item.getBoundingClientRect();
      setStyle({ '--aim-y': `${inner.top - outer.top + list.scrollTop}px`, '--aim-h': `${inner.height}px` });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [listRef, activeKey]);
  return style;
}

/* ---------- Building blocks ------------------------------------------------ */

/** The label twice, for .aim-roll. The copy is hidden from screen readers. */
export function RollLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="aim-roll">
      <span>{children}</span>
      <span aria-hidden="true">{children}</span>
    </span>
  );
}

/** The dot inside a ring. `play` lands the dot and draws the ring when it mounts;
 *  `wave` adds the single ring that travels out (module complete). */
export function SignalMark({ size = 22, play = false, wave = false, className }: {
  size?: number;
  play?: boolean;
  wave?: boolean;
  className?: string;
}) {
  return (
    <svg className={cx('aim-mark', play && 'aim-mark--play', className)} width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" focusable="false">
      {wave ? <circle className="aim-mark__wave" cx="11" cy="11" r="9.5" /> : null}
      <circle className="aim-mark__ring" cx="11" cy="11" r="9.5" pathLength={1} />
      <circle className="aim-mark__dot" cx="11" cy="11" r="4" />
    </svg>
  );
}

/** The hairline sweep, the one loader. It takes the text color. */
export function HairlineSweep({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={cx('aim-sweep', className)} style={style} aria-hidden="true" />;
}

/* ---------- 03 · Async button ---------------------------------------------- */

export type AsyncState = 'idle' | 'busy' | 'done' | 'error';

export interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  state: AsyncState;
  /** Shown beside the mark when the work is done, e.g. "Signed In". */
  doneLabel?: React.ReactNode;
  size?: 'lg' | 'md' | 'sm';
  fullWidth?: boolean;
}

export function AsyncButton({ state, doneLabel = 'Done', size = 'md', fullWidth, className, children, onClick, ...rest }: AsyncButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (state === 'error') restartAnimation(ref.current);
  }, [state]);
  const busy = state === 'busy';
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={cx('aiw-btn aiw-btn--primary aim-press aim-async', `aiw-btn--${size}`, fullWidth && 'aiw-btn--full', className)}
      data-state={state}
      aria-busy={busy || undefined}
      onClick={busy || state === 'done' ? (e) => e.preventDefault() : onClick}
    >
      <span className="aim-async__label" aria-hidden={state === 'done' || undefined}>
        <RollLabel>{children}</RollLabel>
      </span>
      <HairlineSweep />
      <span className="aim-async__done" aria-hidden={state !== 'done' || undefined}>
        <SignalMark />
        {doneLabel}
      </span>
    </button>
  );
}

/* ---------- 04 · Header loader --------------------------------------------- */

/** The page loader on the header's hairline. Put it inside the header.
 *  Leave `progress` undefined to sweep, pass 0–1 to fill. When `active` turns false it fills and fades. */
export function HeaderLoader({ active, progress }: { active: boolean; progress?: number }) {
  const { mounted, state } = usePresence(active, 640);
  if (!mounted) return null;
  const done = state === 'closing';
  const known = typeof progress === 'number';
  return (
    <span className="aim-bar" data-state={done ? 'done' : known ? 'fill' : 'sweep'} aria-hidden="true">
      {known || done ? (
        <span className="aim-bar__fill" style={{ '--aim-progress': progress ?? 0 } as MotionStyle} />
      ) : (
        <HairlineSweep />
      )}
    </span>
  );
}

/* ---------- 05 · Drawer ---------------------------------------------------- */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name, e.g. "Lesson outline". */
  label: string;
  children: React.ReactNode;
  className?: string;
}

/** A side panel that springs in from the right. Escape and the scrim close it; focus stays inside
 *  while it's open and goes back where it was when it closes. Mark content blocks with
 *  className="aim-in" and style={{ '--i': n }} so they arrive in order. */
export function Drawer({ open, onClose, label, children, className }: DrawerProps) {
  const { mounted, state } = usePresence(open, 200);
  const panel = React.useRef<HTMLElement>(null);
  const close = React.useRef(onClose);
  useIsoLayoutEffect(() => {
    close.current = onClose;
  });

  React.useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close.current();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      before?.focus?.();
    };
  }, [open]);

  if (!mounted) return null;
  return (
    <div className={cx('aim-drawer', className)} data-state={state}>
      <div className="aim-drawer__scrim" onClick={() => close.current()} />
      <aside ref={panel} className="aim-drawer__panel" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        {children}
      </aside>
    </div>
  );
}

/* ---------- 06 · Toast ----------------------------------------------------- */

/** Holds toasts in the bottom-right corner and announces them politely. Render it once. */
export function ToastRegion({ children }: { children?: React.ReactNode }) {
  return (
    <div className="aim-toasts" aria-live="polite">
      {children}
    </div>
  );
}

export interface ToastProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  meta?: React.ReactNode;
  /** A quiet action, such as an Undo text link. */
  action?: React.ReactNode;
  /** How long it stays, in ms. Hover and focus pause it. */
  duration?: number;
}

export function Toast({ open, onClose, title, meta, action, duration = 5000 }: ToastProps) {
  const { mounted, state } = usePresence(open, 200);
  const timer = useTimer(duration, onClose, open);
  if (!mounted) return null;
  return (
    <div
      className="aim-toast"
      data-state={state}
      style={{ '--aim-toast-ms': `${duration}ms` } as MotionStyle}
      onMouseEnter={timer.pause}
      onMouseLeave={timer.resume}
      onFocus={timer.pause}
      onBlur={timer.resume}
    >
      <SignalMark />
      <div className="aim-toast__text">
        <p className="aim-toast__title">{title}</p>
        {meta ? <p className="aim-toast__meta">{meta}</p> : null}
      </div>
      {action}
      <span className="aim-toast__timer" aria-hidden="true" />
    </div>
  );
}

/* ---------- 07 · Text field ------------------------------------------------ */

export interface MotionFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
  hint?: React.ReactNode;
  /** Replaces the hint, darkens the border and shakes the field. */
  error?: React.ReactNode;
  /** Draws a check. Pass text to show a confirmation in place of the hint. */
  valid?: boolean | React.ReactNode;
  /** Bump on every submit so a repeated error shakes again. */
  attempt?: number;
}

/** The system's TextField markup with focus, error and valid motion. */
export function MotionField({ label, hint, error, valid, attempt = 0, id, className, ...input }: MotionFieldProps) {
  const autoId = React.useId();
  const fieldId = id ?? autoId;
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (error && attempt) restartAnimation(ref.current);
  }, [error, attempt]);
  const state = error ? 'error' : valid ? 'valid' : undefined;
  const message = error ?? (valid && valid !== true ? valid : hint);
  const msgId = `${fieldId}-msg`;
  return (
    <div className={cx('aiw-field aim-field', error ? 'aiw-field--error' : null, className)} data-state={state}>
      <label className="aiw-field__label" htmlFor={fieldId}>{label}</label>
      <div className="aim-field__box">
        <input
          ref={ref}
          id={fieldId}
          type="text"
          className="aiw-field__input"
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? msgId : undefined}
          {...input}
        />
        <svg className="aim-field__check" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
          <path d="M4 9.5l3.2 3.2L14 6" pathLength={1} />
        </svg>
      </div>
      {message ? (
        <p
          key={state ?? 'hint'}
          id={msgId}
          className={cx('aiw-field__msg', error ? 'aiw-field__msg--error' : null, state === 'valid' && valid !== true ? 'aim-field__msg--valid' : null)}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- 08 · Splash ---------------------------------------------------- */

/** The Academy splash. Pass the Wordmark (or Monogram) as children: it plays the system's logo
 *  intro, holds, then lifts away. Render what comes next (with .aim-rise) once onDone fires. */
export function Splash({ children, holdMs = 300, onDone }: { children: React.ReactNode; holdMs?: number; onDone?: () => void }) {
  const [state, setState] = React.useState<Presence | 'gone'>('open');
  const finish = React.useRef(onDone);
  useIsoLayoutEffect(() => {
    finish.current = onDone;
  });
  React.useEffect(() => {
    const quick = isReducedMotion();
    const leaveAt = quick ? 0 : 900 + holdMs;
    const goneAt = quick ? 0 : leaveAt + 380;
    const a = window.setTimeout(() => setState('closing'), leaveAt);
    const b = window.setTimeout(() => {
      setState('gone');
      finish.current?.();
    }, goneAt);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [holdMs]);
  if (state === 'gone') return null;
  return (
    <div className="aim-splash" data-state={state}>
      <div className="aim-intro">{children}</div>
    </div>
  );
}

/* ---------- 09 · Skeleton -------------------------------------------------- */

export function Skeleton({ variant, style }: { variant?: 'title' | 'figure' | 'short' | 'block'; style?: React.CSSProperties }) {
  return <span className={cx('aim-skel', variant && `aim-skel--${variant}`)} style={style} aria-hidden="true" />;
}

/* ---------- 10 · Sidebar nav ----------------------------------------------- */

export interface NavItem {
  key: string;
  label: string;
  href?: string;
  /** Render the system's Icon; `active` paints its dot signal. */
  icon: (active: boolean) => React.ReactNode;
}

export function SideNav({ items, current, onSelect, label = 'Academy' }: {
  items: NavItem[];
  current: string;
  onSelect?: (key: string) => void;
  label?: string;
}) {
  const ref = React.useRef<HTMLElement>(null);
  const marker = useMarker(ref, current);
  return (
    <nav ref={ref} className="aim-nav" aria-label={label}>
      <ul className="aim-nav__list">
        {items.map((item) => {
          const active = item.key === current;
          return (
            <li key={item.key}>
              <a
                href={item.href ?? '#'}
                className="aim-nav__link"
                aria-current={active ? 'page' : undefined}
                onClick={onSelect ? (e) => { e.preventDefault(); onSelect(item.key); } : undefined}
              >
                {item.icon(active)}
                <span className="aim-nav__label">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <span className="aim-nav__marker" style={marker} aria-hidden="true" />
    </nav>
  );
}

/* ---------- 11 · Lesson checkbox ------------------------------------------- */

export function LessonCheck({ title, minutes, checked, onChange }: {
  title: React.ReactNode;
  minutes: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = React.useId();
  return (
    <label className="aim-lesson" htmlFor={id}>
      <span className="aim-check">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <svg viewBox="0 0 22 22" aria-hidden="true" focusable="false">
          <path d="M6.5 11.5l3 3 6-6.5" pathLength={1} />
        </svg>
      </span>
      <span className="aim-lesson__title">{title}</span>
      <span className="aim-lesson__status" aria-hidden="true">
        <span className="aim-lesson__dot" />
        <span className="aim-roll">
          <span>{minutes} min</span>
          <span>Done</span>
        </span>
      </span>
    </label>
  );
}

/* ---------- 12 · Progress -------------------------------------------------- */

export function ModuleProgress({ label, done, total }: { label: React.ReactNode; done: number; total: number }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  const shownPct = useCountUp(pct);
  const shownDone = useCountUp(done);
  return (
    <div className="aim-progress">
      <div className="aim-progress__head">
        <span className="aim-progress__label">{label}</span>
        <span className="aim-progress__num">{Math.round(shownPct)}%</span>
      </div>
      <div className="aim-progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <span className="aim-progress__fill" style={{ '--aim-value': pct / 100 } as MotionStyle} />
      </div>
      <span className="aim-progress__num">{Math.round(shownDone)} of {total} lessons</span>
    </div>
  );
}

/** One segment per week; `weeks` holds each week's progress, 0–1. */
export function WeekTrack({ weeks }: { weeks: number[] }) {
  return (
    <div className="aim-weeks" style={{ '--aim-weeks': weeks.length } as MotionStyle} aria-hidden="true">
      {weeks.map((value, i) => (
        <span key={i} style={{ '--aim-value': value } as MotionStyle} />
      ))}
    </div>
  );
}

/* ---------- 13 · Completion ------------------------------------------------ */

/** Module complete: the mark lands and sends one ring out, then the words rise in. */
export function ModuleComplete({ children }: { children: React.ReactNode }) {
  return (
    <div className="aim-complete">
      <SignalMark size={44} wave />
      <div className="aim-rise" style={{ '--i': 6 } as MotionStyle}>
        {children}
      </div>
    </div>
  );
}

/* ---------- 14 · Notification bell ----------------------------------------- */

/** Where the notifications icon's dot sits in its 24-unit box. */
const BELL_DOT = { cx: 18, cy: 6, r: 2.6 };

/** Pass the system's Icon as children: <Icon name="notifications" active={unread} />.
 *  When `unread` turns true the dot lands and one ring goes out, once. */
export function NotificationBell({ unread, onClick, children, size = 24 }: {
  unread: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <button type="button" className="aim-bell aim-press" data-new={unread || undefined} aria-label={unread ? 'Notifications, new' : 'Notifications'} onClick={onClick}>
      {children}
      <svg className="aim-bell__fx" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle className="aim-bell__wave" cx={BELL_DOT.cx} cy={BELL_DOT.cy} r={BELL_DOT.r} />
      </svg>
    </button>
  );
}

/** A panel that unfolds from its trigger (the notifications list). */
export function Popover({ open, children, className, label }: { open: boolean; children: React.ReactNode; className?: string; label: string }) {
  const { mounted, state } = usePresence(open, 200);
  if (!mounted) return null;
  return (
    <div className={cx('aim-pop', className)} data-state={state} role="region" aria-label={label}>
      {children}
    </div>
  );
}

/* ---------- 15 · AI Employee run ------------------------------------------- */

/** A Geist Mono status that rolls to each step, with a caret and the hairline sweep.
 *  When `done`, the sweep gives way to the mark and `doneLabel`. */
export function AiRun({ steps, step, done, doneLabel }: { steps: string[]; step: number; done: boolean; doneLabel: string }) {
  const text = done ? doneLabel : steps[Math.min(step, steps.length - 1)] ?? '';
  return (
    <div className="aim-run" data-state={done ? 'done' : 'busy'}>
      <p className="aim-status" data-state={done ? 'done' : 'busy'} role="status">
        {done ? <SignalMark size={18} play /> : null}
        <span className="aim-status__line">
          <span key={done ? 'done' : step}>{text}</span>
        </span>
        <span className="aim-status__caret" aria-hidden="true" />
      </p>
      <HairlineSweep />
    </div>
  );
}

/* ---------- 16 · Upload ---------------------------------------------------- */

/** Drag state and handlers for a drop zone: spread `props` on the .aim-drop element. */
export function useDropZone(onFiles: (files: File[]) => void) {
  const [drag, setDrag] = React.useState(false);
  const depth = React.useRef(0);
  const handle = React.useRef(onFiles);
  useIsoLayoutEffect(() => {
    handle.current = onFiles;
  });
  const props = {
    'data-drag': drag || undefined,
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      depth.current += 1;
      setDrag(true);
    },
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDragLeave: () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDrag(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      depth.current = 0;
      setDrag(false);
      handle.current(Array.from(e.dataTransfer.files));
    },
  };
  return { drag, props };
}

export function FileRow({ name, size, progress, index = 0 }: { name: string; size: string; progress: number; index?: number }) {
  const done = progress >= 1;
  const shown = useCountUp(progress * 100, 300);
  return (
    <div className="aim-file" data-state={done ? 'done' : 'busy'} style={{ '--i': index, '--aim-value': progress } as MotionStyle}>
      <span className="aim-file__name">{name} · {size}</span>
      <span className="aim-file__state">
        {done ? (
          <>
            <svg className="aim-file__check" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M3.5 8.5l2.8 2.8L12.5 5" pathLength={1} />
            </svg>
            Uploaded
          </>
        ) : (
          `${Math.round(shown)}%`
        )}
      </span>
      <span className="aim-file__bar" aria-hidden="true" />
    </div>
  );
}
