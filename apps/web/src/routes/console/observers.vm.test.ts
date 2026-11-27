// D-264: the "Cohort observer emails" card's words, and the fixture's promise that it shows no such card.
import { describe, expect, it } from 'vitest';
import { EMAIL_OBSERVERS_COPY } from '@ai/core';
import type { EmailObserversView } from '@ai/core';
import { OBSERVERS_COPY, observersToSave, observersVM } from './observers.vm';
import { createConsoleFixture } from '../../data/console-fixture';

const view = (over: Partial<EmailObserversView> = {}): EmailObserversView => ({
  addresses: ['observer-one@example.com', 'observer-two@example.com'],
  source: 'console',
  envAddresses: [],
  updatedAt: Date.parse('2026-12-10T15:52:00Z'),
  updatedBy: 'Connor Leiva',
  ...over,
});

describe('the cohort observer card (D-264)', () => {
  it('reads core’s words: a sentence-case title like the page’s other cards, and a Title Case button', () => {
    expect(OBSERVERS_COPY).toBe(EMAIL_OBSERVERS_COPY);
    expect(OBSERVERS_COPY.title).toBe('Cohort observer emails');
    expect(OBSERVERS_COPY.save).toBe('Save Addresses');
  });

  it('lists the addresses one per line, and says who saved them and when, in the admin’s zone', () => {
    expect(observersVM(view(), ['flags.write'])).toEqual({
      text: 'observer-one@example.com\nobserver-two@example.com',
      source: 'Saved by Connor Leiva, Dec 10, 8:52 AM.',
      canEdit: true,
    });
  });

  it('names the env var while it is the list in force, and says when nobody gets a copy', () => {
    expect(observersVM(view({ source: 'env', updatedAt: null, updatedBy: null }), ['flags.write']).source).toBe(OBSERVERS_COPY.fromEnv);
    expect(observersVM(view({ source: 'none', addresses: [], updatedAt: null, updatedBy: null }), ['flags.write']).source).toBe(OBSERVERS_COPY.none);
    expect(observersVM(view({ source: 'none', addresses: [] }), ['flags.write']).source).toBe('No observer gets a copy. Saved by Connor Leiva, Dec 10, 8:52 AM.');
  });

  it('is read-only without flags.write', () => {
    expect(observersVM(view(), ['ops.read']).canEdit).toBe(false);
  });

  it('checks what was typed before it is sent', () => {
    expect(observersToSave('A@Example.com\n b@example.com ')).toEqual({ ok: true, addresses: ['a@example.com', 'b@example.com'] });
    expect(observersToSave('')).toEqual({ ok: true, addresses: [] });
    expect(observersToSave('not an address').ok).toBe(false);
  });

  it('the fixture build has no observer view, so the page the mockup draws is unchanged', async () => {
    const api = createConsoleFixture();
    await expect(api.emailObservers()).resolves.toBeNull();
  });
});
