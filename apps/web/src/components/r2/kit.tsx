import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Fragment } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import type { AdminStatus, SeatBar } from '@ai/core';
import { Icon } from '../Icon';
import { ButtonLink } from './Button';
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

/** `Bar`: 6px, green; amber when nearly full; grey when a fixed-seat plan is full. Never red. */
export function Bar({ pct, kind = 'ok' }: { pct: number; kind?: SeatBar }) {
  return (
    <span className={clsx(k.bar, kind === 'hot' && k.hot, kind === 'full' && k.full)}>
      <i style={{ width: `${pct}%` }} />
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
export function Facts({ items }: { items: readonly { label: string; value: ReactNode }[] }) {
  return (
    <div className={k.fx}>
      {items.map((f) => (
        <div key={f.label}>
          <span className={k.me}>{f.label}</span>
          <span className={clsx(k.w5, k.el)}>{f.value}</span>
        </div>
      ))}
    </div>
  );
}

/** `KV`: label and value pairs. */
export function KV({ rows }: { rows: readonly { label: string; value: ReactNode }[] }) {
  return (
    <dl className={k.kv}>
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
