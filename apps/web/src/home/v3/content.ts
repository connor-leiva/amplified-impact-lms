// Homepage v3's words, exactly as `docs/design/home-v3/copy.md` gives them (Connor approved the copy;
// Spring reviews every new word, listed in `spring-new-words.md`). Mono labels are written in sentence
// case: the stylesheet sets them in capitals, as copy.md notes.
//
// Not here, on purpose: figures that already have a source. The hero's 100 and 700+ are the proof
// line's (`HOME.proof`, split by `splitProof`), its 58 is the Library's count (`ENTRIES.length`, as
// /library counts it), and "Made-up example" is the kit's (`KIT.example`).

/** One AI employee on the hero's badge: its tab, its name and role, four facts, and what it has ready. */
export interface Badge {
  key: 'owners' | 'agents' | 'ops';
  tab: string;
  name: string;
  role: string;
  facts: readonly (readonly [string, string])[];
  readyAt: string;
  ready: readonly string[];
}

export const HERO = {
  eyebrow: 'AI coaching, training and ready-to-run skills',
  /** The headline's three lines, as the mockup breaks them. */
  title: ['Your next', 'employee doesn’t', 'need a desk.'],
  lead: 'We teach owners, ops leads and agents to put AI to work. You get live coaching plus ready-to-run skills that do real jobs in your business, in your voice. Built inside a 100-agent real estate team, for agents and teams like yours.',
  primary: { label: 'Get 5 Free Skills', href: '#free' },
  secondary: { label: 'See the Programs', href: '#programs' },
  kicker: 'AI employee',
  tabsLabel: 'Meet an AI employee',
  badges: [
    {
      key: 'owners',
      tab: 'Owners',
      name: 'Morning Brief',
      role: 'For team owners',
      facts: [
        ['Reports to', 'You'],
        ['Start date', 'Today'],
        ['Shift', 'Every morning, 6:00 AM'],
        ['Lunch', 'Skips it'],
      ],
      readyAt: 'Ready at 6:00 AM',
      ready: ['3 things need you today', '2 deals haven’t moved this week', 'Every next step has an owner', '4 replies drafted for your yes'],
    },
    {
      key: 'agents',
      tab: 'Agents',
      name: 'Speed to Lead Reply',
      role: 'For agents',
      facts: [
        ['Reports to', 'You'],
        ['Sounds like', 'You, on a good day'],
        ['Shift', 'Every new lead'],
        ['Sends', 'After your yes'],
      ],
      readyAt: 'New lead at 9:12 PM',
      ready: ['First reply drafted, in your voice', 'Call opener ready for the morning', '2 follow-ups lined up', 'Nothing sent without your yes'],
    },
    {
      key: 'ops',
      tab: 'Ops',
      name: 'Commission Tie-Out',
      role: 'For ops leads',
      facts: [
        ['Reports to', 'Your ops lead'],
        ['Desk', 'Not needed'],
        ['Shift', 'Every closing'],
        ['Rounding', 'Never'],
      ],
      readyAt: 'After today’s closing',
      ready: ['Deposit matched to the CDA', 'Split and cap checked', 'Fees tied out', '1 difference flagged for you'],
    },
  ] as const satisfies readonly Badge[],
  /** The stat strip's labels, under the proof line's two figures and the Library's count. */
  stats: {
    agents: 'Agents on the team where it was built',
    homes: 'Homes that team closes a year',
    library: 'Skills, guides and templates',
  },
} as const;

/**
 * S2. Connor's decision (Nov 12, C9): no video; a real still photo in its place, which he is choosing.
 * The heading and caption are copy.md's; the video's own words (its length, the player, the
 * "Spring on camera" bubble) are gone with it. Until the photo is chosen the section is pending
 * (`video-still`), so these words show only in a preview, beside an empty slot: never a stock or AI image.
 */
export const STILL = {
  title: 'Watch it run in a real business.',
  caption:
    'No stock footage. No demo account. This is Spring opening the reports, briefs and follow-ups that run her 100-agent team every morning.',
  /** Preview only: what the empty slot says, and its name for screen readers. */
  slot: 'Photo to come · Connor is choosing a real still',
  slotLabel: 'Placeholder for a real photo of Spring’s morning, still being chosen',
} as const;

/**
 * S3, "So what’s a skill?" (copy.md). The chat's 12 is an illustration: it carries the kit's
 * "Made-up example" tag (Connor's decision, C15). The skill's 1 is how a skill works, not a statistic.
 */
export const SKILL = {
  eyebrow: 'So what’s a skill?',
  title: 'A new hire who already knows the job.',
  intro: [
    'You already use AI. You ask a question. You get an answer. Then tomorrow you start over and explain your whole business again.',
    'A skill fixes that. You set it up once. It learns your voice, your numbers and your rules. Then it does one job for you, the same way, every single time. Like a great employee who never forgets the training.',
  ],
  chat: {
    tag: 'A chat',
    meta: 'New chat',
    you: 'You',
    youSays: 'Okay, one more time. We’re a 100-agent team on Follow Up Boss, and I write short and warm…',
    ai: 'AI',
    aiSays: 'Happy to help! First, tell me a little about your business.',
    count: 12,
    countLabel: 'Times you’ve explained your business this month',
  },
  skill: {
    tag: 'A skill',
    meta: 'Set up once',
    name: 'Morning Brief',
    learned: ['Your voice', 'Your numbers', 'Your rules'],
    week: 'Ran this week',
    /** The weekday row's name for screen readers (the mockup's). */
    weekLabel: 'It ran every weekday, the same way',
    days: ['M', 'T', 'W', 'T', 'F'],
    count: 1,
    countLabel: 'Time you explained your business',
  },
} as const;

