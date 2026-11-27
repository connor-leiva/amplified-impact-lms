// D-263: Resend's delivery events on the email log. Parsing a webhook body, folding one email's events
// into its row whatever their order or repeats, the badge's state, and the rollup's rates.
import { describe, expect, it } from 'vitest';
import {
  BOUNCE_MESSAGE_MAX,
  CLICK_LINK_MAX,
  DELIVERY_STATES,
  EMAIL_LOG_STATUSES,
  NO_DELIVERY,
  NO_ROLLUP,
  RESEND_EVENT_TYPES,
  bounceLine,
  cleanLink,
  cleanText,
  deliveryStateOf,
  emailLogStatus,
  emailRollup,
  foldResendEvents,
  parseResendEvent,
  ratePct,
  rollupOf,
} from '../src/index';
import type { ResendEvent, ResendEventType } from '../src/index';

const T0 = Date.parse('2026-12-08T19:00:00.000Z');
const RECEIVED = Date.parse('2026-12-08T20:00:00.000Z');

/** A webhook body as Resend sends it (https://resend.com/docs/dashboard/webhooks/event-types). */
const body = (type: string, data: Record<string, unknown> = {}, createdAt: string | null = '2026-12-08T19:00:05.000Z') => ({
  type,
  ...(createdAt === null ? {} : { created_at: createdAt }),
  data: {
    created_at: '2026-12-08T19:00:00.000000+00:00',
    email_id: '4ef9a417-02e9-4d39-ad75-9611e0fcc33c',
    from: 'Amplified Impact <hello@example.com>',
    to: ['elena@example.com'],
    subject: 'Tomorrow at 12:00 PM MST: Session 2 live build',
    ...data,
  },
});

let n = 0;
const ev = (type: ResendEventType, minutes: number, extra: Partial<ResendEvent> = {}): ResendEvent => ({
  id: `msg_${String(++n).padStart(4, '0')}`,
  type,
  emailId: 're_1',
  occurredAt: T0 + minutes * 60_000,
  bounceType: null,
  bounceSubType: null,
  bounceMessage: null,
  link: null,
  ...extra,
});

