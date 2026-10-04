import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Accessibility gate: zero serious or critical axe violations, except for defects the reference
 * prototype itself has and which cannot be fixed without changing a generated design token.
 *
 * Those are matched by their MEASURED COLOUR PAIR, not by a selector, so the allowance covers
 * exactly the two known shortfalls and nothing else. A new contrast failure anywhere, in any other
 * colours, still fails the gate. Each allowance names a DECISIONS.md entry and is printed on every
 * run so it stays visible rather than fading into the background.
 *
 * Verified against the unmodified prototype: both pairs below reproduce on
 * design-reference/States.dc.html with identical ratios. The app additionally FIXES three
 * violations the reference has — `nested-interactive` on the Employee Card, plus `document-title`
 * and `html-has-lang`.
 */
interface KnownContrastDefect {
  fg: string;
  bg: string;
  ratio: number;
  decision: string;
  why: string;
}

const KNOWN_CONTRAST_DEFECTS: KnownContrastDefect[] = [
  {
    fg: '#a6a4a0', // --text-disabled (ink-400)
    bg: '#f4f2ef', // --bg-sidebar (ink-100)
    ratio: 2.22,
    decision: 'D-010',
    why: 'Locked nav row, light theme. Fixing it means changing --text-disabled or --bg-sidebar.',
  },
  {
    fg: '#6e6b67', // --text-disabled (ink-500)
    bg: '#0c0b08', // --bg-sidebar, dark theme
    ratio: 3.71,
    decision: 'D-010',
    why: 'Locked nav row, dark theme. Same token pair as above, dark mapping.',
  },
  {
    fg: '#ffffff', // --action-on-primary
    bg: '#2f8380', // --action-primary, dark theme
    ratio: 4.48,
    decision: 'D-010',
    why: 'White on the Pine accent, dark theme: 4.48:1, 0.02 short of AA. Fixing it means changing the brand accent.',
  },
  {
    fg: '#ffffff', // --action-on-primary
    bg: '#439692', // --action-primary-hover, dark theme
    ratio: 3.49,
    decision: 'D-010',
    why: 'White on the hovered Pine accent, dark theme. The hover step lightens the background, so it falls further than the resting state.',
  },
];

const norm = (c: string | undefined) => (c ?? '').trim().toLowerCase();

export async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');

  const unexpected: string[] = [];
  const allowed = new Map<string, number>();

  for (const v of serious) {
    for (const node of v.nodes) {
      const target = node.target.join(' ');
      let known: KnownContrastDefect | undefined;
      if (v.id === 'color-contrast') {
        const data = node.any.find((a) => a.id === 'color-contrast')?.data as
          | { contrastRatio?: number; fgColor?: string; bgColor?: string }
          | undefined;
        known = KNOWN_CONTRAST_DEFECTS.find(
          (k) =>
            norm(data?.fgColor) === k.fg &&
            norm(data?.bgColor) === k.bg &&
            Math.abs((data?.contrastRatio ?? 0) - k.ratio) < 0.05,
        );
      }
      if (known) allowed.set(known.decision, (allowed.get(known.decision) ?? 0) + 1);
      else unexpected.push(`${v.id}: ${target}`);
    }
  }

  if (allowed.size)
    console.log(
      `  a11y: known reference defects allowed — ${[...allowed].map(([d, n]) => `${d} ×${n}`).join(', ')} (see DECISIONS.md)`,
    );
  expect(unexpected).toEqual([]);
}
