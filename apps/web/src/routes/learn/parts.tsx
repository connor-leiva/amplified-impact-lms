import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import type { IconName } from '@ai/core';
import type { PathBlock, VideoBlock } from '@ai/core/course-types';
import type { IcsEvent } from '@ai/core';
import { Icon } from '../../components/Icon';
import { calLinks } from '../../components/calendar-links';
import { useToaster } from '../../components/primitives/Toaster';
import { useJoin } from '../../data/join';
import { courseVideoUrl } from '../../data/files';
import { HlsEngine } from '../../components/replay/HlsEngine';
import { videoBlockSource } from '../../components/replay/source';
import { HUE, LABELS } from './learn.vm';
import type { JoinVM, KitRowVM, Seg, SessionRowVM, Tone } from './learn.vm';
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

/**
 * D-183: Join, through the join route inside its window (the current portal's `useJoin`); the fixture
 * build toasts "Opening Zoom", as the portal does.
 */
export function JoinBtn({ sessionId, title, label, className }: { sessionId: string; title: string; label: string; className: string }) {
  const join = useJoin();
  const { toast } = useToaster();
  return (
    <button type="button" className={className} onClick={() => void join(sessionId, () => toast(`Opening Zoom · ${title}`, 'info'))}>
      <Icon name="lvVideo" size={14} strokeWidth={1.75} />
      {label}
    </button>
  );
}

/** D-183: the live badge ("Live now", with the pulsing dot) or "Starting soon", always with its words. */
export function JoinBadge({ j }: { j: Pick<JoinVM, 'state' | 'badge'> }) {
  return (
    <span className={s.ost} data-tone={j.state === 'live' ? 'ok' : 'ip'}>
      {j.state === 'live' ? <LiveDot /> : <Icon name="lvLive" size={13} strokeWidth={1.75} />}
      {j.badge}
    </span>
  );
}

/**
 * D-183: a session to join now, as a card's strip: the badge, the session's title and time, and Join. The
 * Schedule draws one under the week a session belongs to; the week page draws one above its steps.
 */
export function JoinStrip({ j, compact = false }: { j: JoinVM; compact?: boolean }) {
  return (
    <div className={s.jst} data-state={j.state} role="group" aria-label={`${j.badge}: ${j.title}`}>
      <JoinBadge j={j} />
      <span className={`${s.colZ} ${s.grow}`}>
        <span className={s.w5}>{j.title}</span>
        <span className={s.me}>{j.meta}</span>
      </span>
      <JoinBtn sessionId={j.sessionId} title={j.title} label={compact ? LABELS.join : j.joinLabel} className={`${s.b} ${s.bp}`} />
    </div>
  );
}

/**
 * D-183: beside a one-event .ics download, the current portal's other two ways in: Google Calendar and
 * Outlook, each in a new tab, from the same builders (`components/calendar-links.ts`). Never a join link.
 */
export function CalLinks({ event, className }: { event: IcsEvent | undefined; className?: string }) {
  if (!event) return null;
  const links = calLinks({ title: event.title, start: event.start, end: event.end });
  return (
    <>
      <a className={`${s.b} ${s.bq} ${className ?? ''}`} href={links.google} target="_blank" rel="noopener">
        {LABELS.googleCalendar}
      </a>
      <a className={`${s.b} ${s.bq} ${className ?? ''}`} href={links.outlook} target="_blank" rel="noopener">
        {LABELS.outlook}
      </a>
    </>
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

/**
 * A table's columns, each as wide as its longest cell asks (within limits), as `fr` shares.
 * `floor` is the track's minimum (D-189): step tables use `7rem` so a narrow column cannot shrink
 * to nothing. Skill sample tables pass `0`, the floor they have always had.
 */
export function columnTemplate(head: readonly string[] | undefined, rows: readonly (readonly string[])[], cols: number, floor = '7rem'): string {
  const widths = Array.from({ length: cols }, (_, c) => Math.min(40, Math.max(3, ...[head?.[c] ?? '', ...rows.map((r) => r[c] ?? '')].map((x) => x.length))));
  return widths.map((w) => `minmax(${floor}, ${w}fr)`).join(' ');
}

/**
 * A step's path, block by block: a list's items as numbered steps, a paragraph, a copy block with its
 * button, a table (its first column as the row's name, as the mockup's "where it goes" table), and
 * (D-188) a video.
 */
export function Blocks({ blocks }: { blocks: PathBlock[] }) {
  let n = 0;
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === 'video')
          return (
            <div key={i} className={s.blk}>
              <VideoView block={b} />
            </div>
          );
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
        // D-190: checklist, callout and accordion blocks draw in the one-step layout, not here.
        if (b.type !== 'table') return null;
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

/**
 * D-188: a course video block (a step's path, a week's Media). What it plays is `videoBlockSource`: an
 * uploaded mp4 from its same-origin API address, or an `.m3u8` / `.mp4` link, in a `<video>` with the
 * browser's own controls (play, seek, keyboard), driven by `HlsEngine` as the replay player drives
 * its element (`direct` for a file, hls.js or native HLS for a manifest). Any other link is a "Watch"
 * link that opens in a new tab. No chapters or transcript. The title, when there is one, is the
 * video's name and its caption.
 */
export function VideoView({ block }: { block: VideoBlock }) {
  const source = videoBlockSource(block, courseVideoUrl);
  const video = useRef<HTMLVideoElement | null>(null);
  const kind = source?.kind ?? null;
  const src = source && source.kind !== 'link' ? source.src : '';
  useLayoutEffect(() => {
    const el = video.current;
    if (!el || !src || (kind !== 'file' && kind !== 'hls')) return;
    const engine = new HlsEngine({ src, dur: 0, t: 0, media: el, direct: kind === 'file', learnDuration: true });
    return () => engine.destroy();
  }, [src, kind]);
  if (!source) return null;
  const title = block.title?.trim() || null;
  if (source.kind === 'link')
    return (
      <div className={s.vlink}>
        {title ? <span className={s.w5}>{title}</span> : null}
        <a className={`${s.b} ${s.bq} ${s.bi}`} href={source.href} target="_blank" rel="noopener noreferrer" aria-label={title ? `${STEP.watch} ${title}` : undefined}>
          <Icon name="r2Play" size={14} strokeWidth={1.75} />
          {STEP.watch}
        </a>
      </div>
    );
  return (
    <figure className={s.vfig}>
      <video ref={video} className={s.vplay} controls playsInline preload="metadata" aria-label={title ?? STEP.video} data-video-block="" />
      {title ? <figcaption className={s.me}>{title}</figcaption> : null}
    </figure>
  );
}
