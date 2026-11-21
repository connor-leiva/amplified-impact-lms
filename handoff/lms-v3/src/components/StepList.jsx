// The one step list. Each row says who does it, what done looks like, how long it takes and where it stands;
// the last row is the finish line (deployment). The role filter shows only one person's steps.
// Row states use the step page's vocabulary: done = energy check, up next = forest, in progress = energy ring,
// waiting = dashed, "Coming soon" (the step isn't built yet), not started = plain.
// Motion: the filter's thumb springs to the choice (brand 10, the marker); after a filter change the rows that
// remain rise in order (.aim-rise). Rows change colour on hover and their chevron nudges; nothing lifts.
import { useLayoutEffect, useRef, useState } from 'react';
import { Icon, NumCheck } from './Icons.jsx';

const ST_LABEL = { done: 'done', next: 'upNext', progress: 'inProgress' };

function RoleFilter({ roles, role, onRole, label }) {
  const ref = useRef(null);
  const [thumb, setThumb] = useState({});
  const [live, setLive] = useState(false);
  useLayoutEffect(() => {
    const seg = ref.current; if (!seg) return undefined;
    const place = () => { const b = seg.querySelector('[aria-checked="true"]'); if (b) setThumb({ '--x': `${b.offsetLeft}px`, '--w': `${b.offsetWidth}px` }); };
    place();
    const ro = new ResizeObserver(place); ro.observe(seg);
    document.fonts?.ready.then(() => { place(); requestAnimationFrame(() => requestAnimationFrame(() => setLive(true))); });
    return () => ro.disconnect();
  }, [role]);
  const onKey = (e, i) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return; e.preventDefault();
    const to = roles[(i + d + roles.length) % roles.length];
    onRole(to.id); ref.current.querySelector(`[data-role="${to.id}"]`)?.focus();
  };
  return (
    <div className="wk-seg" id="wk-seg" role="radiogroup" aria-label={label} ref={ref}>
      <span className={'wk-seg-thumb' + (live ? ' live' : '')} style={thumb} aria-hidden="true" />
      {roles.map((r, i) => (
        <button key={r.id} className="wk-seg-b" type="button" role="radio" aria-checked={r.id === role ? 'true' : 'false'} tabIndex={r.id === role ? 0 : -1}
          data-role={r.id} onClick={() => onRole(r.id)} onKeyDown={(e) => onKey(e, i)}>{r.label}<small>{r.count}</small></button>
      ))}
    </div>
  );
}

export function StepList({ week, view, labels }) {
  const [role, setRole] = useState('all');
  const [filtered, setFiltered] = useState(false);
  const pick = (r) => { setRole(r); setFiltered(true); };
  const total = week.steps.length, togo = total - view.doneN;
  const fs = view.deployed ? 'deployed' : view.allDone ? 'ready' : 'locked';
  let k = 0;
  // after a filter change the rows remount (the key carries the role) so their rise plays again, in order
  const rise = () => (filtered ? { className: 'aim-rise', style: { '--i': k++ } } : {});
  const keyOf = (id) => (filtered ? `${role}-${id}` : id);
  return (
    <section className="wk-steps-sec aim-rise" style={{ '--i': 2 }} id="steps" aria-labelledby="steps-h">
      <div className="wk-sec-head">
        <h2 className="wk-h2" id="steps-h">{labels.stepsTitle}</h2>
        <RoleFilter roles={week.roles} role={role} onRole={pick} label={labels.showStepsFor} />
      </div>
      <p className="wk-sum" id="wk-sum" aria-live="polite">{week.roles.find((r) => r.id === role).summary}</p>
      <ol className="wk-steps" id="wk-steps">
        {week.steps.map((s, i) => {
          const st = s.status === 'done' ? 'done' : i === view.nextI ? 'next' : s.status;
          const show = role === 'all' || s.who.includes(role);
          if (!show) return <li key={s.n} hidden />;
          const label = st === 'waiting' ? `${labels.waitingOn} ${s.waitsOn}` : labels[ST_LABEL[st]];
          return (
            <li key={keyOf(s.n)} {...rise()}>
              <a className="wk-step" data-s={st} data-n={s.n} href={s.href} onClick={s.href === '#' ? (e) => e.preventDefault() : undefined} aria-current={st === 'next' ? 'step' : undefined}>
                <span className="wk-num" aria-hidden="true">{st === 'done' ? <NumCheck /> : s.n}</span>
                <span className="wk-step-tx"><span className="wk-step-t">{s.title}<span className="wk-chip">{s.role}</span></span><span className="wk-step-d">{s.doneWhen}</span></span>
                <span className="wk-step-r">{label && <span className="wk-st" data-s={st}>{st === 'done' && <Icon name="check" />}{label}</span>}<span className="wk-time">{s.time}</span></span>
                <Icon name="right" size={20} className="wk-chev wk-arrow" />
              </a>
            </li>
          );
        })}
        <li key={keyOf('finish')} {...rise()}>
          <div className="wk-step wk-finish" data-s={fs} id="wk-finish">
            <span className="wk-num" aria-hidden="true">{fs === 'deployed' ? <NumCheck /> : <Icon name="flag" size={16} />}</span>
            <span className="wk-step-tx"><span className="wk-step-t">{`Week ${week.n} deployed`}</span><span className="wk-step-d">{week.deployedWhen}<small>{`Platform: ${week.platform}`}</small></span></span>
            <span className="wk-step-r">
              {fs === 'deployed' ? <span className="wk-st" data-s="done"><Icon name="check" />{labels.deployed}</span>
                : fs === 'ready' ? <span className="wk-st" data-s="next">{labels.ready}</span>
                : <span className="wk-st" data-s="locked">{`${togo} ${togo === 1 ? 'step' : 'steps'} to go`}</span>}
            </span>
          </div>
        </li>
      </ol>
    </section>
  );
}
