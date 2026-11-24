// D-250: § 8.1 row 5, `session-24h` and `session-1h`, in the learner emails' design (`branded-html.ts`: the wordmark
// on the dark band, the dark button, the footer), written as a note from Connor, as he asked on Nov 24, 2026.
//
//   session-24h   a day out: we build together tomorrow, the session and its time, and a button to it
//   session-1h    an hour out: we start in an hour, see you there, and the Join button's page
//
// THE TIME. Mountain Time, with "MT", for a reader with no saved zone; a reader who saved one sees theirs first and
// Mountain Time in parentheses (`mountainWhenFor`, through `whenFor` in `recipient.ts`).
//
// NEITHER REMINDER LINKS TO ZOOM. § 8.4 keeps the Zoom URL on the server (`GET /api/sessions/:id/join` hands it over
// only inside the join window), and there is no address that joins a session by itself: Join is a button that asks the
// server when it is pressed. So both buttons go to `/sessions`, the page with that button: the first portal's
// Sessions, or, for a learner with the course, the learner portal's Schedule (`redirects.tsx`), whose Join opens 15
// minutes before the start. `templates.test.tsx` asserts no `zoom.us` link reaches the HTML.

import { LEARN_ORIGIN } from '@ai/core/skill-guides';
import { SUPPORT_EMAIL } from '@ai/core/offer';
import { brandedEmailHtml, buttonRow, cardRow, esc, fineRow, letterRow, signoffRow, spacerRow } from './branded-html';
import { ROUTES, absolute } from './links';

export type SessionReminderKind = 'session-24h' | 'session-1h';

export interface SessionReminderInput {
  /** "Session 3", or an office hour's "Week 2": the subject's own label. */
  label: string;
  /** The session's title, as staff typed it. */
  title: string;
  /** The session instant, already rendered for the reader (`whenFor`). */
  when: string;
  /** The reader's first name, or '' for none. */
  firstName: string;
  appUrl?: string | null;
}

interface Copy {
  preheader: (when: string) => string;
  eyebrow: string;
  heading: string;
  note: string;
  button: string;
  fine: string;
  closing: string;
}

/** The words, in one place. Title Case for the heading and the button; no em dashes; "MT" comes with the time. */
export const SESSION_REMINDER_COPY: Readonly<Record<SessionReminderKind, Copy>> = {
  'session-24h': {
    preheader: (when) => `We build together tomorrow, ${when}.`,
    eyebrow: 'Live session tomorrow',
    heading: 'We Build Together Tomorrow',
    note: 'I’m excited for tomorrow. We’ll build this one together, live, so bring your questions and whatever you’re working on.',
    button: 'View the Session',
    fine: 'Join opens 15 minutes before we start, on the same page.',
    closing: 'See you tomorrow,',
  },
  'session-1h': {
    preheader: (when) => `We start in an hour, ${when}. See you there.`,
    eyebrow: 'Live session in an hour',
    heading: 'Starting in an Hour',
    note: 'We start in an hour. Bring your questions and whatever you’re working on, and I’ll see you there.',
    button: 'Join Session',
    fine: 'Join opens 15 minutes before we start.',
    closing: 'See you there,',
  },
};

/** Who signs the reminders. */
export const SESSION_REMINDER_FROM = 'Connor';

const greeting = (first: string): string => (first ? `Hi ${first},` : 'Hi,');
const sessionsHref = (appUrl?: string | null): string => absolute(ROUTES.sessions, appUrl);

export function sessionReminderHtml(kind: SessionReminderKind, input: SessionReminderInput): string {
  const c = SESSION_REMINDER_COPY[kind];
  const when = esc(input.when);
  return brandedEmailHtml({
    title: c.heading,
    preheader: c.preheader(when),
    eyebrow: c.eyebrow,
    heading: c.heading,
    rows: [
      letterRow([esc(greeting(input.firstName.trim())), c.note]),
      cardRow(esc(input.label), esc(input.title), when),
      buttonRow(c.button, sessionsHref(input.appUrl)),
      fineRow(c.fine),
      signoffRow(c.closing, SESSION_REMINDER_FROM),
      spacerRow(),
    ].join('\n'),
  });
}

export function sessionReminderText(kind: SessionReminderKind, input: SessionReminderInput): string {
  const c = SESSION_REMINDER_COPY[kind];
  return [
    greeting(input.firstName.trim()),
    '',
    c.note,
    '',
    `${input.label} · ${input.title}`,
    input.when,
    '',
    `${c.button}: ${sessionsHref(input.appUrl)}`,
    '',
    c.fine,
    '',
    c.closing,
    SESSION_REMINDER_FROM,
    '',
    `Sign In: ${LEARN_ORIGIN}`,
    `Questions? Write to ${SUPPORT_EMAIL}.`,
  ].join('\n');
}
