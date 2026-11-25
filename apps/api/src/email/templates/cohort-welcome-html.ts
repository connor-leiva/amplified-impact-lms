// The cohort welcome (`cohort-welcome`), in the Week 0 Is Open email's design (`week0-open-html.ts`, Connor's v2, #263),
// as Connor asked on Nov 25, 2026: the same dark band with the wordmark, the one-time confetti GIF, the eyebrow, the
// heading and its grey intro, the light card, the dark button and its small print, the numbered list, the dark Live
// Build box, the sign-off and the footer. React Email is not used, as for the other learner emails.
//
// WHO READS IT. A team owner who enrolls after the switch came on, so after launch: Week 0 is already open for them.
// The send logic, the switch (off) and the audience are `jobs/welcome.ts`'s, unchanged.
//
// FROM DATA, NOT TYPED HERE. The cohort's name with its noun ("December 2026 Cohort", `cohortLabel`); Week 0's due time
// (its Due) and the first live build's range, each from its instant, MT first and CT after it (`dueTimeMtCt`,
// `sessionTimeMtCt`); Week 0's title and step count, and the number of baseline tasks (the stored table's rows); whether
// the "How the LMS Works" tour is live (D-252: only then does the email mention it); and the set-password link's life,
// from the token's own TTL. The support address is `SUPPORT_EMAIL`.

import { cohortLabel, welcomeSubject } from '@ai/core';
import { countWord } from '@ai/core/learner';
import { SUPPORT_EMAIL } from '@ai/core/offer';
import { dueTimeMtCt, sessionTimeMtCt, sessionTimeMtCtParts } from '@ai/core/release';
import { LEARN_ORIGIN } from '@ai/core/skill-guides';
import { WEEK0_LEARN_PATH } from '@ai/core/week0-open';
import { SET_PASSWORD_TTL_MS } from '../../auth/tokens';
import {
  CONFETTI_MOBILE_CSS,
  WEEK0_CONFETTI_URL,
  bandIntroRow,
  brandedEmailHtml,
  buttonRow,
  cardRow,
  closingRow,
  confettiRow,
  darkBoxRow,
  esc,
  fineRow,
  keepTimeHalves,
  launchListRows,
} from './branded-html';
import { absolute } from './links';

export interface CohortWelcomeInput {
  /** The cohort's stored name ("December 2026"). The copy gives it its noun. */
  cohortName: string;
  /** The reader's first name, or '' for none. */
  firstName: string;
  /** Week 0's Due, its title as the course page shows it, its step count, and the rows of its baseline table. */
  week0DueAt: number;
  week0Title: string;
  week0Steps: number;
  baselineTasks: number;
  /** D-252: the "How the LMS Works" tour is flagged in Week 0's Media, so it opens on sign-in. */
  tour: boolean;
  /** The first live build's start, and its length in minutes (`welcomeSchedule`'s `session1At`, `session1Mins`). */
  liveBuildAt: number;
  liveBuildMins: number;
  /** A set-password link, for an owner with no password and no Google account. */
  setPasswordUrl?: string | null;
  appUrl?: string | null;
}

/** How long a set-password link lasts, in hours, from the token's own TTL. */
const LINK_HOURS = Math.round(SET_PASSWORD_TTL_MS / 3_600_000);

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** The words, in one place. Title Case headings and labels, no em dashes, "MT / … CT" with every clock. */
export const COHORT_WELCOME_COPY = {
  preheader: (due: string) => `You’re in! Week 0 is open, and it’s due ${due}.`,
  eyebrow: (cohort: string) => `Amplified AI Accelerator · ${cohort}`,
  heading: (first: string) => (first ? `${first}, You’re In!` : 'You’re In!'),
  intro: (cohort: string) =>
    `Welcome to the ${cohort}. Your access to the Amplified AI Accelerator is live, Week 0 is already open, and we couldn’t be more excited to build with you.`,
  gifAlt: (cohort: string) => `Confetti popping to welcome you to the ${cohort}`,
  cardLabel: 'Start here',
  cardTitle: 'Week 0 Is Open',
  cardLine: 'Week 0 gets you, your team and your AI ready, so you hit the ground running in Week 1. It’s due',
  button: 'Start Week 0',
  findWeek0: 'Sign in, then click Week 0. If you still see the Skill Library, reload the page.',
  setPasswordLabel: 'Set Your Password',
  setPasswordFine: `This link works once and expires in ${LINK_HOURS} hours.`,
  signInLink: 'Haven’t set a password yet? On the sign-in page, choose Email Me a Sign-In Link Instead and we’ll send you a secure link.',
  listHeading: 'What to Do First',
  tour: {
    title: 'Watch How the LMS Works',
    line: 'A quick tour of your new home for the Accelerator. It opens when you sign in, and it’s pinned at the top of Week 0. Watch it with your AI Implementer.',
  },
  startWeek0: (title: string, steps: number) => ({
    title: `Start Week 0 · ${title}`,
    line: `${title} is the Week 0 course, and it has ${countWord(steps)} steps. A few belong to the owner and a few belong to your AI Implementer.`,
  }),
  invite: {
    title: 'Invite Your AI Implementer',
    line: 'Your AI Implementer is a person on your team, not software. Name them and send their invite.',
  },
  baseline: (tasks: number) => ({
    title: `Time Your ${cap(countWord(tasks))} Tasks`,
    line: `Start your time baseline: the ${countWord(tasks)} tasks we’ll measure against for the rest of the cohort.`,
  }),
  buildLabel: 'Mark your calendar',
  buildTitle: 'Our First Live Build',
  buildLine: (dueDay: string) => `Finish Week 0 by ${dueDay}, so you and your AI Implementer can build your first hire live with the cohort.`,
  closing: 'Here’s to the journey ahead. We can’t wait to see what you build.',
  from: 'Connor and the Amplified Impact team',
  footerNote: (cohort: string) => `Amplified Impact, LLC. You’re getting this because you enrolled in the ${cohort}.`,
} as const;

