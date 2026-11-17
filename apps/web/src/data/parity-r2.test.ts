import { describe, expect, it } from 'vitest';
import { seed } from '@ai/core';
import { INCIDENTS, INV, MODS0_STATUS, PARITY_R2, STAFF, UPGRADE_REQUESTS, SUPPORT_USERS, SUPPORT_WS, mockCents, mockStamp, readParityR2 } from './parity-r2';
import { ENVIRONMENT, PROGRAM, initials, shellDataFrom, shellDataFromParity } from './admin-shell';

// D-160 R2-1b: the R2 parity fixture is the mockup's own data, and the shell's data otherwise comes
// from the snapshot.

describe('the R2 parity fixture (D-160 R2-1b)', () => {
  it('is the mockup’s: Connor Leiva, Owner; the cohort tile; Production; 6 draft, 2 and 1', () => {
    expect(PARITY_R2.viewer).toEqual({ name: 'Connor Leiva', role: 'Owner' });
    expect(STAFF.map((s) => s.role)).toEqual(['Owner', 'Admin', 'Support']);
    expect(PARITY_R2.program).toBe('Amplified AI Accelerator');
    expect(PARITY_R2.cohort).toBe('December 2026 Cohort');
    expect(PARITY_R2.environment).toBe('Production');
    expect(PARITY_R2.started).toBe(true);
    expect(PARITY_R2.counts).toEqual({ drafts: 6, requests: 2, incidents: 1 });
    expect(MODS0_STATUS).toHaveLength(15);
    expect(INCIDENTS.map((i) => i.id)).toEqual(['INC-0007', 'INC-0006', 'INC-0005']);
    expect(UPGRADE_REQUESTS).toHaveLength(3);
  });

  it('is used only when the address asks for it', () => {
    expect(readParityR2('?as=admin&parity=r2')).toBe(PARITY_R2);
    expect(readParityR2('?as=admin')).toBeNull();
    expect(readParityR2('?parity=r1')).toBeNull();
    expect(readParityR2('')).toBeNull();
  });
});

describe('the admin shell’s data (D-160 R2-1b)', () => {
  it('comes from the snapshot: the viewer, the cohort, the drafts and new requests, no incidents yet', () => {
    const db = seed('live');
    const d = shellDataFrom(db, 'st1', 'Owner');
    expect(d.viewer).toEqual({ name: 'Casey Lin', role: 'Owner' });
    expect(d.program).toBe(PROGRAM);
    expect(d.cohort).toBe('December 2026 Cohort');
    expect(d.environment).toBe(ENVIRONMENT);
    expect(d.counts).toEqual({
      drafts: db.modules.filter((m) => m.status === 'draft').length,
      requests: db.requests.filter((q) => q.status === 'new').length,
      incidents: 0,
    });
    expect(d.fullNav).toBe(false);
    // The fixture build may preview another role; the name stays the viewer's.
    expect(shellDataFrom(db, 'st1', 'Support').viewer).toEqual({ name: 'Casey Lin', role: 'Support' });
  });

  it('from the parity fixture, shows the mockup’s whole NAV', () => {
    expect(shellDataFromParity(PARITY_R2)).toEqual({
      viewer: { name: 'Connor Leiva', role: 'Owner' },
      program: 'Amplified AI Accelerator',
      cohort: 'December 2026 Cohort',
      environment: 'Production',
      counts: { drafts: 6, requests: 2, incidents: 1 },
      fullNav: true,
    });
  });

  it('has the mockup’s initials', () => {
    expect(initials('Amplified AI Accelerator')).toBe('AA');
    expect(initials('Connor Leiva')).toBe('CL');
    expect(initials('Cher')).toBe('C');
  });
});

describe('the Support records (D-160 R2-1c): the mockup’s WS, USERS and INV, and its stamps', () => {
  it('copies the mockup’s records', () => {
    expect(SUPPORT_WS.map((w) => w.id)).toEqual(['ws_northshore', 'ws_halemarlowe', 'ws_redcliff', 'ws_copperbasin', 'ws_tidewater', 'ws_lantern', 'ws_fourthmeridian']);
    expect(SUPPORT_USERS.map((u) => u.id)).toEqual(['u_1042', 'u_1043', 'u_1061', 'u_1077', 'u_1090', 'u_1104', 'u_1118', 'u_1125']);
    expect(INV).toHaveLength(6);
  });

  it('reads a mockup stamp as MST, and an amount as cents', () => {
    expect(new Date(mockStamp('Dec 10, 8:52 AM')).toISOString()).toBe('2026-12-10T15:52:00.000Z');
    expect(new Date(mockStamp('Dec 10, 12:41 AM')).toISOString()).toBe('2026-12-10T07:41:00.000Z');
    expect(new Date(mockStamp('Nov 2, 4:40 PM')).toISOString()).toBe('2026-11-02T23:40:00.000Z');
    expect(new Date(mockStamp('Jan 8, 2027')).toISOString()).toBe('2027-01-08T16:00:00.000Z');
    expect(() => mockStamp('tomorrow')).toThrow();
    expect(mockCents('$1,495.00')).toBe(149500);
  });
});
