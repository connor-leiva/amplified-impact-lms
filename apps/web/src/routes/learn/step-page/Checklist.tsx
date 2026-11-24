// The checklist: 44px tap box, a forest halo on hover, done titles at 60% ink, role chips, per-item actions,
// sub-checks, a Know These card, and callouts as their own list rows.
// Motion (Amplified Impact Motion v1, 11 lesson check): the box squeezes to .84 on press and springs back, the check
// draws over 240 ms after 70 ms, the title settles in 240 ms. No flash. Secondary buttons roll their labels; the
// five words rise in order when opened; the section rises in with the page (--i 3).
// D-210: everything a checklist path can hold beyond the mockup's four rows uses the same pieces: the waiting and
// optional chips are role chips, a download, copy or invite is a secondary button, a click path is a row of tags,
// sub-checks are the rail's mini boxes, and the waiting confirm is a card like the Mark step done card.
import { forwardRef, useEffect, useRef, useState } from 'react';
import type { MutableRefObject, ReactNode } from 'react';
import { RollLabel } from '@brand/ai-motion';
import type { MotionStyle } from '@brand/ai-motion';
import { BoxCheck, Icon } from './Icons';
import type { SpAction, SpCallout, SpIcon, SpItem, SpLabels, SpSubcheck } from './types';

const CALLOUT_ICON: Record<string, SpIcon> = { tip: 'info', heads_up: 'alert', diy: 'user' };

export function Callout({ c }: { c: SpCallout }) {
  return (
    <div className={'callout ' + c.kind}><Icon name={CALLOUT_ICON[c.kind] ?? 'info'} size={18} /><p><strong>{c.label}</strong>{c.node ?? c.text}</p></div>
  );
}

function useFlash(ms = 1400): [boolean, () => void] {
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return [on, () => { setOn(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setOn(false), ms); }];
}

function KnowCard({ action, card }: { action: Extract<SpAction, { type: 'card' }>; card: NonNullable<SpItem['card']> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="item-acts">
        <button className="btn btn-secondary btn-sm" type="button" id="know-btn" aria-expanded={open ? 'true' : 'false'} aria-controls="know" onClick={() => setOpen(!open)}>
          <Icon name="book" size={14} /><RollLabel>{open ? action.closeLabel : action.openLabel}</RollLabel>
        </button>
      </div>
      <dl className="know" id="know" hidden={!open}>
        {card.map((k, i) => <div key={k.id} className="aim-rise" style={{ '--i': i } as MotionStyle}><dt>{k.term}</dt><dd>{k.short}</dd></div>)}
      </dl>
    </>
  );
}

function CopyAction({ a, labels }: { a: Extract<SpAction, { type: 'copy' }>; labels: SpLabels }) {
  const [copied, flash] = useFlash();
  return (
    <div className="copyline">
      <code>{a.text}</code>
      <button className="btn btn-secondary btn-sm" type="button" data-copy onClick={() => { navigator.clipboard?.writeText(a.text).catch(() => {}); flash(); }}>
        <Icon name="copy" size={14} /><RollLabel>{copied ? labels.copied : a.label}</RollLabel>
      </button>
    </div>
  );
}

function DownloadAction({ a, labels }: { a: Extract<SpAction, { type: 'download' }>; labels: SpLabels }) {
  const [done, flash] = useFlash(2000);
  return (
    <>
      {a.files.map((f) =>
        // D-245: a file that opens a form (the intake's, B-15) is the form's button: its words, the pen and the arrow.
        f.href && f.form ? (
          <a key={f.id} className="btn btn-secondary btn-sm btn-arrow" href={f.href} data-act="form">
            <Icon name="pen" size={14} /><RollLabel>{f.form}</RollLabel><svg className="arrow" width="14" height="14"><use href="#i-arrow" /></svg>
          </a>
        ) : f.href ? (
          <a key={f.id} className="btn btn-secondary btn-sm" href={f.href} onClick={flash}>
            <Icon name="down" size={14} /><RollLabel>{done ? (labels.downloaded ?? f.title) : f.title}</RollLabel>
          </a>
        ) : (
          <span key={f.id} className="btn btn-secondary btn-sm" aria-disabled="true">{f.title}</span>
        ),
      )}
    </>
  );
}

