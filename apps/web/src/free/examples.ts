// The mockup's illustrations on /free: a small preview over each agents' resource, and a panel beside
// the owners' three. MADE-UP NAMES, NOTES AND HOURS, so each carries the "Made-up example" tag, and
// none sits next to a price or a buy button (the brief, audit §6; this page has neither).
//
// OFF UNTIL CONNOR TURNS IT ON. `EXAMPLES_ON` is the page's one switch. Every word here is the mockup's,
// listed under "New copy for Spring's review".

/** The page's one switch for its illustrations. */
export const EXAMPLES_ON = false;

/** Over the agents' cards, by resource slug (the AI 101 sign-up's is `signup`). */
export const AGENT_PREVIEWS = {
  'voice-profile': {
    kind: 'voice',
    generic: {
      label: 'Generic AI',
      text: 'I hope this message finds you well. I wanted to follow up regarding the inspection results for the property.',
    },
    you: {
      label: 'Sounds like you',
      text: 'Hey Sam, quick one on the inspection: the roof’s fine, the water heater isn’t. I’ll call you at 4 with options.',
    },
  },
  ai101: { kind: 'slide', n: '01', text: '3 things to fix before you list', foot: 'Swipe' },
  signup: {
    kind: 'live',
    title: 'AI 101',
    live: 'Live',
    text: 'A live workshop for agents',
    host: 'Hosted on ai.springb.co',
  },
} as const;

/** Beside the owners' three, by resource slug. */
export const OWNER_PANELS = {
  'ops-time-audit': {
    rows: [
      ['Inbox and follow-up', 6, true],
      ['Transaction checklists', 5, true],
      ['Weekly numbers and reports', 4, true],
      ['Agent questions', 4, false],
      ['Scheduling and reminders', 3, true],
      ['Recruiting and coaching', 4, false],
    ] as readonly (readonly [task: string, hours: number, ai: boolean])[],
    tag: 'AI could do this',
    totalBefore: 'of',
    totalAfter: 'hours a week AI could already be doing',
  },
  'task-sync-starter': {
    notes: 'Team meeting notes',
    promises: [
      [
        'Maya',
        'I’ll send the new listing checklist to the team',
        'by Friday.',
        'Send the listing checklist to the team',
        'MR',
        'Friday',
        'Attach the updated checklist',
      ],
      [
        'Jordan',
        'Let’s get the open house signs ordered',
        'this week.',
        'Order open house signs',
        'JP',
        'This week',
        'Get a quote from the sign shop',
      ],
      [
        'You',
        'I’ll follow up with the lender on the Elm file',
        'tomorrow.',
        'Follow up with the lender on Elm',
        'You',
        'Tomorrow',
        'Ask for the appraisal date',
      ],
    ] as readonly (readonly [
      who: string,
      said: string,
      when: string,
      task: string,
      owner: string,
      due: string,
      next: string,
    ])[],
    nextLabel: 'Next:',
  },
  retool: {
    meta: 'How the kit runs',
    steps: ['Map your ops leader’s week', 'Build a first AI employee', 'Plan a 30-day retool'],
    employee: 'One job, done the same way every time',
  },
} as const;
