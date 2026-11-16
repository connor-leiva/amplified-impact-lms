import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Fragment } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import type { AdminStatus, SeatBar } from '@ai/core';
import { Icon } from '../Icon';
import { Button, ButtonLink } from './Button';
import { Empty } from './Empty';
import k from './kit.module.css';

// The R2 kit's small pieces (D-160 R2-1c), each the mockup's own (AdminRedesign.jsx): the page head
// (`Head`), `Pill`, `Bar`, the avatar, `Two`, `Facts`, `KV`, `Tabs`, the fields (`Find`, `Sel`, a
// textarea), the staff note and the timeline. `k` is the kit's stylesheet, for a screen's own layout.

export { k };

/** `Head`: an optional way back, the h1 with its status, the description, and the actions. */
export function PageHead({
  title,
  meta,
  description,
  right,
  back,
}: {
  title: string;
  meta?: ReactNode;
  description?: string;
  right?: ReactNode;
  back?: { to: string; label: string };
}) {
  return (
    <div className={clsx(k.col, k.colM)}>
      {back ? (
        <ButtonLink kind="quiet" to={back.to} className={k.back} icon="r2Back">
          {back.label}
        </ButtonLink>
      ) : null}
      <div className={k.hd}>
        <div className={clsx(k.col, k.colS, k.hdText)}>
          <div className={k.row} style={{ gap: 10 }}>
            <h1 className={k.h1}>{title}</h1>
            {meta}
          </div>
          {description ? <p className={clsx(k.p, k.s2, k.desc)}>{description}</p> : null}
        </div>
        {right ? <div className={k.row}>{right}</div> : null}
      </div>
    </div>
  );
}

const PILL_TONE: Record<AdminStatus['tone'], string | undefined> = {
  ok: k.ok,
  info: k.info,
  run: k.info,
  bad: k.bad,
  warn: k.warn,
  off: undefined,
  neutral: undefined,
};

/** `Pill`: a soft status pill (`.pl`), its tone the status's (running reads as info, off as neutral). */
export function Pill({
  status,
  tone,
  children,
}: {
  status?: AdminStatus;
  tone?: AdminStatus['tone'];
  children?: ReactNode;
}) {
  return <span className={clsx(k.pl, PILL_TONE[tone ?? status?.tone ?? 'neutral'])}>{children ?? status?.label}</span>;
}

/**
 * `Bar`: 6px, green; amber when nearly full; grey when a fixed-seat plan is full. Never red. `pct2`
 * is a second, blue segment after the first (the Overview funnel's "In progress", R2-3).
 */
export function Bar({ pct, pct2, kind = 'ok' }: { pct: number; pct2?: number; kind?: SeatBar }) {
  return (
    <span className={clsx(k.bar, kind === 'hot' && k.hot, kind === 'full' && k.full)}>
      <i style={{ width: `${pct}%` }} />
      {pct2 !== undefined ? <i className={k.b2} style={{ width: `${pct2}%` }} /> : null}
    </span>
  );
}

/**
 * `Stat` (R2-3): a KPI tile, the label over the figure over a muted line, which `tone` colours. A tile
 * that goes somewhere is a link to it, drawn as the mockup's `button.stat`.
 */
export function Stat({
  label,
  value,
  sub,
  tone,
  to,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'ok' | 'warn' | 'bad' | null;
  to?: string | null;
}) {
  const body = (
    <>
      <span className={clsx(k.mu, k.stl)}>{label}</span>
      <span className={k.fig}>{value}</span>
      {sub ? (
        <span className={clsx(k.me, tone === 'ok' && k.toneOk, tone === 'warn' && k.toneWarn, tone === 'bad' && k.toneBad)}>{sub}</span>
      ) : null}
    </>
  );
  return to ? (
    <Link to={to} className={clsx(k.cd, k.stat, k.go)}>
      {body}
    </Link>
  ) : (
    <div className={clsx(k.cd, k.stat)}>{body}</div>
  );
}

/** `Skel` (R2-3): a card of shimmering lines while a screen loads (the mockup's `Gate` loading state). */
export function Skel({ lines = 5 }: { lines?: number }) {
  return (
    <div className={clsx(k.cd, k.skel)} role="status" aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={k.sk} style={{ width: `${88 - i * 12}%` }} />
      ))}
    </div>
  );
}

/**
 * `ErrorState` (R2-3b): the mockup's `ErrBox`, a list that didn't load, its words the Console's own
 * (`errorCopy`: "Too many requests." on a 429), and Retry.
 */
export function ErrorState({ copy, onRetry }: { copy: { title: string; body: string; retry: string }; onRetry: () => void }) {
  return (
    <Empty icon="r2Incidents" tone="bad" role="alert" title={copy.title} body={copy.body}>
      <Button icon="r2Refresh" className={k.retry} onClick={onRetry}>
        {copy.retry}
      </Button>
    </Empty>
  );
}

/**
 * `TapCheck` (R2-3a): a checkbox in a 44px target, for a phone. The box is drawn by a decorative
 * checkbox; the real control is a transparent one over the whole target (the table's phone pattern).
 */
export function TapCheck({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <span className={k.tapBox}>
      <input type="checkbox" className={k.chk} checked={checked} disabled={disabled} readOnly tabIndex={-1} aria-hidden="true" />
      <input type="checkbox" className={k.hit} aria-label={label} checked={checked} disabled={disabled} onChange={onChange} />
    </span>
  );
}

/**
 * `CheckCell` (R2-3b): a permission matrix's box and its word ("Yes", "No"), read-only (D11): every
 * box is disabled. A box fixed by product rules carries the lock and says so in its title and
 * accessible name. On a phone the word comes first ("Allowed", "Not allowed"), as the mockup's card.
 */
