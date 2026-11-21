// The rail: the week's kit (skills, files, the system prompt; grouped, in step order), the instructor's note, help.
// A skill and its zip are one row; a file's formats are buttons on one row. Rows that open something are links
// (the whole row is the target); extra actions sit beside or under the text. A row with a form (r.form) has one
// button that opens it in a drawer (FormDrawer.jsx); its meta line says how far along the form is.
// Motion: button labels roll, outlines firm to ink, Copy rolls to Copied; cards rise in with the page.
// D-225: `handoff/lms-v3/src/components/Kit.jsx`, converted to TSX and nothing else.
import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Icon } from './Icons';
import { RollLabel } from '@brand/ai-motion';
import type { MotionStyle } from '@brand/ai-motion';
import type { KitAct, WeekLabels, WeekProps } from './types';

const stop = (href: string) => (href === '#' ? (e: MouseEvent) => e.preventDefault() : undefined);

function Act({ a, labels }: { a: KitAct; labels: WeekLabels }) {
  const [copied, setCopied] = useState(false);
  const onClick = a.copyText != null
    ? () => { navigator.clipboard?.writeText(a.copyText!).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1400); }
    : a.onClick;
  return (
    <button className="wk-btn wk-btn-secondary wk-btn-sm" type="button" data-act={a.copyText != null ? 'copy' : a.act} onClick={onClick}>
      <Icon name={a.icon} /><RollLabel>{copied ? labels.copied : a.label}</RollLabel>
    </button>
  );
}

export function Kit({ week, labels }: { week: WeekProps; labels: WeekLabels }) {
  return (
    <aside className="wk-rail" aria-label={labels.forThisWeek}>
      <section className="wk-card aim-rise" style={{ '--i': 3 } as MotionStyle} aria-labelledby="kit-h">
        <div className="wk-card-h"><h3 className="wk-h3" id="kit-h">{`Week ${week.n} kit`}</h3><small>{labels.inStepOrder}</small></div>
        <div id="wk-kit">
          {week.kit.map((g) => [
            <p className="wk-label wk-kit-g" key={g.label}>{g.label}</p>,
            <ul key={g.label + '-rows'}>
              {g.rows.map((r) => (
                <li className="wk-kit-row" key={r.title} data-acts={(r.acts?.length ?? 0) > 1 ? '2' : undefined} data-form-row={r.form ? '' : undefined}>
                  <span className="wk-ic"><Icon name={r.icon} size={16} /></span>
                  <span className="wk-kit-tx">
                    {r.href ? <a className="wk-kit-a" href={r.href} onClick={stop(r.href)}>{r.title}</a> : <b>{r.title}</b>}
                    <small>{r.meta}</small>
                    {r.tags && <span className="wk-tags">{r.tags.map((t) => <span key={t.label} className={'wk-chip' + (t.hi ? ' wk-chip-hi' : '')}>{t.label}</span>)}</span>}
                  </span>
                  <span className="wk-kit-acts">
                    {(r.acts ?? []).map((a) => <Act key={a.label} a={a} labels={labels} />)}
                    {r.href && !r.acts && <Icon name="right" size={16} className="wk-chev wk-arrow" />}
                  </span>
                </li>
              ))}
            </ul>,
          ])}
        </div>
        <div className="wk-kit-foot">
          <a className="wk-btn wk-btn-secondary wk-btn-arrow" href={week.libraryHref} onClick={stop(week.libraryHref)}><RollLabel>{labels.openLibrary}</RollLabel><Icon name="arrow" className="wk-arrow" /></a>
        </div>
      </section>
      {week.note && (
        <section className="wk-card aim-rise" style={{ '--i': 4 } as MotionStyle} aria-label={labels.instructorNote}>
          <div className="wk-note">
            <div className="wk-who"><span className="wk-av" aria-hidden="true">{week.note.initials}</span><span>{week.note.name}<small>{labels.whyThisWeek}</small></span></div>
            <p>{week.note.text}</p>
          </div>
        </section>
      )}
      <section className="wk-card aim-rise" style={{ '--i': 5 } as MotionStyle} aria-label={labels.questions}>
        <div className="wk-help"><b>{labels.questions}</b><a className="wk-mail" href={`mailto:${week.supportEmail}`}>{week.supportEmail}</a></div>
      </section>
    </aside>
  );
}
