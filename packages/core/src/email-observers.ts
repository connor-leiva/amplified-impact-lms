// Cohort observer emails (D-264): Connor and Spring see what a cohort receives without a learner seat.
//
// WHAT AN OBSERVER GETS. One copy of each cohort-wide email, per cohort send: a session's 24-hour and 1-hour reminders,
// its replay notice and its 48-hour build reminder, a cohort's weekly digest for a week, an announcement, a cohort's
// Week 0 Is Open email and a cohort's welcome. "Per cohort send" means one copy for that session, that week's digest
// in that cohort, that announcement, that cohort's Week 0 email or welcome, however many learners or teams it went to.
//
// WHAT AN OBSERVER NEVER GETS. Anything addressed to one person about their own account or their own progress: the
// sign-in link, the two password links, the three invites, a staff nudge and a $37 skill's receipt. Those carry a live
// token or one learner's own state, and a copy of them is a copy of someone's key.
//
// WHERE THE LIST COMES FROM. The Console's setting (`console_settings`, saved on Environment Flags) when one is saved,
// else `COHORT_OBSERVER_EMAILS` (comma-separated) on the service, else nobody. A saved empty list is a choice: it turns
// the copies off even with the env var set.
//
// An observer is an address, never a user: no row in `users`, no seat, no team, no enrollment, no progress. So no
// roster, seat count or progress figure can see one.

/** The `console_settings` key the list is saved under. */
export const COHORT_OBSERVER_SETTING = 'cohort_observer_emails';

/** The env var read when the Console has no saved list. */
export const COHORT_OBSERVER_ENV = 'COHORT_OBSERVER_EMAILS';

/** How many addresses the list may hold. Two today (Connor's and Spring's); ten is room, not a target. */
export const OBSERVER_ADDRESSES_MAX = 10;

/** RFC 5321's limit on a forward path. */
export const OBSERVER_ADDRESS_MAX_LENGTH = 254;

/**
 * The cohort-wide templates: an observer gets one copy per cohort send of each. The API's map over its own
 * `TemplateName` is total, and its test holds it to these two lists, so a new template can't be added without saying
 * which side it is on.
 */
export const OBSERVER_COPY_TEMPLATES = [
  'week0-open',
  'session-24h',
  'session-1h',
  'replay-ready',
  'build-reminder',
  'weekly-digest',
  'announcement',
  // Its set-password link is replaced by an inert placeholder in the copy (the API's `observerData`).
  'cohort-welcome',
] as const;

/** The templates an observer never receives: one person's own sign-in, password, invite, nudge or receipt. */
export const OBSERVER_NEVER_TEMPLATES = [
  'sign-in',
  'set-password',
  'reset-password',
  'learner-invite',
  'team-invite',
  'staff-invite',
  'learner-nudge',
  'skill-purchase',
] as const;

export type ObserverCopyTemplate = (typeof OBSERVER_COPY_TEMPLATES)[number];

export const isObserverCopyTemplate = (v: unknown): v is ObserverCopyTemplate =>
  typeof v === 'string' && (OBSERVER_COPY_TEMPLATES as readonly string[]).includes(v);

/**
 * One address, as an observer list keeps it: trimmed and lowercased. Shape only, like the transport's own check: one
 * `@`, a dot in the domain, no whitespace. Also nothing that splits a list or a ledger key (`,` `;` `:`) and nothing
 * that makes a display name (`<` `>` `"` `(` `)`), so one entry is always exactly one mailbox.
 */
