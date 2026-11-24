// D-243: the operator is the AI Implementer. The words change everywhere a person reads them; ids, keys, role
// values and a team's answers don't. Words saved before the rename still mean what they meant, the glossary marks
// the new name without mistaking it for "Your AI", and the one-time data step renames the course (staff edits
// included), adds Connor's line where the role is defined, touches nothing else, and does nothing the second time.
import { describe, expect, it } from 'vitest';
import { conditionMet } from '../src/checklist';
import type { CheckBlock, CourseIntake, PathBlock } from '../src/course-types';
import { cohortCopyFields, copyIssues, moduleCopyFields } from '../src/course-rules';
import { markSequence } from '../src/glossary';
import { cleanIntakeAnswers, currentIntakeAnswers } from '../src/intake';
import { knownStepRole, stepRoles } from '../src/learner';
import { implementerWords, sameRoleWords } from '../src/role-words';
import type { AIEmployee, Db } from '../src/types';
import { AI_IMPLEMENTER_V1, PERSON_NOT_SOFTWARE, planAiImplementerV1 } from '../seed/ai-implementer-v1';
import { planContentV2 } from '../seed/content-v2';
import { planCopyV1 } from '../seed/copy-v1';
import { planCopyV2 } from '../seed/copy-v2';
import { planCopyV3 } from '../seed/copy-v3';
import { seedProduction } from '../seed/curriculum';
import { planFiveWordsV1 } from '../seed/five-words-v1';
import { ACCELERATOR_GLOSSARY, planGlossaryV1 } from '../seed/glossary-v1';
import { planIntakeV1 } from '../seed/intake-v1';
import { planPromiseV1 } from '../seed/promise-v1';
import { planReleaseV1 } from '../seed/release-plan-v1';
import { planIntakeRequiredV1 } from '../seed/required-v1';
import { planStackV1 } from '../seed/stack-v1';
import { planStartHereV1 } from '../seed/start-here-v1';
import { planUnshownV1 } from '../seed/unshown-v1';
import { planWeeks12V1 } from '../seed/weeks-1-2-steps-v1';

