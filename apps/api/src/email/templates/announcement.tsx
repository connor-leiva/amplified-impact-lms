// § 8.1 row 4 · `announcement` · subject is `{title}` · `sendAnnouncement` with the `email` channel
//
// This is the one template whose copy is entirely the sender's: the H1 is the announcement's title
// (which IS the subject, § 8.1) and the body is the announcement's body. `sendAnnouncement` already
// rejects an empty title or body ("Add a title and a message."), so both are always present.
//
// THE BUTTON IS WHERE THIS EMAIL DIVERGES FROM THE IN-APP BANNER, DELIBERATELY.
//
// `AnnouncementBanner` renders its action button only when `action` is set, and renders none
// otherwise — two of the three seeded announcements have `action: null`. An email cannot do that:
// § 8.1's shell has one primary button, and a reader in an inbox has no other way back into the
// product, whereas a reader of the banner is already standing in it.
//
// So the label and destination follow the app's own rules as far as they reach, and the app's own
// fallback past that point:
//   - label: `Dashboard.vm.ts` line 255 — `raw.action ? raw.actionLabel || 'Open' : ''`. The seed's
//     labels are `Update Calendar` and `Open Sessions`; `Open` is the app's own default, and it is
//     what this email uses when there is no action at all.
//   - destination: `/sessions` when there is an action, which is where `Dashboard.vm.ts`'s
//     `{kind: 'nav', to: '/sessions'}` sends both action kinds. `/` otherwise, because the
//     Dashboard is where this announcement's in-app banner appears.
//
// The `calendar` action is the one thing that cannot cross over: in the app it downloads a
// regenerated `.ics` ("Calendar invite updated"). An email cannot trigger a download from a button,
// and attaching an `.ics` is not something § 8.1 asks for, so `Update Calendar` lands on
// `/sessions` where the Add-to-Calendar control lives. Noted as a follow-up in the sprint report.

import { EmailLayout, Para } from './layout';
import { ROUTES, absolute } from './links';

export interface AnnouncementEmailProps {
  subject: string;
  /** `Announcement.body`. Never empty: `sendAnnouncement` requires it. */
  body: string;
  /** `Announcement.action` — `'calendar' | 'sessions' | null`. */
  action?: 'calendar' | 'sessions' | null;
  /** `Announcement.actionLabel`, e.g. `Update Calendar`. */
  actionLabel?: string;
  appUrl?: string | null;
}

/** `Dashboard.vm.ts`: an action with no label of its own reads `Open`. */
const DEFAULT_ACTION_LABEL = 'Open';

export function AnnouncementEmail({ subject, body, action = null, actionLabel = '', appUrl }: AnnouncementEmailProps) {
  const label = action ? actionLabel || DEFAULT_ACTION_LABEL : DEFAULT_ACTION_LABEL;
  const href = absolute(action ? ROUTES.sessions : ROUTES.dashboard, appUrl);

  return (
    <EmailLayout subject={subject} cta={{ label, href }}>
      <Para>{body}</Para>
    </EmailLayout>
  );
}
