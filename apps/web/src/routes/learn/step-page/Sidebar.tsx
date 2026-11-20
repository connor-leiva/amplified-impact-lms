// The right rail: On This Page (scroll-spy), the checklist mirror with mini checks, the due line,
// For This Step (kit rows with View / Copy) and Still Stuck (email + office hours).
// Motion (Amplified Impact Motion v1): one marker springs to the current section (brand 10, the nav marker);
// View and Copy roll their labels; mini checks draw in 240 ms; the cards rise in with the page (--i 2, 3, 4).
import { useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent, RefObject } from 'react';
import { RollLabel } from '@brand/ai-motion';
import type { MotionStyle } from '@brand/ai-motion';
import { BoxCheck, Icon } from './Icons';
import type { SpLabels, SpStep } from './types';

function CopyButton({ text, labels }: { text: string; labels: SpLabels }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="btn btn-secondary btn-sm" type="button" data-copy
      onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>
      <Icon name="copy" size={14} /><RollLabel>{copied ? labels.copied : labels.copy}</RollLabel>
    </button>
  );
}

/** Measures the current section's link (aria-current="true") for the .spy-mark marker, like useMarker in
 *  ai-motion.tsx (which looks for aria-current="page"). Transitions switch on after the first placement. */
function useSpyMarker(navRef: RefObject<HTMLElement | null>, spy: string | null) {
  const [style, setStyle] = useState<MotionStyle>({});
  const [live, setLive] = useState(false);
  useLayoutEffect(() => {
    const nav = navRef.current; if (!nav) return undefined;
    const place = () => {
      const a = nav.querySelector<HTMLElement>('a[data-spy][aria-current="true"]'); if (!a) return;
      setStyle({ '--x': `${a.offsetLeft}px`, '--y': `${a.offsetTop}px`, '--h': `${a.offsetHeight}px` });
    };
    place();
    const ro = new ResizeObserver(place); ro.observe(nav);
    document.fonts?.ready.then(() => { place(); requestAnimationFrame(() => requestAnimationFrame(() => setLive(true))); });
    return () => ro.disconnect();
  }, [navRef, spy]);
  return { style, live };
}

/**
 * D-223: where the sticky rail pins. A rail that fits keeps the CSS's top (24px). A taller one pins by its bottom
 * instead (a negative top), so the end of the main column never pushes it up: before this, opening a Reference
 * row at the foot of the page lengthened the column and the rail snapped back down. Measured again whenever the
 * rail's height or the window changes; below 1100px the rail is static and this top does nothing.
 */
function useRailTop(railRef: RefObject<HTMLElement | null>): number | undefined {
  const [top, setTop] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const place = () => {
      const grid = rail.parentElement;
      const page = rail.closest('.page') ?? grid;
      if (!grid || !page) return;
      // The room under the grid at the page's end (its bottom padding): the rail stays clear of it.
      const below = Math.max(0, page.getBoundingClientRect().bottom - grid.getBoundingClientRect().bottom);
      const fit = Math.floor(window.innerHeight - rail.offsetHeight - below);
      setTop(fit >= 24 ? undefined : fit);
    };
    place();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    ro?.observe(rail);
    window.addEventListener('resize', place);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [railRef]);
  return top;
}

/**
 * D-224: a checklist row in the rail goes to its own item, not the top of the checklist (Connor: the rail's links
 * didn't scroll right). The item is brought to the middle of the screen and its box takes the focus, so a keyboard
 * user lands where a mouse user looks. The link keeps `#checklist` for a reader with no script.
 */
function goToItem(e: MouseEvent, id: string): void {
  const item = document.querySelector<HTMLElement>(`#checklist .item[data-id="${CSS.escape(id)}"]`);
  if (!item) return;
  e.preventDefault();
  item.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  item.querySelector<HTMLElement>('.box-btn')?.focus({ preventScroll: true });
}

