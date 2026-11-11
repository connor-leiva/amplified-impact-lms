// The Week 1 calculation worksheet (D-110). The arithmetic is deterministic and a missing input is
// unknown, never zero: the two rules the course plan sets for lead-source economics.
import { describe, expect, it } from 'vitest';
import { BLANK_WORKSHEET, PRACTICE_SET, WORKSHEET_COLUMNS, money, worksheet, worksheetCsv } from '../src/worksheet';
import type { WorksheetRow } from '../src/worksheet';

const row = (over: Partial<WorksheetRow>): WorksheetRow => ({ source: 'A', period: 'Oct 2026', spend: 1000, spendScope: 'Direct marketing only', leads: 50, closings: 2, ...over });

describe('worksheet', () => {
  it('works out cost per lead and period cost per closing to the cent', () => {
    const [line] = worksheet([row({ spend: 1000, leads: 3, closings: 3 })]).lines;
    expect(line!.costPerLead).toBe(333.33);
    expect(line!.periodCostPerClosing).toBe(333.33);
  });

  it('never treats a missing input as zero', () => {
    const res = worksheet([row({ source: 'Referral', spend: null })]);
    expect(res.lines[0]).toMatchObject({ costPerLead: null, periodCostPerClosing: null });
    expect(res.unknowns).toEqual(['Referral: spend is not on file, so its cost per lead and cost per closing are unknown.']);
    expect(money(res.lines[0]!.costPerLead)).toBe('unknown');
  });

  it('has no cost per closing for a source with no closings, rather than an infinite or zero one', () => {
    const [line] = worksheet([row({ closings: 0 })]).lines;
    expect(line!.periodCostPerClosing).toBeNull();
    expect(line!.costPerLead).toBe(20);
    expect(money(line!.periodCostPerClosing, 'no closings')).toBe('no closings');
  });

  it('counts the unknown bucket toward coverage and never prices it as a channel', () => {
    const res = worksheet([row({ leads: 80, closings: 3 }), row({ source: 'Unknown', spend: null, leads: 20, closings: 1, unknownSource: true })]);
    expect(res.coverage).toEqual({ leads: 0.8, closings: 0.75 });
    expect(res.lines[1]).toMatchObject({ costPerLead: null, periodCostPerClosing: null });
    // A missing spend in the unknown bucket is not an "unknown" to repair: it is not a source.
    expect(res.unknowns).toEqual([]);
  });

  it('makes coverage unknown when any count is missing', () => {
    const res = worksheet([row({ leads: null })]);
    expect(res.coverage.leads).toBeNull();
    expect(res.unknowns).toContain('Lead coverage: at least one lead count is missing.');
  });

  it('gives the practice set’s deliberately missing input as unknown, which is the readiness exercise', () => {
    const res = worksheet(PRACTICE_SET);
    expect(res.lines.map((l) => [l.source, l.costPerLead, l.periodCostPerClosing])).toEqual([
      ['Portal leads (practice)', 20, 1200],
      ['Open houses (practice)', 16.67, 300],
      ['Referral partner (practice)', null, null],
      ['Unknown source (practice)', null, null],
    ]);
    expect(res.unknowns).toEqual(['Referral partner (practice): spend is not on file, so its cost per lead and cost per closing are unknown.']);
    // 147 of 169 leads and 4 of 5 closings have a usable source.
    expect(res.coverage).toEqual({ leads: 0.87, closings: 0.8 });
    expect(PRACTICE_SET.every((r) => /practice/.test(r.source))).toBe(true);
  });
});

describe('worksheetCsv', () => {
  const csv = worksheetCsv(PRACTICE_SET).split('\n');

  it('has the named columns, one row per source and the two coverage rows', () => {
    expect(csv[0]).toBe(WORKSHEET_COLUMNS.map((c) => `"${c}"`).join(','));
    expect(csv).toHaveLength(1 + PRACTICE_SET.length + 2);
  });

  it('leaves missing inputs blank and computes with formulas that print "unknown" instead of zero', () => {
    expect(csv[1]).toContain('2400,"Direct marketing only",120,2,');
    expect(csv[1]).toContain('"=IF(OR(C2="""",E2="""",E2=0),""unknown"",ROUND(C2/E2,2))"');
    expect(csv[3]).toContain(',,"Fees paid at closing, not yet booked",9,1,');
    expect(csv[3]).toContain('""no closings""');
    // The unknown bucket gets no price formulas, only a note.
    expect(csv[4]).toContain('Not a channel.');
    expect(csv[4]).not.toContain('ROUND(');
  });

  it('works out coverage over the sheet, excluding the unknown bucket', () => {
    expect(csv[5]).toMatch(/^"Lead coverage",.*\(SUM\(E2:E5\)-E5\)\/SUM\(E2:E5\)/);
    expect(csv[6]).toMatch(/^"Closing coverage",.*\(SUM\(F2:F5\)-F5\)\/SUM\(F2:F5\)/);
  });

  it('ships a blank worksheet for three sources and the unknown bucket', () => {
    expect(BLANK_WORKSHEET).toHaveLength(4);
    expect(worksheetCsv(BLANK_WORKSHEET).split('\n')).toHaveLength(7);
  });
});
