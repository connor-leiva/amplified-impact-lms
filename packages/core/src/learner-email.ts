// D-246 (H-9): the learner emails staff and team owners send by hand, and what their toasts say.
//
//   Resend Invite (Learners & Teams' drawer, and a Team Owner's Team Hub): a fresh set-password link
//   for a learner who hasn't joined yet, in the $37 skill email's design.
//   Send Nudge (Learners & Teams' drawer): a short email asking a learner who has joined to pick up
//   where they left off, in the same design.
//   Send now with Email (Announcements): the announcement's email, through the scheduled path's audience
//   and ledger, at once.
//
// Every toast says what the server did: the email went, the server has no email set up (so nothing
// went), or the send failed. None says a send happened that didn't. Who may do each is decided here
// (`resendInviteTarget`, `nudgeTarget`), so the API and its tests read one rule.

import { can, requirePerm } from './can';
import { MutationError } from './mutations';
import type { Actor } from './mutations';
import { fmt } from './time';
import type { Announcement, Db, Learner } from './types';

/** What the server did with an email it was asked to send. `off`: this server sends no email (not set up). */
export type EmailOutcome = 'sent' | 'off' | 'failed';

export const LEARNER_EMAIL_COPY = {
  /** Resend Invite for someone who has signed in already. */
  notInvited: 'They’ve already joined, so there’s no invite to resend.',
  /** Send Nudge for someone who hasn't joined yet. */
  notJoined: 'They haven’t joined yet. Resend the invite instead.',
  /** A Team Owner's resend for someone who isn't on their team, or a role that can't invite. */
  teamOnly: 'Only the team owner or operations lead can resend an invite.',
  /** The server has no email set up (development, or production without Resend's key or sender). */
  off: 'Email isn’t set up on this server, so nothing was sent.',
  /** The provider refused the send, or the template failed. */
  failed: 'The email didn’t send. Try again.',
} as const;

export interface Toast {
  msg: string;
  tone: 'success' | 'warn';
}

/** Resend Invite's and Send Nudge's toast, from what happened. The sent words are the screens' own. */
export function learnerEmailToast(kind: 'invite' | 'nudge', outcome: EmailOutcome, who: Pick<Learner, 'name' | 'email'>): Toast {
  if (outcome === 'off') return { msg: LEARNER_EMAIL_COPY.off, tone: 'warn' };
  if (outcome === 'failed') return { msg: LEARNER_EMAIL_COPY.failed, tone: 'warn' };
  return { msg: kind === 'invite' ? `Invite resent to ${who.email}` : `Nudge sent to ${who.name}`, tone: 'success' };
}

const learnerById = (db: Db, id: string): Learner => {
  const u = db.users.find((x) => x.id === id);
  if (!u) throw new MutationError('not_found', `No learner ${id}`);
  return u;
};

/**
 * Who Resend Invite may go to, for this actor: a learner who hasn't joined yet (`status: 'invited'`).
 * Staff need View learners (the Learners screen's own rule, as `nudgeLearners`); a learner must be the
 * Team Owner or Operations Lead of the invitee's team (`inviteMember`'s rule).
 */
export function resendInviteTarget(db: Db, a: Actor, userId: string): Learner {
  if (a.kind === 'staff') {
    requirePerm(db, a, 'viewLearners');
  } else {
    const me = db.users.find((u) => u.id === a.userId);
    if (!me || !me.teamId || !['Team Owner', 'Operations Lead'].includes(me.role)) throw new MutationError('forbidden', LEARNER_EMAIL_COPY.teamOnly);
    const them = db.users.find((u) => u.id === userId);
    if (!them || them.teamId !== me.teamId) throw new MutationError('forbidden', LEARNER_EMAIL_COPY.teamOnly);
  }
  const u = learnerById(db, userId);
  if (u.status !== 'invited') throw new MutationError('invalid', LEARNER_EMAIL_COPY.notInvited);
  return u;
}

/** Who Send Nudge may go to: staff with View learners, to a learner who has joined. */
export function nudgeTarget(db: Db, a: Actor, userId: string): Learner {
  if (a.kind !== 'staff' || !can(db, a, 'viewLearners')) throw new MutationError('forbidden', 'You don’t have permission to do that.');
  const u = learnerById(db, userId);
  if (u.status === 'invited') throw new MutationError('invalid', LEARNER_EMAIL_COPY.notJoined);
  return u;
}

/** A learner's first name for an email greeting, or '' when they have none. */
export const firstNameOf = (name: string): string => name.trim().split(/\s+/).filter(Boolean)[0] ?? '';

/** Announcements this write moved to `sent` with the Email channel on: Send now's email is owed for these. */
export function newlySentWithEmail(before: Db, after: Db): Announcement[] {
  const was = new Map(before.announcements.map((a) => [a.id, a.status]));
  return after.announcements.filter((a) => a.status === 'sent' && was.get(a.id) !== 'sent' && a.channels.includes('email'));
}

/** What Send now's email did, for its toast. */
export interface AnnouncementEmailResult {
  outcome: 'sent' | 'off';
  sent: number;
  failed: number;
}

/**
 * Send now's toast with the Email channel on. The in-app half is core's words, as before; the email half
 * says how many it went to, or that this server sends no email. With Email alone, core's "Sent to N
 * learners" would claim a send, so the email half is the whole toast.
 */
export function sendNowToast(core: { msg: string } | undefined, a: Pick<Announcement, 'audience' | 'channels'>, r: AnnouncementEmailResult): Toast {
  const who = a.audience === 'owners' ? 'team owners' : 'learners';
  const inapp = a.channels.includes('inapp');
  if (r.outcome === 'off') {
    const line = inapp ? 'Email isn’t set up on this server, so no email went out.' : LEARNER_EMAIL_COPY.off;
    return { msg: inapp && core ? `${core.msg} ${line}` : line, tone: 'warn' };
  }
  const total = r.sent + r.failed;
  const line = r.failed
    ? `Email sent to ${fmt.num(r.sent)} of ${fmt.num(total)} ${who}. The rest didn’t send.`
    : `Email sent to ${fmt.num(r.sent)} ${who}.`;
  return { msg: inapp && core ? `${core.msg} ${line}` : line, tone: r.failed ? 'warn' : 'success' };
}