export function Sidebar({ step, spy, checked, labels, onJump }: { step: SpStep; spy: string | null; checked: Record<string, boolean>; labels: SpLabels; onJump?: (id: string) => void }) {
  const noop = (href: string) => (href === '#' ? (e: MouseEvent) => e.preventDefault() : undefined);
  const navRef = useRef<HTMLElement | null>(null);
  const railRef = useRef<HTMLElement | null>(null);
  const marker = useSpyMarker(navRef, spy);
  const railTop = useRailTop(railRef);
  return (
    <aside className="rail" aria-label="On this step" ref={railRef} style={railTop === undefined ? undefined : { top: railTop }}>
      {/* A step with nothing to jump to, no checklist and no due line has no "On this page" card. */}
      {step.jumps.length > 0 || step.items.length > 0 || step.due ? (
      <nav className="card aim-rise" style={{ '--i': 2 } as MotionStyle} aria-label={labels.onThisPage} ref={navRef}>
        <h3>{labels.onThisPage}</h3>
        {step.jumps.map((j) => (
          <a key={j.id} className="rail-link" href={'#' + j.id} data-spy={j.id} aria-current={spy === j.id ? 'true' : undefined} onClick={() => onJump?.(j.id)}>{j.label}</a>
        ))}
        <span className={'spy-mark' + (marker.live ? ' live' : '')} style={marker.style} aria-hidden="true" />
        {step.items.length > 0 && (
          <>
            <h3 style={{ marginTop: 20 }}>{labels.checklist}</h3>
            <div className="rail-list" id="rail-list">
              {step.items.map((it) => (
                <a key={it.id} className={'rail-link' + (checked[it.id] ? ' done' : '')} href="#checklist" data-for={it.id} onClick={(e) => { goToItem(e, it.id); onJump?.('checklist'); }}>
                  <span className={'mini' + (checked[it.id] ? ' on' : '')}><BoxCheck size={10} /></span>{it.title}
                </a>
              ))}
            </div>
          </>
        )}
        {step.due && <p className="due">{step.due}</p>}
      </nav>
      ) : null}
      {step.forStep?.length > 0 && (
        <section className="card aim-rise" style={{ '--i': 3 } as MotionStyle} aria-label={labels.forStep}>
          <h3>{labels.forStep}</h3>
          {step.forStep.map((r) => (
            <div className="res" key={r.id}><span className="res-ic"><Icon name={r.icon} /></span>
              <div><b>{r.title}</b><small>{r.meta}</small>
                {r.tags?.length ? <div className="res-tags">{r.tags.map((t) => <span key={t} className="role">{t}</span>)}</div> : null}
                {r.vars?.length ? <div className="res-vars"><span>{labels.fillIn ?? 'Fill in'}</span>{r.vars.map((v) => <code key={v} className="rt-code">{v}</code>)}</div> : null}
                <div className="item-acts">
                  {r.view && (r.href
                    ? <a className="btn btn-secondary btn-sm" href={r.href} {...(/^https?:/.test(r.href) ? { target: '_blank', rel: 'noopener' } : {})}><Icon name="eye" size={14} /><RollLabel>{labels.view}</RollLabel></a>
                    : <button className="btn btn-secondary btn-sm" type="button" onClick={r.onView}><Icon name="eye" size={14} /><RollLabel>{labels.view}</RollLabel></button>)}
                  {r.download?.href && <a className="btn btn-secondary btn-sm" href={r.download.href}><Icon name="down" size={14} /><RollLabel>{labels.download ?? 'Download'}</RollLabel></a>}
                  {r.copyText != null && <CopyButton text={r.copyText} labels={labels} />}
                </div>
              </div></div>
          ))}
        </section>
      )}
      {step.help?.length > 0 && (
        <section className="card aim-rise" style={{ '--i': 4 } as MotionStyle} aria-label="Still stuck">
          <h3>{labels.stillStuck}</h3>
          {step.help.map((h) => (
            <a key={h.title} className="card-link li" href={h.href} onClick={noop(h.href)}>
              <span className="res-ic"><Icon name={h.icon} /></span><span><b>{h.title}</b><small>{h.meta}</small></span><Icon name="arrow" className="arrow" />
            </a>
          ))}
        </section>
      )}
    </aside>
  );
}
