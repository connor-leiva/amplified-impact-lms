import { beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import type { ConsoleOrder } from '@ai/core';
import { PLAN_OPTIONS, STATUS_OPTIONS, activityLine, amountOf, dayOf, entitlementPairs, isMissing, orderStatusBadge, planStatusBadge, whenOf } from './records.vm';

// What the Console's support records share (D-158): badges are a word and a glyph, never a colour
// alone; times go through fmt.*; amounts are the order's own or "Not recorded".

const NOW = Date.parse('2026-12-07T16:42:00Z');

describe('records.vm (D-158)', () => {
  beforeEach(() => setViewerZone('America/Phoenix'));

  it('offers each plan by its Console label, and each status in Title Case', () => {
    expect(PLAN_OPTIONS.map((o) => o.label)).toEqual(['Any Plan', 'AI Accelerator', 'Team Plan', 'Agent Plan', 'Insiders', 'Skill Library']);
    expect(PLAN_OPTIONS.map((o) => o.value)).toEqual(['', 'cohort', 'agents', 'agent_plan', 'membership', 'library']);
    expect(STATUS_OPTIONS.map((o) => o.label)).toEqual(['Any Status', 'Trialing', 'Active', 'Past Due', 'Canceled', 'Ended']);
  });

  it('gives every status a word and a distinct glyph', () => {
    const plan = (['active', 'trialing', 'past_due', 'canceled', 'ended'] as const).map(planStatusBadge);
    expect(new Set(plan.map((b) => b.icon)).size).toBe(plan.length);
    expect(planStatusBadge(null)).toEqual({ label: 'No Plan', tone: 'neutral', icon: 'minus' });
    expect(orderStatusBadge('failed')).toEqual({ label: 'Failed', tone: 'attention', icon: 'alert' });
    expect(orderStatusBadge('mystery').label).toBe('mystery');
  });

  it('formats days, moments and amounts', () => {
    expect(dayOf(null)).toBe('Never');
    expect(dayOf(NOW)).toBe('Dec 7');
    expect(whenOf(NOW)).toMatch(/Mon, Dec 7 · 9:42 AM MST \(10:42 AM CT\)/);
    const o = (amountTotal: number | null, currency: string | null) => ({ amountTotal, currency }) as Pick<ConsoleOrder, 'amountTotal' | 'currency'>;
    expect(amountOf(o(750000, 'usd'))).toBe('$7,500');
    expect(amountOf(o(null, null))).toBe('Not recorded');
    expect(amountOf(o(1050, 'eur'))).toBe('10.50 EUR');
  });

  it('writes each activity line', () => {
    const a = (kind: Parameters<typeof activityLine>[0]['kind'], label: string) => activityLine({ at: NOW, kind, subject: 'x', label });
    expect(a('order_created', 'Team Plan')).toBe('Team Plan order started');
    expect(a('payment_failed', 'Insiders')).toBe('Insiders payment failed');
    expect(a('member_joined', 'Priya Shah')).toBe('Priya Shah joined');
    expect(a('invite_sent', 'alex@example.com')).toBe('Owner invite sent to alex@example.com');
    expect(a('plan_started', 'AI Accelerator')).toBe('AI Accelerator plan added');
  });

  it('lists entitlements, saying None rather than leaving a blank', () => {
    expect(entitlementPairs({ sets: [], course: false, groups: [] }).map((p) => p.value)).toEqual(['None', 'No', 'None']);
    expect(
      entitlementPairs({ sets: ['owner_ops', 'agent'], course: true, groups: [{ id: 'g', name: 'Utah Life', planKind: 'agents', planLabel: 'Team Plan', members: 1 }] }).map((p) => p.value),
    ).toEqual(['Owner and Operations Skills, Agent Skills', 'Yes', 'Utah Life (Team Plan, 1 member)']);
  });

  it('treats only a 404 as a missing record', () => {
    expect(isMissing('not_found')).toBe(true);
    expect(isMissing('failed')).toBe(false);
  });
});
