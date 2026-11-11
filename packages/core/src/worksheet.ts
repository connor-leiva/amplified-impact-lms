// The Week 1 calculation worksheet (DECISIONS.md D-110): lead-source economics, worked out by code and
// by spreadsheet formulas, never by a chat window.
//
// The course plan's rule is that arithmetic is deterministic and AI only explains the results, names
// missing inputs and drafts decision questions. So the worksheet is two things that must agree:
//
//   worksheet(rows)     the numbers, computed here and unit-tested
//   worksheetCsv(rows)  the same worksheet as a CSV a team opens in Google Sheets or Excel, with each
//                       calculated cell a formula over that row, so the team's own copy recomputes
//
// THE MISSING-DATA POLICY. A blank input is unknown, never zero. A cost per lead with no spend on file
// is `null`, shown as "unknown", and listed among the unknowns; it is not $0. A source with no
// closings has no cost per closing (`null`, "no closings"), not an infinite or zero one. The "unknown"
// bucket (leads or closings with no usable source) counts toward coverage and is never compared as if
// it were a marketing channel.
//
// Pure, no imports, and no text from the course: the web app may import it for the download button
// without carrying the course's words into its bundle.

/** One source, one period. `null` is unknown: not on file yet. */
export interface WorksheetRow {
  source: string;
  /** e.g. "Oct 2026". The same period for every row, or the comparison is not fair. */
  period: string;
  /** Defined acquisition spend in dollars for this source and period. `null`: not on file. */
  spend: number | null;
  /** What the spend includes, e.g. "Direct marketing only". Said so two sources compare on one rule. */
  spendScope: string;
  /** Unique leads created in the period. `null`: not on file. */
  leads: number | null;
  /** Closings attributed to the source in the period. `null`: not on file. */
  closings: number | null;
  /** True for the bucket of leads and closings with no usable source. Never a channel. */
  unknownSource?: boolean;
}

export interface WorksheetLine extends WorksheetRow {
  /** Spend ÷ unique leads, to the cent. `null` when either is missing or there are no leads. */
  costPerLead: number | null;
  /**
   * Spend in the period ÷ closings in the period, to the cent. A period indicator, not what the leads
   * that closed actually cost. `null` when spend is missing or there were no closings.
   */
  periodCostPerClosing: number | null;
}

export interface WorksheetResult {
  lines: WorksheetLine[];
  /** Share of leads and closings with a usable source, 0 to 1. `null` when there is nothing to count. */
  coverage: { leads: number | null; closings: number | null };
  /** Every missing input, by source, in plain words. */
  unknowns: string[];
}

const cents = (x: number): number => Math.round(x * 100) / 100;
const ratio = (num: number | null, den: number | null): number | null =>
  num === null || den === null || den <= 0 ? null : cents(num / den);

/** The worksheet's numbers. Rows keep their order; nothing is filled in for a missing input. */
export function worksheet(rows: readonly WorksheetRow[]): WorksheetResult {
  const lines: WorksheetLine[] = rows.map((r) => ({
    ...r,
    costPerLead: r.unknownSource ? null : ratio(r.spend, r.leads),
    periodCostPerClosing: r.unknownSource ? null : ratio(r.spend, r.closings),
  }));

  const unknowns: string[] = [];
  for (const r of rows) {
    if (r.unknownSource) continue;
    if (r.spend === null) unknowns.push(`${r.source}: spend is not on file, so its cost per lead and cost per closing are unknown.`);
    if (r.leads === null) unknowns.push(`${r.source}: the lead count is not on file.`);
    if (r.closings === null) unknowns.push(`${r.source}: the closing count is not on file.`);
  }

  const share = (pick: (r: WorksheetRow) => number | null): number | null => {
    // Coverage is only meaningful when every count is known: a missing count makes it unknown too.
    if (rows.some((r) => pick(r) === null)) return null;
    const total = rows.reduce((a, r) => a + (pick(r) ?? 0), 0);
    if (total <= 0) return null;
    const known = rows.filter((r) => !r.unknownSource).reduce((a, r) => a + (pick(r) ?? 0), 0);
    return Math.round((known / total) * 1000) / 1000;
  };
  const coverage = { leads: share((r) => r.leads), closings: share((r) => r.closings) };
  if (coverage.leads === null) unknowns.push('Lead coverage: at least one lead count is missing.');
  if (coverage.closings === null) unknowns.push('Closing coverage: at least one closing count is missing.');

  return { lines, coverage, unknowns };
}

