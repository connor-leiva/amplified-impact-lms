// Resend's delivery events on the email log (D-263). Pure: the API parses each webhook event with
// these, folds an email's events into its log row, and counts the rollup; the Email Log prints from the
// same functions, and the fixture draws with them.
//
// ONE EMAIL'S EVENTS ARE FOLDED WHOLE, NEVER APPLIED ONE BY ONE. Resend (through Svix) delivers each
// event at least once and in no promised order: a retry can repeat one, an open can land before its
// delivery, and a webhook can beat the send's own log row. So the API keeps every event it accepts
// (`resend_events`, keyed by the webhook message id, which is the same on every retry) and, after each
// new one, writes the row from `foldResendEvents` over all of that email's events. The fold sorts its
// input first, so the answer is the same however many times and in whatever order the events came.
//
// THE STATE, strongest first: complained > bounced > delivered > delayed > sent.
//   complained  the recipient marked it as spam (it was delivered to do so)
//   bounced     the receiving server refused it
//   delivered   the receiving server took it, or an open or click proves it arrived
//   delayed     Resend is still retrying a temporary refusal
//   sent        Resend took it and nothing has happened since
// A later, weaker event never undoes a stronger one: "delayed" after "delivered" stays delivered.
//
// WHAT IS NEVER KEPT: the recipient, subject, sender, IP address or user agent an event carries. The
// log already holds the address and subject; the rest is not ours to store. A bounce keeps its type,
// subtype and Resend's message (capped); a click keeps the link (http or https, capped).

// ================================================================================================
// The events
// ================================================================================================

/** The seven events the email log records. Any other type is answered 200 and not kept. */
export const RESEND_EVENT_TYPES = [
  'email.sent',
  'email.delivered',
  'email.delivery_delayed',
  'email.bounced',
  'email.complained',
  'email.opened',
  'email.clicked',
] as const;
export type ResendEventType = (typeof RESEND_EVENT_TYPES)[number];
export const isResendEventType = (v: unknown): v is ResendEventType => typeof v === 'string' && (RESEND_EVENT_TYPES as readonly string[]).includes(v);

/** A webhook message id or a Resend email id: letters, digits and `_ . : -`, 128 at most. */
export const RESEND_ID = /^[A-Za-z0-9_.:-]{1,128}$/;
export const BOUNCE_KIND_MAX = 64;
export const BOUNCE_MESSAGE_MAX = 500;
export const CLICK_LINK_MAX = 2048;

/** One accepted event, as `resend_events` keeps it. Times are epoch ms. */
export interface ResendEvent {
  /** The webhook message id (`svix-id`): one per event, the same on every retry of it. */
  id: string;
  type: ResendEventType;
  /** Resend's email id, which the log keeps as `provider_id`. */
  emailId: string;
  /** When Resend says it happened (the event's `created_at`), else when it arrived. */
  occurredAt: number;
  bounceType: string | null;
  bounceSubType: string | null;
  bounceMessage: string | null;
  /** The link clicked (`email.clicked` only). */
  link: string | null;
}

export type ParsedResendEvent = { kind: 'event'; event: ResendEvent } | { kind: 'ignored'; type: string } | { kind: 'invalid' };

const record = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** Text from a provider, made safe to keep: no control characters, one space between words, capped. */
export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
}

/** A clicked link worth keeping: an absolute http or https URL, capped; anything else is null. */
export function cleanLink(v: unknown): string | null {
  const s = cleanText(v, CLICK_LINK_MAX);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? s : null;
  } catch {
    return null;
  }
}

/**
 * A webhook body as one event, once its signature has been checked. `id` is the webhook message id from
 * the headers; `receivedAt` stands in for a missing or unreadable `created_at`. A type the log does not
 * record is `ignored`; a body without an email id is `invalid`.
 */
