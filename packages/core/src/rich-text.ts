// Inline formatting for a step's words (D-209). A field keeps its plain string, which is what the
// copy rules and the glossary read. `rich` is optional sanitized JSON. Absent, the string renders
// as it always has.

import type { GlossarySpan } from './glossary';

export const BRAND_COLORS = [
  { id: 'ink', label: 'Ink', value: 'var(--r2-ink)' },
  { id: 'muted', label: 'Muted', value: 'color-mix(in srgb, var(--r2-ink) 68%, transparent)' },
  { id: 'forest', label: 'Forest', value: 'var(--r2-for)' },
  { id: 'energy', label: 'Energy', value: 'var(--r2-energy)' },
  { id: 'mint', label: 'Mint', value: 'var(--r2-mint)' },
] as const;

/** Brand faces first, then a short web-safe list. */
export const RICH_FONTS = [
  { id: 'Geist, system-ui, sans-serif', label: 'Geist', brand: true },
  { id: "'Geist Mono', ui-monospace, monospace", label: 'Geist Mono', brand: true },
  { id: 'Georgia, serif', label: 'Georgia', brand: false },
  { id: 'Palatino, "Palatino Linotype", serif', label: 'Palatino', brand: false },
  { id: '"Times New Roman", Times, serif', label: 'Times New Roman', brand: false },
  { id: 'Arial, Helvetica, sans-serif', label: 'Arial', brand: false },
  { id: 'Verdana, Geneva, sans-serif', label: 'Verdana', brand: false },
  { id: '"Courier New", Courier, monospace', label: 'Courier New', brand: false },
] as const;

export const RICH_SIZES = [16, 18, 20, 25, 31] as const;

const HEX = /^#[0-9a-fA-F]{6}$/;
const SIZE = /^([1-9]\d?)px$/;
const WASH = /^color-mix\(in srgb, (?:var\(--r2-(?:ink|for|energy|mint)\)|#[0-9a-fA-F]{6}) (?:[1-9]|[1-9]\d|100)%, transparent\)$/;

const COLOR_VALUES = new Set<string>(BRAND_COLORS.map((c) => c.value));
const FONT_VALUES = new Set<string>(RICH_FONTS.map((f) => f.id));

export interface RichMark {
  type: 'bold' | 'italic' | 'textStyle' | 'highlight';
  attrs?: { color?: string; fontFamily?: string; fontSize?: string };
}

export interface RichTextNode {
  type: 'text';
  text: string;
  marks?: RichMark[];
}

export interface RichParagraph {
  type: 'paragraph';
  content?: RichTextNode[];
}

export interface RichText {
  type: 'doc';
  content: RichParagraph[];
}

export interface PaintedRun {
  text: string;
  marks: RichMark[];
  termId?: string;
}

const okColor = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  if (COLOR_VALUES.has(v) || HEX.test(v)) return HEX.test(v) ? v.toLowerCase() : v;
  return undefined;
};

const okWash = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  if (WASH.test(v) || COLOR_VALUES.has(v) || HEX.test(v)) return HEX.test(v) ? v.toLowerCase() : v;
  return undefined;
};

const okFont = (v: unknown): string | undefined => (typeof v === 'string' && FONT_VALUES.has(v) ? v : undefined);

const okSize = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const m = SIZE.exec(v);
  if (!m) return undefined;
  const n = Number(m[1]);
  return n >= 8 && n <= 96 ? `${n}px` : undefined;
};

function cleanMark(mark: RichMark): RichMark | undefined {
  if (mark.type === 'bold' || mark.type === 'italic') return { type: mark.type };
  if (mark.type === 'highlight') {
    const color = okWash(mark.attrs?.color);
    return color ? { type: 'highlight', attrs: { color } } : { type: 'highlight' };
  }
  if (mark.type !== 'textStyle') return undefined;
  const attrs: NonNullable<RichMark['attrs']> = {};
  const color = okColor(mark.attrs?.color);
  const fontFamily = okFont(mark.attrs?.fontFamily);
  const fontSize = okSize(mark.attrs?.fontSize);
  if (color) attrs.color = color;
  if (fontFamily) attrs.fontFamily = fontFamily;
  if (fontSize) attrs.fontSize = fontSize;
  return color || fontFamily || fontSize ? { type: 'textStyle', attrs } : undefined;
}

