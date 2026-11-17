// ================================================================================================
// ADMIN REDESIGN R2: the approved parity exceptions (D-160, Connor, Nov 16, 2026, 8:27 AM MST)
// ================================================================================================
//
// A CLOSED LIST. Connor's decision A, verbatim: "Phone key-facts text: KEEP 16px (the phone type
// floor). Don't change the build to 15px. The only parity exceptions allowed are the 390 cells whose
// sole diff is the 15px vs 16px key-facts text: #138 Cohorts 390, #136 Workspace detail 390 and #141
// User detail 390. Record each exception in D-160 and in its PR body, with the measured %. Every other
// cell stays at ≤0.1%, with no new masks."
//
// The mockup's `.ph .fx>div>span:last-child{font-size:15px}` sets the key facts' values at 15px on a
// phone; the build keeps the 16px phone floor. Each cell below differs from its ref by those values
// alone, which is proven by measuring it with the mockup's 15px applied temporarily: 0.0000% (0 px).
//
// How `pnpm parity:admin-r2` treats a listed cell: it is ENFORCED, and it passes only with IDENTICAL
// width × height (its ref's, recorded below) AND at most its recorded ceiling of differing pixels, the
// exact count measured at the last runs. It is reported as "PASS (approved exception, D-160)". Nothing
// else changes: every other cell keeps the 0.1% rule (`MAX_DIFF_RATIO`), and there is no mask.
//
// Only the three cells decision A names may ever be listed (`ALLOWED_EXCEPTION_CELLS`), each 390 wide
// with a ceiling under 0.5%. The list is checked when this module loads and by the runner's own test
// (`admin-r2-parity.spec.ts`, "approved exceptions"). Each R2 PR adds its own cell when it lands: R2-2b
// (#138) `cohorts-sessions-390`, R2-1c part 1 (#136) `workspace-detail-390`, R2-1c part 2 (#141)
// `user-390`.
//
// LATER SCREENS (the shepherd, Nov 17, 2026, 2:00 AM PST): decision A names the three cells "and any
// later screen with the same key-facts component". A later 390 cell whose ONLY diff is those values, under
// about 0.5% and 0 px with the mockup's 15px applied temporarily, is listed here the same way, and named in
// `ALLOWED_EXCEPTION_CELLS` so the list stays closed: Console PR 9 (#151) `flags-390`.

/** Where the decision is recorded. */
export const EXCEPTION_DECISION = 'D-160, Connor, Nov 16, 2026, 8:27 AM MST' as const;
/** The one reason decision A accepts. */
export const EXCEPTION_REASON = '15px vs 16px phone key-facts text; the build keeps the 16px floor' as const;
/** The cells decision A names. The list below holds some of these and nothing else. */
export const ALLOWED_EXCEPTION_CELLS = ['cohorts-sessions-390', 'workspace-detail-390', 'user-390', 'flags-390'] as const;
/** Every ceiling must be under this % of the cell's pixels. */
export const EXCEPTION_CEILING_LIMIT_PCT = 0.5;

export interface ApprovedException {
  cell: (typeof ALLOWED_EXCEPTION_CELLS)[number];
  /** The cell's dimensions, which are its ref's: the capture must match them exactly. */
  width: 390;
  height: number;
  /** The measured ceiling: the differing pixels at the last runs (pixelmatch 0.1, `includeAA: false`). */
  ceilingPx: number;
  /** The same ceiling as a % of width × height, to four places, as the report prints it. */
  ceilingPct: number;
  reason: typeof EXCEPTION_REASON;
  ref: typeof EXCEPTION_DECISION;
  /** The pull request that built the cell and recorded the exception. */
  pr: number;
}