/** One task on a Monday timeline: its time, what it is, the line under it, and what a skill leaves done. */
export interface MondayTask {
  time: string;
  label: string;
  sub: string;
  done: string;
  /** Where it starts and how long it runs, in hours after 8 AM (the mockup's). */
  start: number;
  hours: number;
}

/** One column of S4: who it's for, the open morning a skill gives back, three tasks, and the two ways it goes. */
export interface MondayColumn {
  who: string;
  open: string;
  openLine: string;
  tasks: readonly MondayTask[];
  without: string;
  withSkills: string;
}

/** S4, "Picture your Monday." (copy.md). */
export const MONDAY = {
  eyebrow: 'Same Monday, two ways',
  title: 'Picture your Monday.',
  toggleLabel: 'Show Monday',
  without: 'Without Skills',
  withSkills: 'With Skills',
  hint: 'Keep scrolling to hand it off',
  lane: 'Done before 8 AM',
  hours: ['8 AM', '9', '10', '11', '12 PM'],
  allYours: '8 AM to noon · All yours',
  withoutK: 'Without skills',
  withK: 'With skills',
  columns: [
    {
      who: 'If you run a team',
      open: 'Spend Monday leading.',
      openLine: 'Run the meeting. Coach your people. Make the calls only you can make.',
      tasks: [
        { time: '8:00', label: 'Pull the numbers', sub: 'P&L, conversion, production', done: 'Numbers pulled', start: 0, hours: 1.25 },
        { time: '9:15', label: 'Chase agents for updates', sub: 'Texts, calls, more texts', done: 'Stuck deals flagged', start: 1.25, hours: 1.25 },
        { time: '10:30', label: 'Build the meeting agenda', sub: 'From scratch, again', done: 'Meeting ready', start: 2.5, hours: 1.25 },
      ],
      without: 'You pull the numbers. You chase agents for updates. You build the meeting agenda. By noon you haven’t led anyone.',
      withSkills: 'Your numbers are pulled. Stuck deals are flagged. Your meeting is ready before your coffee is. You spend Monday leading.',
    },
    {
      who: 'If you’re an agent',
      open: 'Spend Monday with people.',
      openLine: 'Showings, calls and coffee with a past client. Not paperwork.',
      tasks: [
        { time: '8:00', label: 'Write the same follow-up', sub: 'For the tenth time', done: 'Follow-ups drafted', start: 0, hours: 1.25 },
        { time: '9:15', label: 'A new lead waits an hour', sub: 'You’re still on that follow-up', done: 'New lead answered', start: 1.25, hours: 1 },
        { time: '10:15', label: 'A deadline sneaks up', sub: 'Inspection ends when?', done: 'Buyer dates sent', start: 2.25, hours: 1.5 },
      ],
      without: 'You write the same follow-up for the tenth time. A new lead waits an hour. A deadline sneaks up on you.',
      withSkills: 'Every lead gets a reply that sounds like you. Every buyer knows their dates. You spend Monday with people, not paperwork.',
    },
  ] as const satisfies readonly MondayColumn[],
} as const;

/**
 * S5, "How it works" (copy.md, and the handoff's own markup for panels two and three, which copy.md read
 * in their hidden state). Every panel is an illustration with made-up names, so each one shows the
 * kit's "Made-up example" tag; the first keeps the mockup's own "Made-up example · Morning Brief".
 */
export const HOW = {
  eyebrow: 'How it works · Three steps',
  title: 'AI does the busywork. You keep the judgment.',
  steps: [
    { name: 'You give it the work.', text: 'A contract. Your inbox. Last week’s numbers.' },
    { name: 'It does the job.', text: 'It reads, sorts, does the math and writes a first draft.' },
    { name: 'You say yes.', text: 'Nothing goes out until you check it. You’re still the boss.' },
  ],
  setup: {
    tag: 'Set up once',
    example: 'Made-up example · Morning Brief',
    inputs: [
      ['Your CRM', 'Deals, stages and owners'],
      ['Your calendar', 'Today’s meetings'],
      ['Your inbox', 'What you owe people'],
    ],
    core: 'Morning Brief',
    coreK: 'Your AI employee',
    note: 'You set it up once with your CRM, your calendar and your inbox. Then every morning, before you’re out of bed, one page is waiting.',
  },
  brief: {
    tag: 'It runs and drafts',
    meta: 'Monday · 6:00 AM',
    needs: 'Needs you today',
    needsList: ['Approve the price drop on Pretend Poppy', 'Call back the Maple Court buyers', 'Sign off on December lead spend'],
    stuck: 'Hasn’t moved this week',
    stuckList: [
      ['Pretend Poppy', 'No showings in 9 days'],
      ['Maple Court', 'Lender quiet since Tuesday'],
    ],
    owners: 'Every next step has an owner',
    ownersOf: '11 of 11',
    replies: 'Replies you owe',
    repliesChip: '4 drafted',
  },
  yes: {
    tag: 'You own the yes',
    notSent: 'Not sent',
    approved: 'Approved by you',
    to: 'To',
    toWho: 'Jess, on your team',
    subject: 'Subject',
    subjectLine: 'Maple Court file',
    body: 'Hi Jess, the Maple Court file hasn’t moved since Tuesday. Can you call the lender today and update the file by 3? If anything’s stuck, grab me after the meeting.',
    send: 'Send',
    sendK: 'Nothing goes out until you check it',
    owns: 'Stays with you. Always.',
    ownsList: ['Money', 'Contracts', 'Fair housing', 'Decisions about people'],
  },
} as const;
