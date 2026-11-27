// D-264: the cohort observer list's rules. Which templates an observer may ever get, how a typed or env list is read,
// and which list is in force. The sends themselves are the API's (`apps/api/test/email-observers.test.ts`).
import { describe, expect, it } from 'vitest';
import {
  AUDIT_ACTIONS,
  COHORT_OBSERVER_ENV,
  EMAIL_OBSERVERS_COPY,
  INFRA_PATHS,
  OBSERVER_ADDRESSES_MAX,
  OBSERVER_COPY_TEMPLATES,
  OBSERVER_NEVER_TEMPLATES,
  isObserverAddress,
  isObserverCopyTemplate,
  observerAddressesFromEnv,
  parseObserverAddresses,
  resolveObservers,
} from '../src';

describe('which templates an observer gets (D-264)', () => {
  it('copies the seven cohort-wide emails the brief names, and the welcome', () => {
    expect([...OBSERVER_COPY_TEMPLATES].sort()).toEqual(
      ['announcement', 'build-reminder', 'cohort-welcome', 'replay-ready', 'session-1h', 'session-24h', 'week0-open', 'weekly-digest'].sort(),
    );
  });

  it('never copies a sign-in, password, invite, nudge or receipt email', () => {
    for (const t of ['sign-in', 'set-password', 'reset-password', 'learner-invite', 'team-invite', 'staff-invite', 'learner-nudge', 'skill-purchase']) {
      expect(OBSERVER_NEVER_TEMPLATES).toContain(t);
      expect(isObserverCopyTemplate(t)).toBe(false);
    }
  });

  it('puts no template on both sides', () => {
    const both = OBSERVER_COPY_TEMPLATES.filter((t) => (OBSERVER_NEVER_TEMPLATES as readonly string[]).includes(t));
    expect(both).toEqual([]);
  });
});

describe('reading an observer list (D-264)', () => {
  it('trims, lowercases and collapses duplicates, in first-seen order', () => {
    expect(parseObserverAddresses(['  Connor@Example.com ', 'spring@example.com', 'connor@example.com'])).toEqual({
      ok: true,
      addresses: ['connor@example.com', 'spring@example.com'],
    });
  });

  it('reads one typed string split by commas, semicolons or new lines', () => {
    expect(parseObserverAddresses('a@example.com,\nb@example.com; c@example.com')).toEqual({ ok: true, addresses: ['a@example.com', 'b@example.com', 'c@example.com'] });
  });

  it('takes an empty list, which turns the copies off', () => {
    expect(parseObserverAddresses([])).toEqual({ ok: true, addresses: [] });
    expect(parseObserverAddresses('')).toEqual({ ok: true, addresses: [] });
  });

  it('refuses anything that is not one mailbox', () => {
    for (const bad of ['connor', 'connor@', '@example.com', 'connor@example', 'Connor <connor@example.com>', 'a:b@example.com', 'a b@example.com', 'a@b@example.com']) {
      expect(isObserverAddress(bad), bad).toBe(false);
      expect(parseObserverAddresses([bad]).ok, bad).toBe(false);
    }
    expect(parseObserverAddresses({ addresses: 'x' }).ok).toBe(false);
    expect(parseObserverAddresses([1]).ok).toBe(false);
  });

  it(`holds at most ${OBSERVER_ADDRESSES_MAX}`, () => {
    const many = Array.from({ length: OBSERVER_ADDRESSES_MAX + 1 }, (_, i) => `o${i}@example.com`);
    expect(parseObserverAddresses(many).ok).toBe(false);
    expect(parseObserverAddresses(many.slice(0, OBSERVER_ADDRESSES_MAX)).ok).toBe(true);
  });

  it('reads the env var leniently: a typo drops that entry and says so', () => {
    expect(observerAddressesFromEnv('connor@example.com, not-an-address ,Spring@Example.com')).toEqual({
      addresses: ['connor@example.com', 'spring@example.com'],
      invalid: ['not-an-address'],
    });
    expect(observerAddressesFromEnv(undefined)).toEqual({ addresses: [], invalid: [] });
  });
});

describe('the list in force (D-264)', () => {
  it('is the Console’s saved list when there is one', () => {
    expect(resolveObservers(['connor@example.com'], 'spring@example.com')).toEqual({ addresses: ['connor@example.com'], source: 'console' });
  });

  it('is nobody when the Console saved an empty list, even with the env var set', () => {
    expect(resolveObservers([], 'spring@example.com')).toEqual({ addresses: [], source: 'none' });
  });

  it('falls back to the env var, then to nobody', () => {
    expect(resolveObservers(null, 'spring@example.com')).toEqual({ addresses: ['spring@example.com'], source: 'env' });
    expect(resolveObservers(null, undefined)).toEqual({ addresses: [], source: 'none' });
  });

  it('names its route, its audit action and its env var', () => {
    expect(INFRA_PATHS.emailObservers).toBe('/api/console/email-observers');
    expect(AUDIT_ACTIONS).toContain('email_observers.save');
    expect(COHORT_OBSERVER_ENV).toBe('COHORT_OBSERVER_EMAILS');
    expect(EMAIL_OBSERVERS_COPY.fromEnv).toContain('COHORT_OBSERVER_EMAILS');
  });
});