/** Production before this step: the seed, then every earlier data step, in the deploy's order. */
function deployed(): Db {
  let db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  for (const plan of [planReleaseV1, planCopyV1, planContentV2, planCopyV2, planCopyV3, planGlossaryV1, planStartHereV1, planIntakeV1, planStackV1, planPromiseV1, planUnshownV1, planFiveWordsV1, planIntakeRequiredV1, planWeeks12V1]) db = plan(db).db;
  return db;
}
const week = (db: Db, n: number): AIEmployee => db.modules.find((m) => m.id === `accelerator-week-${n}`)!;
const course = (db: Db) => db.cohorts.find((c) => c.id === 'dec26')!.course!;
const strings = (v: unknown, key = '', out: { key: string; text: string }[] = []): { key: string; text: string }[] => {
  if (typeof v === 'string') out.push({ key, text: v });
  else if (Array.isArray(v)) v.forEach((x) => strings(x, key, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) strings(x, k, out);
  return out;
};

describe('the words (D-243)', () => {
  it('renames the role in any case, plural and possessive, and keeps "an"', () => {
    expect(implementerWords('Name your operator.')).toBe('Name your AI Implementer.');
    expect(implementerWords('Operator. 20 min.')).toBe('AI Implementer. 20 min.');
    expect(implementerWords('Owners and operators')).toBe('Owners and AI Implementers');
    expect(implementerWords('The operator’s role')).toBe('The AI Implementer’s role');
    expect(implementerWords("The operator's account (our default)")).toBe("The AI Implementer's account (our default)");
    expect(implementerWords('as an owner, an operator')).toBe('as an owner, an AI Implementer');
    expect(implementerWords('Fill In Your Intake and Name Your Operator')).toBe('Fill In Your Intake and Name Your AI Implementer');
  });

  it('leaves ids and other words alone', () => {
    for (const s of ['operator-name', 'co-operator', 'cooperators', 'operatorship', 'Owner and owner']) expect(implementerWords(s)).toBe(s);
  });

  it('reads a Who line in either words', () => {
    for (const who of ['Operator', 'operator.', 'AI Implementer', 'ai implementer.']) expect(stepRoles(who)).toEqual(['operator']);
    for (const who of ['Owner and operator', 'Owner and AI Implementer', 'Each of you', '']) expect(stepRoles(who)).toEqual(['owner', 'operator']);
    expect(stepRoles('Owner')).toEqual(['owner']);
    for (const who of ['Operator', 'AI Implementer', 'Owner and operator', 'Owner and AI Implementer', 'Each of you']) expect(knownStepRole(who)).toBe(true);
    expect(knownStepRole('Ops lead')).toBe(false);
  });

  it('matches a condition and an answer saved in the old words', () => {
    expect(sameRoleWords("The operator's account (our default)", "The AI Implementer's account (our default)")).toBe(true);
    const answers = { account: "The operator's account (our default)" };
    expect(conditionMet({ field: 'account', equals: "The AI Implementer's account (our default)" }, answers)).toBe(true);
    expect(conditionMet({ field: 'account', equals: "The owner's account" }, answers)).toBe(false);
    expect(conditionMet({ field: 'operator', equals: 'both' }, { operator: "I'm both" })).toBe(true);
  });
});

describe('a team’s intake answers, saved before the rename (D-243)', () => {
  const form: CourseIntake = {
    sections: [
      {
        title: 'Your AI',
        questions: [
          { id: 'account', label: 'Whose AI account runs your hires?', kind: 'choice', options: ["The AI Implementer's account (our default)", "The owner's account"] },
          { id: 'tools', label: 'Tools', kind: 'multi', options: ['The AI Implementer’s laptop', 'Shared drive'] },
          { id: 'note', label: 'Anything else', kind: 'long' },
        ],
      },
    ],
  };
  const saved = { account: "The operator's account (our default)", tools: ['The operator’s laptop', 'Shared drive'], note: 'Our operator is new.', gone: 'kept' };

  it('reads as the option it picks today, and the rest as it was', () => {
    expect(currentIntakeAnswers(form, saved)).toEqual({
      account: "The AI Implementer's account (our default)",
      tools: ['The AI Implementer’s laptop', 'Shared drive'],
      note: 'Our operator is new.',
      gone: 'kept',
    });
    const fresh = { account: "The owner's account" };
    expect(currentIntakeAnswers(form, fresh)).toBe(fresh);
  });

  it('is not dropped on the next save', () => {
    expect(cleanIntakeAnswers(form, saved)).toEqual({
      account: "The AI Implementer's account (our default)",
      tools: ['The AI Implementer’s laptop', 'Shared drive'],
      note: 'Our operator is new.',
    });
    expect(cleanIntakeAnswers(form, { account: 'Someone else' })).toEqual({});
  });
});

describe('the glossary marks the AI Implementer, not "Your AI" inside it (D-243)', () => {
  const terms = planAiImplementerV1(deployed()).db.cohorts.find((c) => c.id === 'dec26')!.course!.glossary!;

  it('marks the first use, and a later "your AI Implementer" stays plain text', () => {
    const texts = ['Your AI Implementer runs that week’s skill.', 'If the owner is also the AI Implementer, do both reads.', 'Then your AI Implementer builds the hire.', 'AI Implementers can swap.'];
    const out = markSequence(texts, terms, 2);
    const marked = out.map((spans) => (spans ?? []).filter((s) => s.kind === 'term').map((s) => (s.kind === 'term' ? `${s.id}:${s.text}` : '')));
    expect(marked[0]).toContain('operator:Your AI Implementer');
    expect(marked.flat().filter((m) => m.startsWith('ai:'))).toEqual([]);
  });

  it('marks "Your AI" where it is the AI', () => {
    const out = markSequence(['Open your AI and paste it.'], terms, 2);
    expect(out[0]?.some((s) => s.kind === 'term' && s.id === 'ai')).toBe(true);
  });
});

describe('the one-time step (D-243)', () => {
  const before = deployed();
  const out = planAiImplementerV1(before);
  const after = out.db;

  it('has a dated id', () => expect(AI_IMPLEMENTER_V1).toBe('2026-11-24-ai-implementer'));

  it('leaves no "operator" a person reads in the course: only ids and role values', () => {
    const left = strings({ modules: after.modules, cohorts: after.cohorts }).filter((s) => /operator/i.test(s.text));
    expect(new Set(left.map((s) => s.key))).toEqual(new Set(['id', 'role']));
    expect(left.filter((s) => s.key === 'role').every((s) => s.text === 'operator')).toBe(true);
    expect(left.filter((s) => s.key === 'id').map((s) => s.text).sort()).toEqual(['operator', 'operator', 'operator-name']);
  });

  it('renames what the scoping found, word for word', () => {
    const w0 = week(after, 0);
    expect(w0.checklist[0]!.ch).toBe('Fill In Your Intake and Name Your AI Implementer');
    expect(w0.checklist.map((s) => s.who)).toEqual(['Owner', 'Owner and AI Implementer', 'Owner', 'AI Implementer', 'Each of you', 'AI Implementer', 'AI Implementer', 'AI Implementer']);
    expect(w0.checklist[3]!.hint).toBe('AI Implementer. 20 min.');
    expect(w0.forWho).toBe('team owners and their AI Implementers');
    const intake = w0.course!.intake!;
    expect(intake.sections[1]!.title).toBe('Your AI Implementer');
    expect(intake.sections[1]!.questions.map((q) => [q.id, q.label])).toEqual([
      ['operator', 'Who is your AI Implementer?'],
      ['operator-name', 'Their name and email.'],
      ['invited', 'Have you invited them in the portal yet?'],
    ]);
    expect(intake.sections[2]!.questions.find((q) => q.id === 'account')!.options![0]).toBe("The AI Implementer's account (our default)");
    expect(week(after, 7).course!.question).toBe('Can our AI Implementer adapt and run the next workflow without the instructor?');
    expect(course(after).shared.paths.map((p) => p.label)).toContain('AI Implementer Requirement');
  });

  it('adds Connor’s line where the role is defined', () => {
    const term = course(after).glossary!.find((t) => t.id === 'operator')!;
    expect(term.term).toBe('AI Implementer');
    expect(term.aliases).toEqual(['your AI Implementer', 'AI Implementers']);
    expect(term.short).toBe(`The teammate who sets up your AI and runs it alongside you. ${PERSON_NOT_SOFTWARE}`);
    expect(term.long).toBe(`The teammate who sets up your AI and runs it alongside you. ${PERSON_NOT_SOFTWARE} The owner can hold both roles.`);
    expect(course(after).intro.roles.operator).toBe(
      `Maintains the workflows: refreshes inputs, reruns outputs, finds failures and follows the repair steps. ${PERSON_NOT_SOFTWARE} An owner can hold both roles, on purpose.`,
    );
    const intro = week(after, 0).course!.intake!.intro!;
    // D-249: the intro's sentence names Week 1's opening, Sun, Nov 29; the line still follows it.
    expect(intro).toContain(`before Week 1 opens on Sunday, November 29. ${PERSON_NOT_SOFTWARE} Short answers are fine.`);
    expect(intro.split(PERSON_NOT_SOFTWARE)).toHaveLength(2);
  });

  it('names Week 0 Step 1 for staff when the seed gives it no sentence to follow', () => {
    expect(out.skipped).toEqual([expect.objectContaining({ id: 'accelerator-week-0.step-1.line' })]);
  });

  it('places the line in Step 1 after the sentence that says who the person is, plain and rich', () => {
    const blocks: PathBlock[] = [
      { type: 'check', id: 's1-name', title: 'Name your operator', detail: 'The person who refreshes inputs, reruns outputs and follows the repair steps.\nYou can hold both roles.' },
      { type: 'text', id: 's1-why', text: 'Why it matters.', rich: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Pick one. The teammate who runs it weekly is your operator.' }] }] } },
    ] as PathBlock[];
    const db = deployed();
    const w0 = week(db, 0);
    const edited: Db = { ...db, modules: db.modules.map((m) => (m.id === w0.id ? { ...m, checklist: [{ ...m.checklist[0]!, paths: { claude: { blocks }, chatgpt: { blocks } } }, ...m.checklist.slice(1)] } : m)) };
    const res = planAiImplementerV1(edited);
    const step = week(res.db, 0).checklist[0]!;
    const [check, text] = step.paths!.claude!.blocks as [CheckBlock, PathBlock & { rich: { content: { content: { text: string }[] }[] } }];
    expect(check.title).toBe('Name your AI Implementer');
    expect(check.detail).toBe(`The person who refreshes inputs, reruns outputs and follows the repair steps. ${PERSON_NOT_SOFTWARE}\nYou can hold both roles.`);
    expect(text.rich.content[0]!.content[0]!.text).toBe(`Pick one. The teammate who runs it weekly is your AI Implementer. ${PERSON_NOT_SOFTWARE}`);
    expect(res.skipped).toEqual([]);
  });

  it('renames staff edits too, and never ids, roles, conditions, links or transcripts', () => {
    const db = deployed();
    const w1 = week(db, 1);
    const block = { type: 'check', id: 'x-operator', title: 'Ask your operator', role: 'operator', hideIf: { field: 'operator', equals: 'operator' }, action: { type: 'link', url: 'https://example.com/operator' } };
    const edited: Db = {
      ...db,
      modules: db.modules.map((m) =>
        m.id === w1.id ? { ...m, transcript: [[0, 'the operator said']], checklist: [{ ...m.checklist[0]!, paths: { claude: { blocks: [block as unknown as PathBlock] } } }, ...m.checklist.slice(1)] } : m,
      ),
      resources: [{ id: 'r-operator', title: 'Operator checklist', desc: 'For your operator.', cat: 'Week 0', type: 'PDF', tier: 'team', size: '1 MB', dl: 0, updated: 0, exec: false, status: 'published' } as unknown as Db['resources'][number]],
      copy: [...(db.copy ?? []), { key: 'operator.note', value: 'Ask your operator.', audience: 'learner' }],
    };
    const res = planAiImplementerV1(edited).db;
    const b = week(res, 1).checklist[0]!.paths!.claude!.blocks[0] as unknown as typeof block;
    expect(b).toEqual({ ...block, title: 'Ask your AI Implementer' });
    expect(week(res, 1).transcript).toEqual([[0, 'the operator said']]);
    expect(res.copy!.find((c) => c.key === 'operator.note')!.value).toBe('Ask your AI Implementer.');
    expect([res.resources[0]!.id, res.resources[0]!.title, res.resources[0]!.desc, res.resources[0]!.cat]).toEqual(['r-operator', 'AI Implementer checklist', 'For your AI Implementer.', 'Week 0']);
  });

  it('leaves people, teams, plans and announcements as they were, and every non-course module', () => {
    for (const k of ['users', 'teams', 'staff', 'tiers', 'requests', 'announcements', 'perms', 'activity'] as const) expect(after[k]).toBe(before[k]);
    for (const m of after.modules.filter((x) => !x.id.startsWith('accelerator-'))) expect(m).toBe(before.modules.find((x) => x.id === m.id));
  });

  it('keeps the copy rules', () => {
    const was = (db: Db) => [...db.modules.flatMap((m) => copyIssues(moduleCopyFields(m))), ...copyIssues(cohortCopyFields(db.cohorts.find((c) => c.id === 'dec26')!))];
    expect(was(after).length).toBe(was(before).length);
  });

  it('records each field before and after, and does nothing the second time', () => {
    const w0 = out.changes.find((c) => c.target.id === 'accelerator-week-0')!;
    const was = w0.before as Record<string, string>;
    const now = w0.after as Record<string, string>;
    expect(was['course.intake.intro']).toContain('That way your operator gets');
    expect(now['course.intake.intro']).toContain(`That way your AI Implementer gets`);
    expect(now['course.intake.intro']).toContain(PERSON_NOT_SOFTWARE);
    expect(Object.keys(now).length).toBeGreaterThan(15);
    const twice = planAiImplementerV1(after);
    expect(twice.changes).toEqual([]);
    expect(twice.db).toBe(after);
  });

  it('keeps the glossary seed’s own words for history: the step renames them, the seed file does not', () => {
    expect(ACCELERATOR_GLOSSARY.find((t) => t.id === 'operator')!.term).toBe('Operator');
  });
});

describe('a term already marked holds its words (D-243)', () => {
  const terms = planAiImplementerV1(deployed()).db.cohorts.find((c) => c.id === 'dec26')!.course!.glossary!;
  const marks = (texts: string[]) =>
    markSequence(texts, terms, 8).map((spans) => (spans ?? []).flatMap((s) => (s.kind === 'term' ? [`${s.id}:${s.text}`] : [])));

  it('keeps "your AI" from taking a marked "AI Office" that starts after it', () => {
    const out = marks(['Put it in the AI Office.', 'Open your AI Office project in Claude.']);
    expect(out[0]).toContain('ai-office:AI Office');
    expect(out[1]!.filter((m) => m.startsWith('ai:'))).toEqual([]);
  });

  it('still lets a longer term win over a marked shorter one inside it', () => {
    const inbox = terms.find((t) => t.term === 'Inbox folder');
    expect(inbox).toBeDefined();
    const shortOnly = terms.filter((t) => t.id !== inbox!.id);
    const withShort = [...shortOnly, { ...inbox!, term: 'Inbox folder', aliases: [] }, { id: 'inbox-word', term: 'inbox', short: 'x', long: 'x', aliases: [], firstStep: 1 }];
    const out = markSequence(['Check the inbox.', 'Drop it in the inbox folder.'], withShort, 8);
    expect(out[1]?.some((s) => s.kind === 'term' && s.id === inbox!.id)).toBe(true);
  });
});
