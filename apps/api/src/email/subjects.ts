// Email subject lines, phase 08 § 8.1 — the exact-copy half of the email system.
//
// CLAUDE.md: "Copy is exact. Do not paraphrase, shorten or 'improve' text." A subject line is the
// one piece of our copy that lands in an inbox with no stylesheet, no screenshot and no parity
// scenario covering it, so there is nothing but this file and its test standing between the spec's
// table and what a learner actually reads. Every string here was copied out of
// `docs/phases/08-integrations.md` § 8.1 and its code points verified against that file, not
// retyped from memory:
//
//   - `staff-invite` contains U+2019 RIGHT SINGLE QUOTATION MARK ("You’ve"), not ASCII "'".
//   - the three session subjects contain U+00B7 MIDDLE DOT with a space on each side
//     ("Session 3 · Speed to Lead"), not a hyphen, an en dash or a bullet.
//
// Both are invisible in a diff and both are the kind of thing an editor, a shell heredoc or a
// well-meaning autocorrect silently flattens to ASCII, so `subjects.test.ts` pins the literal
// strings AND asserts the code points directly.
//
// The registry is typed `{ [K in TemplateName]: (data: SubjectData[K]) => string }` rather than a
// loose object, which buys two compile-time guarantees:
//   - a template with no subject builder is a typecheck failure (missing property)
//   - a builder for a name that is not a template is a typecheck failure (excess property on the
//     object literal)
// So the nine-row table in § 8.1 and this file cannot drift in either direction.

import { sessionTimeMtCt, welcomeSubject } from '@ai/core';
import { DEFAULT_WEEK0_LABEL, week0CohortLabel } from '@ai/core/cohort-learner';

/**
 * The nine templates in § 8.1's table, in table order.
 *
 * Note the table's left column also names `nudge` in § 8's top mapping ("Email via Resend
 * (`nudge`, `build-reminder`)"), but § 8.1's template table does not: a nudge sends the
 * `build-reminder` template. There are nine templates, not ten.
 */
export const TEMPLATE_NAMES = [
  'sign-in',
  'team-invite',
  'staff-invite',
  'announcement',
  'session-24h',
  'session-1h',
  'replay-ready',
  'build-reminder',
  'weekly-digest',
  // D-132: the two password links, after § 8.1's nine.
  'set-password',
  'reset-password',
  // A $37 skill, bought with no account or with one. Sent only while SKILL_GUEST_CHECKOUT is on.
  'skill-purchase',
  // D-247 (H-9): Learners & Teams' Resend Invite (and a Team Owner's) and Send Nudge, in the purchase email's design.
  'learner-invite',
  'learner-nudge',

  // The cohort welcome, sent when a cohort enrollment is due.
  'cohort-welcome',
  // The Week 0 Is Open celebration, sent once to each Accelerator owner enrolled when its switch came on.
  'week0-open',
] as const;

export type TemplateName = (typeof TEMPLATE_NAMES)[number];

/**
 * A subject that interpolates nothing still takes a data argument, so that `subjectFor` can be
 * called generically over `TemplateName` without a special case per arity.
 *
 * `Record<never, never>` rather than `{}`: it is an empty object type that eslint's
 * `no-empty-object-type` accepts, and — unlike `Record<string, never>` — it still intersects
 * usefully with the body payload in `EmailData` (see `transport.ts`), because the body of a
 * sign-in email obviously does carry data even though its subject does not.
 */
export type NoSubjectData = Record<never, never>;

/**
 * The fields each subject interpolates — only those. The placeholders are § 8.1's own:
 * `{inviter}`, `{team}`, `{title}`, `{n}`, `{employee}`.
 *
 * This is deliberately NOT the whole email payload. A template body needs more than its subject
 * does (the sign-in link, the reader's first name, the session's time), and that larger type
 * belongs with the templates in `apps/api/src/email/templates/`. `transport.ts` composes the two:
 * it requires these fields, because without them it cannot build a subject at all, and it accepts
 * whatever else the template needs.
 */
