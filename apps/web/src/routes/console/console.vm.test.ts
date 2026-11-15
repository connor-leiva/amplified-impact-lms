import { describe, expect, it } from 'vitest';
import { consoleCan } from '@ai/core';
import { CONSOLE_HOME, CONSOLE_SCREENS, NOT_FOUND_COPY, deniedCopy, errorCopy } from './console.vm';

describe('the Console’s shared states (D-157)', () => {
  it('opens each screen with its spec capability', () => {
    expect(CONSOLE_SCREENS.audit).toEqual({ title: 'Audit Log', cap: 'audit.read', path: '/admin/audit' });
    expect(CONSOLE_SCREENS.roles).toEqual({ title: 'Roles & Permissions', cap: 'ops.read', path: '/admin/roles' });
    // Support reads the log but not the ops screens (D3).
    expect(consoleCan('Support', CONSOLE_SCREENS.audit.cap)).toBe(true);
    expect(consoleCan('Support', CONSOLE_SCREENS.roles.cap)).toBe(false);
  });

  it('says which screen and which role on Denied, and goes to the Overview', () => {
    expect(deniedCopy('roles', 'Support')).toEqual({
      eyebrow: 'Permission Needed',
      title: 'Your role can’t open Roles & Permissions.',
      body: 'You’re signed in as Support. Staff roles are set in Staff & Roles.',
      action: { label: 'Go to Overview', to: '/admin' },
    });
    expect(deniedCopy('audit', null).body).toBe('Staff roles are set in Staff & Roles.');
    expect(CONSOLE_HOME.to).toBe('/admin');
  });

  it('has the Console 404 in the mockup’s words', () => {
    expect(NOT_FOUND_COPY).toEqual({
      eyebrow: '404',
      title: 'That Console page doesn’t exist.',
      body: 'The link may be old, or the record was deleted.',
      action: { label: 'Go to Overview', to: '/admin' },
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
