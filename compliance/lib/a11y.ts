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
 * Verified against the reference: every pair below reproduces on design-reference/ with identical
 * ratios (re-measured after the rebrand, D-031). The app additionally FIXES three
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
  // Re-measured with axe ON THE REBRANDED REFERENCE (States, the agent shell and the prompt viewer,
  // light and dark), 2026-10-07, D-031. The rebrand CLOSED two of D-010's five: the dark theme's
  // white-on-Pine button (4.48) and its hover (3.49) are now Ink on Energy Bright, 9.10 and 10.94.
  // The three below are the same two defect classes as before — disabled text is low contrast by
  // intent, and the brand guide's own disabled grey (#8A968F) is what the light theme uses — and
  // each one is BETTER than the value it replaces (2.22 → 3.07, 2.38 → 2.74, 3.71 → 4.43).
  {
    fg: '#8a968f', // --text-disabled (ink-400, the brand guide's disabled grey)
    bg: '#ffffff', // --bg-sidebar (paper)
    ratio: 3.07,
    decision: 'D-010',
    why: 'Locked nav row, light theme. Fixing it means changing --text-disabled or --bg-sidebar.',
  },
  {
    fg: '#8a968f', // --text-disabled (ink-400)
    bg: '#f4f2ec', // --bg-sunken (Cream) — the code viewer's inset
    ratio: 2.74,
    decision: 'D-010',
    why: 'Line numbers in the prompt/skill-file viewer, which SCREENS § 3.2 specifies as --text-disabled.',
  },
  {
    fg: '#78837d', // --text-disabled, dark theme
    bg: '#111c18', // --bg-sidebar, dark theme
    ratio: 4.43,
    decision: 'D-010',
    why: 'Locked nav row, dark theme. Same token pair as above, dark mapping; 0.07 short of AA.',
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
