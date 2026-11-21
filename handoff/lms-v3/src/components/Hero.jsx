// The hero: the page's one primary action, with progress beside it.
//   steps left   -> "Up next · Step N of 8", Start / Continue step N
//   only coming-soon steps left -> that step, no button (there is nothing to start)
//   all done     -> "Mark Week 0 deployed" (the only place that action lives)
//   deployed     -> the brand's module completion (13): the mark lands and sends one ring out, the words rise in
// Motion (Amplified Impact Motion v1): labels roll, press squeezes; the segments fill over 720 ms on the system curve
// while the figure counts with them (useCountUp).
import { Icon } from './Icons.jsx';
import { ModuleComplete, RollLabel, useCountUp } from '../motion/ai-motion';

const stop = (href) => (href === '#' ? (e) => e.preventDefault() : undefined);

export function Hero({ week, view, labels, onDeploy, onUndo }) {
  const shown = useCountUp(view.doneN, 720);
  const next = view.nextI >= 0 ? week.steps[view.nextI] : null;
  return (
    <section className="wk-hero aim-rise" style={{ '--i': 1 }} aria-label={labels.upNext}>
      <div className="wk-hero-main" id="wk-hero">
        {view.deployed ? (
          <ModuleComplete>
            <p className="wk-kick">{`Week ${week.n} · ${labels.deployed}`}</p>
            <h2 className="wk-hero-t">{labels.deployedTitle}</h2>
            <p className="wk-hero-d">{`All ${week.steps.length} steps are done.`}</p>
            <div className="wk-hero-acts">
              <a className="wk-btn wk-btn-accent wk-btn-lg wk-btn-arrow" id="wk-go" href={week.next.href} onClick={stop(week.next.href)}>
                <RollLabel>{`Go to Week ${week.next.n}`}</RollLabel><Icon name="arrow" size={16} className="wk-arrow" />
              </a>
              <button className="wk-btn wk-btn-onforest" type="button" id="wk-undo" onClick={onUndo}>{labels.undo}</button>
            </div>
          </ModuleComplete>
        ) : next ? (
          <>
            <p className="wk-kick">{`${labels.upNext} · Step ${next.n} of ${week.steps.length}`}</p>
            <h2 className="wk-hero-t">{next.title}</h2>
            <p className="wk-hero-m"><span>{next.time}</span><span>{next.role}</span></p>
            <p className="wk-hero-d"><b>{labels.doneWhen}</b>{next.doneWhen}</p>
            <div className="wk-hero-acts">
              <a className="wk-btn wk-btn-accent wk-btn-lg wk-btn-arrow" id="wk-go" href={next.href} onClick={stop(next.href)}>
                <RollLabel>{`${next.status === 'progress' ? labels.continue : labels.start} step ${next.n}`}</RollLabel><Icon name="arrow" size={16} className="wk-arrow" />
              </a>
            </div>
          </>
        ) : (
          <>
            <p className="wk-kick">{`All ${week.steps.length} steps done`}</p>
            <h2 className="wk-hero-t">{`Mark Week ${week.n} deployed`}</h2>
            <p className="wk-hero-d"><b>{labels.deployedWhen}</b>{week.deployedWhen}</p>
            <div className="wk-hero-acts">
              <button className="wk-btn wk-btn-accent wk-btn-lg" type="button" id="wk-deploy" onClick={onDeploy}><RollLabel>{labels.markDeployed}</RollLabel></button>
            </div>
          </>
        )}
      </div>
      <div className="wk-prog" id="wk-prog">
        <p className="wk-prog-l"><Icon name="check" />{labels.stepsDone}</p>
        <p className="wk-prog-n"><b id="wk-n">{Math.round(shown)}</b>{`of ${week.steps.length}`}</p>
        <div className="wk-segs" id="wk-segs" role="progressbar" aria-valuemin={0} aria-valuemax={week.steps.length} aria-valuenow={view.doneN} aria-label={labels.stepsDone}>
          {week.steps.map((s) => <span key={s.n} style={{ '--v': s.status === 'done' ? 1 : 0 }} />)}
        </div>
        <p className="wk-prog-left" id="wk-left">{view.deployed ? labels.deployed : view.left ? `About ${hrs(view.left)} left` : labels.allDone}</p>
      </div>
    </section>
  );
}

/** 160 -> "2 hr 40 min" */
export const hrs = (m) => { const h = Math.floor(m / 60), r = m % 60; return (h ? `${h} hr` : '') + (h && r ? ' ' : '') + (r ? `${r} min` : ''); };
