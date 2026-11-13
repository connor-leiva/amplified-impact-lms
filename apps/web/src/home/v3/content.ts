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
 * S2. The frame is Connor's morning task sync, recorded live (the file he supplied, Nov 13): Claude
 * reads ClickUp and Gmail and posts the day's plan. 1920×1080, H.264, about 60 seconds, under
 * `/media/` the same way the Reel Editor's clips are. The heading and caption are copy.md's.
 */
export const VIDEO = {
  title: 'Watch it run in a real business.',
  caption: 'Connor’s morning task sync, recorded live: Claude reads ClickUp and Gmail and posts the day’s plan. 60 seconds.',
  /** Accessible name for the player. The caption under the frame is the same words, for sighted visitors. */
  label: 'Connor’s morning task sync, recorded live: Claude reads ClickUp and Gmail and posts the day’s plan. 60 seconds.',
  src: '/media/morning-task-sync.mp4?v=2',
  poster: '/media/morning-task-sync.webp?v=2',
  width: 1920,
  height: 1080,
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

/**
 * S6, "Off your plate" (`section.band`, forest). Each row is a job and the Library skill that takes it,
 * by its page's slug: the link comes from the Library's own record (brief § 4: every skill name in S6,
 * S7, S8 and S13 links to its live page), and the name is the mockup's, which here is the record's title.
 */
export const BAND = {
  title: 'Each skill takes one job off your plate. Add a few and you get your week back.',
  sub: 'It doesn’t take lunch. It does take direction.',
  cta: { label: 'Try 5 Skills Free', href: '#free' },
  plate: 'Off your plate',
  rows: [
    ['Prep the weekly meeting', 'L10 Meeting Prep', 'l10-meeting-prep'],
    ['Answer the new lead', 'Speed to Lead Reply', 'speed-to-lead-reply'],
    ['Tie out the commission', 'Commission Tie-Out', 'commission-tie-out'],
    ['Chase the file deadlines', 'Contract-to-Close Deadline Tracker', 'contract-to-close-deadlines'],
    ['Prep the listing appointment', 'Listing Appointment Prep', 'listing-appointment-prep'],
  ],
} as const;

/** One skill on the org chart: its name as the chart says it, and its Library page, or `null` when it was built for our team. */
export interface ChartSkill {
  name: string;
  slug: string | null;
}

/** One box on the org chart: a person or a seat, and the skills that work for them. */
export interface ChartNode {
  kicker: 'Visionary' | 'Integrator' | 'Seat' | 'Human';
  name: string;
  /** The line over the CEO's skills. */
  aiLabel?: string;
  skills: readonly ChartSkill[];
}

const own = (name: string): ChartSkill => ({ name, slug: null });
const lib = (name: string, slug: string): ChartSkill => ({ name, slug });

/**
 * S7, the proof (`section.prf`, #proof). The three tiles' figures are cleared (Connor's D3: no source
 * needed). The chart is The Utah Life Real Estate Group's, box for box as the mockup draws it; its
 * counts ("12 seats", "29 skills") are worked out from it (`chartCounts`), never typed. The intro's
 * first sentence is Spring's to approve, and she has (C8, D2: Connor, 4:41 PM MT Nov 12).
 */
export const PROOF = {
  eyebrow: 'The proof is our own team',
  title: 'We didn’t read about this. We run on it.',
  /** C8: part of Spring's approval (D2), given on Nov 12. */
  introClaim: 'This is the real EOS chart at The Utah Life Real Estate Group.',
  intro: 'Every seat is a person. Under each person are the skills that work for them.',
  stats: {
    production: { figure: 38, label: 'More production than last year, and AI is a big part of why', lastYear: 'Last year', thisYear: 'This year' },
    finance: { figure: 95, label: 'Of our finance work done by AI. Our bookkeepers add the human 5%.', ai: 'AI', human: 'Human' },
    daily: { figure: 'Daily', label: 'Reports that run on their own, every morning', days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'] },
  },
  toggleLabel: 'Show the chart with',
  people: 'People',
  peopleAndAi: 'People and AI',
  /** Connor's D4: "12 people" is "12 seats". */
  seats: 'seats',
  skills: 'skills working for them',
  legendLabel: 'Key',
  legend: { person: 'Person', library: 'Skill in the Library', own: 'Built for our team' },
  chart: {
    top: [
      {
        kicker: 'Visionary',
        name: 'CEO',
        aiLabel: 'Her AI executive assistant',
        skills: [
          own('Daily Sisu reports'),
          own('Morning Debrief'),
          lib('Inbox and Meeting Follow-Through', 'inbox-meeting-follow-through'),
          lib('Tasks synced to ClickUp', 'task-sync-starter'),
          lib('Perfect Week', 'perfect-week'),
        ],
      },
      {
        kicker: 'Integrator',
        name: 'Runs the business',
        skills: [
          lib('L10 Meeting Prep', 'l10-meeting-prep'),
          lib('Team P&L Review', 'team-pnl-review'),
          lib('Morning Brief', 'morning-brief'),
          lib('Lead-Source ROI', 'lead-source-roi'),
        ],
      },
    ],
    seats: [
      {
        seat: { kicker: 'Seat', name: 'Operations', skills: [lib('New Agent Onboarding Plan', 'new-agent-onboarding-plan')] },
        people: [
          {
            kicker: 'Human',
            name: 'Transaction Coordinator',
            skills: [
              lib('TC File Audit', 'tc-file-audit'),
              lib('Contract-to-Close Deadline Tracker', 'contract-to-close-deadlines'),
              lib('Closing-Week Checklist', 'closing-week-checklist'),
            ],
          },
          {
            kicker: 'Human',
            name: 'Bookkeepers',
            skills: [
              lib('Weekly Card & Bank Audit', 'card-bank-feed-audit'),
              lib('Commission Tie-Out', 'commission-tie-out'),
              lib('Month-End Close Packet', 'month-end-close'),
            ],
          },
        ],
      },
      {
        seat: { kicker: 'Seat', name: 'Sales Leader', skills: [] },
        people: [
          {
            kicker: 'Human',
            name: 'Team Leads',
            skills: [own('Team activity reports'), lib('Agent 1:1 Prep', 'agent-1on1-prep'), lib('FUB Pipeline Review', 'fub-pipeline-review')],
          },
          {
            kicker: 'Human',
            name: 'Agents',
            skills: [
              lib('Sounds Like You', 'voice-profile'),
              lib('Speed to Lead Reply', 'speed-to-lead-reply'),
              lib('Offer Strategy', 'offer-strategy'),
              lib('Listing Appointment Prep', 'listing-appointment-prep'),
              lib('Market Update Email', 'market-update-email'),
            ],
          },
          { kicker: 'Human', name: 'Recruiter', skills: [lib('Recruiting Prep', 'recruiting-prep')] },
        ],
      },
      {
        seat: { kicker: 'Seat', name: 'Marketing', skills: [] },
        people: [
          {
            kicker: 'Human',
            name: 'Content Creator',
            skills: [lib('Content Strategist', 'content-strategist'), lib('Reel Editor', 'reel-editor'), lib('Sounds Like You', 'voice-profile')],
          },
          {
            kicker: 'Human',
            name: 'Social and Database',
            skills: [
              lib('Market Update Email', 'market-update-email'),
              lib('Sphere Touch Plan', 'sphere-touch-plan'),
              lib('Database Health Check', 'database-health-check'),
            ],
          },
        ],
      },
    ],
  },
} as const;

/** Every box on the chart, top to bottom and left to right. */
export const chartNodes = (): readonly ChartNode[] => [
  ...(PROOF.chart.top as readonly ChartNode[]),
  ...PROOF.chart.seats.flatMap((s): ChartNode[] => [s.seat as ChartNode, ...(s.people as readonly ChartNode[])]),
];

/**
 * The chart's counts, worked out from it: every box is a seat (12, Connor's D4), every skill counts
 * once however many seats use it (29), and the ones with a Library page are "in the Library" (26).
 */
export function chartCounts(): { seats: number; skills: number; inLibrary: number } {
  const nodes = chartNodes();
  const skills = new Map<string, string | null>();
  for (const n of nodes) for (const s of n.skills) skills.set(s.name, s.slug);
  return { seats: nodes.length, skills: skills.size, inLibrary: [...skills.values()].filter(Boolean).length };
}

/**
 * S8, "In Spring’s words" (`section.qt`): her quote, its four steps (two of which repeat the quote's 95%
 * and 38%), and the line under them, all approved by Spring (Connor's D2, cleared 4:41 PM MT Nov 12).
 * Each step lights when the highlight reaches its word in the quote (`at`); the quote's `keys` are
 * marked as they light.
 */
export const QUOTE = {
  heading: 'In Spring’s words',
  text: 'It started with our Sisu data. I connected it to Claude, built skills, and now my reports show up every morning. Then we moved into finance. AI runs 95% of it now, and our bookkeepers add the human part. Now it’s in sales, recruiting and marketing. Our production is up 38% over last year, and AI is a big reason why.',
  keys: ['95%', '38%'],
  name: 'Spring Bengtzen',
  role: 'Co-founder, Amplified Impact · CEO, The Utah Life Real Estate Group',
  pathLabel: 'Where AI went next at The Utah Life Real Estate Group',
  stops: [
    { k: 'Reports', t: 'Sisu data, every morning', at: 'reports' },
    { k: 'Finance', t: '95% run by AI', at: 'finance.' },
    { k: 'Sales, recruiting, marketing', t: 'AI in every seat', at: 'sales,' },
    { k: 'Production', t: 'Up 38% over last year', at: '38%' },
  ],
  foot: 'Almost every skill on this chart is in our library. You can build the same thing in your business, one seat at a time.',
  /** "26 of 29 are in the Library": the counts are the chart's (`chartCounts`). */
  inLibrary: (n: number, of: number) => `${n} of ${of} are in the Library`,
  library: { label: 'Browse the Library', href: '/library' },
} as const;

/**
 * S9, the hours calculator (`section.hrs`): its words and defaults. The brief's arithmetic is in
 * `client/hours.ts` (`hoursMath`), which prints the defaults' results into the markup and recounts them
 * as you slide.
 */
export const HOURS = {
  eyebrow: 'Do the math',
  title: 'How many hours could AI give you back?',
  intro: 'Slide each bar to the hours you or your leaders spend in a normal week. Then type in what an hour of your time is really worth. Be honest. Nobody’s watching.',
  rows: [
    ['numbers', 'Pulling numbers: P&L, lead conversion, production', 4],
    ['meetings', 'Prepping L10s, 1:1s and leadership meetings', 3],
    ['email', 'Email, meeting notes and follow-ups', 6],
    ['chasing', 'Chasing tasks, deadlines and team updates', 3],
    ['books', 'Reviewing the books and month-end close', 2],
    ['recruit', 'Recruiting and onboarding new agents', 2],
    ['marketing', 'Marketing, content and your database', 3],
  ],
  max: 20,
  /** A slider's value; `n` is a number, or the `{n}` the script fills in. */
  perWeek: (n: number | string) => `${n} hrs a week`,
  perWeekSaid: (n: number | string) => `${n} hours a week`,
  rateLabel: 'What’s one hour of your time worth?',
  rate: 250,
  rateMax: 100000,
  rateUnit: 'an hour',
  out: 'Your hours back',
  bigK: 'hours back every week',
  year: 'Hours back a year',
  weeks: 'Full work weeks back',
  dollars: 'Your time, in dollars',
  yearK: 'Your 50 work weeks. The lit ones come back.',
  cellsSaid: (weeks: string) => `${weeks} of 50 work weeks back`,
  said: (week: string, year: string, dollars: string) => `${week} hours back every week, ${year} a year, worth ${dollars}.`,
  cta: { label: 'Start Getting Them Back, Free', href: '#free' },
  note: 'We assume AI drafts about half of this work and you check it. Based on 50 work weeks a year. Your results will vary.',
} as const;

/** S10, the five free skills (`section.fh`, #free): in the Library's order (`FREE_FIVE`), the mockup's words for each. */
export const FREE = {
  eyebrow: 'Free to start',
  title: 'Five free hires. No interviews.',
  intro: 'These work for anyone with a calendar, an inbox and a business. Agent, owner or neither.',
  cta: 'Get the 5 Free Skills',
  items: [
    { slug: 'ai-brain-setup', name: 'AI Brain Setup', text: 'Teaches your AI who you are, what you sell and how you work. Everything you do after this gets smarter. Think of it as day-one onboarding.' },
    { slug: 'voice-profile', name: 'Sounds Like You', text: 'Your AI voice profile. So your drafts sound like you on a good day, not a robot that just discovered exclamation points.' },
    { slug: 'ai-brain-tuneup', name: 'AI Brain Tune-Up', text: 'Finds the stale, vague or conflicting lines in your AI setup. It changes nothing. It just tells on them.' },
    { slug: 'perfect-week', name: 'Perfect Week', text: 'Fits your calendar and your task list into the hours you actually have. Adds nothing without your OK.' },
    {
      slug: 'inbox-meeting-follow-through',
      name: 'Inbox and Meeting Follow-Through',
      text: 'Pulls out the decisions, replies and promises you made, then drafts the follow-ups. Never sends. You’ll finally remember what you said yes to.',
    },
  ],
  foot: 'Works in Claude or ChatGPT · Perfect Week and Follow-Through need a paid Claude plan',
} as const;

/**
 * S11, the programs (`section.pg`, #programs). Every button goes to the program's own page, never to
 * Stripe (Connor's D1), with the proof line beside it. The prices, dates and seats are not here: the
 * section reads them from /pricing's own sources (`../prices.ts`, `@ai/core/offer`).
 */
export const PROGRAMS = {
  eyebrow: 'Programs',
  title: 'Four ways to hire AI. Here’s the simple version.',
  intro: 'Every program comes with weekly office hours: a live Q&A call where you pop on and ask us anything, so you’re never stuck. Every price is right here. No “book a call to find out.”',
  indexLabel: 'The four programs',
  details: 'Details',
  detailsSaid: (name: string) => `${name}: see full details`,
  /** The seat line's words once the API has counted: "12 of 15 founding seats left". */
  seatsWord: 'founding seats left',
  /**
   * What the line can say before anything is counted (Design, 5:20 PM CT Nov 12): the written cap, "15 of
   * 15 founding seats", and the deadline's day as the Accelerator's own line puts it, "Ends Nov 30".
   */
  seatsCap: 'founding seats',
  seatsEnds: (day: string) => `Ends ${day}`,
  cards: {
    accelerator: {
      kicker: 'We build it with you',
      short: 'AI Accelerator',
      who: 'Team owners and ops leads',
      href: '/team-build',
      text: 'Every Wednesday for eight weeks, you and your ops lead get on a live call with us. We build one skill together, on your real business. By the end, eight jobs run without you. Then you keep going, with new skills and office hours for 90 days after your last build.',
      list: [
        '8 live builds, 90 minutes each',
        'Every owner, ops and agent skill',
        'Weekly office hours: a live Q&A, ask us anything',
        'New skills and office hours for 90 days after your last build',
        'Every build recorded, so a missed week isn’t a lost week',
      ],
      best: 'Best if you want it done right, done fast, and done with a coach in the room. Needs Follow Up Boss.',
      note: 'founding price',
      /** The figures go in from /pricing's sources: "2 payments of $3,750. Then $9,997. Ends Nov 30." */
      after: (twoPay: string, then: string, ends: string) =>
        `For an owner and an ops lead, or 2 payments of ${twoPay}. Then ${then}. Ends ${ends}.`,
      cta: 'Claim a Founding Seat',
      alt: (twoPay: string) => `Or 2 payments of ${twoPay}`,
    },
    insiders: {
      kicker: 'You build it yourself',
      short: 'Insiders',
      who: 'Team owners and ops leads',
      href: '/insiders',
      text: 'The same owner skills we use, ready to download. Each one is a job description for your AI, with a short guide that walks you through setup. You set them up on your own time. Get stuck? Bring it to office hours and we’ll help.',
      list: [
        'Every owner and ops skill, like Morning Brief, L10 Meeting Prep and Team P&L Review',
        '2 new skills added every month',
        'Weekly office hours: ask questions, or sit in and learn with other team owners',
        'Every session recorded in the Academy',
        'Keep everything you download, even if you leave',
      ],
      best: 'Best if you like to figure things out yourself and want the whole toolbox for less.',
      toggle: { label: 'Insiders billing', a: 'Yearly', b: 'Monthly' },
      notes: ['a year', 'a month'],
      after: (monthly: string) => `Counts fully toward the Accelerator later. Or ${monthly} a month, with a 3-month minimum.`,
      cta: 'Join Insiders',
    },
    team: {
      kicker: 'We train your agents',
      short: 'Team Plan',
      who: 'Team owners',
      href: '/teams',
      text: 'You want every agent using AI, but you don’t have time to teach it. So we do. Every agent gets the agent skills and a live class with us each week. You get a view of who’s actually using it. You don’t teach a thing.',
      list: [
        'Every agent skill, for every agent on your team',
        'A short starter path so each agent is set up in week one',
        'A weekly live agent class, plus office hours to ask us anything',
        'Every class recorded, so agents can catch up anytime in the Academy',
        'Your owner view of who’s using it, and how much',
      ],
      best: 'Best if you want a smarter team without becoming the AI teacher.',
      /**
       * The Team Plan's dates in /pricing's words (Connor's D7, 4:41 PM MT Nov 12): only the starter path
       * and the 5 free skills open December 14, and live classes start the week of January 4. A test
       * holds each half to /pricing's own lines (`OFFERS.agents.starts`).
       */
      dates: 'Your agents get the starter path and the 5 free skills on December 14, and live classes start the week of January 4.',
      toggle: { label: 'Team size', a: 'Up to 15', b: '16 to 40' },
      note: 'first 3 months',
      after: (upTo: number, monthly: string, from: string) => `For up to ${upTo} agents. Then ${monthly} a month, from ${from}.`,
      afterWide: (from16: number, upTo: number, monthly: string, from: string) =>
        `For ${from16} to ${upTo} agents. Then ${monthly} a month, from ${from}.`,
      cta: 'Train My Team',
      over: 'Over 40 agents? Let’s talk',
    },
    agent: {
      kicker: 'Just for you, the agent',
      short: 'Agent Plan',
      who: 'Agents',
      href: '/agents',
      text: 'Same training as the Team Plan, for one agent. You get every agent skill and a live class each week that covers leads, listings, buyers and planning your week. It costs less than one missed follow-up.',
      list: [
        'Every agent skill, like Speed to Lead Reply and Offer Strategy',
        'A short starter path to get you set up',
        'A weekly live class, recorded so you never miss one',
        'Weekly office hours: a live Q&A, ask us anything',
      ],
      best: 'Best if your team owner hasn’t jumped in yet, or you just want to get ahead.',
      toggle: { label: 'Agent Plan billing', a: 'Monthly', b: 'Yearly' },
      notes: ['a month', 'a year'],
      after: (yearly: string, first: string) => `Or ${yearly} a year. Join any day, cancel anytime. First charge ${first}.`,
      cta: 'Start the Agent Plan',
    },
  },
  foot: 'Still not sure? Start with the 5 free skills. You’ll know in a week which program fits.',
  compare: { label: 'Compare Every Program', href: '/pricing' },
} as const;

/**
 * S12, the Accelerator's eight Wednesdays (`section.wed`). The dates are /team-build's (`WEEKS`), short;
 * the names and lines are the mockup's. The ring counts the eight builds and, settled, is full.
 */
export const TIMELINE = {
  eyebrow: (starts: string) => `Amplified AI Accelerator · Starts ${starts}`,
  title: 'Eight Wednesdays. Eight AI employees.',
  intro: 'Each week we build one skill live, on your real business, in Follow Up Boss. You leave every session with something that works on Thursday. Then the support keeps going: new skills and office hours for 90 days after your last build.',
  built: 'of 8 built',
  builds: 8,
  cta: 'Claim a Founding Seat',
  more: { label: 'See the Accelerator', href: '/team-build' },
  weekLabel: (n: number) => `Week ${n}`,
  weeks: [
    { n: 0, name: 'Setup', text: 'Your AI Brain, your voice profile and a Team AI Brain, plus a 30-minute orientation.' },
    { n: 1, name: 'Lead-Source ROI', text: 'What every lead source really costs you, and which numbers you can trust.' },
    { n: 2, name: 'Morning Brief', text: 'One page every morning. What needs you today and who owns the next step.' },
    { n: 3, name: 'L10 Meeting Prep', text: 'Your scorecard checked and a short list of problems to solve, before anyone sits down.' },
    { n: 4, name: 'FUB Pipeline Review', text: 'Where follow-through is slipping in your pipeline, and what to decide this week.' },
    { n: 5, name: 'Agent 1:1 Prep', text: 'Coaching prep built on what each agent actually did, not what they remember doing.' },
    { n: 6, name: 'Team Playbook Builder', text: 'Your SOPs turned into a playbook, so work leaves your desk and your standards stay.' },
    { n: 7, name: 'New Agent Onboarding Plan', text: 'Standards, checkpoints and a dated first 30 days for every new hire.' },
    { n: 8, name: 'Sustain and Expand', text: 'Keep, fix or retire each workflow, then leave with your 90-day plan.' },
  ],
  /** The holiday break, between weeks 3 and 4. */
  pause: { label: 'Break', date: 'Dec 23, 30', text: 'No builds or office hours over the holidays.' },
  after: {
    label: 'After',
    date: '90 days',
    name: 'Keep building',
    text: (price: string, from: string) =>
      `New skills and office hours for 90 days after your last build. Then Amplified Insiders at ${price} a month, from ${from}, until you cancel.`,
  },
  meta: ['Builds Wed 2:00 PM ET (1:00 PM CT), 90 minutes', 'Office hours Thu 2:00 PM ET (1:00 PM CT)', 'No builds Dec 23 or 30'],
} as const;

/** S13, Library favorites (`section.fav`, #library): four columns, by Library slug, the mockup's line for each. */
export const FAVORITES = {
  eyebrow: 'The Library',
  title: (n: number) => `${n} skills and guides, sorted by who you are.`,
  intro: 'Every skill says what it does, what you hand it and what tools it needs. A few favorites:',
  columns: [
    {
      h: 'Buyer’s agents',
      items: [
        ['showing-tour-prep', 'A tour sheet for your buyer and questions for every listing agent.'],
        ['offer-strategy', 'A recommended offer, the risk in each term and an email to your buyer.'],
        ['due-diligence-review', 'What matters in the inspection, seller requests and every deadline.'],
        ['new-construction-review', 'Reads the builder’s contract for money at risk. Builders love this one less.'],
      ],
    },
    {
      h: 'Listing agents',
      items: [
        ['listing-appointment-prep', 'A one-page plan, seller questions, a marketing menu and a net sheet.'],
        ['pricing-conversation-prep', 'Your price, your talk track and answers for “but Zillow says.”'],
        ['offer-comparison', 'Every offer side by side for your seller, escalation math included.'],
        ['listing-description-writer', 'MLS remarks and headlines, with a fair housing check built in.'],
      ],
    },
    {
      h: 'Team owners',
      items: [
        ['team-pnl-review', 'Where the money went, plus the questions to ask your bookkeeper.'],
        ['agent-1on1-prep', 'Coaching prep with pace math against each agent’s goal.'],
        ['recruiting-prep', 'A clean, tiered recruit list and first-touch emails.'],
        ['database-health-check', 'A health report and cleanup list for your CRM. Never touches your data.'],
      ],
    },
    {
      h: 'Content and your week',
      items: [
        ['content-strategist', 'Weekly reel ideas built from your own stories.'],
        ['reel-editor', 'Turns a talking-head video into a finished Reel.'],
        ['speed-to-lead-reply', 'A personal first reply, text and call opener for every new lead.'],
        ['sphere-touch-plan', 'A year of touches for your sphere, tied to real details about them.'],
      ],
    },
  ],
  all: (n: number) => `See All ${n}`,
  allHref: '/library',
} as const;

/** S14, the founders (`section.fd`, #founders): the mockup's words (Connor's D6) with their real photos. */
export const FOUNDERS = {
  eyebrow: 'Who’s behind it',
  title: 'Built by people who run real estate, not people who read about it.',
  intro: 'Most AI courses are made by tech people guessing what agents need. Ours are made by a real estate data expert who knows the numbers and a CEO who runs a team on these tools every day.',
  people: [
    {
      photo: 'connor',
      role: 'Co-founder',
      name: 'Connor Leiva',
      tag: 'Real estate’s numbers person, now building its AI.',
      bio: 'Connor has spent more than a decade in the corporate side of real estate, at RE/MAX Headquarters, Realogy and PLACE. With an MBA in data analytics, he knows the numbers behind a team better than almost anyone: the finances, the leads, conversion and the health of the database. So when he builds a skill, it isn’t a generic prompt. It’s built by someone who lives and breathes real estate and knows what the numbers should say.',
      facts: ['MBA, data analytics', 'Finance and P&L', 'Lead conversion', 'Database health', 'Team operations'],
    },
    {
      photo: 'spring',
      role: 'Co-founder',
      name: 'Spring Bengtzen',
      tag: 'She runs a real business. Every skill gets tested there first.',
      bio: 'Spring is the CEO of The Utah Life Real Estate Group, a 100-agent team closing 700+ homes a year. She uses these skills in her own company every day. AI runs her daily reports, most of her finance work and big parts of sales, recruiting and marketing. Her production is up 38% year over year, and she credits a big part of that to AI.',
      facts: ['CEO, 100-agent team', '700+ homes a year', '20+ years in real estate', 'Founder of The Forum'],
    },
  ],
  venn: {
    a: { n: 'Spring', t: 'What a team needs to grow' },
    mid: 'Every skill',
    b: { n: 'Connor', t: 'The numbers, leads and systems' },
  },
  vennTitle: 'The perfect combo for AI in a real estate business.',
  vennText: 'Spring knows what a team needs to grow. Connor knows the numbers, leads and systems underneath it. Together, every skill is built by people who know this business inside out, then proven in a real team before it reaches yours.',
  more: { label: 'Read Our Story', href: '/about' },
} as const;

/** S15, the questions (`section.faq`, #questions), in the mockup's order, with its answers. */
export const QUESTIONS = {
  title: 'Good questions. Straight answers.',
  aside: 'Still wondering about something? Email us and a real person will answer.',
  items: [
    { q: 'I’m not techy. Can I really do this?', a: ['Yes. If you can send an email, you can run a skill. Every skill comes with a short setup guide, and weekly office hours are there if you get stuck.'] },
    { q: 'Is my client data safe?', a: ['Your data stays in your own AI account and your own tools. Skills read and draft. Nothing sends, and nothing changes in your CRM, until you approve it.'] },
    { q: 'Will my agents actually use it?', a: ['That’s what the Team Plan is for. We teach them live every week, every class is recorded, and you can see who’s using it and how much.'] },
    {
      q: 'Do I need Claude or ChatGPT?',
      a: ['Yes, one of them. Most skills work in either. A few, like Perfect Week and Inbox and Meeting Follow-Through, need a paid Claude plan. Every skill tells you what it needs.'],
    },
    { q: 'What if I miss a week?', a: ['Every build and class is recorded in the Academy. Watch it when you can, then bring your questions to office hours.'] },
    { q: 'Do I need Follow Up Boss?', a: ['Only for the Accelerator, because we build on your real Follow Up Boss data. Everything else works with any CRM.'] },
    {
      q: 'Which program should I pick?',
      a: [
        'Want it built with you, live? The Accelerator. Want to build it yourself? Insiders. Want your agents trained for you? The Team Plan. Just you, as an agent? The Agent Plan. Still not sure? Start with the 5 free skills.',
      ],
      link: { label: 'Compare Every Program', href: '/pricing' },
    },
    {
      q: 'Can I cancel?',
      a: ['The Agent Plan cancels anytime. Insiders monthly has a 3-month minimum. The Team Plan’s first 3 months are paid up front, then it’s monthly. You keep every skill you’ve downloaded.'],
    },
  ],
} as const;

/** S16, the close (`section.close`, forest): the free button with its proof line, and the programs. */
export const CLOSE = {
  title: 'Make your first hire today.',
  lead: 'Five free skills, ready to run. No interview, no desk, no awkward first day.',
  free: 'Get 5 Free Skills',
  programs: { label: 'See the Programs', href: '#programs' },
} as const;