/** One action button. A play, calendar, link, invite or download sits in the row; a copy brings its text. */
function Act({ a, item, onPlay, labels }: { a: SpAction; item: SpItem; onPlay: (seconds: number, video?: string | null) => void; labels: SpLabels }) {
  if (a.type === 'play') {
    return <button className="btn btn-secondary btn-sm" type="button" data-seek={a.seconds} onClick={() => onPlay(a.seconds, a.video)}><Icon name="play" size={14} /><RollLabel>{a.label}</RollLabel></button>;
  }
  if (a.type === 'calendar') {
    return <button className="btn btn-secondary btn-sm" type="button" onClick={a.onClick}><Icon name="calplus" size={14} /><RollLabel>{a.label}</RollLabel></button>;
  }
  if (a.type === 'link' || a.type === 'invite') {
    return (
      <a className="btn btn-secondary btn-sm btn-arrow" href={a.href} onClick={a.href === '#' ? (e) => e.preventDefault() : undefined}>
        {a.type === 'invite' ? <Icon name="users" size={14} /> : a.form ? <Icon name="pen" size={14} /> : null}
        <RollLabel>{a.label}</RollLabel><svg className="arrow" width="14" height="14"><use href="#i-arrow" /></svg>
      </a>
    );
  }
  // D-230: Turn in is the step page's own button, as it is; an agent's line uses the row's own text style.
  if (a.type === 'upload') return <button className="btn btn-secondary btn-sm" type="button" data-act="turnin" onClick={a.onClick}><RollLabel>{a.label}</RollLabel></button>;
  // D-236: the seat card's Form button looks as a form's link does (the arrow button, D-245: with the pen) and opens its drawer.
  if (a.type === 'form') {
    return (
      <button className="btn btn-secondary btn-sm btn-arrow" type="button" data-act="seatcard" onClick={a.onClick}>
        <Icon name="pen" size={14} /><RollLabel>{a.label}</RollLabel><svg className="arrow" width="14" height="14"><use href="#i-arrow" /></svg>
      </button>
    );
  }
  if (a.type === 'line') return <span className="auto">{a.text}</span>;
  if (a.type === 'download') return <DownloadAction a={a} labels={labels} />;
  if (a.type === 'copy') return <CopyAction a={a} labels={labels} />;
  if (a.type === 'card') return <KnowCard action={a} card={item.card ?? []} />;
  return null;
}

function Actions({ item, onPlay, labels }: { item: SpItem; onPlay: (seconds: number, video?: string | null) => void; labels: SpLabels }) {
  const a = item.action;
  const x = item.extra ?? null;
  if (!a && !x) return null;
  // The mockup's own rows, exactly as it draws them.
  if (a?.type === 'card' && !x) return <KnowCard action={a} card={item.card ?? []} />;
  if (a?.type === 'play' && !x) {
    return (
      <div className="item-acts">
        <Act a={a} item={item} onPlay={onPlay} labels={labels} />
        {item.autoLabel && <span className="auto"><Icon name="check" size={14} />{item.autoLabel}</span>}
      </div>
    );
  }
  const copy = [a, x].find((y): y is Extract<SpAction, { type: 'copy' }> => y?.type === 'copy');
  const card = [a, x].find((y): y is Extract<SpAction, { type: 'card' }> => y?.type === 'card');
  const row = [a, x].filter((y): y is SpAction => !!y && y.type !== 'copy' && y.type !== 'card');
  return (
    <>
      {card ? <KnowCard action={card} card={item.card ?? []} /> : null}
      {copy ? <CopyAction a={copy} labels={labels} /> : null}
      {row.length || item.autoLabel ? (
        <div className="item-acts">
          {row.map((y, k) => <Act key={k} a={y} item={item} onPlay={onPlay} labels={labels} />)}
          {item.autoLabel && <span className="auto"><Icon name="check" size={14} />{item.autoLabel}</span>}
        </div>
      ) : null}
    </>
  );
}