/** "unknown", "no closings", or the dollars, the way the worksheet and the course page print a value. */
export function money(x: number | null, missing = 'unknown'): string {
  if (x === null) return missing;
  return `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** The worksheet's columns, in order. Exported so the course page and the test name the same ones. */
export const WORKSHEET_COLUMNS = [
  'Source',
  'Period',
  'Spend ($)',
  'Spend scope',
  'Unique leads',
  'Closings',
  'Cost per lead',
  'Period cost per closing',
  'Notes',
] as const;

const q = (c: string): string => `"${c.replace(/"/g, '""')}"`;
const cell = (x: number | null): string => (x === null ? '' : String(x));

/**
 * The worksheet as CSV, with formulas. Columns C (spend), E (leads) and F (closings) are the inputs;
 * G and H are formulas that print "unknown" or "no closings" rather than a number when an input is
 * blank, so a team's copy can never quietly treat a missing cost as zero. The last two rows are the
 * coverage formulas over the whole sheet.
 */
export function worksheetCsv(rows: readonly WorksheetRow[]): string {
  const out: string[] = [WORKSHEET_COLUMNS.map(q).join(',')];
  rows.forEach((r, i) => {
    const n = i + 2;
    const cpl = r.unknownSource ? '' : `=IF(OR(C${n}="",E${n}="",E${n}=0),"unknown",ROUND(C${n}/E${n},2))`;
    const cpc = r.unknownSource
      ? ''
      : `=IF(C${n}="","unknown",IF(OR(F${n}="",F${n}=0),"no closings",ROUND(C${n}/F${n},2)))`;
    const note = r.unknownSource ? 'No usable source. Counts toward coverage only. Not a channel.' : '';
    out.push([q(r.source), q(r.period), cell(r.spend), q(r.spendScope), cell(r.leads), cell(r.closings), q(cpl), q(cpc), q(note)].join(','));
  });
  const last = rows.length + 1;
  const unknownRow = rows.findIndex((r) => r.unknownSource);
  const u = unknownRow === -1 ? null : unknownRow + 2;
  const cov = (col: 'E' | 'F') =>
    u === null
      ? `=IF(SUM(${col}2:${col}${last})=0,"unknown",1)`
      : `=IF(OR(COUNTBLANK(${col}2:${col}${last})>0,SUM(${col}2:${col}${last})=0),"unknown",ROUND((SUM(${col}2:${col}${last})-${col}${u})/SUM(${col}2:${col}${last}),3))`;
  out.push([q('Lead coverage'), '', '', '', '', '', q(cov('E')), '', q('Share of leads with a usable source.')].join(','));
  out.push([q('Closing coverage'), '', '', '', '', '', q(cov('F')), '', q('Share of closings with a usable source.')].join(','));
  return out.join('\n');
}

/**
 * The synthetic practice set: invented numbers for practice only, never a benchmark. Teams whose own
 * inputs are incomplete finish Week 1 on it, in "data repair required" status. One input is missing
 * on purpose (the referral partner's fees were never booked), which is Week 0's readiness exercise:
 * the worksheet must say "unknown" there, not $0.
 */
export const PRACTICE_SET: readonly WorksheetRow[] = [
  { source: 'Portal leads (practice)', period: 'Practice month', spend: 2400, spendScope: 'Direct marketing only', leads: 120, closings: 2 },
  { source: 'Open houses (practice)', period: 'Practice month', spend: 300, spendScope: 'Direct marketing only', leads: 18, closings: 1 },
  { source: 'Referral partner (practice)', period: 'Practice month', spend: null, spendScope: 'Fees paid at closing, not yet booked', leads: 9, closings: 1 },
  { source: 'Unknown source (practice)', period: 'Practice month', spend: null, spendScope: 'n/a', leads: 22, closings: 1, unknownSource: true },
];

