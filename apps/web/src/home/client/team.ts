// The Team Plan calculator: the slider sets how many agents, which sets the tier, the price today and
// the monthly price after. Every figure and word comes from the panel's `data-*` (written by the build
// from `../prices.ts` and `../content.ts`); this file holds no price.
//
// The slider's value is also the Team Plan card's (`plans.ts`), so `onAgents` hears every change.

import { usd } from './fill';
import { countingNumber } from './motion';

const numbers = (s: string | undefined): number[] => (s ?? '').split(',').map(Number);

export function initTeamCalc(panel: HTMLElement, onAgents: (agents: number) => void): void {
  const d = panel.dataset;
  const input = panel.querySelector<HTMLInputElement>('input[type="range"]')!;
  const count = panel.querySelector<HTMLElement>('[data-calc-count]')!;
  const tierLabel = panel.querySelector<HTMLElement>('[data-calc-tier]')!;
  const price = panel.querySelector<HTMLElement>('[data-calc-price]')!;
  const after = panel.querySelector<HTMLElement>('[data-calc-after]')!;
  const extra = panel.querySelector<HTMLElement>('[data-calc-extra]')!;
  const seats = [...panel.querySelectorAll<HTMLElement>('.seat')];
  const tierMax = Number(d.tierMax);
  const today = numbers(d.today);
  const tiers = (d.tiers ?? '').split('|');
  const afters = (d.after ?? '').split('|');
  const max = Number(input.max);
  const min = Number(input.min);

  const tierOf = (n: number) => (n > tierMax ? 1 : 0);
  const show = countingNumber(price, today[tierOf(Number(input.value))]!, usd);

  const update = () => {
    const n = Number(input.value);
    const tier = tierOf(n);
    count.textContent = String(n);
    input.style.setProperty('--fill', `${(((n - min) / (max - min)) * 100).toFixed(2)}%`);
    seats.forEach((s, i) => s.classList.toggle('is-on', i < n));
    tierLabel.textContent = tiers[tier]!;
    after.textContent = afters[tier]!;
    extra.hidden = tier === 0;
    show(today[tier]!);
    // What a screen reader hears as the slider moves: the count, and what it costs.
    input.setAttribute('aria-valuetext', `${n}, ${tiers[tier]}, ${usd(today[tier]!)} ${d.unit ?? ''}`.trim());
    onAgents(n);
  };
  input.addEventListener('input', update);
  update();
}
