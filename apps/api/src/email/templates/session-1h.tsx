// § 8.1 row 5b · `session-1h` · "Starting in 1 hour: Session {n} · {title}" · scheduler, 1 h before
//
// The button is `Join Session`, which is `JoinButton`'s own label for the `ready`/upcoming state
// (`JoinButton.tsx`: `mode === 'live' ? 'Join Now' : 'Join Session'`). An hour out that button is
// still `disabled` for another 45 minutes, so this email takes the reader to the page rather than
// to Zoom — see `session-reminder.tsx` for why no reminder may ever carry the Zoom URL.

import { SessionReminder } from './session-reminder';

export interface Session1hEmailProps {
  subject: string;
  /** `whenFor(session.start, recipient.prefs.tz)`. */
  when: string;
  appUrl?: string | null;
}

export function Session1hEmail({ subject, when, appUrl }: Session1hEmailProps) {
  return <SessionReminder subject={subject} when={when} ctaLabel="Join Session" appUrl={appUrl} />;
}
