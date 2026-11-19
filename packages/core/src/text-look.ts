// How a step's paragraph is styled (piece 5). Optional on the block, so a paragraph that has none
// is the same string it always was. The builder preview and the learner page both read this.

import type { GlossarySpan } from './glossary';

export const TEXT_COLORS = ['ink', 'muted', 'forest', 'energy', 'mint'] as const;
export type TextColor = (typeof TEXT_COLORS)[number];
export const TEXT_FONTS = ['sans', 'mono'] as const;
export type TextFont = (typeof TEXT_FONTS)[number];
/** Desktop sizes. 16 is the phone floor, so none of these shrink on a phone. */
export const TEXT_SIZES = [16, 18, 20, 25, 31] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export interface TextRange {
  start: number;
  end: number;
}

export interface TextLook {
  /** A brand swatch, or a custom `#rrggbb` from the picker. */
  color?: TextColor | string;
  font?: TextFont;
  size?: TextSize;
  highlight?: TextRange[];
}

export interface TextRun {
  text: string;
  termId?: string;
  highlight: boolean;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export const isTextColor = (v: string): v is TextColor => (TEXT_COLORS as readonly string[]).includes(v);
export const isTextFont = (v: string): v is TextFont => (TEXT_FONTS as readonly string[]).includes(v);
export const isTextSize = (v: number): v is TextSize => (TEXT_SIZES as readonly number[]).includes(v);

/** Drop ranges that are empty or outside the text, and merge ones that touch. */
export function mergeRanges(ranges: readonly TextRange[], len: number): TextRange[] {
  const sorted = ranges
    .map((r) => ({ start: Math.max(0, Math.floor(r.start)), end: Math.min(len, Math.floor(r.end)) }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const out: TextRange[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else out.push({ start: r.start, end: r.end });
  }
  return out;
}

/** Add a selection, or clear it when it already sits inside a highlight. */
export function toggleRange(ranges: readonly TextRange[] | undefined, start: number, end: number, len: number): TextRange[] {
  const a = Math.max(0, Math.min(start, end));
  const b = Math.min(len, Math.max(start, end));
  const current = mergeRanges(ranges ?? [], len);
  if (b <= a) return current;
  const covered = current.some((r) => r.start <= a && r.end >= b);
  if (!covered) return mergeRanges([...current, { start: a, end: b }], len);
  const next: TextRange[] = [];
  for (const r of current) {
    if (r.end <= a || r.start >= b) next.push(r);
    else {
      if (r.start < a) next.push({ start: r.start, end: a });
      if (r.end > b) next.push({ start: b, end: r.end });
    }
  }
  return next;
}

/** Keep only values the picker can write. An empty look comes back undefined. */
export function cleanLook(look: TextLook | undefined, text: string): TextLook | undefined {
  if (!look) return undefined;
  const next: TextLook = {};
  if (typeof look.color === 'string' && (isTextColor(look.color) || HEX.test(look.color))) next.color = isTextColor(look.color) ? look.color : look.color.toLowerCase();
  if (look.font && isTextFont(look.font)) next.font = look.font;
  if (typeof look.size === 'number' && isTextSize(look.size)) next.size = look.size;
  const highlight = mergeRanges(look.highlight ?? [], text.length);
  if (highlight.length) next.highlight = highlight;
  return next.color || next.font || next.size || next.highlight ? next : undefined;
}

/**
 * The paragraph as runs. Glossary spans and highlight ranges share the plain-text offsets, so a
 * term inside a highlight stays a term.
 */
export function textRuns(text: string, spans: readonly GlossarySpan[] | undefined, highlights: readonly TextRange[] | undefined): TextRun[] {
  const marks = mergeRanges(highlights ?? [], text.length);
  const on = (i: number) => marks.some((r) => i >= r.start && i < r.end);
  const base: readonly GlossarySpan[] = spans && spans.length ? spans : [{ kind: 'text', text }];
  const out: TextRun[] = [];
  let at = 0;
  const push = (slice: string, from: number, termId?: string) => {
    let i = 0;
    while (i < slice.length) {
      const hi = on(from + i);
      let j = i + 1;
      while (j < slice.length && on(from + j) === hi) j += 1;
      const chunk = slice.slice(i, j);
      const prev = out[out.length - 1];
      if (prev && prev.highlight === hi && prev.termId === termId) prev.text += chunk;
      else out.push({ text: chunk, highlight: hi, ...(termId ? { termId } : {}) });
      i = j;
    }
  };
  for (const span of base) {
    push(span.text, at, span.kind === 'term' ? span.id : undefined);
    at += span.text.length;
  }
  return out.filter((r) => r.text.length > 0);
}