const C = COHORT_WELCOME_COPY;

const startHref = (appUrl?: string | null): string => absolute(WEEK0_LEARN_PATH, appUrl);

/** The list, numbered in order: the tour first when it is live. */
function listOf(input: CohortWelcomeInput): { n: string; title: string; line: string }[] {
  const rows = [
    ...(input.tour ? [C.tour] : []),
    C.startWeek0(input.week0Title.trim(), input.week0Steps),
    C.invite,
    C.baseline(input.baselineTasks),
  ];
  return rows.map((r, i) => ({ n: String(i + 1).padStart(2, '0'), title: r.title, line: r.line }));
}

/** Everything that comes from data, worked out once for both outputs. */
function partsOf(input: CohortWelcomeInput) {
  const cohort = cohortLabel(input.cohortName);
  return {
    cohort,
    subject: welcomeSubject(input.cohortName),
    first: input.firstName.trim(),
    dueShort: dueTimeMtCt(input.week0DueAt),
    dueLong: dueTimeMtCt(input.week0DueAt, { year: true }),
    dueDay: sessionTimeMtCtParts(input.week0DueAt).day,
    build: sessionTimeMtCt(input.liveBuildAt, input.liveBuildMins),
    list: listOf(input),
  };
}

const link = (href: string, label: string): string =>
  `<a href="${esc(href)}" style="color:#1f4d40; text-decoration:underline;">${label}</a>`;

export function cohortWelcomeHtml(input: CohortWelcomeInput): string {
  const p = partsOf(input);
  const password = input.setPasswordUrl
    ? `First time signing in? ${link(input.setPasswordUrl, C.setPasswordLabel)} first. ${C.setPasswordFine}`
    : C.signInLink;
  return brandedEmailHtml({
    // The <title> is the subject without its emoji.
    title: esc(p.subject.replace(/^🎉\s*/, '')),
    preheader: esc(C.preheader(p.dueShort)),
    eyebrow: esc(C.eyebrow(p.cohort)),
    heading: esc(C.heading(p.first)),
    mobileCss: [CONFETTI_MOBILE_CSS],
    afterLogo: confettiRow(WEEK0_CONFETTI_URL, esc(C.gifAlt(p.cohort))),
    underHeading: bandIntroRow(esc(C.intro(p.cohort))),
    footerNote: esc(C.footerNote(p.cohort)),
    rows: [
      cardRow(C.cardLabel, C.cardTitle, `${C.cardLine} ${keepTimeHalves(p.dueLong)}.`),
      buttonRow(C.button, startHref(input.appUrl)),
      fineRow(C.findWeek0),
      fineRow(password),
      launchListRows(C.listHeading, p.list.map((r) => ({ n: r.n, title: esc(r.title), line: esc(r.line) }))),
      darkBoxRow(C.buildLabel, C.buildTitle, keepTimeHalves(p.build), esc(C.buildLine(p.dueDay))),
      closingRow(C.closing, C.from),
    ].join('\n'),
  });
}

export function cohortWelcomeText(input: CohortWelcomeInput): string {
  const p = partsOf(input);
  return [
    C.heading(p.first),
    '',
    C.eyebrow(p.cohort),
    '',
    C.intro(p.cohort),
    '',
    C.cardLabel,
    C.cardTitle,
    `${C.cardLine} ${p.dueLong}.`,
    '',
    `${C.button}: ${startHref(input.appUrl)}`,
    '',
    C.findWeek0,
    '',
    ...(input.setPasswordUrl ? [`First time signing in? ${C.setPasswordLabel} first: ${input.setPasswordUrl}`, C.setPasswordFine] : [C.signInLink]),
    '',
    C.listHeading,
    ...p.list.map((r) => `${r.n} ${r.title}: ${r.line}`),
    '',
    C.buildLabel,
    C.buildTitle,
    p.build,
    C.buildLine(p.dueDay),
    '',
    C.closing,
    C.from,
    '',
    `Sign In: ${LEARN_ORIGIN}`,
    `Questions? Write to ${SUPPORT_EMAIL}.`,
    C.footerNote(p.cohort),
  ].join('\n');
}
