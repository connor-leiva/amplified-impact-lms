// D-193: the glossary's first use, the card's missing ids, and the Accelerator's insert-only seed.
import { describe, expect, it } from 'vitest';
import { ACCELERATOR_COHORT_ID } from '../src/accelerator';
import type { GlossaryTerm } from '../src/course-types';
import { cohortCopyFields, copyIssues } from '../src/course-rules';
import { cardTerms, glossaryIssues, markSequence, normalizeGlossary } from '../src/glossary';
import { ACCELERATOR_GLOSSARY, GLOSSARY_V1, planGlossaryV1 } from '../seed/glossary-v1';
import { seedProduction } from '../seed/curriculum';
import type { Db } from '../src/types';

const term = (over: Partial<GlossaryTerm> & Pick<GlossaryTerm, 'id' | 'term'>): GlossaryTerm => ({
  short: `${over.term} short`,
  long: `${over.term} long`,
  aliases: [],
  ...over,
});

const prod = (): Db => seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });

describe('the first use of a glossary term (D-193)', () => {
  const terms = [
    term({ id: 'owner', term: 'Owner', firstStep: 1 }),
    term({ id: 'operator', term: 'Operator', aliases: ['your operator'], firstStep: 1 }),
    term({ id: 'skill', term: 'Skill', aliases: ['skills', 'cohort skill'], firstStep: 2 }),
    term({ id: 'desk', term: 'Desk', firstStep: 2 }),
    term({ id: 'inbox', term: 'Inbox folder', aliases: ['inbox'], firstStep: 1 }),
    term({ id: 'green', term: 'Green source', aliases: ['green'], firstStep: 1, underline: false }),
  ];

  it('underlines the first whole word on the page, case-insensitive, and not a longer word', () => {
    const [one, two] = markSequence(['The owner keeps a desktop.', 'Ask the Owner again.'], terms, 2);
    expect(one).toEqual([
      { kind: 'text', text: 'The ' },
      { kind: 'term', text: 'owner', id: 'owner' },
      { kind: 'text', text: ' keeps a desktop.' },
    ]);
    expect(two).toBeUndefined();
    expect(markSequence(['a skillful skills list and one skill'], terms, 2)[0]).toEqual([
      { kind: 'text', text: 'a skillful ' },
      { kind: 'term', text: 'skills', id: 'skill' },
      { kind: 'text', text: ' list and one skill' },
    ]);
  });

  it('prefers the longer phrase, and a later step waits for firstStep', () => {
    expect(markSequence(['Ask your operator.'], terms, 1)[0]?.filter((s) => s.kind === 'term')).toEqual([
      { kind: 'term', text: 'your operator', id: 'operator' },
    ]);
    expect(markSequence(['Open the Inbox folder.'], terms, 1)[0]?.filter((s) => s.kind === 'term')).toEqual([
      { kind: 'term', text: 'Inbox folder', id: 'inbox' },
    ]);
    expect(markSequence(['the desk page'], terms, 1)[0]).toBeUndefined();
    expect(markSequence(['the desk page'], terms, 2)[0]?.some((s) => s.kind === 'term' && s.id === 'desk')).toBe(true);
    expect(markSequence(['a green source'], terms, 1)[0]).toBeUndefined();
  });

  it('skips a null surface, so a copy box does not use up the term', () => {
    const marks = markSequence([null, 'The owner decides.'], terms, 1);
    expect(marks[0]).toBeUndefined();
    expect(marks[1]?.some((s) => s.kind === 'term')).toBe(true);
  });

  it('lists the card’s terms and skips an id that is not there', () => {
    expect(cardTerms(['missing', 'owner', 'owner', 'desk'], terms).map((t) => t.id)).toEqual(['owner', 'desk']);
    expect(cardTerms(['owner'], undefined)).toEqual([]);
  });
});