export const APPROVED_EXCEPTIONS: readonly ApprovedException[] = [
  // R2-2b (#138): Cohorts & Sessions on a phone. Its key facts: December 2026, Active, Wed, Dec 2 ·
  // 12:00 PM MST, 2 of 6, 148 learners, Wednesdays, weekly.
  {
    cell: 'cohorts-sessions-390',
    width: 390,
    height: 2092,
    ceilingPx: 2766,
    ceilingPct: 0.339,
    reason: EXCEPTION_REASON,
    ref: EXCEPTION_DECISION,
    pr: 138,
  },
  // R2-1c part 1 (#136): Workspace (Northshore Group) on a phone. Its key facts' values: the workspace
  // id, plan, seats, owner, MRR and last activity (y 276–435).
  {
    cell: 'workspace-detail-390',
    width: 390,
    height: 1341,
    ceilingPx: 1993,
    ceilingPct: 0.3811,
    reason: EXCEPTION_REASON,
    ref: EXCEPTION_DECISION,
    pr: 136,
  },
  // R2-1c part 2 (#141): User (Elena Vargas) on a phone. Its key facts' values: the user id, email,
  // workspace, role, tier and last sign-in (y 286–455).
  {
    cell: 'user-390',
    width: 390,
    height: 1273,
    ceilingPx: 1644,
    ceilingPct: 0.3311,
    reason: EXCEPTION_REASON,
    ref: EXCEPTION_DECISION,
    pr: 141,
  },
  // Console PR 9 (#151, D-168): Environment Flags on a phone. Its key facts' values: Production, Live,
  // Resend, live sending and 6 of 8 (y 240–328). 0 px with the mockup's 15px applied.
  {
    cell: 'flags-390',
    width: 390,
    height: 1671,
    ceilingPx: 1290,
    ceilingPct: 0.1979,
    reason: EXCEPTION_REASON,
    ref: EXCEPTION_DECISION,
    pr: 151,
  },
];

/** A ceiling as the report prints it: `0.3390% · 2766 px`. */
export const ceilingText = (e: ApprovedException) => `${e.ceilingPct.toFixed(4)}% · ${e.ceilingPx} px`;

/** What is wrong with the list, if anything: an empty array means it is decision A's closed list. */
export function exceptionProblems(list: readonly ApprovedException[] = APPROVED_EXCEPTIONS): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const e of list) {
    const at = `approved exception "${e.cell}"`;
    if (!(ALLOWED_EXCEPTION_CELLS as readonly string[]).includes(e.cell))
      problems.push(`${at}: only ${ALLOWED_EXCEPTION_CELLS.join(', ')} may be listed (${EXCEPTION_DECISION}).`);
    if (seen.has(e.cell)) problems.push(`${at}: listed twice.`);
    seen.add(e.cell);
    if (e.width !== 390 || !e.cell.endsWith('-390')) problems.push(`${at}: must be a 390-wide cell.`);
    if (!Number.isInteger(e.height) || e.height <= 0) problems.push(`${at}: needs the ref's height.`);
    if (!Number.isInteger(e.ceilingPx) || e.ceilingPx < 0) problems.push(`${at}: the ceiling must be a pixel count.`);
    const pct = (100 * e.ceilingPx) / (e.width * e.height);
    if (!(pct < EXCEPTION_CEILING_LIMIT_PCT))
      problems.push(`${at}: its ceiling must be under ${EXCEPTION_CEILING_LIMIT_PCT}%.`);
    if (e.ceilingPct.toFixed(4) !== pct.toFixed(4))
      problems.push(
        `${at}: ceilingPct ${e.ceilingPct} is not ${pct.toFixed(4)} (${e.ceilingPx} px of ${e.width} × ${e.height}).`,
      );
    if (e.reason !== EXCEPTION_REASON) problems.push(`${at}: the only reason allowed is "${EXCEPTION_REASON}".`);
    if (e.ref !== EXCEPTION_DECISION) problems.push(`${at}: must cite ${EXCEPTION_DECISION}.`);
  }
  return problems;
}

// The list is closed: a run never starts with anything else in it.
const problems = exceptionProblems();
if (problems.length) throw new Error(`compliance/lib/admin-r2-exceptions.ts:\n${problems.join('\n')}`);

/** The approved exception for a cell, if it has one. */
export const approvedException = (cell: string): ApprovedException | undefined =>
  APPROVED_EXCEPTIONS.find((e) => e.cell === cell);

/**
 * Whether a listed cell passes: identical dimensions, which are its recorded ones, and at most its
 * recorded ceiling of differing pixels. The 0.1% rule is not consulted; nothing else is relaxed.
 */
export function passesException(
  e: ApprovedException,
  r: { dimsOk: boolean; appDims: string; diffPx?: number },
): boolean {
  return r.dimsOk && r.appDims === `${e.width}×${e.height}` && r.diffPx !== undefined && r.diffPx <= e.ceilingPx;
}