export function CheckCell({
  label,
  on,
  locked,
  word,
  phone,
}: {
  /** The box's accessible name: `{capability}, {role}`. */
  label: string;
  on: boolean;
  locked?: boolean;
  word: string;
  phone?: boolean;
}) {
  const box = (
    <input
      type="checkbox"
      className={k.chk}
      checked={on}
      disabled
      readOnly
      aria-label={locked ? `${label}. Fixed by product rules` : label}
    />
  );
  const group = locked ? (
    <span className={clsx(k.row, k.nw, k.mu, k.lockGroup)}>
      {box}
      <Icon name="r2Lock" size={14} strokeWidth={1.75} />
    </span>
  ) : (
    box
  );
  return phone ? (
    <span className={clsx(k.row, k.nw, k.check)} title={locked ? 'Fixed by product rules' : undefined}>
      {word}
      {group}
    </span>
  ) : (
    <span className={clsx(k.row, k.nw, k.check)} title={locked ? 'Fixed by product rules' : undefined}>
      {group}
      <span className={k.mu}>{word}</span>
    </span>
  );
}

export function Avatar({ initials }: { initials: string }) {
  return (
    <span className={k.av} aria-hidden="true">
      {initials}
    </span>
  );
}

/** "elena@northshoregroup.example" may break after the @ (the mockup's `brk`). */
export const breakAt = (s: string): ReactNode =>
  s.includes('@')
    ? s.split('@').map((p, i) => (
        <Fragment key={i}>
          {i > 0 ? (
            <>
              @<wbr />
            </>
          ) : null}
          {p}
        </Fragment>
      ))
    : s;

/** Hyphenated words stay whole when the line wraps ("Fair-Housing-checked"): the mockup's `nb` (R2-2). */
export const keepHyphens = (s: string): ReactNode =>
  s.includes('-')
    ? s.split(/(\S+-\S+)/).map((p, i) =>
        i % 2 ? (
          <span key={i} className={k.nowrap}>
            {p}
          </span>
        ) : (
          p
        ),
      )
    : s;

/** `Two`: a name over a muted second line. `to` makes the name a link. */
export function Two({ a, b, mono, to }: { a: string; b: string; mono?: boolean; to?: string }) {
  return (
    <div className={clsx(k.col, k.col0)}>
      {to ? (
        <Link to={to} className={clsx(k.w5, k.el, k.nm)}>
          {a}
        </Link>
      ) : (
        <span className={clsx(k.w5, k.el)}>{a}</span>
      )}
      <span className={clsx(k.me, k.el, mono && k.mo)}>{breakAt(b)}</span>
    </div>
  );
}

/** `Facts`: the key-facts strip. */
export function Facts({ items }: { items: readonly { label: string; value: ReactNode; wide?: boolean }[] }) {
  return (
    <div className={k.fx}>
      {items.map((f) => (
        <div key={f.label} className={f.wide ? k.fxw : undefined}>
          <span className={k.me}>{f.label}</span>
          <span className={clsx(k.w5, k.el)}>{f.value}</span>
        </div>
      ))}
    </div>
  );
}

/** `KV`: label and value pairs. `stacked` is the mockup's `.kvs .kv`: each label over its value (D-169). */
export function KV({ rows, stacked }: { rows: readonly { label: string; value: ReactNode }[]; stacked?: boolean }) {
  return (
    <dl className={clsx(k.kv, stacked && k.kvs)}>
      {rows.map((r) => (
        <Fragment key={r.label}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

export interface TabDef<T extends string> {
  id: T;
  label: string;
  count?: number;
}

/** `Tabs`: an underlined tab list; on a phone, one select (the mockup's "Section"). */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  phone,
  label,
}: {
  tabs: readonly TabDef<T>[];
  value: T;
  onChange: (v: T) => void;
  phone: boolean;
  label: string;
}) {
  if (phone)
    return (
      <select
        className={clsx(k.in, k.select, k.full)}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {tabs.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    );
  return (
    <div className={k.tabs} role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          className={clsx(k.tab, value === t.id && k.on)}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count !== undefined ? <span className={clsx(k.mu, k.count)}>{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** `Find`: the filter box with its search glyph. */
export function Find({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <span className={k.sin}>
      <Icon name="r2Search" size={16} strokeWidth={1.75} />
      <input
        className={k.in}
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </span>
  );
}

/** `Sel`: a select with the mockup's chevron. */
export function Sel({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(k.in, k.select, className)} {...rest} />;
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(k.in, k.area, className)} {...rest} />;
}

/** A staff note: who and when, then the words. */
export function Note({ who, when, body }: { who: string; when: string; body: string }) {
  return (
    <div className={clsx(k.note, k.col, k.colS)}>
      <span>
        <span className={k.w5}>{who}</span> <span className={k.me}>· {when}</span>
      </span>
      <p className={clsx(k.p, k.s2)}>{body}</p>
    </div>
  );
}

/** The activity timeline (`.tl`). */
export function Timeline({ items }: { items: readonly { key: string; text: string; when: string }[] }) {
  return (
    <>
      {items.map((a) => (
        <div key={a.key} className={k.tl}>
          <div>{a.text}</div>
          <div className={clsx(k.me, k.mo)}>{a.when}</div>
        </div>
      ))}
    </>
  );
}

/** A lock and the reason a value can't change here (the mockup's Seat tier lines). */
export function Locked({ children }: { children: ReactNode }) {
  return (
    <span className={k.row} style={{ gap: 6 }}>
      <Icon name="r2Lock" size={16} strokeWidth={1.75} />
      {children}
    </span>
  );
}
