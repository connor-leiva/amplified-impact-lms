// The checklist: 44px tap box, a forest halo on hover, done titles at 60% ink, role chips, per-item actions,
// sub-checks, a Know These card, and callouts as their own list rows.
// Motion (Amplified Impact Motion v1, 11 lesson check): the box squeezes to .84 on press and springs back, the check
// draws over 240 ms after 70 ms, the title settles in 240 ms. No flash. Secondary buttons roll their labels; the
// five words rise in order when opened; the section rises in with the page (--i 3).
import { forwardRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { RollLabel } from '@brand/ai-motion';
import type { MotionStyle } from '@brand/ai-motion';
import { BoxCheck, Icon } from './Icons';
import type { SpAction, SpCallout, SpIcon, SpItem, SpSubcheck } from './types';

const CALLOUT_ICON: Record<string, SpIcon> = { tip: 'info', heads_up: 'alert', diy: 'user' };

export function Callout({ c }: { c: SpCallout }) {
  return (
    <div className={'callout ' + c.kind}><Icon name={CALLOUT_ICON[c.kind] ?? 'info'} size={18} /><p><strong>{c.label}</strong>{c.text}</p></div>
  );
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

function Actions({ item, onPlay }: { item: SpItem; onPlay: (seconds: number) => void }) {
  const a = item.action;
  if (!a) return null;
  if (a.type === 'card') return <KnowCard action={a} card={item.card ?? []} />;
  if (a.type === 'play') {
    return (
      <div className="item-acts">
        <button className="btn btn-secondary btn-sm" type="button" data-seek={a.seconds} onClick={() => onPlay(a.seconds)}><Icon name="play" size={14} /><RollLabel>{a.label}</RollLabel></button>
        {item.autoLabel && <span className="auto"><Icon name="check" size={14} />{item.autoLabel}</span>}
      </div>
    );
  }
  if (a.type === 'calendar') {
    return <div className="item-acts"><button className="btn btn-secondary btn-sm" type="button" onClick={a.onClick}><Icon name="calplus" size={14} /><RollLabel>{a.label}</RollLabel></button></div>;
  }
  if (a.type === 'link') {
    return (
      <div className="item-acts"><a className="btn btn-secondary btn-sm btn-arrow" href={a.href} onClick={a.href === '#' ? (e) => e.preventDefault() : undefined}>
        <RollLabel>{a.label}</RollLabel><svg className="arrow" width="14" height="14"><use href="#i-arrow" /></svg></a></div>
    );
  }
  return null;
}

/** Sub-checks use the rail's mini box (14px, the same draw). The mockup has none on step 2; this is the same component the rail uses. */
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

interface CheckItemProps {
  item: SpItem;
  checked: boolean;
  onToggle: (on: boolean) => void;
  onPlay: (seconds: number) => void;
  onSub?: ((itemId: string, subId: string, on: boolean) => void) | undefined;
}

export const CheckItem = forwardRef<HTMLButtonElement, CheckItemProps>(function CheckItem({ item, checked, onToggle, onPlay, onSub }, boxRef) {
  return (
    <li className={'item' + (checked ? ' done' : '')} data-id={item.id}>
      <button ref={boxRef} className="box-btn" type="button" role="checkbox" aria-checked={checked ? 'true' : 'false'} aria-label={item.title} onClick={() => onToggle(!checked)}>
        <span className="check-box"><BoxCheck /></span>
      </button>
      <div>
        <div className="item-title">{item.title}{item.role && <>{' '}<span className="role">{item.role}</span></>}</div>
        {item.detail && <p className="item-detail">{item.detail}</p>}
        <Actions item={item} onPlay={onPlay} />
        <SubChecks subs={item.subchecks} onToggle={(id, on) => onSub?.(item.id, id, on)} />
      </div>
    </li>
  );
});

export function Checklist({ items, checked, boxRefs, onToggle, onPlay, onSub, title }: {
  items: SpItem[]; checked: Record<string, boolean>; boxRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>;
  onToggle: (id: string, on: boolean) => void; onPlay: (seconds: number) => void; onSub?: (itemId: string, subId: string, on: boolean) => void; title: string;
}) {
  return (
    <section id="checklist" className="aim-rise" style={{ '--i': 3 } as MotionStyle} aria-labelledby="check-h">
      <h2 className="sec-h" id="check-h">{title}</h2>
      <ol className="list" id="list">
        {items.map((it) => [
          <CheckItem key={it.id} item={it} checked={!!checked[it.id]} ref={(el) => { boxRefs.current[it.id] = el; }}
            onToggle={(on) => onToggle(it.id, on)} onPlay={onPlay} onSub={onSub} />,
          ...(it.callouts ?? []).map((c, k) => <li key={it.id + '-c' + k} style={{ listStyle: 'none' }}><Callout c={c} /></li>),
        ])}
      </ol>
    </section>
  );
}
