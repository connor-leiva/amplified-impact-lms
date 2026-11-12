// The mockup's week previews: a small drawing of what each week's skill produces. MADE-UP NUMBERS AND
// NAMES, every one, so each preview carries the "Made-up example" tag, and none sits next to a price or
// a buy button (the brief, audit §6).
//
// OFF UNTIL CONNOR TURNS IT ON. `EXAMPLES_ON` is the page's one switch; with it off the page renders no
// preview at all. Every word here is the mockup's, listed under "New copy for Spring's review".

/** The page's one switch for its illustrations. */
export const EXAMPLES_ON = false;

export const EXAMPLE_LABELS = {
  /** Over week 0's preview, which shows what you'll have rather than a result. */
  setup: 'What you’ll have',
  /** Over every other week's. */
  result: 'What it gives you',
} as const;

export type Preview =
  | { kind: 'ticks'; rows: readonly string[]; flag: string }
  | { kind: 'bars'; caption: string; rows: readonly [label: string, dollars: number][]; flag: string }
  | { kind: 'owners'; rows: readonly [item: string, owner: string | null][]; none: string }
  | { kind: 'agenda'; caption: string; parts: readonly [label: string, minutes: number][]; flag: string }
  | { kind: 'stages'; stages: readonly [label: string, count: number, old: number][]; flag: string }
  | { kind: 'pace'; cells: readonly [label: string, value: number, flag?: boolean][]; flag: string }
  | { kind: 'sources'; rows: readonly [item: string, source: string][]; flag: string }
  | { kind: 'days'; days: readonly [day: string, owner: string][]; flag: string }
  | { kind: 'verdicts'; rows: readonly [skill: string, verdict: 'Keep' | 'Fix'][]; flag: string };

/** Each week's preview, by week number (the mockup's `Preview`). Week 0's is the set-up, not a result. */
export const PREVIEWS: Readonly<Record<number, Preview>> = {
  0: {
    kind: 'ticks',
    rows: ['Your AI knows how you work', 'It writes the way you talk', 'Your team shares one AI workspace'],
    flag: 'Then a 30-minute orientation',
  },
  1: {
    kind: 'bars',
    caption: 'Cost per closing, last 90 days',
    rows: [
      ['Sphere', 86],
      ['Open houses', 175],
      ['Portal leads', 1400],
    ],
    flag: '6 leads have no source tag',
  },
  2: {
    kind: 'owners',
    rows: [
      ['Counter on 418 Maple expires at 5 PM', 'JM'],
      ['Price change on Elm, seller waiting', null],
      ['New agent starts Monday', 'KT'],
    ],
    none: 'No owner',
  },
  3: {
    kind: 'agenda',
    caption: 'Weekly meeting, 90 minutes',
    parts: [
      ['Segue', 5],
      ['Scorecard', 5],
      ['Rocks', 5],
      ['Headlines', 5],
      ['To-dos', 5],
      ['Solve', 60],
      ['Conclude', 5],
    ],
    flag: '2 scorecard numbers didn’t match the source',
  },
  4: {
    kind: 'stages',
    stages: [
      ['New', 42, 0],
      ['Attempted', 31, 11],
      ['Nurture', 18, 4],
      ['Appt', 9, 1],
      ['Pending', 6, 0],
    ],
    flag: '16 leads older than 14 days in their stage',
  },
  5: {
    kind: 'pace',
    cells: [
      ['Goal', 24],
      ['On pace for', 19],
      ['Gap', 5, true],
    ],
    flag: '2 commitments carried forward from last month',
  },
  6: {
    kind: 'sources',
    rows: [
      ['Speed to lead', 'SOP 03'],
      ['Listing launch', 'Training 07'],
      ['Contract to close', 'SOP 11'],
    ],
    flag: '12 test questions, each tied to its source',
  },
  7: {
    kind: 'days',
    days: [
      ['Day 1', 'Ops lead'],
      ['Day 7', 'Mentor'],
      ['Day 14', 'Owner'],
      ['Day 30', 'Owner'],
    ],
    flag: 'Every checkpoint has a dated owner',
  },
  8: {
    kind: 'verdicts',
    rows: [
      ['Morning Brief', 'Keep'],
      ['FUB Pipeline Review', 'Fix'],
      ['Agent 1:1 Prep', 'Keep'],
    ],
    flag: 'Next: your 90-day plan',
  },
};
