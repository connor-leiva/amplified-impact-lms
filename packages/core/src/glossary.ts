// Glossary terms (D-193). Pure: no clock, no random source, no I/O.
//
// A term is course copy on the cohort (`CohortCourse.glossary`). Step pages underline the first use of
// a term or an alias, whole word and case-insensitive, and only when the term is switched on and its
// first step is this step or earlier. The Know These card lists terms by id and skips an id that is
// not in the glossary.

import type { GlossaryTerm } from './course-types';

/** A slice of a string. `term` is the first use of that glossary id on the page. */
export type GlossarySpan = { kind: 'text'; text: string } | { kind: 'term'; text: string; id: string };

const TERM_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Terms a step may underline: switched on, and `firstStep` absent or at or before this step. */
export function termsForStep(terms: readonly GlossaryTerm[], step: number): GlossaryTerm[] {
  return terms.filter((t) => t.underline !== false && (t.firstStep === undefined || t.firstStep <= step));
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Hit {
  start: number;
  end: number;
  id: string;
  len: number;
  order: number;
}

/** Whole-word hits, case-insensitive. A letter, number or underscore on either side blocks a hit. */
function hitsIn(text: string, terms: readonly GlossaryTerm[]): Hit[] {
  const hits: Hit[] = [];
  terms.forEach((term, order) => {
    const phrases = [term.term, ...term.aliases].map((p) => p.trim()).filter(Boolean);
    for (const phrase of phrases) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRe(phrase)}(?![\\p{L}\\p{N}_])`, 'giu');
      for (const m of text.matchAll(re)) {
        const start = m.index ?? 0;
        hits.push({ start, end: start + m[0].length, id: term.id, len: m[0].length, order });
      }
    }
  });
  return hits;
}

/**
 * The first unused term in `text`. Longer phrases win when they overlap (so "Inbox folder" beats
 * "inbox", and "your AI Implementer" beats "Your AI"). A term already marked still holds its words, so
 * a shorter term inside them isn't marked instead: the second "your AI Implementer" is plain text, not
 * the "Your AI" term (D-243). `used` gains each id this call marks.
 */
function take(text: string, terms: readonly GlossaryTerm[], used: Set<string>): GlossarySpan[] {
  const hits = hitsIn(text, terms).sort((a, b) => a.start - b.start || b.len - a.len || a.order - b.order);
  const chosen: Hit[] = [];
  // Words of a term marked in an earlier text are held before anything is chosen, so a shorter term that starts
  // first ("your AI" in "your AI Office") can't take them either.
  const held: Hit[] = hits.filter((h) => used.has(h.id));
  const overlaps = (h: Hit, c: Hit): boolean => h.start < c.end && h.end > c.start;
  // A longer term that holds the held words whole still wins, as longer phrases do ("Inbox folder" over "inbox").
  const covers = (h: Hit, c: Hit): boolean => h.start <= c.start && h.end >= c.end && h.len > c.len;
  for (const h of hits) {
    if (held.includes(h)) continue;
    if (chosen.some((c) => overlaps(h, c)) || held.some((c) => overlaps(h, c) && !covers(h, c))) continue;
    if (used.has(h.id)) {
      held.push(h);
      continue;
    }
    chosen.push(h);
    used.add(h.id);
  }
  chosen.sort((a, b) => a.start - b.start);
  const spans: GlossarySpan[] = [];
  let at = 0;
  for (const h of chosen) {
    if (h.start > at) spans.push({ kind: 'text', text: text.slice(at, h.start) });
    spans.push({ kind: 'term', text: text.slice(h.start, h.end), id: h.id });
    at = h.end;
  }
  if (at < text.length) spans.push({ kind: 'text', text: text.slice(at) });
  return spans;
}

/**
 * First use of each term across `texts`, in order. A null entry is not a surface (a copy box, a
 * heading, a link) and is skipped. A string with no new term comes back undefined, so the caller
 * can leave that text as it was.
 */
export function markSequence(
  texts: readonly (string | null | undefined)[],
  terms: readonly GlossaryTerm[],
  step: number,
): (GlossarySpan[] | undefined)[] {
  const active = termsForStep(terms, step);
  const used = new Set<string>();
  return texts.map((text) => {
    if (!text || !active.length) return undefined;
    const spans = take(text, active, used);
    return spans.some((s) => s.kind === 'term') ? spans : undefined;
  });
}

/** The card's rows, in the order the item names them. An id that is not in the glossary is skipped. */
export function cardTerms(
  ids: readonly string[],
  glossary: readonly GlossaryTerm[] | undefined,
): { id: string; term: string; short: string }[] {
  if (!glossary?.length) return [];
  const byId = new Map(glossary.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const out: { id: string; term: string; short: string }[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const t = byId.get(id);
    if (t) out.push({ id: t.id, term: t.term, short: t.short });
  }
  return out;
}

/** Trimmed terms, with a blank alias dropped and the underline stored only when it is off. */
export function normalizeGlossary(terms: readonly GlossaryTerm[]): GlossaryTerm[] {
  return terms.map((t) => {
    const out: GlossaryTerm = {
      id: t.id.trim(),
      term: t.term.trim(),
      short: t.short.trim(),
      long: t.long.trim(),
      aliases: t.aliases.map((a) => a.trim()).filter(Boolean),
    };
    if (t.firstStep !== undefined) out.firstStep = t.firstStep;
    if (t.underline === false) out.underline = false;
    return out;
  });
}

/** What a glossary save is refused for, before the copy rules. One line per problem. */
export function glossaryIssues(terms: readonly GlossaryTerm[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  terms.forEach((t, i) => {
    const label = `Glossary ${i + 1}`;
    const id = t.id.trim();
    if (!TERM_ID.test(id)) out.push(`${label}: Use a lower-case id like owner or seat-card.`);
    else if (seen.has(id)) out.push(`${label}: ${id} is already a glossary term.`);
    else seen.add(id);
    if (!t.term.trim()) out.push(`${label}: Write the term.`);
    if (!t.short.trim()) out.push(`${label}: Write the short meaning.`);
    if (!t.long.trim()) out.push(`${label}: Write the long meaning.`);
    if (t.firstStep !== undefined && (!Number.isInteger(t.firstStep) || t.firstStep < 1 || t.firstStep > 99))
      out.push(`${label}: First step is a step number.`);
  });
  return out;
}