describe('a glossary save (D-193)', () => {
  it('trims, drops a blank alias, and stores the underline only when it is off', () => {
    expect(
      normalizeGlossary([
        term({
          id: ' owner ',
          term: ' Owner ',
          short: ' The team leader. ',
          long: ' The team leader who decides. ',
          aliases: [' ', 'hire'],
          underline: true,
          firstStep: 2,
        }),
      ]),
    ).toEqual([
      {
        id: 'owner',
        term: 'Owner',
        short: 'The team leader.',
        long: 'The team leader who decides.',
        aliases: ['hire'],
        firstStep: 2,
      },
    ]);
    expect(normalizeGlossary([term({ id: 'owner', term: 'Owner', underline: false })])[0]).toMatchObject({
      underline: false,
    });
  });

  it('refuses a bad id, a repeat, a blank meaning, and a step that is not a number', () => {
    const bad = term({ id: 'Owner', term: '', short: '', long: ' ', firstStep: 0 });
    expect(glossaryIssues([bad, term({ id: 'owner', term: 'Owner' }), term({ id: 'owner', term: 'Again' })])).toEqual([
      'Glossary 1: Use a lower-case id like owner or seat-card.',
      'Glossary 1: Write the term.',
      'Glossary 1: Write the short meaning.',
      'Glossary 1: Write the long meaning.',
      'Glossary 1: First step is a step number.',
      'Glossary 3: owner is already a glossary term.',
    ]);
  });
});

describe('the Accelerator glossary seed (D-193)', () => {
  it('is the design’s 31 terms, and every string passes the copy rules', () => {
    expect(GLOSSARY_V1).toBe('2026-11-18-glossary');
    expect(ACCELERATOR_GLOSSARY).toHaveLength(31);
    expect(ACCELERATOR_GLOSSARY.find((t) => t.id === 'desk')).toMatchObject({
      term: 'Desk',
      firstStep: 2,
      aliases: [],
    });
    expect(ACCELERATOR_GLOSSARY.find((t) => t.id === 'mt')!.short).toContain('MT');
    expect(ACCELERATOR_GLOSSARY.find((t) => t.id === 'live-build')!.long).toContain('12:00 to 1:30 PM MT');
    const db = prod();
    const course = { ...db.cohorts[0]!.course!, glossary: [...ACCELERATOR_GLOSSARY] };
    const fields = cohortCopyFields({ name: db.cohorts[0]!.name, cadence: db.cohorts[0]!.cadence, course }).filter(
      (f) => f.path.startsWith('course.glossary'),
    );
    expect(fields.length).toBeGreaterThan(31);
    expect(copyIssues(fields)).toEqual([]);
  });

  it('sets the glossary only on the Accelerator course, and only when it has none', () => {
    const before = prod();
    const out = planGlossaryV1(before);
    expect(out.skipped).toEqual([]);
    expect(out.changes).toEqual([
      {
        target: { type: 'cohort', id: ACCELERATOR_COHORT_ID, label: before.cohorts[0]!.name },
        before: { glossary: 0 },
        after: { glossary: 31 },
      },
    ]);
    expect(out.db.cohorts.find((c) => c.id === ACCELERATOR_COHORT_ID)!.course!.glossary).toEqual(
      ACCELERATOR_GLOSSARY.map((t) => ({ ...t, aliases: [...t.aliases] })),
    );
    const twice = planGlossaryV1(out.db);
    expect(twice.changes).toEqual([]);
    expect(twice.skipped).toEqual([
      { id: `${ACCELERATOR_COHORT_ID}.course.glossary`, reason: 'the glossary was already set in the builder' },
    ]);
    expect(twice.db).toBe(out.db);
    const edited = structuredClone(out.db);
    edited.cohorts.find((c) => c.id === ACCELERATOR_COHORT_ID)!.course!.glossary = [];
    expect(planGlossaryV1(edited).db).toBe(edited);
    const other = structuredClone(before);
    other.cohorts.push({ ...other.cohorts[0]!, id: 'other', course: { ...other.cohorts[0]!.course! } });
    delete other.cohorts[1]!.course!.glossary;
    const kept = planGlossaryV1(other);
    expect(kept.db.cohorts.find((c) => c.id === 'other')!.course!.glossary).toBeUndefined();
  });
});