export function parseResendEvent(id: string, body: unknown, receivedAt: number): ParsedResendEvent {
  const root = record(body);
  if (!root || !RESEND_ID.test(id)) return { kind: 'invalid' };
  const type = root.type;
  if (typeof type !== 'string' || type.length > 64) return { kind: 'invalid' };
  if (!isResendEventType(type)) return { kind: 'ignored', type };
  const data = record(root.data);
  const emailId = data?.email_id;
  if (!data || typeof emailId !== 'string' || !RESEND_ID.test(emailId)) return { kind: 'invalid' };
  const at = typeof root.created_at === 'string' ? Date.parse(root.created_at) : Number.NaN;
  const bounce = type === 'email.bounced' ? record(data.bounce) : null;
  const click = type === 'email.clicked' ? record(data.click) : null;
  return {
    kind: 'event',
    event: {
      id,
      type,
      emailId,
      occurredAt: Number.isFinite(at) && at > 0 ? at : receivedAt,
      bounceType: cleanText(bounce?.type, BOUNCE_KIND_MAX),
      bounceSubType: cleanText(bounce?.subType, BOUNCE_KIND_MAX),
      bounceMessage: cleanText(bounce?.message, BOUNCE_MESSAGE_MAX),
      link: cleanLink(click?.link),
    },
  };
}

// ================================================================================================
// One email's delivery, folded from its events
// ================================================================================================

export const DELIVERY_STATES = ['sent', 'delivered', 'delayed', 'bounced', 'complained'] as const;
export type DeliveryState = (typeof DELIVERY_STATES)[number];
export const isDeliveryState = (v: unknown): v is DeliveryState => typeof v === 'string' && (DELIVERY_STATES as readonly string[]).includes(v);

/** What the log keeps about one email's delivery: `email_log`'s delivery columns. */
export interface EmailDelivery {
  /** Null until the first event arrives. */
  delivery: DeliveryState | null;
  deliveredAt: number | null;
  /** The latest delay. */
  delayedAt: number | null;
  /** The latest bounce, and its details. */
  bouncedAt: number | null;
  bounceType: string | null;
  bounceSubType: string | null;
  bounceMessage: string | null;
  complainedAt: number | null;
  openCount: number;
  openedFirstAt: number | null;
  openedLastAt: number | null;
  clickCount: number;
  clickedFirstAt: number | null;
  clickedLastAt: number | null;
  /** The link of the latest click that named one. */
  clickedLink: string | null;
}

export const NO_DELIVERY: EmailDelivery = {
  delivery: null,
  deliveredAt: null,
  delayedAt: null,
  bouncedAt: null,
  bounceType: null,
  bounceSubType: null,
  bounceMessage: null,
  complainedAt: null,
  openCount: 0,
  openedFirstAt: null,
  openedLastAt: null,
  clickCount: 0,
  clickedFirstAt: null,
  clickedLastAt: null,
  clickedLink: null,
};

/** The strongest state the facts support (see the header). Null with no event at all. */
export function deliveryStateOf(d: Omit<EmailDelivery, 'delivery'>, anyEvent: boolean): DeliveryState | null {
  if (d.complainedAt !== null) return 'complained';
  if (d.bouncedAt !== null) return 'bounced';
  if (d.deliveredAt !== null || d.openCount > 0 || d.clickCount > 0) return 'delivered';
  if (d.delayedAt !== null) return 'delayed';
  return anyEvent ? 'sent' : null;
}

/** Oldest first, ties by id: the one order every fold reads events in. */
const byTime = (a: Pick<ResendEvent, 'occurredAt' | 'id'>, b: Pick<ResendEvent, 'occurredAt' | 'id'>): number =>
  a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * One email's delivery from all of its events. The input is sorted first, so any order of the same
 * events gives the same answer, and a repeated id counts once.
 */
export function foldResendEvents(events: readonly ResendEvent[]): EmailDelivery {
  const seen = new Set<string>();
  const sorted = [...events].sort(byTime).filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
  const d = { ...NO_DELIVERY };
  for (const e of sorted) {
    const t = e.occurredAt;
    switch (e.type) {
      case 'email.sent':
        break;
      case 'email.delivered':
        d.deliveredAt ??= t;
        break;
      case 'email.delivery_delayed':
        d.delayedAt = t;
        break;
      case 'email.bounced':
        d.bouncedAt = t;
        d.bounceType = e.bounceType;
        d.bounceSubType = e.bounceSubType;
        d.bounceMessage = e.bounceMessage;
        break;
      case 'email.complained':
        d.complainedAt ??= t;
        break;
      case 'email.opened':
        d.openCount += 1;
        d.openedFirstAt ??= t;
        d.openedLastAt = t;
        break;
      case 'email.clicked':
        d.clickCount += 1;
        d.clickedFirstAt ??= t;
        d.clickedLastAt = t;
        if (e.link) d.clickedLink = e.link;
        break;
    }
  }
  return { ...d, delivery: deliveryStateOf(d, sorted.length > 0) };
}