const ADDRESS = /^[^\s@,;:<>"()]+@[^\s@,;:<>"()]+\.[^\s@,;:<>"()]+$/;

export const normalizeObserverAddress = (raw: string): string => raw.trim().toLowerCase();

export const isObserverAddress = (raw: string): boolean => {
  const a = normalizeObserverAddress(raw);
  return a.length > 0 && a.length <= OBSERVER_ADDRESS_MAX_LENGTH && ADDRESS.test(a);
};

/** Splits what a person typed or an env var holds: commas, semicolons and new lines all separate. */
const splitList = (raw: string): string[] =>
  raw
    .split(/[,;\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean);

export type ObserverParse = { ok: true; addresses: string[] } | { ok: false; error: string };

/**
 * The Console's save: an array of addresses, or one string of them. Every entry must be an address; duplicates
 * (ignoring case) collapse, in first-seen order. An empty list is valid and turns the copies off.
 */
export function parseObserverAddresses(input: unknown): ObserverParse {
  let entries: string[];
  if (typeof input === 'string') entries = splitList(input);
  else if (Array.isArray(input) && input.every((v) => typeof v === 'string')) entries = (input as string[]).flatMap(splitList);
  else return { ok: false, error: 'Send the addresses as a list: { "addresses": ["name@example.com"] }.' };
  const bad = entries.filter((e) => !isObserverAddress(e));
  if (bad.length) return { ok: false, error: `Not an email address: ${bad[0]!.slice(0, 80)}` };
  const addresses = [...new Set(entries.map(normalizeObserverAddress))];
  if (addresses.length > OBSERVER_ADDRESSES_MAX) return { ok: false, error: `Up to ${OBSERVER_ADDRESSES_MAX} addresses.` };
  return { ok: true, addresses };
}

/**
 * `COHORT_OBSERVER_EMAILS`, read leniently: a deploy's typo drops that one entry (reported in `invalid`) rather than
 * turning off every copy or, worse, reaching a ledger key. At most `OBSERVER_ADDRESSES_MAX` are kept.
 */
export function observerAddressesFromEnv(raw: string | undefined): { addresses: string[]; invalid: string[] } {
  const entries = splitList(raw ?? '');
  const invalid = entries.filter((e) => !isObserverAddress(e));
  const addresses = [...new Set(entries.filter(isObserverAddress).map(normalizeObserverAddress))].slice(0, OBSERVER_ADDRESSES_MAX);
  return { addresses, invalid };
}

/** Where the list in force came from. */
export type EmailObserverSource = 'console' | 'env' | 'none';

/** `GET /api/console/email-observers`: the list in force, where it came from, and the env var's list beside it. */
export interface EmailObserversView {
  addresses: string[];
  source: EmailObserverSource;
  /** What `COHORT_OBSERVER_ENV` holds (valid entries only), whether or not it is the list in force. */
  envAddresses: string[];
  /** The Console's last save, when there is one. */
  updatedAt: number | null;
  updatedBy: string | null;
}

/** The list in force: a saved Console list wins (even an empty one), else the env var's, else none. */
export function resolveObservers(saved: readonly string[] | null, envRaw: string | undefined): { addresses: string[]; source: EmailObserverSource } {
  if (saved !== null) return { addresses: [...saved], source: saved.length ? 'console' : 'none' };
  const env = observerAddressesFromEnv(envRaw).addresses;
  return env.length ? { addresses: env, source: 'env' } : { addresses: [], source: 'none' };
}

/**
 * The Environment Flags card's words, in that page's own design language: a card title in sentence case, as its
 * "Feature flags" and "Send a test welcome" are; a button in Title Case, as its "Send Test" is.
 */
export const EMAIL_OBSERVERS_COPY = {
  title: 'Cohort observer emails',
  sub: 'Each address gets one copy of every cohort-wide email, once per cohort send: session reminders, replays, build reminders, digests, announcements, the welcome and Week 0. Never a sign-in, password, invite, nudge or receipt email. An observer holds no seat.',
  label: 'Addresses',
  hint: `One per line, or separated by commas. Up to ${OBSERVER_ADDRESSES_MAX}. Leave it empty to send no copies.`,
  save: 'Save Addresses',
  saving: 'Saving',
  saved: 'Observer addresses saved',
  failed: 'The observer addresses were not saved.',
  fromEnv: `From ${COHORT_OBSERVER_ENV} until addresses are saved here.`,
  none: 'No observer gets a copy.',
} as const;
