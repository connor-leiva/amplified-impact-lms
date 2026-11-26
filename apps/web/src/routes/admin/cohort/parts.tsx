import clsx from 'clsx';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { LAYOUT_KIND_LABEL } from '@ai/core';
import type { CohortSlot, SessionType } from '@ai/core';
import { Icon } from '../../../components/Icon';
import { Pill, Sel, k } from '../../../components/r2/kit';
import type { FactVM, PlanWeekVM } from './cohort.vm';
import c from './Cohort.module.css';

// D-255 (R-5 Phase 3): the pieces the Cohort page's tabs and New cohort share, each the mockup's own (p3-model.jsx,
// p3-cohort.jsx): a fact strip whose facts open what they count (`LFacts`), a week's number (`Wn`), the segmented
// control (`Seg`), the shape's fields (`ShapeFields`), the week picker (`WeekPick`) and the calendar a shape makes
// (`PlanList`).

/** `LFacts`: the key-facts strip, each fact that opens something a link with its chevron. */
export function LinkFacts({ items }: { items: readonly FactVM[] }) {
  return (
    <div className={c.fx}>
      {items.map((f) => {
        const value = f.short ? (
          <>
            <span className={c.fxLong}>{f.value}</span>
            <span className={c.fxShort}>{f.short}</span>
          </>
        ) : (
          f.value
        );
        return f.to ? (
          <Link key={f.label} to={f.to} className={c.fxl}>
            <span className={k.me}>{f.label}</span>
            <span className={clsx(k.w5, k.el)}>{value}</span>
            <Icon name="r2Chev" size={12} strokeWidth={2.2} />
          </Link>
        ) : (
          <div key={f.label}>
            <span className={k.me}>{f.label}</span>
            <span className={clsx(k.w5, k.el)}>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

/** `Wn`: a week's number, muted for a draft. */
export function Wn({ n, draft, small, picked }: { n: number | string; draft?: boolean; small?: boolean; picked?: boolean }) {
  return <span className={clsx(c.wn, small && c.sm, picked && c.pk, draft && !small && c.off)}>{n}</span>;
}

/** `Seg`: a segmented choice. */
export function Seg<T extends string | number>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: readonly (readonly [T, string])[]; label: string }) {
  return (
    <span className={c.seg} role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={String(v)} type="button" className={clsx(value === v && c.on)} aria-pressed={value === v} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </span>
  );
}

const DAYS: readonly (readonly [CohortSlot['day'], string])[] = [
  [1, 'Monday'],
  [2, 'Tuesday'],
  [3, 'Wednesday'],
  [4, 'Thursday'],
  [5, 'Friday'],
];
const TIMES: readonly (readonly [string, string])[] = [
  ['09:00', '9:00 AM'],
  ['10:00', '10:00 AM'],
  ['11:00', '11:00 AM'],
  ['12:00', '12:00 PM'],
  ['13:00', '1:00 PM'],
  ['14:00', '2:00 PM'],
  ['15:00', '3:00 PM'],
];
const KINDS: readonly SessionType[] = ['live_build', 'office_hours', 'other'];
/** A new meeting, as the mockup's `times` adds one: Tuesday, then Thursday, then Friday; a build first, then office hours. */
const slotFor = (i: number): CohortSlot => ({
  day: ([2, 4, 5] as const)[i] ?? 5,
  time: '12:00',
  kind: i ? 'office_hours' : 'live_build',
  mins: i ? 60 : 90,
});

export interface ShapeForm {
  picks: string[];
  slots: CohortSlot[];
  setupWeek: boolean;
}

/** `ShapeFields`: how long it runs and how often you meet. `ids` are the program's building weeks, in order. */
export function ShapeFields({ f, up, ids, locked }: { f: ShapeForm; up: (p: Partial<ShapeForm>) => void; ids: readonly string[]; locked?: boolean }) {
  const weeks = (n: number) => {
    const p = [...f.picks];
    while (p.length > n) p.pop();
    while (p.length < n) {
      const next = ids.find((id) => !p.includes(id));
      if (next === undefined) break;
      p.push(next);
    }
    up({ picks: ids.filter((id) => p.includes(id)) });
  };
  const slot = (i: number, patch: Partial<CohortSlot>) => up({ slots: f.slots.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const times = (n: number) => up({ slots: Array.from({ length: n }, (_, i) => f.slots[i] ?? slotFor(i)) });
  return (
    <div className={k.col}>
      <div className={c.shapeRow}>
        <div className={c.lab}>
          <span>Weeks of building</span>
          <span className={c.stp2}>
            <button type="button" aria-label="One week fewer" disabled={locked || f.picks.length <= 1} onClick={() => weeks(f.picks.length - 1)}>
              −
            </button>
            <b className={k.tn}>{f.picks.length}</b>
            <button
              type="button"
              aria-label="One week more"
              disabled={locked || f.picks.length >= ids.length}
              title={f.picks.length >= ids.length ? `The curriculum has ${ids.length} building weeks. Add one there first.` : undefined}
              onClick={() => weeks(f.picks.length + 1)}
            >
              +
            </button>
          </span>
        </div>
        <div className={c.lab}>
          <span>You meet</span>
          {locked ? (
            <span className={k.s2}>{f.slots.length === 1 ? 'Once a week' : f.slots.length === 2 ? 'Twice a week' : `${f.slots.length} times`}</span>
          ) : (
            <Seg
              label="You meet"
              value={f.slots.length}
              onChange={times}
              options={[
                [1, 'Once a week'],
                [2, 'Twice a week'],
                [3, 'Three times'],
              ]}
            />
          )}
        </div>
      </div>
      <div className={c.lab}>
        <span>When</span>
        <span className={c.fat}>Mountain time. Learners see Central, one hour later.</span>
        <div className={c.lns}>
          {f.slots.map((s, i) => (
            <div key={i} className={c.slt}>
              <Sel aria-label={`Day ${i + 1}`} disabled={locked} value={String(s.day)} onChange={(e) => slot(i, { day: Number(e.target.value) as CohortSlot['day'] })}>
                {DAYS.map(([d, l]) => (
                  <option key={d} value={d}>
                    {l}
                  </option>
                ))}
              </Sel>
              <Sel aria-label={`Time ${i + 1}`} disabled={locked} value={s.time} onChange={(e) => slot(i, { time: e.target.value })}>
                {TIMES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Sel>
              <Sel
                aria-label={`Kind ${i + 1}`}
                disabled={locked}
                value={s.kind}
                onChange={(e) => {
                  const kind = e.target.value as SessionType;
                  slot(i, { kind, mins: kind === 'live_build' ? 90 : 60 });
                }}
              >
                {KINDS.map((kd) => (
                  <option key={kd} value={kd}>
                    {LAYOUT_KIND_LABEL[kd]}
                  </option>
                ))}
              </Sel>
            </div>
          ))}
        </div>
      </div>
      <label className={c.ckr}>
        <input type="checkbox" checked={f.setupWeek} disabled={locked} onChange={(e) => up({ setupWeek: e.target.checked })} />
        <span className={clsx(k.col, k.col0)}>
          <span className={k.w5}>Start with a setup week</span>
          <span className={k.me}>Week 0, self-paced, opens a week before Week 1. Teams fill in their intake and get their AI ready.</span>
        </span>
      </label>
    </div>
  );
}

export interface PickWeek {
  id: string;
  title: string;
  outcome: string;
  published: boolean;
  steps: number;
}

/** `WeekPick`: which of the program's weeks the cohort runs. They keep the curriculum's order. */
export function WeekPick({ weeks, picks, onChange }: { weeks: readonly PickWeek[]; picks: readonly string[]; onChange: (p: string[]) => void }) {
  const ids = weeks.map((w) => w.id);
  return (
    <div className={c.wpl}>
      {weeks.map((w) => {
        const i = picks.indexOf(w.id);
        const on = i >= 0;
        return (
          <label key={w.id} className={clsx(c.wpk, on && c.on)}>
            <input
              type="checkbox"
              checked={on}
              disabled={on && picks.length === 1}
              onChange={() => onChange(ids.filter((id) => (id === w.id ? !on : picks.includes(id))))}
            />
            <Wn n={on ? i + 1 : '·'} small picked={on} />
            <span className={clsx(k.col, k.col0, c.grow)}>
              <span className={clsx(k.w5, k.el, c.wpTitle)}>{w.title}</span>
              <span className={clsx(k.me, k.el, c.wpSub)}>{w.outcome}</span>
            </span>
            {w.published ? <Pill tone="ok">Published</Pill> : <Pill tone={w.steps ? 'neutral' : 'warn'}>{w.steps ? `Draft · ${w.steps} steps` : 'Not built yet'}</Pill>}
          </label>
        );
      })}
    </div>
  );
}

/** `PlanList`: the calendar a shape makes, week by week. */
export function PlanList({ plan, free }: { plan: readonly PlanWeekVM[]; free?: boolean }) {
  return (
    // A list that scrolls is a region a keyboard can reach (axe's scrollable-region-focusable); the free one grows.
    <div className={clsx(c.ncl, free && c.free)} {...(free ? {} : { tabIndex: 0, role: 'region', 'aria-label': 'What this makes' })}>
      {plan.map((w) => (
        <div key={w.id} className={c.ncw}>
          <Wn n={w.n} small picked />
          <span className={clsx(k.col, c.grow)} style={{ gap: 4 }}>
            <span className={clsx(k.w5, k.el)}>{w.title}</span>
            <span className={k.me}>{w.opens}</span>
            <span className={c.chips}>
              {w.sessions.length ? (
                w.sessions.map((s, i) => (
                  <span key={i} className={clsx(c.skc, s.tone === 'alt' && c.alt, s.tone === 'warn' && c.warn)} title={s.title}>
                    {s.label}
                  </span>
                ))
              ) : (
                <span className={clsx(c.skc, c.off)}>Self-paced</span>
              )}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** A label over its field (`.lab`), with an optional hint under the label (`.fat`). */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className={c.lab}>
      {label}
      {hint ? <span className={c.fat}>{hint}</span> : null}
      {children}
    </label>
  );
}
