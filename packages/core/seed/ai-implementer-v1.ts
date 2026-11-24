// SEED, NOT RUNTIME (D-243). Connor, Nov 24, 2026: the course's second role is the AI Implementer, not the
// operator, everywhere a person reads it ("Go with B"), and wherever the role is first defined, the line
// "Your AI Implementer is a person on your team, not software." A one-time data step makes both edits on the
// stored course, once, on deploy:
//
//   1. THE WORD, in every word a person reads: "operator" becomes "AI Implementer", "operators" becomes "AI
//      Implementers", possessives and "an" included (`implementerWords`). Option B covers what staff wrote in
//      the builder too, so this step departs from D-175's "only rows still as the seed left them": it reads
//      every row, edited or not. Where: the Accelerator weeks (every field but the ones listed in KEEP), the
//      Accelerator cohort's shared course pages and glossary, the Accelerator's session titles, the Resource
//      Vault's titles and descriptions, and the builder's copy strings.
//   2. THE LINE, after the sentence that defines the role: the Week 0 intake's intro (after its first mention
//      of the AI Implementer), the glossary term's short and long lines and the course's role line (after
//      their first sentence), and Week 0 Step 1 (after the sentence that says who the person is, "The person
//      who…" or "The teammate who…"). Where Step 1 has no such sentence, it is left alone and named in the
//      step's summary, for staff to place by hand in the builder.
//
// Never touched: ids, keys, role values (the step role `operator`, the account role `Operations Lead`), the
// intake's question ids and a team's answers, conditions (`field`, `equals`), links, uploads and file keys,
// live-session transcripts, announcements already sent, and anything about people, plans or billing. A
// condition and an answer saved in the old words still match (`sameRoleWords`, `currentIntakeAnswers`).
//
// Pure: no clock, no random source. Each change says which fields moved and what they said before and after.

import { ACCELERATOR_COHORT_ID, isAcceleratorModule } from '../src/accelerator';
import type { CohortCourse, GlossaryTerm, ModuleCourse, PathBlock, StepPath } from '../src/course-types';
import { AI_IMPLEMENTER, implementerWords } from '../src/role-words';
import type { AIEmployee, Db, Step } from '../src/types';
import type { DataChange, DataSkip, DataStepOutcome } from './data-step';
import { WEEK0_MODULE_ID } from './start-here-v1';

/** The step's id, recorded in `data_migrations` once it has run. */
export const AI_IMPLEMENTER_V1 = '2026-11-24-ai-implementer';

/** Connor's line, word for word, where the role is first defined. */
export const PERSON_NOT_SOFTWARE = 'Your AI Implementer is a person on your team, not software.';

/** The glossary term's id. It stays `operator`: step text and the Week 0 card name it by id. */
export const IMPLEMENTER_TERM_ID = 'operator';

/** The plural the glossary underlines as well, so "AI Implementers" opens the same term. */
const PLURAL_ALIAS = `${AI_IMPLEMENTER}s`;

/**
 * Keys whose values are ids, settings, links or records, never words to rename. A string under any of these
 * is left exactly as it is, and so is everything inside one (a transcript is what was said on the call).
 */
const KEEP: ReadonlySet<string> = new Set([
  'id', 'role', 'field', 'equals', 'formId', 'itemId', 'kitItemIds', 'termId', 'terms', 'linkedSkill',
  'sessionId', 'moduleId', 'cohortId', 'stepId', 'videoId', 'dependsOn', 'upload', 'url', 'href', 'src',
  'key', 'route', 'path', 'icon', 'ic', 'tone', 'tier', 'status', 'st', 'kind', 'type', 'platform',
  'visibility', 'audience', 'timezone', 'defaultOpenTime', 'zoom', 'replay', 'mime', 'size', 'transcript',
]);

/** A link or a path: left alone even under a key that holds words. */
const LINK = /^(?:[a-z][a-z0-9+.-]*:\/\/|\/|www\.)\S*$/i;

interface Edit {
  path: string;
  before: string;
  after: string;
}

const label = (x: unknown, i: number): string => {
  const id = x && typeof x === 'object' ? (x as { id?: unknown }).id : undefined;
  return typeof id === 'string' && id ? id : String(i);
};