/** Drop every node and mark the editor is not allowed to store. */
export function sanitizeRich(value: unknown): RichText | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const doc = value as { type?: unknown; content?: unknown };
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) return undefined;
  const content: RichParagraph[] = [];
  for (const block of doc.content) {
    if (!block || typeof block !== 'object' || (block as { type?: unknown }).type !== 'paragraph') continue;
    const nodes = (block as { content?: unknown }).content;
    const paragraph: RichParagraph = { type: 'paragraph' };
    if (Array.isArray(nodes)) {
      const text: RichTextNode[] = [];
      for (const node of nodes) {
        if (!node || typeof node !== 'object' || (node as { type?: unknown }).type !== 'text') continue;
        const raw = (node as { text?: unknown }).text;
        if (typeof raw !== 'string' || !raw) continue;
        const marks = Array.isArray((node as { marks?: unknown }).marks)
          ? ((node as { marks: RichMark[] }).marks.map(cleanMark).filter((m): m is RichMark => !!m))
          : [];
        text.push(marks.length ? { type: 'text', text: raw, marks } : { type: 'text', text: raw });
      }
      if (text.length) paragraph.content = text;
    }
    content.push(paragraph);
  }
  return content.length ? { type: 'doc', content } : undefined;
}

/** The words, one paragraph per line. This is what the copy rules and the glossary see. */
export function stripRich(doc: RichText): string {
  return doc.content.map((p) => (p.content ?? []).map((n) => n.text).join('')).join('\n');
}

/** Store the doc only when it says more than the plain string. */
export function storedRich(value: unknown): RichText | undefined {
  const doc = sanitizeRich(value);
  if (!doc) return undefined;
  const styled = doc.content.some((p) => p.content?.some((n) => n.marks?.length));
  if (styled || doc.content.length > 1) return doc;
  return undefined;
}

export function plainDoc(text: string): RichText {
  const lines = text.split('\n');
  return {
    type: 'doc',
    content: lines.map((line) => (line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' })),
  };
}

/** Split the doc's text nodes where a glossary term starts or ends. Offsets follow `stripRich`. */
export function paintRich(doc: RichText, spans: readonly GlossarySpan[] | undefined): PaintedRun[][] {
  const plain = stripRich(doc);
  const covered = spans && spans.reduce((n, s) => n + s.text.length, 0) === plain.length ? spans : undefined;
  const ranges: { start: number; end: number; id?: string }[] = [];
  if (covered) {
    let at = 0;
    for (const span of covered) {
      ranges.push({ start: at, end: at + span.text.length, ...(span.kind === 'term' ? { id: span.id } : {}) });
      at += span.text.length;
    }
  }
  const termAt = (i: number) => ranges.find((r) => r.id && i >= r.start && i < r.end)?.id;
  let cursor = 0;
  return doc.content.map((p, pi) => {
    if (pi > 0) cursor += 1;
    const runs: PaintedRun[] = [];
    for (const node of p.content ?? []) {
      const marks = node.marks ?? [];
      let i = 0;
      while (i < node.text.length) {
        const id = termAt(cursor + i);
        let j = i + 1;
        while (j < node.text.length && termAt(cursor + j) === id) j += 1;
        const prev = runs[runs.length - 1];
        const text = node.text.slice(i, j);
        if (prev && prev.termId === id && JSON.stringify(prev.marks) === JSON.stringify(marks)) prev.text += text;
        else runs.push({ text, marks, ...(id ? { termId: id } : {}) });
        i = j;
      }
      cursor += node.text.length;
    }
    return runs;
  });
}
