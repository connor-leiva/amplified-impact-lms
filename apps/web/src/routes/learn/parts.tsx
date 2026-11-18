import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import type { IconName } from '@ai/core';
import type { ContentBlock } from '@ai/core/course-types';
import { Icon } from '../../components/Icon';
import { HUE } from './learn.vm';
import type { KitRowVM, Seg, SessionRowVM, Tone } from './learn.vm';
import { STEP } from './Step.vm';
import s from './Learn.module.css';

// The pieces the learner portal v2's pages share (D-177). Markup only: every string is the caller's
// view-model's.

const SIZE: Record<28 | 36 | 44 | 52, string> = { 28: s.t28!, 36: s.t36!, 44: s.t44!, 52: s.t52! };

export function Tile({ icon, tone, size }: { icon: IconName; tone: Tone; size: 28 | 36 | 44 | 52 }) {
  return (
    <span className={`${s.tile} ${SIZE[size]}`} data-hue={HUE[tone]} aria-hidden="true">
      <Icon name={icon} size={18} strokeWidth={size === 52 ? 1.7 : 1.8} />
    </span>
  );
}

/** `--n`, the count of a progress bar's segments, for the stylesheet's `repeat(var(--n), …)`. */
export const nStyle = (n: number): CSSProperties => ({ '--n': String(Math.max(1, n)) }) as CSSProperties;

export function Prog({ segs, aria, max }: { segs: Seg[]; aria?: string; max?: number }) {
  return (
    <div className={s.prog} role={aria ? 'img' : undefined} aria-label={aria} aria-hidden={aria ? undefined : true} style={{ ...nStyle(segs.length), ...(max ? { maxWidth: max } : {}) }}>
      {segs.map((x, i) => (
        <i key={i} data-s={x || undefined} />
      ))}
    </div>
  );
}

export function Mbar({ segs }: { segs: Seg[] }) {
  return (
    <span className={s.mbar} aria-hidden="true" style={nStyle(segs.length)}>
      {segs.map((x, i) => (
        <i key={i} data-s={x || undefined} />
      ))}
    </span>
  );
}

export function LiveDot() {
  return (
    <span className={s.st} aria-hidden="true">
      <i />
    </span>
  );
}