/** `value` with the role renamed in every word a person reads. The same reference when nothing changes. */
function rename<T>(value: T, path: string, edits: Edit[], key = ''): T {
  if (KEEP.has(key)) return value;
  if (typeof value === 'string') {
    if (LINK.test(value)) return value;
    const next = implementerWords(value);
    if (next === value) return value;
    edits.push({ path, before: value, after: next });
    return next as T;
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((x, i) => {
      const y = rename(x, `${path}[${label(x, i)}]`, edits, key);
      if (y !== x) changed = true;
      return y;
    });
    return (changed ? next : value) as T;
  }
  if (value && typeof value === 'object') {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(value)) {
      const y = rename(x, path ? `${path}.${k}` : k, edits, k);
      if (y !== x) changed = true;
      next[k] = y;
    }
    return (changed ? next : value) as T;
  }
  return value;
}

/** The space after a sentence's last mark, before the next sentence starts. */
const SENTENCE_END = /(?<=[.!?][”"’']?)\s+(?=[“"‘'(A-Z0-9])/g;

/**
 * The line after the first sentence `pick` accepts, or null when none does or the line is already there. The text's
 * own spacing and line breaks are kept: the line goes in right after that sentence's last mark.
 */
function withLine(text: string, pick: (sentence: string, index: number) => boolean): string | null {
  if (text.includes(PERSON_NOT_SOFTWARE)) return null;
  const ends = [...text.matchAll(SENTENCE_END)].map((m) => m.index);
  let start = 0;
  for (const [i, end] of [...ends, text.trimEnd().length].entries()) {
    if (pick(text.slice(start, end).trim(), i)) return `${text.slice(0, end)} ${PERSON_NOT_SOFTWARE}${text.slice(end)}`;
    start = end;
  }
  return null;
}

const first = (_s: string, i: number): boolean => i === 0;
const mentions = (s: string): boolean => s.includes(AI_IMPLEMENTER);
const SAYS_WHO = /^(?:The|A|Your) (?:person|teammate) (?:who|that)\b/i;
const definesWho = (s: string): boolean => SAYS_WHO.test(s.trim());

/** Week 0 Step 1 with the line after the sentence that says who the person is, in each path, plain and rich. */
function stepOneWithLine(step: Step, edits: Edit[], path: string): Step | null {
  if (!step.paths) return null;
  let placed = false;
  const lineIn = (text: string, where: string): string => {
    const next = withLine(text, definesWho);
    if (next === null) return text;
    placed = true;
    edits.push({ path: where, before: text, after: next });
    return next;
  };
  const block = (b: PathBlock, where: string): PathBlock => {
    const out = { ...b } as Record<string, unknown>;
    for (const k of ['text', 'detail', 'body'] as const) if (typeof out[k] === 'string') out[k] = lineIn(out[k] as string, `${where}.${k}`);
    for (const k of ['rich', 'detailRich', 'bodyRich'] as const) {
      const rich = out[k] as { type: 'doc'; content: { type: string; content?: { text: string }[] }[] } | undefined;
      if (!rich) continue;
      out[k] = {
        ...rich,
        content: rich.content.map((p, pi) => (p.content ? { ...p, content: p.content.map((n, ni) => ({ ...n, text: lineIn(n.text, `${where}.${k}[${pi}][${ni}]`) })) } : p)),
      };
    }
    return out as unknown as PathBlock;
  };
  const paths = Object.fromEntries(
    Object.entries(step.paths as Record<string, StepPath | undefined>).map(([platform, p]) => [
      platform,
      p ? { ...p, blocks: p.blocks.map((b: PathBlock, i: number) => block(b, `${path}.paths.${platform}.blocks[${label(b, i)}]`)) } : p,
    ]),
  ) as Step['paths'];
  return placed ? { ...step, paths } : null;
}

/** The glossary term with its plural alias and the line, after the rename. */
function termWithLine(t: GlossaryTerm, edits: Edit[], path: string): GlossaryTerm {
  const short = withLine(t.short, first);
  const long = withLine(t.long, first);
  if (short !== null) edits.push({ path: `${path}.short`, before: t.short, after: short });
  if (long !== null) edits.push({ path: `${path}.long`, before: t.long, after: long });
  const plural = t.aliases.some((a) => a.trim().toLowerCase() === PLURAL_ALIAS.toLowerCase());
  if (!plural) edits.push({ path: `${path}.aliases`, before: t.aliases.join(' | '), after: [...t.aliases, PLURAL_ALIAS].join(' | ') });
  return { ...t, short: short ?? t.short, long: long ?? t.long, aliases: plural ? t.aliases : [...t.aliases, PLURAL_ALIAS] };
}

/** Each field once: what it said before the step, and what it says after (a field renamed, then given the line). */
function fields(edits: Edit[]): { before: Record<string, string>; after: Record<string, string> } {
  const before: Record<string, string> = {};
  const after: Record<string, string> = {};
  for (const e of edits) {
    if (!(e.path in before)) before[e.path] = e.before;
    after[e.path] = e.after;
  }
  return { before, after };
}

/** Rename the role across the course's words, and add the line where the role is defined. */
export function planAiImplementerV1(db: Db): DataStepOutcome {
  const changes: DataChange[] = [];
  const skipped: DataSkip[] = [];
  const record = (type: string, id: string, labelText: string, edits: Edit[]): void => {
    if (edits.length) changes.push({ target: { type, id, label: labelText }, ...fields(edits) });
  };

  // The Accelerator's weeks: every word but a transcript, then the line on Week 0.
  const modules = db.modules.map((m): AIEmployee => {
    if (!isAcceleratorModule(m.id)) return m;
    const edits: Edit[] = [];
    let next = rename(m, '', edits);
    if (m.id === WEEK0_MODULE_ID) {
      const course: ModuleCourse | undefined = next.course;
      const intro = course?.intake?.intro;
      if (course?.intake && intro) {
        const withIt = withLine(intro, mentions);
        if (withIt !== null) {
          edits.push({ path: 'course.intake.intro', before: intro, after: withIt });
          next = { ...next, course: { ...course, intake: { ...course.intake, intro: withIt } } };
        }
      } else skipped.push({ id: `${m.id}.course.intake.intro`, reason: 'Week 0 has no intake intro, so the line has nowhere to go there' });
      const one = next.checklist[0];
      const placed = one ? stepOneWithLine(one, edits, `checklist[${one.id}]`) : null;
      if (placed) next = { ...next, checklist: [placed, ...next.checklist.slice(1)] };
      else if (!JSON.stringify(one ?? {}).includes(PERSON_NOT_SOFTWARE))
        skipped.push({
          id: `${m.id}.step-1.line`,
          reason: `Step 1 has no sentence that says who the AI Implementer is ("The person who…"), so "${PERSON_NOT_SOFTWARE}" was not placed there; add it in the builder`,
        });
    }
    record('module', m.id, m.name, edits);
    return next;
  });

  // The Accelerator cohort's shared pages and glossary, then the line on the term and the role.
  const cohorts = db.cohorts.map((c) => {
    if (c.id !== ACCELERATOR_COHORT_ID || !c.course) return c;
    const edits: Edit[] = [];
    let course: CohortCourse = rename(c.course, 'course', edits);
    const role = course.intro?.roles?.operator;
    if (role) {
      const withIt = withLine(role, first);
      if (withIt !== null) {
        edits.push({ path: 'course.intro.roles.operator', before: role, after: withIt });
        course = { ...course, intro: { ...course.intro, roles: { ...course.intro.roles, operator: withIt } } };
      }
    }
    const term = (course.glossary ?? []).findIndex((t) => t.id === IMPLEMENTER_TERM_ID);
    if (term >= 0) {
      const glossary = [...course.glossary!];
      glossary[term] = termWithLine(glossary[term]!, edits, `course.glossary[${IMPLEMENTER_TERM_ID}]`);
      course = { ...course, glossary };
    } else skipped.push({ id: `${c.id}.glossary.${IMPLEMENTER_TERM_ID}`, reason: 'the glossary has no term with id operator, so its words and the line were left to staff' });
    record('cohort', c.id, c.name, edits);
    return course === c.course ? c : { ...c, course };
  });

  // The Accelerator's session titles.
  const sessions = db.sessions.map((s) => {
    if (s.cohortId !== ACCELERATOR_COHORT_ID) return s;
    const edits: Edit[] = [];
    const title = rename(s.title, 'title', edits, 'title');
    record('session', s.id, s.title, edits);
    return title === s.title ? s : { ...s, title };
  });

  // The Resource Vault's titles and descriptions. The files themselves are not this step's.
  const resources = db.resources.map((r) => {
    const edits: Edit[] = [];
    const title = rename(r.title, 'title', edits, 'title');
    const desc = rename(r.desc, 'desc', edits, 'desc');
    record('resource', r.id, r.title, edits);
    return title === r.title && desc === r.desc ? r : { ...r, title, desc };
  });

  // The builder's copy strings: the words, never the key.
  const copy = db.copy?.map((s) => {
    const edits: Edit[] = [];
    const value = rename(s.value, 'value', edits, 'value');
    record('copy', s.key, s.key, edits);
    return value === s.value ? s : { ...s, value };
  });

  if (!changes.length) return { db, changes, skipped };
  return { db: { ...db, modules, cohorts, sessions, resources, ...(copy ? { copy } : {}) }, changes, skipped };
}