// ================================================================================================
// The log's status: a send's outcome, then its delivery
// ================================================================================================

/** The Status filter's options, in its order: a delivery state, else the send's own outcome. */
export const EMAIL_LOG_STATUSES = ['sent', 'delivered', 'delayed', 'bounced', 'complained', 'failed', 'skipped'] as const;
export type EmailLogStatus = (typeof EMAIL_LOG_STATUSES)[number];
export const isEmailLogStatus = (v: unknown): v is EmailLogStatus => typeof v === 'string' && (EMAIL_LOG_STATUSES as readonly string[]).includes(v);

/** What a row's badge says: its delivery once Resend has reported one, else the send's outcome. */
export const emailLogStatus = (r: { status: string; delivery: string | null }): string => r.delivery ?? r.status;

// ================================================================================================
// The rollup
// ================================================================================================

/** The rollup's counts over the rows a filter picks (all of them, not a page). */
export interface EmailRollupCounts {
  /** Rows Resend accepted (`status = 'sent'`): the denominator of Delivered. */
  sent: number;
  /** Delivered, complained included (a complaint means it arrived): the denominator of the engagement rates. */
  delivered: number;
  delayed: number;
  bounced: number;
  complained: number;
  /** Delivered rows opened at least once (unique opens). */
  opened: number;
  /** Delivered rows clicked at least once (unique clicks). */
  clicked: number;
}

export const NO_ROLLUP: EmailRollupCounts = { sent: 0, delivered: 0, delayed: 0, bounced: 0, complained: 0, opened: 0, clicked: 0 };

const REACHED: ReadonlySet<string> = new Set(['delivered', 'complained']);

/** The rollup's counts from rows in hand (the fixture, and the API's SQL is tested against it). */
export function rollupOf(rows: readonly { status: string; delivery: string | null; openCount: number; clickCount: number }[]): EmailRollupCounts {
  const c = { ...NO_ROLLUP };
  for (const r of rows) {
    if (r.status !== 'sent') continue;
    c.sent += 1;
    const reached = r.delivery !== null && REACHED.has(r.delivery);
    if (reached) c.delivered += 1;
    if (r.delivery === 'delayed') c.delayed += 1;
    if (r.delivery === 'bounced') c.bounced += 1;
    if (r.delivery === 'complained') c.complained += 1;
    if (reached && r.openCount > 0) c.opened += 1;
    if (reached && r.clickCount > 0) c.clicked += 1;
  }
  return c;
}

/**
 * `n` of `d` as a whole percent, null when `d` is 0. Rounding never claims all or none when that is not
 * so: 199 of 200 is 99%, not 100%, and 1 of 300 is 1%, not 0%.
 */
export function ratePct(n: number, d: number): number | null {
  if (!(d > 0)) return null;
  const p = Math.round((n / d) * 100);
  if (n > 0 && n < d) return Math.min(99, Math.max(1, p));
  return p;
}

/** Resend's guidance keeps bounces under 4% of what was sent; any complaint is worth a look. */
export const BOUNCE_ALERT_PCT = 4;

export interface EmailRollup extends EmailRollupCounts {
  deliveredPct: number | null;
  bouncedPct: number | null;
  openedPct: number | null;
  clickedPct: number | null;
  /** Bounces at or over `BOUNCE_ALERT_PCT` of sends (unrounded), or any complaint. */
  alert: boolean;
}

export function emailRollup(c: EmailRollupCounts): EmailRollup {
  return {
    ...c,
    deliveredPct: ratePct(c.delivered, c.sent),
    bouncedPct: ratePct(c.bounced, c.sent),
    openedPct: ratePct(c.opened, c.delivered),
    clickedPct: ratePct(c.clicked, c.delivered),
    alert: c.complained > 0 || (c.sent > 0 && c.bounced / c.sent >= BOUNCE_ALERT_PCT / 100),
  };
}

// ================================================================================================
// Words
// ================================================================================================

/** A bounce as one line: "Permanent · General · The mailbox does not exist." Null with nothing to say. */
export function bounceLine(d: Pick<EmailDelivery, 'bounceType' | 'bounceSubType' | 'bounceMessage'>): string | null {
  const parts = [d.bounceType, d.bounceSubType, d.bounceMessage].filter((p): p is string => !!p);
  return parts.length ? parts.join(' · ') : null;
}
