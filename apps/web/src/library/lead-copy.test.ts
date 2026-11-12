import { GROK_TEMPLATES } from '@ai/core/grok-templates';
import { SKILL_CATALOG } from '@ai/core/skills';
import { describe, expect, it } from 'vitest';
import { ENTRIES, FOR_ROLES, GUIDE_WHO, leadFor, type Entry } from './content';

// THE LEAD'S COPY (`LEAD` in `content.ts`): every Library entry leads with the problem it fixes, in words
// a 4th grader could read (Spring, via Connor, 2026-11-12). These tests hold the copy to its rules, so a
// later edit can't slip jargon, hype or a made-up number in. Where it shows, and that it shows first, is
// `lead-render.test.ts`'s.

const slugOf = (e: Entry) => (e.href ?? '').replace(/^\//, '');

/** Sentences, by their closing mark. */
const sentences = (s: string) => s.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [];

/**
 * A rough Flesch-Kincaid grade, with the usual vowel-group syllable count: enough to catch a lead
 * that drifts far from a 4th grade read. Short texts are noisy, so the bar per lead is loose and the
 * bar across all of them is tight.
 */
function grade(s: string): number {
  const words = s.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  const syllables = (word: string) => {
    let w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    return Math.max(1, (w.match(/[aeiouy]{1,2}/g) ?? []).length);
  };
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  return 0.39 * (words.length / Math.max(1, sentences(s).length)) + 11.8 * (syl / words.length) - 15.59;
}

describe('every entry’s lead: the copy', () => {
  it('gives every Library entry, free and locked, skills, guides and Grok Bot templates, a problem and an outcome', () => {
    expect(ENTRIES).toHaveLength(58);
    for (const e of ENTRIES) {
      expect(e.problem.trim(), e.title).not.toBe('');
      expect(e.outcome.trim(), e.title).not.toBe('');
      expect(FOR_ROLES, e.title).toContain(e.forRole);
    }
    // Every Grok Bot template on the shelf is in there too.
    expect(ENTRIES.filter((e) => e.collection !== undefined).map(slugOf).sort()).toEqual(GROK_TEMPLATES.map((g) => g.id).sort());
  });

  it('keeps the problem to one or two short sentences and the outcome to one', () => {
    for (const e of ENTRIES) {
      expect(sentences(e.problem).length, e.title).toBeGreaterThanOrEqual(1);
      expect(sentences(e.problem).length, e.title).toBeLessThanOrEqual(2);
      expect(sentences(e.outcome), e.title).toHaveLength(1);
      expect(e.problem.length, e.title).toBeLessThanOrEqual(160);
      expect(e.outcome.length, e.title).toBeLessThanOrEqual(140);
    }
  });

  it('uses no jargon, no hype, no dashes and no made-up numbers', () => {
    // The brief: "no MCP, API, prompt, connector or token in the lead". No hype. A number only where it
    // is the name of the thing (a 1099, a W-9, an L10), never a time saved or a result.
    const jargon = /\b(MCP|APIs?|prompts?|connectors?|tokens?)\b/i;
    const hype = /\b(stunning|amazing|game.?changer|revolutionary|effortless|magic(al)?|supercharge|seamless(ly)?|powerful|winning|guarantee[ds]?|10x)\b/i;
    const names = /\b(1099|W-9|L10)\b/g;
    for (const e of ENTRIES) {
      for (const field of [e.problem, e.outcome, e.forRole ?? '']) {
        expect(field, e.title).not.toMatch(jargon);
        expect(field, e.title).not.toMatch(hype);
        expect(field, e.title).not.toMatch(/[–—]/);
        expect(field.replace(names, ''), e.title).not.toMatch(/[\d%$]/);
      }
    }
  });

  it('reads at about a 4th grade level', () => {
    const grades = ENTRIES.map((e) => [e.title, grade(`${e.problem} ${e.outcome}`)] as const);
    for (const [title, g] of grades) expect(g, title).toBeLessThanOrEqual(8);
    const mean = grades.reduce((n, [, g]) => n + g, 0) / grades.length;
    expect(mean).toBeLessThanOrEqual(5);
  });

  it('says what you get, never that it sends, posts or decides for you: it drafts, you check', () => {
    for (const e of ENTRIES) expect(e.outcome, e.title).not.toMatch(/\bit (sends|posts|publishes|submits|files|decides|changes)\b/i);
  });

  it('never says who it’s for in a way the catalog contradicts', () => {
    for (const e of ENTRIES) {
      const slug = slugOf(e);
      const sets =
        SKILL_CATALOG.find((s) => s.id === slug || s.page === slug)?.sets ??
        GROK_TEMPLATES.find((g) => g.id === slug)?.sets ??
        (GUIDE_WHO[slug]?.join() === 'agents' ? 'agent' : GUIDE_WHO[slug]?.join() === 'owners' ? 'owner_ops' : 'both');
      if (sets === 'agent') expect(['Agent', 'Anyone'], e.title).toContain(e.forRole);
      if (sets === 'owner_ops') expect(e.forRole, e.title).not.toBe('Agent');
    }
  });

  it('finds a page’s lead by its path, in its card’s own words', () => {
    const tc = ENTRIES.find((e) => e.href === '/tc-file-audit') as Entry;
    expect(leadFor('tc-file-audit')).toEqual({ problem: tc.problem, outcome: tc.outcome, forRole: tc.forRole });
    expect(leadFor('no-such-page')).toBeUndefined();
  });
});
