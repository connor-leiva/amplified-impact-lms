// D-235: Weeks 1 and 2 by code, once, and then the Week Builder's (the Weeks 1 and 2 brief, `handoff/weeks-1-2/`).
// The plan over the deployed seed changes all twelve steps and every card row; a second run changes nothing; a step
// or a field someone changed is left and named; the ids, dependencies and copy rules hold; and what isn't there yet
// (Kit files, the seat card form) is named, not guessed.
import { describe, expect, it } from 'vitest';
import { checklistIssues, copyIssues, moduleCopyFields } from '../src/course-rules';
import type { CheckBlock, PathBlock } from '../src/course-types';
import type { AIEmployee, Db } from '../src/types';
import { seedProduction } from '../seed/curriculum';
import { planReleaseV1 } from '../seed/release-plan-v1';
import { planCopyV1 } from '../seed/copy-v1';
import { planContentV2 } from '../seed/content-v2';
import { planCopyV2 } from '../seed/copy-v2';
import { planCopyV3 } from '../seed/copy-v3';
import { planGlossaryV1 } from '../seed/glossary-v1';
import { planStartHereV1 } from '../seed/start-here-v1';
import { planIntakeV1 } from '../seed/intake-v1';
import { planStackV1 } from '../seed/stack-v1';
import { planPromiseV1 } from '../seed/promise-v1';
import { planUnshownV1 } from '../seed/unshown-v1';
import { planFiveWordsV1 } from '../seed/five-words-v1';
import { planIntakeRequiredV1 } from '../seed/required-v1';
import { WEEKS_1_2_DATA, holdsHandoffValue, planWeeks12V1 } from '../seed/weeks-1-2-steps-v1';

/** What production holds before this step: the seed, then every earlier data step, in the deploy's order. */
function deployed(): Db {
  let db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  for (const plan of [planReleaseV1, planCopyV1, planContentV2, planCopyV2, planCopyV3, planGlossaryV1, planStartHereV1, planIntakeV1, planStackV1, planPromiseV1, planUnshownV1, planFiveWordsV1, planIntakeRequiredV1]) db = plan(db).db;
  return db;
}
const week = (db: Db, n: 1 | 2): AIEmployee => db.modules.find((m) => m.id === `accelerator-week-${n}`)!;
const checks = (blocks: readonly PathBlock[]): CheckBlock[] => blocks.filter((b): b is CheckBlock => b.type === 'check');

