// § 8.1 row 5, the shared body of `session-24h` and `session-1h`.
//
// The two live on one row of § 8.1's table because they are one email with two subjects:
//   `Tomorrow: Session {n} · {title}` / `Starting in 1 hour: Session {n} · {title}`
// Both are built from this component, so there is exactly one place where a session reminder's
// body, time rendering and destination are decided. `session-24h.tsx` and `session-1h.tsx` are the
// two named templates and hold nothing but their button label.
//
// THE BODY IS THE TIME, AND NOTHING ELSE. That is not minimalism for its own sake: § 8.1's only
// sentence about the content of any email is "Session times in emails use `fmt.when` with the
// recipient's saved zone, and fall back to CT", so the time is the one body line the spec actually
// specifies. The subject already carries the session number and title. `when` arrives
// pre-formatted from `whenFor` — see `recipient.ts` for why it is not formatted in here.
//
// NEITHER REMINDER LINKS TO ZOOM. § 8.4 makes the Zoom URL server-withheld: `scopeSnapshot` blanks
// `session.zoom` for learners and `GET /api/sessions/:id/join` hands it over only inside the join
// window, so a 24-hour-old reminder email carrying a Zoom link would be a permanent bypass of the
// window the whole section exists to enforce — and SCREENS § 5.3 already says `JoinButton` is "the
// ONLY element anywhere that links to Zoom". Both reminders therefore land on `/sessions`, where
// that button is. `templates.test.tsx` asserts no `zoom.us` link reaches the HTML.

import { EmailLayout, Para } from './layout';
import { ROUTES, absolute } from './links';

export interface SessionReminderProps {
  subject: string;
  /** The session instant, already rendered by `whenFor(start, recipientZone)`. */
  when: string;
  /** `Join Session` or `Open Sessions`, per the two wrappers. */
  ctaLabel: string;
  appUrl?: string | null;
}

export function SessionReminder({ subject, when, ctaLabel, appUrl }: SessionReminderProps) {
  return (
    <EmailLayout subject={subject} cta={{ label: ctaLabel, href: absolute(ROUTES.sessions, appUrl) }}>
      <Para>{when}</Para>
    </EmailLayout>
  );
}