/** Every order of a small list, for the fold's order-independence. */
function permutations<T>(xs: readonly T[]): T[][] {
  if (xs.length <= 1) return [[...xs]];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

describe('parsing a webhook body (D-263)', () => {
  it('records the seven email events the brief names, and nothing else', () => {
    expect(RESEND_EVENT_TYPES).toEqual([
      'email.sent',
      'email.delivered',
      'email.delivery_delayed',
      'email.bounced',
      'email.complained',
      'email.opened',
      'email.clicked',
    ]);
    for (const type of RESEND_EVENT_TYPES) expect(parseResendEvent('msg_1', body(type), RECEIVED).kind).toBe('event');
    expect(parseResendEvent('msg_1', body('email.failed'), RECEIVED)).toEqual({ kind: 'ignored', type: 'email.failed' });
    expect(parseResendEvent('msg_1', body('contact.created'), RECEIVED)).toEqual({ kind: 'ignored', type: 'contact.created' });
  });

  it('keeps the email id and when it happened, and none of the recipient, subject or sender', () => {
    const p = parseResendEvent('msg_2Kx', body('email.delivered'), RECEIVED);
    expect(p).toEqual({
      kind: 'event',
      event: {
        id: 'msg_2Kx',
        type: 'email.delivered',
        emailId: '4ef9a417-02e9-4d39-ad75-9611e0fcc33c',
        occurredAt: Date.parse('2026-12-08T19:00:05.000Z'),
        bounceType: null,
        bounceSubType: null,
        bounceMessage: null,
        link: null,
      },
    });
    expect(JSON.stringify(p)).not.toContain('elena@example.com');
    expect(JSON.stringify(p)).not.toContain('Session 2');
  });

  it('uses the arrival time when created_at is missing or unreadable', () => {
    const missing = parseResendEvent('msg_1', body('email.opened', {}, null), RECEIVED);
    const junk = parseResendEvent('msg_1', { ...body('email.opened'), created_at: 'yesterday' }, RECEIVED);
    expect(missing.kind === 'event' && missing.event.occurredAt).toBe(RECEIVED);
    expect(junk.kind === 'event' && junk.event.occurredAt).toBe(RECEIVED);
  });

  it('captures a bounce’s type, subtype and message, cleaned and capped', () => {
    const p = parseResendEvent(
      'msg_1',
      body('email.bounced', { bounce: { type: 'Permanent', subType: 'General', message: 'The mailbox\r\ndoes not\u0000 exist.' } }),
      RECEIVED,
    );
    expect(p.kind === 'event' && p.event).toMatchObject({ bounceType: 'Permanent', bounceSubType: 'General', bounceMessage: 'The mailbox does not exist.' });
    const long = parseResendEvent('msg_1', body('email.bounced', { bounce: { message: 'x'.repeat(5000) } }), RECEIVED);
    expect(long.kind === 'event' && long.event.bounceMessage?.length).toBe(BOUNCE_MESSAGE_MAX);
    // A bounce with no details is still a bounce.
    expect(parseResendEvent('msg_1', body('email.bounced'), RECEIVED)).toMatchObject({ kind: 'event', event: { bounceType: null, bounceMessage: null } });
  });

  it('captures a click’s link (http or https only), and only on a click', () => {
    const click = (link: unknown) => {
      const p = parseResendEvent('msg_1', body('email.clicked', { click: { link, ipAddress: '203.0.113.9', userAgent: 'Mail', timestamp: 'x' } }), RECEIVED);
      return p.kind === 'event' ? p.event.link : 'not an event';
    };
    expect(click('https://learn.example.com/course?week=2')).toBe('https://learn.example.com/course?week=2');
    expect(click('javascript:alert(1)')).toBeNull();
    expect(click('mailto:x@example.com')).toBeNull();
    expect(click('not a url')).toBeNull();
    expect(click(42)).toBeNull();
    expect(click(`https://example.com/${'a'.repeat(CLICK_LINK_MAX)}`)?.length).toBe(CLICK_LINK_MAX);
    // The IP address and user agent are never kept.
    const p = parseResendEvent('msg_1', body('email.clicked', { click: { link: 'https://x.example', ipAddress: '203.0.113.9' } }), RECEIVED);
    expect(JSON.stringify(p)).not.toContain('203.0.113.9');
    // A link on an open is not a click's.
    const open = parseResendEvent('msg_1', body('email.opened', { click: { link: 'https://x.example' } }), RECEIVED);
    expect(open.kind === 'event' && open.event.link).toBeNull();
  });

  it('refuses a body it cannot tie to an email', () => {
    expect(parseResendEvent('msg_1', null, RECEIVED)).toEqual({ kind: 'invalid' });
    expect(parseResendEvent('msg_1', [], RECEIVED)).toEqual({ kind: 'invalid' });
    expect(parseResendEvent('msg_1', { type: 7 }, RECEIVED)).toEqual({ kind: 'invalid' });
    expect(parseResendEvent('msg_1', { type: 'email.delivered' }, RECEIVED)).toEqual({ kind: 'invalid' });
    expect(parseResendEvent('msg_1', body('email.delivered', { email_id: '' }), RECEIVED)).toEqual({ kind: 'invalid' });
    expect(parseResendEvent('msg_1', body('email.delivered', { email_id: 'a b' }), RECEIVED)).toEqual({ kind: 'invalid' });
    expect(parseResendEvent('', body('email.delivered'), RECEIVED)).toEqual({ kind: 'invalid' });
    expect(parseResendEvent('x'.repeat(129), body('email.delivered'), RECEIVED)).toEqual({ kind: 'invalid' });
  });

  it('cleans provider text', () => {
    expect(cleanText('  a\tb\n\nc  ', 10)).toBe('a b c');
    expect(cleanText('', 10)).toBeNull();
    expect(cleanText('   ', 10)).toBeNull();
    expect(cleanText(null, 10)).toBeNull();
    expect(cleanLink('http://a.example')).toBe('http://a.example');
  });
});

describe('folding one email’s events (D-263)', () => {
  it('is empty with no events', () => expect(foldResendEvents([])).toEqual(NO_DELIVERY));

  it('counts opens and clicks with their first and latest times, and keeps the latest link', () => {
    const d = foldResendEvents([
      ev('email.sent', 0),
      ev('email.delivered', 1),
      ev('email.opened', 10),
      ev('email.clicked', 11, { link: 'https://a.example' }),
      ev('email.opened', 30),
      ev('email.clicked', 31, { link: 'https://b.example' }),
      ev('email.clicked', 32),
      ev('email.opened', 50),
    ]);
    expect(d).toMatchObject({
      delivery: 'delivered',
      deliveredAt: T0 + 60_000,
      openCount: 3,
      openedFirstAt: T0 + 600_000,
      openedLastAt: T0 + 3_000_000,
      clickCount: 3,
      clickedFirstAt: T0 + 660_000,
      clickedLastAt: T0 + 1_920_000,
      // The latest click that named a link.
      clickedLink: 'https://b.example',
    });
  });

  it('gives the same row for every order of the same events', () => {
    const events = [
      ev('email.sent', 0),
      ev('email.delivery_delayed', 1),
      ev('email.delivered', 2),
      ev('email.opened', 3),
      ev('email.clicked', 4, { link: 'https://a.example' }),
      ev('email.complained', 5),
    ];
    const want = foldResendEvents(events);
    expect(want.delivery).toBe('complained');
    for (const order of permutations(events)) expect(foldResendEvents(order)).toEqual(want);
  });

  it('counts a repeated event once (a retry has the same id)', () => {
    const open = ev('email.opened', 3);
    const once = foldResendEvents([ev('email.delivered', 1), open]);
    expect(foldResendEvents([ev('email.delivered', 1), open, open, { ...open }])).toMatchObject({ openCount: once.openCount });
    expect(once.openCount).toBe(1);
  });

  it('keeps the latest bounce and its details', () => {
    const d = foldResendEvents([
      ev('email.bounced', 9, { bounceType: 'Permanent', bounceSubType: 'Suppressed', bounceMessage: 'On the suppression list.' }),
      ev('email.bounced', 2, { bounceType: 'Transient', bounceSubType: 'General', bounceMessage: 'Try later.' }),
    ]);
    expect(d).toMatchObject({ delivery: 'bounced', bouncedAt: T0 + 540_000, bounceType: 'Permanent', bounceSubType: 'Suppressed', bounceMessage: 'On the suppression list.' });
    expect(bounceLine(d)).toBe('Permanent · Suppressed · On the suppression list.');
    expect(bounceLine(NO_DELIVERY)).toBeNull();
  });
});

describe('the badge’s state (D-263)', () => {
  const fold = (...types: ResendEventType[]) => foldResendEvents(types.map((t, i) => ev(t, i))).delivery;

  it('has five states, strongest first: complained, bounced, delivered, delayed, sent', () => {
    expect(DELIVERY_STATES).toEqual(['sent', 'delivered', 'delayed', 'bounced', 'complained']);
    expect(fold('email.sent')).toBe('sent');
    expect(fold('email.sent', 'email.delivery_delayed')).toBe('delayed');
    expect(fold('email.delivery_delayed', 'email.delivered')).toBe('delivered');
    // A late, weaker event never undoes a stronger one.
    expect(fold('email.delivered', 'email.delivery_delayed')).toBe('delivered');
    expect(fold('email.delivered', 'email.bounced')).toBe('bounced');
    expect(fold('email.delivered', 'email.complained', 'email.delivered')).toBe('complained');
    expect(fold('email.bounced', 'email.complained')).toBe('complained');
  });

  it('reads an open or a click as proof of delivery when the delivery event is late or lost', () => {
    expect(fold('email.sent', 'email.opened')).toBe('delivered');
    expect(fold('email.clicked')).toBe('delivered');
    expect(fold('email.delivery_delayed', 'email.opened')).toBe('delivered');
  });

  it('is null with no event', () => expect(deliveryStateOf(NO_DELIVERY, false)).toBeNull());

  it('says the delivery once there is one, else the send’s outcome', () => {
    expect(EMAIL_LOG_STATUSES).toEqual(['sent', 'delivered', 'delayed', 'bounced', 'complained', 'failed', 'skipped']);
    expect(emailLogStatus({ status: 'sent', delivery: null })).toBe('sent');
    expect(emailLogStatus({ status: 'sent', delivery: 'bounced' })).toBe('bounced');
    expect(emailLogStatus({ status: 'failed', delivery: null })).toBe('failed');
    expect(emailLogStatus({ status: 'skipped', delivery: null })).toBe('skipped');
  });
});

describe('the rollup (D-263)', () => {
  const row = (status: string, delivery: string | null, openCount = 0, clickCount = 0) => ({ status, delivery, openCount, clickCount });

  it('counts sends Resend took, deliveries (complaints included), bounces, and unique opens and clicks', () => {
    const c = rollupOf([
      row('sent', 'delivered', 3, 1),
      row('sent', 'delivered', 1, 0),
      row('sent', 'delivered', 0, 0),
      row('sent', 'complained', 2, 0),
      row('sent', 'bounced'),
      row('sent', 'delayed'),
      row('sent', null),
      // Not sent through Resend: never in any count.
      row('failed', null),
      row('skipped', null),
    ]);
    expect(c).toEqual({ sent: 7, delivered: 4, delayed: 1, bounced: 1, complained: 1, opened: 3, clicked: 1 });
  });

  it('counts an open only on a delivered row, so a rate never passes 100%', () => {
    // A bounce that reports an open (a scanner, or a late bounce) is not a delivered open.
    expect(rollupOf([row('sent', 'bounced', 1, 1)])).toMatchObject({ delivered: 0, opened: 0, clicked: 0 });
  });

  it('rates delivery against sends, and opens and clicks against deliveries', () => {
    const r = emailRollup({ sent: 7, delivered: 5, delayed: 0, bounced: 1, complained: 0, opened: 4, clicked: 3 });
    expect(r).toMatchObject({ deliveredPct: 71, bouncedPct: 14, openedPct: 80, clickedPct: 60, alert: true });
  });

  it('has no rate with nothing to rate against', () => {
    expect(emailRollup(NO_ROLLUP)).toEqual({ ...NO_ROLLUP, deliveredPct: null, bouncedPct: null, openedPct: null, clickedPct: null, alert: false });
    expect(emailRollup({ ...NO_ROLLUP, sent: 3 })).toMatchObject({ deliveredPct: 0, openedPct: null, clickedPct: null });
  });

  it('never rounds to all or none when that is not so', () => {
    expect(ratePct(199, 200)).toBe(99);
    expect(ratePct(1, 300)).toBe(1);
    expect(ratePct(200, 200)).toBe(100);
    expect(ratePct(0, 200)).toBe(0);
    expect(ratePct(1, 3)).toBe(33);
    expect(ratePct(2, 3)).toBe(67);
    expect(ratePct(1, 0)).toBeNull();
  });

  it('alerts at 4% bounces or on any complaint', () => {
    const base = { ...NO_ROLLUP, sent: 100, delivered: 96 };
    expect(emailRollup({ ...base, bounced: 3 }).alert).toBe(false);
    expect(emailRollup({ ...base, bounced: 4 }).alert).toBe(true);
    expect(emailRollup({ ...base, complained: 1 }).alert).toBe(true);
    // Unrounded: 3.6% shows as 4% but is under the line.
    expect(emailRollup({ ...NO_ROLLUP, sent: 1000, bounced: 36 })).toMatchObject({ bouncedPct: 4, alert: false });
  });
});