/** Sub-checks use the rail's mini box (14px, the same draw). */
function SubChecks({ subs, onToggle }: { subs: SpSubcheck[]; onToggle: (id: string, on: boolean) => void }) {
  if (!subs?.length) return null;
  return (
    <div className="rail-list" style={{ marginTop: 'var(--sp-s2)' }}>
      {subs.map((s) => (
        <button key={s.id} type="button" className={'rail-link' + (s.checked ? ' done' : '')} role="checkbox" aria-checked={s.checked ? 'true' : 'false'}
          style={{ border: 0, background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer' }} onClick={() => onToggle(s.id, !s.checked)}>
          <span className={'mini' + (s.checked ? ' on' : '')}><BoxCheck size={10} /></span>{s.label}
        </button>
      ))}
    </div>
  );
}

function ClickPath({ parts }: { parts?: string[] }) {
  if (!parts?.length) return null;
  return (
    <div className="clickpath">
      {parts.map((p, i) => <span key={`${i}:${p}`}>{i > 0 ? <span className="sep" aria-hidden="true">›</span> : null}<span className="tag">{p}</span></span>)}
    </div>
  );
}

interface CheckItemProps {
  item: SpItem;
  checked: boolean;
  onToggle: (on: boolean) => void;
  onPlay: (seconds: number, video?: string | null) => void;
  onSub?: ((itemId: string, subId: string, on: boolean) => void) | undefined;
  labels: SpLabels;
}

export const CheckItem = forwardRef<HTMLButtonElement, CheckItemProps>(function CheckItem({ item, checked, onToggle, onPlay, onSub, labels }, boxRef) {
  const mixed = item.subchecks.length > 0 && !checked && item.subchecks.some((s) => s.checked);
  return (
    <li className={'item' + (checked ? ' done' : '')} data-id={item.id} data-wait={item.waiting != null && !checked ? 'true' : undefined}>
      <button ref={boxRef} className="box-btn" type="button" role="checkbox" aria-checked={mixed ? 'mixed' : checked ? 'true' : 'false'} aria-label={item.title} onClick={() => onToggle(!checked)}>
        <span className="check-box"><BoxCheck /></span>
      </button>
      <div>
        <div className="item-title">{item.titleNode ?? item.title}{item.role && <>{' '}<span className="role">{item.role}</span></>}
          {item.waiting != null && !checked && <>{' '}<span className="role wait">{`${labels.waiting ?? 'Waiting on Step'} ${item.waiting}`}</span></>}
          {item.optional && <>{' '}<span className="role opt">{labels.optional ?? 'Optional'}</span></>}
        </div>
        {item.detailNode ? <div className="item-detail">{item.detailNode}</div> : item.detail && <p className="item-detail">{item.detail}</p>}
        {item.note && <p className="item-note">{item.note}</p>}
        <SubChecks subs={item.subchecks} onToggle={(id, on) => onSub?.(item.id, id, on)} />
        <ClickPath parts={item.clickPath} />
        <Actions item={item} onPlay={onPlay} labels={labels} />
      </div>
    </li>
  );
});

/** Checking an item that waits on another step: a card that asks first, as the step player's dialog does. */
export function WaitConfirm({ step, labels, onYes, onNo }: { step: number; labels: SpLabels; onYes: () => void; onNo: () => void }) {
  const card = useRef<HTMLDivElement | null>(null);
  useEffect(() => { card.current?.querySelector<HTMLButtonElement>('.btn-primary')?.focus(); }, []);
  return (
    <div className="sp-scrim" role="presentation" onClick={onNo} onKeyDown={(e) => { if (e.key === 'Escape') onNo(); }}>
      <div ref={card} className="sp-dialog aim-rise" role="dialog" aria-modal="true" aria-labelledby="sp-wait-h" onClick={(e) => e.stopPropagation()}>
        <h2 className="sec-h" id="sp-wait-h">{`${labels.waiting ?? 'Waiting on Step'} ${step}`}</h2>
        <p>{`This is waiting on Step ${step}. Check it off anyway?`}</p>
        <div className="item-acts">
          <button className="btn btn-secondary" type="button" onClick={onNo}><RollLabel>{labels.notNow ?? 'Not now'}</RollLabel></button>
          <button className="btn btn-primary" type="button" onClick={onYes}><RollLabel>{labels.checkAnyway ?? 'Check it off'}</RollLabel></button>
        </div>
      </div>
    </div>
  );
}

export function Checklist({ items, checked, boxRefs, onToggle, onPlay, onSub, title, labels, leading, extras }: {
  items: SpItem[]; checked: Record<string, boolean>; boxRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>;
  onToggle: (id: string, on: boolean) => void; onPlay: (seconds: number, video?: string | null) => void; onSub?: (itemId: string, subId: string, on: boolean) => void; title: string;
  labels: SpLabels; leading?: ReactNode; extras?: ReactNode;
}) {
  return (
    <section id="checklist" className="aim-rise" style={{ '--i': 3 } as MotionStyle} aria-labelledby="check-h">
      <h2 className="sec-h" id="check-h">{title}</h2>
      {leading}
      <ol className="list" id="list">
        {items.map((it) => [
          <CheckItem key={it.id} item={it} checked={!!checked[it.id]} ref={(el) => { boxRefs.current[it.id] = el; }}
            onToggle={(on) => onToggle(it.id, on)} onPlay={onPlay} onSub={onSub} labels={labels} />,
          ...(it.callouts ?? []).map((c, k) => <li key={it.id + '-c' + k} style={{ listStyle: 'none' }}><Callout c={c} /></li>),
        ])}
      </ol>
      {extras}
    </section>
  );
}