export interface SubjectData {
  'sign-in': NoSubjectData;
  'set-password': NoSubjectData;
  'reset-password': NoSubjectData;
  'team-invite': { inviter: string; team: string };
  'staff-invite': NoSubjectData;
  announcement: { title: string };
  // `label` (D-110): an office hour's "Week 2", which reads better than its `n` (102). Absent: `Session {n}`.
  // D-250: `start` and `mins` give the reminder's time, in Mountain and Central (`sessionTimeMtCt`).
  'session-24h': { n: number; title: string; label?: string; start: number; mins?: number };
  'session-1h': { n: number; title: string; label?: string; start: number; mins?: number };
  'replay-ready': { n: number; title: string };
  'build-reminder': { employee: string };
  'weekly-digest': NoSubjectData;
  'skill-purchase': { skillName: string; variant: 'new' | 'ready' };
  'learner-invite': NoSubjectData;
  'learner-nudge': NoSubjectData;

  'cohort-welcome': { cohortName: string };
  // R-5 Phase 4 (D-261): the cohort's stored name, named without its year ("January Cohort"). Absent for December,
  // whose line is Connor's.
  'week0-open': { cohortName?: string; founding?: false };
}

/**
 * `Session {n} · {title}`, the fragment three subjects share verbatim.
 *
 * Factored out so U+00B7 appears exactly once in the implementation while the test still pins all
 * three full subjects as separate literals: one typo here fails three assertions, and no single
 * subject can quietly acquire a different separator from its siblings.
 */
const sessionLine = (data: { n: number; title: string; label?: string }) => `${data.label ?? `Session ${data.n}`} · ${data.title}`;

/**
 * One builder per template. The strings are § 8.1's table, character for character.
 *
 * `satisfies` is not used here on purpose: the explicit annotation is what makes a missing builder
 * an error, and the object literal is what makes an extra one an error. `satisfies` alone would
 * widen `SUBJECTS`'s own type and lose the first half.
 */
export const SUBJECTS: { [K in TemplateName]: (data: SubjectData[K]) => string } = {
  'sign-in': () => 'Your Amplified Impact sign-in link',
  'set-password': () => 'Set your Amplified Impact password',
  'reset-password': () => 'Reset your Amplified Impact password',
  'team-invite': (d) => `${d.inviter} invited you to ${d.team} on Amplified Impact`,
  // U+2019, not ASCII "'". See the header note.
  'staff-invite': () => 'You’ve been added to the Amplified Impact admin console',
  // § 8.1: the announcement's subject IS its title, with no prefix of ours. `sendAnnouncement`
  // already requires a non-empty title, so there is nothing to fall back to and nothing to add.
  announcement: (d) => d.title,
  // D-250: § 8.1's two, with the session's time after it, Mountain Time first and Central Time after it.
  'session-24h': (d) => `Tomorrow: ${sessionLine(d)} · ${sessionTimeMtCt(d.start, d.mins)}`,
  'session-1h': (d) => `Starting in 1 hour: ${sessionLine(d)} · ${sessionTimeMtCt(d.start, d.mins)}`,
  'replay-ready': (d) => `Replay is up: ${sessionLine(d)}`,
  // § 8.1 interpolates the AI Employee's name, so this reads "Finish your Listing Prep Assistant".
  'build-reminder': (d) => `Finish your ${d.employee}`,
  'weekly-digest': () => 'Your team this week',
  'skill-purchase': (d) => (d.variant === 'ready' ? 'Your New Skill Is Ready' : `Thank You for Buying ${d.skillName}`),
  // D-247: the set-password email's own subject: it is the same link, in the purchase email's design.
  'learner-invite': () => 'Set your Amplified Impact password',
  'learner-nudge': () => 'Pick up where you left off',

  // The cohort with its noun ("December 2026 Cohort"), in title case with "to the" lower: `welcomeSubject` (@ai/core).
  'cohort-welcome': (d) => welcomeSubject(d.cohortName),
  // Connor's approved line. "December Cohort" is December's name without its year: "December 2026" reads badly here.
  // R-5 Phase 4 (D-261, PLAN.md § 10.4): another cohort's name, the same way ("January Cohort"); December's is unchanged.
  'week0-open': (d) => `🎉 Welcome to the ${d.cohortName ? week0CohortLabel(d.cohortName) : DEFAULT_WEEK0_LABEL}: Week 0 Is Open`,
};

/**
 * The subject for one send. `transport.send` calls this rather than indexing `SUBJECTS` at every
 * call site, so SUBJECTS stays the single source of truth for what actually reaches an inbox even
 * once the React Email templates also render a `<title>` and a preheader of their own.
 */
export function subjectFor<K extends TemplateName>(template: K, data: SubjectData[K]): string {
  return SUBJECTS[template](data);
}
