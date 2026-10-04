// § 8.1 row 5a · `session-24h` · "Tomorrow: Session {n} · {title}" · scheduler, 24 h before
//
// The button is `Open Sessions`, which is `mutations.ts`'s own `ACTION_LABELS.sessions` — the
// label the admin console already uses for this exact destination. Not `Join Session`: a day out,
// `joinMode` is `disabled` and the Join button on that page still reads "Opens 15 Min Before", so
// promising a join in the subject line's own email would be a promise the product refuses to keep
// for another 23 hours.

import { SessionReminder } from './session-reminder';

export interface Session24hEmailProps {
  subject: string;
  /** `whenFor(session.start, recipient.prefs.tz)`. */
  when: string;
  appUrl?: string | null;
}

export function Session24hEmail({ subject, when, appUrl }: Session24hEmailProps) {
  return <SessionReminder subject={subject} when={when} ctaLabel="Open Sessions" appUrl={appUrl} />;
}
