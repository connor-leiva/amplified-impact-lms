// <WeekPage>: the week overview (/learn/week/N), pixel-identical to the #week-0 view of mockup/index.html.
// Looks: the step page's tokens (--sp-*). Motion: Amplified Impact Motion v1 (src/motion, unchanged).
// It renders only the page ([data-week-page]); <AppShell> goes around it.
//
// Props
//   week       the week's content and each step's status (sample-data.js › sampleWeek)
//   labels     chrome words (sample-data.js › sampleLabels)
//   onDeploy   (on) => void   persist "Mark as deployed" / Undo. The UI updates first.
import { useState } from 'react';
import { IconSprite, Icon } from './components/Icons.jsx';
import { Hero } from './components/Hero.jsx';
import { StepList } from './components/StepList.jsx';
import { Kit } from './components/Kit.jsx';
import { Reference } from './components/Reference.jsx';

export function WeekPage({ week, labels, onDeploy }) {
  const [deployed, setDeployed] = useState(!!week.deployed);
  const [live, setLive] = useState('');
  const steps = week.steps;
  // "Up next" is the first step that isn't done. A waiting step (one of its boxes needs another step first) is still a
  // step the learner can open, so it can be up next; its row says which step it waits on.
  const nextI = steps.findIndex((s) => s.status !== 'done');
  const allDone = nextI < 0;
  const view = {
    nextI, allDone, deployed: deployed && allDone,
    doneN: steps.filter((s) => s.status === 'done').length,
    left: steps.reduce((m, s) => m + (s.status === 'done' ? 0 : s.minutes), 0),
  };
  const deploy = (on) => { setDeployed(on); setLive(on ? `Week ${week.n} marked deployed.` : `Week ${week.n} is no longer marked deployed.`); onDeploy?.(on); };
  const stop = (href) => (href === '#' ? (e) => e.preventDefault() : undefined);
  return (
    <div data-ai="week" data-week-page="" id="view-week">
      <IconSprite />
      <div className="wk-page">
        <nav className="wk-crumbs aim-rise" style={{ '--i': 0 }} aria-label="Breadcrumb">
          {week.crumbs.map((c, i) => [
            i > 0 && <span key={'s' + i} aria-hidden="true">/</span>,
            c.href ? <a key={c.label} href={c.href} onClick={stop(c.href)}>{c.label}</a> : <span key={c.label}>{c.label}</span>,
          ])}
        </nav>
        <header className="wk-head aim-rise" style={{ '--i': 0 }}>
          <p className="wk-eyebrow">{`Week ${week.n} `}{week.open && <span className="wk-open">{labels.open}</span>}</p>
          <h1 className="wk-h1">{week.title}</h1>
          <p className="wk-q">{week.question}</p>
          <p className="wk-purpose">{week.purpose}</p>
          <div className="wk-meta">
            {week.tags.map((t) => <span className="wk-tag" key={t.label}><Icon name={t.icon} />{t.label}</span>)}
          </div>
        </header>
        <Hero week={week} view={view} labels={labels} onDeploy={() => deploy(true)} onUndo={() => deploy(false)} />
        <div className="wk-grid">
          <StepList week={week} view={view} labels={labels} />
          <Kit week={week} labels={labels} />
          <Reference week={week} labels={labels} />
        </div>
        <p className="wk-sr" aria-live="polite" id="wk-live">{live}</p>
      </div>
    </div>
  );
}

export default WeekPage;