/** The blank worksheet a team fills in: three sources and the unknown bucket. */
export const BLANK_WORKSHEET: readonly WorksheetRow[] = [
  { source: 'Source 1', period: '', spend: null, spendScope: 'Direct marketing only', leads: null, closings: null },
  { source: 'Source 2', period: '', spend: null, spendScope: 'Direct marketing only', leads: null, closings: null },
  { source: 'Source 3', period: '', spend: null, spendScope: 'Direct marketing only', leads: null, closings: null },
  { source: 'Unknown source', period: '', spend: null, spendScope: 'n/a', leads: null, closings: null, unknownSource: true },
];

// --- the course's other templates ------------------------------------------------------------------
// Blank CSVs with the columns the course plan names. No formulas and no example rows: the team fills
// them in from its own work. One per kind; the course page offers each on the week that uses it.

export interface CourseTemplate {
  /** The file name the browser saves. */
  file: string;
  /** What the download button says. */
  label: string;
  columns: readonly string[];
  /** The weeks whose page offers it. */
  weeks: readonly number[];
}

export const COURSE_TEMPLATES: readonly CourseTemplate[] = [
  {
    file: 'use-log.csv',
    label: 'Download the Use Log',
    columns: ['Date', 'Who Ran It', 'Skill and Version', 'What It Was For', 'Prep Minutes', 'Review Minutes', 'Correction Minutes', 'Action Taken'],
    weeks: [1, 2, 3, 4, 5, 6, 7, 8],
  },
  {
    file: 'decision-log.csv',
    label: 'Download the Decision Log',
    columns: ['Date', 'Issue', 'Observed Gap', 'Evidence', 'Decision (No Action Counts)', 'Reason', 'Owner', 'Due Date', 'Follow-Up Check'],
    weeks: [3],
  },
  {
    file: 'responsibility-card.csv',
    label: 'Download the Responsibility Card',
    columns: ['Deliverable', 'Outcome', 'Audience', 'Required Evidence', 'Boundaries and Prohibited Information', 'Acceptance Standard', 'Deadline', 'Approval Authority', 'New Owner'],
    weeks: [6],
  },
  {
    file: 'runbook.csv',
    label: 'Download the Runbook',
    columns: ['Skill and Version', 'Trigger', 'Required Data', 'Human Judgment Points', 'Repair Steps', 'Maintainer', 'Second Person Who Reran It', 'Status (Tested and Ready or Adopted)'],
    weeks: [7],
  },
  {
    file: 'keep-fix-retire.csv',
    label: 'Download the Keep, Fix or Retire Worksheet',
    columns: ['Workflow', 'Cycles Run', 'Outputs Accepted', 'What Changed', 'What Broke', 'Benefit Claim', 'Claim Label (Measured, Estimated or Unverified)', 'Decision (Keep, Fix or Retire)', 'Maintainer'],
    weeks: [8],
  },
  {
    file: '90-day-plan.csv',
    label: 'Download the 90-Day Plan',
    columns: ['Workflow', 'Owner', 'Maintainer', 'Trigger', 'Measure', 'Baseline', 'Review Date'],
    weeks: [8],
  },
  {
    file: 'agent-go-no-go.csv',
    label: 'Download the Agent Go or No-Go Worksheet',
    columns: ['Question', 'Evidence', 'Answer'],
    weeks: [8],
  },
];

/** The rows the go or no-go worksheet starts with: the plan's five pilot questions. */
const GO_NO_GO_ROWS: readonly string[] = ['Usefulness', 'Adoption', 'Quality', 'Readiness', 'Next Step (Expand, Fix or Stop)'];

/** A template as CSV: its header row, plus the go or no-go worksheet's five question rows. */
export function templateCsv(t: CourseTemplate): string {
  const head = t.columns.map(q).join(',');
  if (t.file !== 'agent-go-no-go.csv') return head;
  return [head, ...GO_NO_GO_ROWS.map((r) => [q(r), '', ''].join(','))].join('\n');
}
