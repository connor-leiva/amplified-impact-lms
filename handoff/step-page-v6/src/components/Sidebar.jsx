// The right rail: On This Page (scroll-spy), the checklist mirror with mini checks, the due line,
// For This Step (kit rows with View / Copy) and Still Stuck (email + office hours).
// Motion (Amplified Impact Motion v1): one marker springs to the current section (brand 10, the nav marker);
// View and Copy roll their labels; mini checks draw in 240 ms; the cards rise in with the page (--i 2, 3, 4).
import { useLayoutEffect, useRef, useState } from 'react';
import { BoxCheck, Icon } from './Icons.jsx';
import { RollLabel } from '../motion/ai-motion';

function CopyButton({ text, labels }) {
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
function useSpyMarker(navRef, spy) {
  const [style, setStyle] = useState({});
  const [live, setLive] = useState(false);
  useLayoutEffect(() => {
    const nav = navRef.current; if (!nav) return undefined;
    const place = () => {
      const a = nav.querySelector('a[data-spy][aria-current="true"]'); if (!a) return;
      setStyle({ '--x': `${a.offsetLeft}px`, '--y': `${a.offsetTop}px`, '--h': `${a.offsetHeight}px` });
    };
    place();
    const ro = new ResizeObserver(place); ro.observe(nav);
    document.fonts?.ready.then(() => { place(); requestAnimationFrame(() => requestAnimationFrame(() => setLive(true))); });
    return () => ro.disconnect();
  }, [navRef, spy]);
  return { style, live };
}

export function Sidebar({ step, spy, checked, labels }) {
  const noop = (href) => (href === '#' ? (e) => e.preventDefault() : undefined);
  const navRef = useRef(null);
  const marker = useSpyMarker(navRef, spy);
  return (
    <aside className="rail" aria-label="On this step">
      <nav className="card aim-rise" style={{ '--i': 2 }} aria-label={labels.onThisPage} ref={navRef}>
        <h3>{labels.onThisPage}</h3>
        {step.jumps.map((j) => (
          <a key={j.id} className="rail-link" href={'#' + j.id} data-spy={j.id} aria-current={spy === j.id ? 'true' : undefined}>{j.label}</a>
        ))}
        <span className={'spy-mark' + (marker.live ? ' live' : '')} style={marker.style} aria-hidden="true" />
        <h3 style={{ marginTop: 20 }}>{labels.checklist}</h3>
        <div className="rail-list" id="rail-list">
          {step.items.map((it) => (
            <a key={it.id} className={'rail-link' + (checked[it.id] ? ' done' : '')} href="#checklist" data-for={it.id}>
              <span className={'mini' + (checked[it.id] ? ' on' : '')}><BoxCheck size={10} /></span>{it.title}
            </a>
          ))}
        </div>
        {step.due && <p className="due">{step.due}</p>}
      </nav>
      {step.forStep?.length > 0 && (
        <section className="card aim-rise" style={{ '--i': 3 }} aria-label={labels.forStep}>
          <h3>{labels.forStep}</h3>
          {step.forStep.map((r) => (
            <div className="res" key={r.id}><span className="res-ic"><Icon name={r.icon} /></span>
              <div><b>{r.title}</b><small>{r.meta}</small>
                <div className="item-acts">
                  {r.view && <button className="btn btn-secondary btn-sm" type="button" onClick={r.onView}><Icon name="eye" size={14} /><RollLabel>{labels.view}</RollLabel></button>}
                  {r.copyText != null && <CopyButton text={r.copyText} labels={labels} />}
                </div>
              </div></div>
          ))}
        </section>
      )}
      {step.help?.length > 0 && (
        <section className="card aim-rise" style={{ '--i': 4 }} aria-label="Still stuck">
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