describe('Weeks 1 and 2, seeded once (D-235)', () => {
  it('changes all twelve steps and every card row over the deployed seed, and a second run changes nothing', () => {
    const before = deployed();
    const out = planWeeks12V1(before);
    const steps = out.changes.filter((c) => /, step \d$/.test(c.target.label));
    expect(steps).toHaveLength(12);
    const rows = out.changes.filter((c) => !/, step \d$/.test(c.target.label));
    expect(rows).toHaveLength(WEEKS_1_2_DATA[1].cards.length + WEEKS_1_2_DATA[2].cards.length);
    for (const n of [1, 2] as const) {
      const m = week(out.db, n);
      m.checklist.forEach((s, i) => {
        const d = WEEKS_1_2_DATA[n].steps[i]!;
        expect([s.who, s.timeLabel, s.doneWhen, s.goal]).toEqual([d.who, d.time, d.done, d.goal]);
        expect(s.paths?.claude?.blocks.length).toBeGreaterThan(0);
        expect(s.paths?.chatgpt?.blocks.length).toBeGreaterThan(0);
        expect(s.ch).toBe(d.title);
        expect(s.mins).toBe(d.mins);
        expect(s.id).toBe(week(before, n).checklist[i]!.id);
      });
      for (const r of WEEKS_1_2_DATA[n].cards) expect(rows.some((c) => c.after === r.change_to && c.target.id === m.id)).toBe(true);
      expect(m.build).toBe(m.checklist.reduce((a, s) => a + s.mins, 0));
      // Nothing about the week's release changed.
      const was = week(before, n);
      expect([m.status, m.opens, m.dueAt, m.course?.media, m.course?.officeHours]).toEqual([was.status, was.opens, was.dueAt, was.course?.media, was.course?.officeHours]);
    }
    expect(out.db.sessions).toEqual(before.sessions);
    expect(out.db.resources).toEqual(before.resources);
    const twice = planWeeks12V1(out.db);
    expect(twice.changes).toEqual([]);
  });

  it('makes the two row changes of the sales page’s schedule, and no other title or minutes', () => {
    const before = deployed();
    const out = planWeeks12V1(before);
    const w1 = week(out.db, 1).checklist[4]!;
    expect([w1.ch, w1.mins, w1.text]).toEqual(['Schedule the Finance Analyst', 15, w1.goal!.replace(/\.$/, '')]);
    expect(week(out.db, 2).checklist[5]!.mins).toBe(10);
    expect(week(out.db, 2).checklist[5]!.ch).toBe(week(before, 2).checklist[5]!.ch);
    for (const n of [1, 2] as const) {
      week(out.db, n).checklist.forEach((s, i) => {
        if ((n === 1 && i === 4) || (n === 2 && i === 5)) return;
        const was = week(before, n).checklist[i]!;
        expect([s.ch, s.text, s.mins]).toEqual([was.ch, was.text, was.mins]);
      });
    }
    expect([week(before, 1).build, week(out.db, 1).build, week(before, 2).build, week(out.db, 2).build]).toEqual([60, 70, 60, 65]);
  });

  it('leaves a step that was edited in the builder, names it, and still loads the others', () => {
    const before = deployed();
    const m = week(before, 1);
    m.checklist[2] = { ...m.checklist[2]!, paths: { claude: { blocks: [{ type: 'text', text: 'Our own words.' }] } } };
    m.checklist[3] = { ...m.checklist[3]!, doneWhen: 'Our own done-when.' };
    m.checklist[0] = { ...m.checklist[0]!, ch: 'Run It' };
    const out = planWeeks12V1(before);
    expect(out.skipped.filter((s) => /step-[134]$/.test(s.id)).map((s) => [s.id, s.reason])).toEqual([
      ['accelerator-week-1.step-1', 'its title was changed in the builder'],
      ['accelerator-week-1.step-3', 'it has blocks on a path (edited in the builder)'],
      ['accelerator-week-1.step-4', 'its who, time, done-when or goal was set in the builder'],
    ]);
    const after = week(out.db, 1);
    expect(after.checklist[2]).toEqual(m.checklist[2]);
    expect(after.checklist[3]).toEqual(m.checklist[3]);
    expect(after.checklist[0]).toEqual(m.checklist[0]);
    expect(out.changes.filter((c) => /, step \d$/.test(c.target.label))).toHaveLength(9);
  });

  it('changes a week-level field only while it holds its seeded value', () => {
    const before = deployed();
    const m = week(before, 2);
    m.course = { ...m.course!, seatCard: { ...m.course!.seatCard!, runs: 'Our own schedule.' } };
    const out = planWeeks12V1(before);
    expect(out.skipped).toContainEqual({ id: 'accelerator-week-2.Seat card, Runs', reason: 'it no longer holds its seeded value (changed in the builder)' });
    expect(week(out.db, 2).course!.seatCard!.runs).toBe('Our own schedule.');
    expect(week(out.db, 2).course!.seatCard!.cantDo).toBe('Call, text, reassign or update a lead. It drafts and never sends');
  });

  it('reads the handoff’s seeded values by their words: apostrophes, final periods and "..." cuts aside', () => {
    expect(holdsHandoffValue('Once this week, with the operator; goes on a schedule in Week 3.', 'Once this week, with the operator. Goes on a schedule in Week 3')).toBe(true);
    expect(holdsHandoffValue('Baseline task 1, getting last month’s numbers in front of the owner.', "Baseline task 1, getting last month's numbers in front of the owner")).toBe(true);
    expect(holdsHandoffValue('A 12-month ledger or transaction detail export, plus closings from Sisu or an export. Connected teams…', 'A 12-month ledger or transaction detail export, plus closings from Sisu or an export...')).toBe(true);
    expect(holdsHandoffValue('New leads: from Sisu if test 5 passes, otherwise from the CRM’s speed-to-lead report dropped in…', "...from Sisu if test 5 passes, otherwise from the CRM's speed-to-lead report...")).toBe(true);
    expect(holdsHandoffValue('Something else entirely.', 'Once this week, with the operator.')).toBe(false);
  });

  it('keeps each step’s ids unique across both paths, and every dependency on an earlier item of the same path', () => {
    const out = planWeeks12V1(deployed());
    for (const n of [1, 2] as const) {
      const m = week(out.db, n);
      expect(checklistIssues(m)).toEqual([]);
      for (const s of m.checklist) {
        const ids = (['claude', 'chatgpt'] as const).flatMap((p) => checks(s.paths?.[p]?.blocks ?? []).map((c) => c.id));
        expect(new Set(ids).size).toBe(ids.length);
        for (const p of ['claude', 'chatgpt'] as const) {
          const seen = new Set<string>();
          for (const c of checks(s.paths?.[p]?.blocks ?? [])) {
            for (const d of c.dependsOn ?? []) expect(seen.has(d), `${c.id} depends on ${d}`).toBe(true);
            seen.add(c.id);
          }
        }
      }
    }
  });

  it('passes the course rules on both weeks after the plan', () => {
    const out = planWeeks12V1(deployed());
    for (const n of [1, 2] as const) expect(copyIssues(moduleCopyFields(week(out.db, n)))).toEqual([]);
  });

  it('leaves out the videos and their Watch items, which the builder adds as each is recorded', () => {
    const out = planWeeks12V1(deployed());
    for (const n of [1, 2] as const) {
      for (const s of week(out.db, n).checklist) {
        for (const p of ['claude', 'chatgpt'] as const) {
          const blocks = s.paths?.[p]?.blocks ?? [];
          expect(blocks.some((b) => b.type === 'video')).toBe(false);
          expect(checks(blocks).some((c) => c.id.endsWith('-watch') || (c.dependsOn ?? []).some((d) => d.endsWith('-watch')))).toBe(false);
        }
      }
    }
  });

  it('maps each button: copy text exactly, the uploads, the calendar by its session, and names what isn’t there yet', () => {
    const before = deployed();
    const out = planWeeks12V1(before);
    const all = [1, 2].flatMap((n) => week(out.db, n as 1 | 2).checklist.flatMap((s) => ['claude', 'chatgpt'].flatMap((p) => checks(s.paths?.[p as 'claude']?.blocks ?? []))));
    const byId = new Map(all.map((c) => [c.id, c]));
    // Copy: the prompt exactly as given, line breaks kept.
    const prompts = [1, 2].flatMap((n) => WEEKS_1_2_DATA[n as 1 | 2].steps.flatMap((s) => [...s.claude, ...s.chatgpt])).filter((b) => b.type === 'check' && b.button.kind === 'Copy');
    expect(prompts.length).toBe(14);
    for (const b of prompts) {
      if (b.type !== 'check') continue;
      expect(byId.get(b.id)!.action).toEqual({ type: 'copy', label: b.button.label, text: b.button.text });
    }
    // Uploads: Turn in, by the kind it collects, on both paths of steps 4 and 6.
    const uploads = all.filter((c) => c.action?.type === 'upload').map((c) => [c.id, c.action]);
    expect(uploads).toHaveLength(8);
    expect(uploads.filter(([, a]) => (a as { kind: string }).kind === 'live_read')).toHaveLength(4);
    // Calendar: the week's live build, by its title.
    const cal = all.filter((c) => c.action?.type === 'calendar').map((c) => (c.action as { sessionId: string }).sessionId);
    expect(new Set(cal)).toEqual(new Set(['dec26-s1', 'dec26-s2']));
    // The Kit is empty on the seed, and the seat card form doesn't exist yet: both named, the buttons left off.
    const named = out.skipped.filter((s) => s.id.endsWith('.button')).map((s) => s.reason);
    expect(named.filter((r) => r.includes('Download')).length).toBe(10);
    expect(named.filter((r) => r.includes('Form: "Seat card"')).length).toBe(4);
    expect(all.some((c) => c.action?.type === 'download' || c.action?.type === 'form')).toBe(false);
  });

  it('wires a Download button once the week’s Kit has the file by its exact title', () => {
    const before = deployed();
    const file = (id: string, title: string, module: string) => ({ id, title, desc: '', cat: 'Templates', type: 'PDF', tier: 'agent' as const, size: '1 KB', dl: 0, updated: 0, exec: false, status: 'published' as const, module });
    before.resources.push(file('r-guides-1', 'Week 1 Export Guides', 'accelerator-week-1'), file('r-reading', 'Reading Your Report', 'accelerator-week-1'));
    const out = planWeeks12V1(before);
    const items = week(out.db, 1).checklist.flatMap((s) => [...checks(s.paths?.claude?.blocks ?? []), ...checks(s.paths?.chatgpt?.blocks ?? [])]);
    const downloads = items.filter((c) => c.action?.type === 'download');
    expect(downloads.length).toBeGreaterThan(0);
    for (const d of downloads) for (const id of (d.action as { kitItemIds: string[] }).kitItemIds) expect(['r-guides-1', 'r-reading']).toContain(id);
    expect(out.skipped.some((s) => s.id.startsWith('accelerator-week-1') && s.reason.includes('Download'))).toBe(false);
  });
});