/** A link inside learn, or out of it (a guided setup on www, a file). */
export function Go({ href, className, children, label }: { href: string; className: string; children: ReactNode; label?: string }) {
  if (/^https?:\/\//.test(href) || href.startsWith('/api/') || href.startsWith('mailto:'))
    return (
      <a className={className} href={href} aria-label={label} {...(/^https?:\/\//.test(href) ? { target: '_blank', rel: 'noopener' } : {})}>
        {children}
      </a>
    );
  return (
    <Link className={className} to={href} aria-label={label}>
      {children}
    </Link>
  );
}

export function SessionRows({ rows, link }: { rows: SessionRowVM[]; link: string | null }) {
  return (
    <>
      {rows.map((r) => {
        const body = (
          <>
            <span className={s.dt}>
              <span className={s.dw}>{r.tile.dw}</span>
              <span className={s.dd}>{r.tile.dd}</span>
            </span>
            <div className={`${s.colZ} ${s.grow}`}>
              <span className={s.w5}>{r.title}</span>
              <span className={s.me}>{r.meta}</span>
            </div>
            {link ? (
              <span className={s.mu}>
                <Icon name="r2Chev" size={14} strokeWidth={1.75} />
              </span>
            ) : null}
          </>
        );
        return link ? (
          <Link key={r.id} className={s.li} to={link}>
            {body}
          </Link>
        ) : (
          <div key={r.id} className={s.li} style={{ gap: 12 }}>
            {body}
          </div>
        );
      })}
    </>
  );
}

export function KitRows({ rows }: { rows: KitRowVM[] }) {
  return (
    <>
      {rows.map((r) => {
        const body = (
          <>
            <Tile icon={r.icon} tone="forest" size={28} />
            <div className={`${s.colZ} ${s.grow}`}>
              <span className={s.w5}>{r.title}</span>
              <span className={s.me}>{r.meta}</span>
              {r.tags?.length ? (
                <span className={s.tags}>
                  {r.tags.map((t) => (
                    <span key={t.label} className={s.pl} data-tone={t.tone}>
                      {t.label}
                    </span>
                  ))}
                </span>
              ) : null}
            </div>
            {r.href ? (
              <span className={s.mu}>
                <Icon name="r2Chev" size={14} strokeWidth={1.75} />
              </span>
            ) : null}
          </>
        );
        return r.href ? (
          <Go key={r.key} className={s.li!} href={r.href}>
            {body}
          </Go>
        ) : (
          <div key={r.key} className={s.li}>
            {body}
          </div>
        );
      })}
    </>
  );
}

/** A copy block: the text, and a button that puts it on the clipboard. */
export function CopyBlock({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const long = text.length > 80 || text.includes('\n');
  return (
    <div className={`${s.cpy} ${long ? s.cpyLong : ''}`}>
      <code>{text}</code>
      <button
        type="button"
        className={s.b}
        aria-label={label ? `${STEP.copy}: ${label}` : STEP.copy}
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(
            () => {
              setCopied(true);
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => setCopied(false), 2000);
            },
            () => undefined,
          );
        }}
      >
        <Icon name={copied ? 'r2Check' : 'lvCopy'} size={14} strokeWidth={1.75} />
        <span aria-live="polite">{copied ? STEP.copied : STEP.copy}</span>
      </button>
    </div>
  );
}

/** A table's columns, each as wide as its longest cell asks (within limits), as `fr` shares. */
export function columnTemplate(head: readonly string[] | undefined, rows: readonly (readonly string[])[], cols: number): string {
  const widths = Array.from({ length: cols }, (_, c) => Math.min(40, Math.max(3, ...[head?.[c] ?? '', ...rows.map((r) => r[c] ?? '')].map((x) => x.length))));
  return widths.map((w) => `minmax(0, ${w}fr)`).join(' ');
}

/**
 * A step's path, block by block: a list's items as numbered steps, a paragraph, a copy block with its
 * button, and a table (its first column as the row's name, as the mockup's "where it goes" table).
 */
export function Blocks({ blocks }: { blocks: ContentBlock[] }) {
  let n = 0;
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === 'list')
          return b.items.map((item, j) => {
            n += 1;
            return (
              <div key={`${i}:${j}`} className={s.ss}>
                <span className={s.ssn} aria-hidden="true">
                  {n}
                </span>
                <div className={s.ssb}>
                  <span className={`${s.w5} ${s.sst}`}>{item}</span>
                </div>
              </div>
            );
          });
        if (b.type === 'text')
          return (
            <div key={i} className={s.blk}>
              <p className={`${s.p} ${s.s2}`}>{b.text}</p>
            </div>
          );
        if (b.type === 'copy')
          return (
            <div key={i} className={s.blk}>
              {b.label ? <span className={s.w5}>{b.label}</span> : null}
              <CopyBlock text={b.text} label={b.label} />
            </div>
          );
        const cols = Math.max(b.head?.length ?? 0, ...b.rows.map((r) => r.length));
        const rowClass = `${s.wrr} ${cols === 2 ? s.wrr2 : ''}`;
        // Wider columns for longer words, the same on every row so the columns line up.
        const grid = cols > 2 ? ({ '--cols': columnTemplate(b.head, b.rows, cols) } as CSSProperties) : undefined;
        return (
          <div key={i} className={s.blk}>
            <div className={s.where} role="table" style={nStyle(cols)}>
              {b.head ? (
                <div className={`${rowClass} ${s.wh}`} role="row" style={grid}>
                  {b.head.map((h, k) => (
                    <span key={k} role="columnheader">
                      {h}
                    </span>
                  ))}
                </div>
              ) : null}
              {b.rows.map((r, k) => (
                <div key={k} className={rowClass} role="row" style={grid}>
                  {r.map((c, m) => (
                    <span key={m} role="cell" className={m === 0 ? s.w5 : s.s2} data-h={m > 0 ? b.head?.[m] : undefined}>
                      {c}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
