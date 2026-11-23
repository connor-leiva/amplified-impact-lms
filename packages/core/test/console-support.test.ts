// The Admin Console's support records, PR 2 (D-158): plan labels against spec § 7.3's list, the plan
// that names a workspace, "near cap", the note and reason bounds, search's bounds and LIKE escaping,
// activity's merge, and the users export's CSV.
import { describe, expect, it } from 'vitest';
import {
  CONSOLE_ERRORS,
  CONSOLE_PLAN_LABELS,
  INDIVIDUAL_LABEL,
  NOTE_BODY_MAX,
  PLAN_STATUS_LABELS,
  SEARCH_GROUPS,
  USERS_CSV_HEADER,
  WORKSPACE_ACTIVITY_MAX,
  cleanNoteBody,
  cleanReason,
  cleanSearch,
  containsPattern,
  mergeActivity,
  nearCap,
  planSets,
  primaryPlan,
  userPath,
  usersCsv,
  workspacePath,
} from '../src/index';
import type { WorkspaceActivity } from '../src/index';

describe('plan labels (spec § 7.3, inferred there; read from PLAN_NAMES here) @console', () => {
  it('are the spec’s five', () => {
    expect(CONSOLE_PLAN_LABELS).toEqual({
      cohort: 'AI Accelerator',
      agents: 'Team Plan',
      agent_plan: 'Agent Plan',
      membership: 'Insiders',
      insiders_agent: 'Insiders for Agents',
      library: 'Skill Library',
    });
  });

  it('name every plan status in Title Case', () => {
    expect(Object.values(PLAN_STATUS_LABELS)).toEqual(['Trialing', 'Active', 'Past Due', 'Canceled', 'Ended']);
  });

  it('open the sets D-079 gives each plan', () => {
    expect(planSets('cohort')).toEqual(['owner_ops', 'agent']);
    expect(planSets('agents')).toEqual(['agent']);
    expect(planSets('membership')).toEqual(['owner_ops', 'agent']);
  });
});

describe('the plan that names a workspace @console', () => {
  const p = (kind: string, status: string, createdAt: number) => ({ kind, status, createdAt });

  it('prefers a running plan, then the AI Accelerator over Insiders, then the newest', () => {
    expect(primaryPlan([p('membership', 'trialing', 9), p('cohort', 'active', 1)])!.kind).toBe('cohort');
    expect(primaryPlan([p('agents', 'canceled', 9), p('membership', 'active', 1)])!.kind).toBe('membership');
    expect(primaryPlan([p('agents', 'ended', 1), p('agents', 'active', 2), p('agents', 'active', 3)])).toEqual(p('agents', 'active', 3));
    expect(primaryPlan([p('agent_plan', 'past_due', 1), p('membership', 'active', 2)])!.kind).toBe('agent_plan');
    expect(primaryPlan([])).toBeNull();
  });
});

describe('near cap (spec § 7.3) @console', () => {
  it('is 90% or more of more than two seats', () => {
    expect(nearCap(15, 16)).toBe(true);
    expect(nearCap(14, 16)).toBe(false);
    expect(nearCap(37, 41)).toBe(true);
    expect(nearCap(36, 41)).toBe(false);
    expect(nearCap(3, 3)).toBe(true);
    // The owner and one operator: full by design, never "near cap".
    expect(nearCap(2, 2)).toBe(false);
    expect(nearCap(1, 1)).toBe(false);
  });

  it('calls a learner with no team Individual', () => {
    expect(INDIVIDUAL_LABEL).toBe('Individual');
  });
});

describe('note, reason and search bounds @console', () => {
  it('a note is 1 to 2,000 characters, trimmed', () => {
    expect(cleanNoteBody('  hi  ')).toBe('hi');
    expect(cleanNoteBody('   ')).toBeNull();
    expect(cleanNoteBody('x'.repeat(NOTE_BODY_MAX))).toHaveLength(2000);
    expect(cleanNoteBody('x'.repeat(NOTE_BODY_MAX + 1))).toBeNull();
    expect(cleanNoteBody(42)).toBeNull();
  });

  it('a reason is 10 to 500 characters, trimmed', () => {
    expect(cleanReason('  long enough  ')).toBe('long enough');
    expect(cleanReason('too short')).toBeNull();
    expect(cleanReason('x'.repeat(500))).toHaveLength(500);
    expect(cleanReason('x'.repeat(501))).toBeNull();
    expect(cleanReason(undefined)).toBeNull();
    expect(CONSOLE_ERRORS.reason_required).toEqual({ status: 422, message: 'Give a reason of 10 to 500 characters.' });
  });

  it('a search is 2 to 100 characters, trimmed', () => {
    expect(cleanSearch(' ab ')).toBe('ab');
    expect(cleanSearch('a')).toBeNull();
    expect(cleanSearch('x'.repeat(100))).toHaveLength(100);
    expect(cleanSearch('x'.repeat(101))).toBeNull();
    expect(cleanSearch(['ab'])).toBeNull();
    expect(SEARCH_GROUPS).toEqual(['users', 'workspaces', 'orders', 'skills']);
  });

  it('escapes LIKE’s own characters so they match only themselves', () => {
    expect(containsPattern('ab')).toBe('%ab%');
    expect(containsPattern('50%')).toBe('%50\\%%');
    expect(containsPattern('a_b')).toBe('%a\\_b%');
    expect(containsPattern('c:\\x')).toBe('%c:\\\\x%');
  });

  it('builds record paths, encoded', () => {
    expect(workspacePath('northline')).toBe('/admin/workspaces/northline');
    expect(userPath('a b')).toBe('/admin/users/a%20b');
  });
});

describe('workspace activity (spec § 7.3) @console', () => {
  it('merges newest first and keeps 50', () => {
    const items: WorkspaceActivity[] = Array.from({ length: 70 }, (_, i) => ({ at: i, kind: i % 2 ? 'order_paid' : 'member_joined', subject: `s${i}`, label: 'x' }));
    const out = mergeActivity(items);
    expect(out).toHaveLength(WORKSPACE_ACTIVITY_MAX);
    expect(out[0]!.at).toBe(69);
    expect(out.at(-1)!.at).toBe(20);
  });
});

describe('the users export CSV @console', () => {
  it('has the fixed header, no secret column, and neutralizes formulas', () => {
    expect(USERS_CSV_HEADER).not.toContain('hash');
    const csv = usersCsv([
      { id: 'u1', name: '=cmd|calc', email: 'a@example.com', kind: 'learner', role: 'Agent', teamId: null, workspace: 'Individual', status: 'active', joined: 0, lastActive: null },
    ]);
    expect(csv).toBe(
      '"id","name","email","kind","role","team_id","workspace","status","joined","last_active"\r\n' +
        `"u1","'=cmd|calc","a@example.com","learner","Agent","","Individual","active","1970-01-01T00:00:00.000Z",""\r\n`,
    );
  });
});
