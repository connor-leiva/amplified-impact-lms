// S9, the hours calculator (brief § 4): the arithmetic, and the script that recounts as you slide.
//
//   hours back a week = the hours you spend × 0.5 (AI drafts about half, you check it)
//   a year            = a week × 50 work weeks
//   work weeks back   = a year ÷ 40 hours
//   your time         = a year × what an hour is worth
//
// The page prints the defaults' results (`hoursMath`, at build time), so it reads right with no script.
// The script recounts on every slide or keystroke and says the result to a screen reader (aria-live).
// On a wide screen with motion allowed, the figures count up once as the panel arrives, from 0 to what
// they say; any input stops that at once and shows the true figures.

import { COUNT_MS } from './count';
import { pinnable } from './pinned';

export const SHARE = 0.5;
export const WEEKS_A_YEAR = 50;
export const HOURS_A_WEEK = 40;

const one = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });
const whole = (n: number) => Math.round(n).toLocaleString('en-US');

export interface HoursResult {
  week: string;
  year: string;
  weeks: string;
  dollars: string;
  /** The 50 work weeks, each 0 to 1 lit. */
  cells: number[];
}

/** The results for `hours` a week in each row and an hour worth `rate` dollars. */
export function hoursMath(hours: readonly number[], rate: number): HoursResult {
  const week = hours.reduce((a, b) => a + b, 0) * SHARE;
  const year = week * WEEKS_A_YEAR;
  const weeks = year / HOURS_A_WEEK;
  return {
    week: one(week),
    year: whole(year),
    weeks: one(weeks),
    dollars: `$${whole(year * rate)}`,
    cells: Array.from({ length: WEEKS_A_YEAR }, (_, k) => Math.min(1, Math.max(0, weeks - k))),
  };
}

/** What a typed rate means: its digits and point, from 0 to `max`; anything else is 0. */
export function readRate(text: string, max: number): number {
  const n = Number.parseFloat(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
}

/**
 * S9's script: the sliders and the rate drive the results. The words it writes are the page's own
 * (`HOURS`), carried by the markup as templates, so the script holds no copy: `data-per-week` and
 * `data-per-week-said` on the section ({n}), and `data-said` on the weeks and the live line ({weeks},
 * {week}, {year}, {dollars}).
 */
export function initHours(sec: HTMLElement): void {
  const perWeek = (n: number) => (sec.dataset.perWeek ?? '{n}').replace('{n}', String(n));
  const perWeekSaid = (n: number) => (sec.dataset.perWeekSaid ?? '{n}').replace('{n}', String(n));
  const ranges = [...sec.querySelectorAll<HTMLInputElement>('input[type="range"]')];
  const rate = sec.querySelector<HTMLInputElement>('[data-v3-rate]');
  const max = Number(rate?.dataset.max ?? 100000);
  const out = (k: string) => sec.querySelector<HTMLElement>(`[data-v3-out="${k}"]`);
  const cellsBox = sec.querySelector<HTMLElement>('[data-v3-cells]');
  const cells = [...(cellsBox?.querySelectorAll<HTMLElement>('i') ?? [])];
  const said = sec.querySelector<HTMLElement>('[data-v3-said]');
  let frame = 0;
  const show = (r: HoursResult) => {
    for (const k of ['week', 'year', 'weeks', 'dollars'] as const) {
      const el = out(k);
      if (el) el.textContent = r[k];
    }
    cells.forEach((c, k) => c.style.setProperty('--f', String(r.cells[k] ?? 0)));
    if (cellsBox?.dataset.said) cellsBox.setAttribute('aria-label', cellsBox.dataset.said.replace('{weeks}', r.weeks));
  };
  const now = () => hoursMath(
    ranges.map((i) => Number(i.value)),
    readRate(rate?.value ?? '0', max),
  );
  const update = () => {
    cancelAnimationFrame(frame);
    for (const input of ranges) {
      const n = Number(input.value);
      input.style.setProperty('--fill', `${(n / Number(input.max)) * 100}%`);
      input.setAttribute('aria-valuetext', perWeekSaid(n));
      const val = input.closest('.hrs-row')?.querySelector('[data-v3-hrs-val]');
      if (val) val.textContent = perWeek(n);
    }
    const r = now();
    show(r);
    if (said?.dataset.said) said.textContent = said.dataset.said.replace('{week}', r.week).replace('{year}', r.year).replace('{dollars}', r.dollars);
  };
  for (const input of [...ranges, ...(rate ? [rate] : [])]) input.addEventListener('input', update);

  // The arrival: once, from 0 to the figures shown, on a wide screen with motion allowed.
  const panel = sec.querySelector<HTMLElement>('.hrs-out');
  if (!panel || !pinnable() || !('IntersectionObserver' in window) || panel.getBoundingClientRect().top < window.innerHeight) return;
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const hours = ranges.map((i) => Number(i.value));
      const r0 = readRate(rate?.value ?? '0', max);
      let start = 0;
      const step = (t: number) => {
        if (!start) start = t;
        const k = Math.min(1, (t - start) / COUNT_MS);
        const ease = 1 - Math.pow(1 - k, 3);
        show(k < 1 ? hoursMath(hours.map((h) => h * ease), r0) : now());
        if (k < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    },
    { threshold: 0.4 },
  );
  io.observe(panel);
}
