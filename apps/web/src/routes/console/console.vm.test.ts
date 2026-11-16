import { describe, expect, it } from 'vitest';
import { consoleCan } from '@ai/core';
import { CONSOLE_HOME, CONSOLE_SCREENS, NOT_FOUND_COPY, deniedCopy, errorCopy } from './console.vm';

describe('the Console’s shared states (D-157, D-160 R2-1b)', () => {
  it('opens each screen with its spec capability', () => {
    expect(CONSOLE_SCREENS.audit).toEqual({ title: 'Audit Log', cap: 'audit.read', path: '/admin/audit' });
    expect(CONSOLE_SCREENS.roles).toEqual({ title: 'Roles & Permissions', cap: 'ops.read', path: '/admin/roles' });
    // Support reads the log but not the ops screens (D3).
    expect(consoleCan('Support', CONSOLE_SCREENS.audit.cap)).toBe(true);
    expect(consoleCan('Support', CONSOLE_SCREENS.roles.cap)).toBe(false);
  });

  it('says which page and which role on Denied, in the R2 mockup’s words, and goes to the Overview', () => {
    expect(deniedCopy(CONSOLE_SCREENS.roles.title, 'Support')).toEqual({
      title: "Your role can't open Roles & Permissions",
      body: 'You are signed in as Support. An Owner can change this in Roles & Permissions.',
      action: { label: 'Go to Overview', to: '/admin' },
    });
    // The mockup's own Denied page names no page.
    expect(deniedCopy(null, 'Owner').title).toBe("Your role can't open this page");
    expect(deniedCopy('Audit Log', null).body).toBe('An Owner can change this in Roles & Permissions.');
    expect(CONSOLE_HOME.to).toBe('/admin');
  });

  it('has the Console 404 in the R2 mockup’s words', () => {
    expect(NOT_FOUND_COPY).toEqual({
      title: "This page doesn't exist",
      body: 'The link may be old, or the record was removed. Error 404.',
      action: { label: 'Go to Overview', to: '/admin' },
      search: 'Search the admin',
    });
  });

  it('says "Too many requests" on a 429, and offers Retry on every error', () => {
    expect(errorCopy('rate_limited')).toEqual({ badge: 'Too Many Requests', title: 'Too many requests.', body: 'Wait a minute, then try again.', retry: 'Retry' });
    for (const k of ['failed', 'not_found', 'invalid'] as const) {
      expect(errorCopy(k).title).toBe('This didn’t load.');
      expect(errorCopy(k).retry).toBe('Retry');
    }
  });
});
