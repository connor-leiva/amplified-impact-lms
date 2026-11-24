// The Week 0 Is Open celebration email (`week0-open`): Connor's v2 design, approved Nov 24, 2026, ported, not
// rewritten. Its copy is his, word for word, with three changes the brief asks for:
//
//   - every date and clock comes from an instant, Mountain Time first and Central Time after it (`dueTimeMtCt`,
//     `sessionTimeMtCt`), never a typed day or a fixed offset;
//   - the confetti is the app's hosted GIF (`WEEK0_CONFETTI_URL`), an absolute https URL on learn;
//   - the support address is `SUPPORT_EMAIL`, and one line under the button tells a reader who lands on the Skill
//     Library how to reach Week 0 (Connor, Nov 24).
//
// Built from `branded-html.ts`'s parts (the head, the dark band and wordmark, the card, the button, the small print and
// the footer), plus the rows this design adds there (`confettiRow`, `bandIntroRow`, `launchListRows`, `darkBoxRow`,
// `closingRow`). React Email is not used, as for the other learner emails: it would wrap and restyle the document.

import { SUPPORT_EMAIL } from '@ai/core/offer';
import { dueTimeMtCt, sessionTimeMtCt } from '@ai/core/release';
import { LEARN_ORIGIN } from '@ai/core/skill-guides';
import { WEEK0_LEARN_PATH } from '@ai/core/week0-open';
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
  launchListRows,
} from './branded-html';
import { absolute } from './links';

export interface Week0OpenInput {
  /** The reader's first name, or '' for none. */
  firstName: string;
  /** When Week 0 is due: the Week 0 module's Due. */
  week0DueAt: number;
  /** The first live build's start, and its length in minutes (`welcomeSchedule`'s `session1At`, `session1Mins`). */
  liveBuildAt: number;
  liveBuildMins: number;
  appUrl?: string | null;
}

/** The words, in one place: Connor's, as approved. Title Case headings, no em dashes, "MT" with every clock. */
export const WEEK0_OPEN_COPY = {
  title: 'Welcome to the December Cohort: Week 0 Is Open',
  preheader: (due: string) => `It’s official. The Amplified AI Accelerator is underway, and Week 0 is your launchpad. It’s due ${due}.`,
  eyebrow: 'Amplified AI Accelerator · December 2026 Cohort',
  heading: (first: string) => (first ? `${first}, We’re Officially Underway!` : 'We’re Officially Underway!'),
  intro: 'Welcome to the start of our journey together. You’re one of the founding members of the December 2026 Cohort, and we couldn’t be more excited to build with you.',
  gifAlt: 'Confetti popping to celebrate the start of the December 2026 Cohort',
  cardLabel: 'Your launchpad',
  cardTitle: 'Week 0 Is Open',
  cardLine: 'This is where it all begins. Week 0 gets you, your team and your AI ready, so you hit the ground running in Week 1. Week 0 is due',
  button: 'Start Week 0',
  findWeek0: 'Sign in, then click Week 0. If you still see the Skill Library, reload the page.',
  signInLink: 'Haven’t set a password yet? On the sign-in page, choose Email Me a Sign-In Link Instead and we’ll send you a secure link.',
  listHeading: 'Your Week 0 Launch List',
  list: [
    { n: '01', title: 'Fill In Your Intake', line: 'Tell us about your business and the tools you use, right in the LMS.' },
    { n: '02', title: 'Invite Your AI Implementer', line: 'Your AI Implementer is a person on your team, not software. Name them and send their invite.' },
    { n: '03', title: 'Get Your AI Ready', line: 'Set up Claude or ChatGPT. Every step has a Claude version and a ChatGPT version.' },
    { n: '04', title: 'Connect Your Data', line: 'Connect your books, closings, leads and Google tools so your AI can work from your real numbers.' },
  ],
  buildLabel: 'Mark your calendar',
  buildTitle: 'Our First Live Build',
  buildLine: 'This is where it all comes together. Finish Week 0 first, so you and your AI Implementer can build your first hire live with the cohort.',
  closing: 'Here’s to the journey ahead. We can’t wait to see what you build.',
  from: 'Connor and the Amplified Impact team',
} as const;

const C = WEEK0_OPEN_COPY;

/**
 * Each zone's half of a time kept on one line ("Wed, Dec 2, 12:00 to 1:30 PM MT / 1:00 to 2:30 PM CT"), so a phone
 * breaks it after the slash, never inside Central's range, as the session reminders do (D-250).
 */
const keepHalves = (when: string): string =>
  when
    .split(' / ')
    .map((half) => `<span style="white-space:nowrap;">${esc(half)}</span>`)
    .join(' / ');

const startHref = (appUrl?: string | null): string => absolute(WEEK0_LEARN_PATH, appUrl);

/** The times, each from its instant. */
function times(input: Week0OpenInput): { dueShort: string; dueLong: string; build: string } {
  return {
    dueShort: dueTimeMtCt(input.week0DueAt),
    dueLong: dueTimeMtCt(input.week0DueAt, { year: true }),
    build: sessionTimeMtCt(input.liveBuildAt, input.liveBuildMins),
  };
}

export function week0OpenHtml(input: Week0OpenInput): string {
  const t = times(input);
  return brandedEmailHtml({
    title: C.title,
    preheader: esc(C.preheader(t.dueShort)),
    eyebrow: C.eyebrow,
    heading: esc(C.heading(input.firstName.trim())),
    mobileCss: [CONFETTI_MOBILE_CSS],
    afterLogo: confettiRow(WEEK0_CONFETTI_URL, C.gifAlt),
    underHeading: bandIntroRow(C.intro),
    rows: [
      cardRow(C.cardLabel, C.cardTitle, `${C.cardLine} ${keepHalves(t.dueLong)}.`),
      buttonRow(C.button, startHref(input.appUrl)),
      fineRow(C.findWeek0),
      fineRow(C.signInLink),
      launchListRows(C.listHeading, C.list),
      darkBoxRow(C.buildLabel, C.buildTitle, keepHalves(t.build), C.buildLine),
      closingRow(C.closing, C.from),
    ].join('\n'),
  });
}

export function week0OpenText(input: Week0OpenInput): string {
  const t = times(input);
  return [
    C.heading(input.firstName.trim()),
    '',
    C.eyebrow,
    '',
    C.intro,
    '',
    C.cardLabel,
    C.cardTitle,
    `${C.cardLine} ${t.dueLong}.`,
    '',
    `${C.button}: ${startHref(input.appUrl)}`,
    '',
    C.findWeek0,
    '',
    C.signInLink,
    '',
    C.listHeading,
    ...C.list.map((it) => `${it.n} ${it.title}: ${it.line}`),
    '',
    C.buildLabel,
    C.buildTitle,
    t.build,
    C.buildLine,
    '',
    C.closing,
    C.from,
    '',
    `Sign In: ${LEARN_ORIGIN}`,
    `Questions? Write to ${SUPPORT_EMAIL}.`,
  ].join('\n');
}
