// Every word on /retool: the kit for Connor's talk "Retool, Don't Replace: AI 101 for Team Owners", a
// step-through the room follows while the deck runs, gated part way down on an email opt-in.
// DECISIONS.md D-046.
//
// It is built the way /voice-profile is (D-040): /ai101's renderer draws it (`render.ts` here composes
// `../ai101/render.ts`'s parts) and /ai101's script runs it, so Copy & Open, the fields that fill the
// prompts, the Claude / ChatGPT switch and the step-through all work as they do there.
//
// WHAT IS OPEN AND WHAT IS GATED is the talk's own plan ("Build one kit page: the Kit B prompt open to
// anyone, and Kits C through E behind a short form (name, email, team size, a December interest
// checkbox)"), and Segment 4's "No form on it, so nobody loses two minutes": everything up to the
// audit and reading its map is open, so the room can do the work block mid-call; the Contract-to-Close
// Coordinator (Kit C), the 30-day plan (Kit D) and the Retool Conversation script (Kit E) sit after the
// gate. Kit A (the note to Sarah), the run of show and the Q&A prep are the speaker's, not the room's,
// and are not on the page.
//
// The prompts (Kits B, C and E) are Connor's word for word, but for one blank: Kit B's second
// "[number]" is "[how many]", because a placeholder is filled by its exact text (`UI.slots` in
// `../ai101/content.ts`), and two "[number]"s could only ever hold the same value. The other words are
// the talk's, cut to what reads on a phone, and the page's own where a comment says so.
//
// House rules, as on /ai101: no em dashes, short plain sentences.

import { PAGE as AI101, type CopyOpen, type FillField, type Inline, type Prompt, type Screen } from '../ai101/content';

/**
 * Who the opt-in agrees to hear from: Amplified Impact, LLC, as on every sign-up (D-041).
 * `CONSENT.guides` in `src/legal/content.ts` quotes the line built from this, and a test holds the two
 * equal.
 */
export const RETOOL_SENDERS = 'Amplified Impact, LLC';

/**
 * The team sizes the opt-in offers: `value` is what the form posts, exactly the API's `TEAM_SIZES`
 * (routes/ai101.ts), which a test holds equal; `label` is what the visitor reads.
 */
export const TEAM_SIZE_OPTIONS = [
  { value: '1-10', label: '1 to 10 agents' },
  { value: '11-25', label: '11 to 25 agents' },
  { value: '26-50', label: '26 to 50 agents' },
  { value: '51+', label: '51 or more agents' },
] as const;

/** Kit B, the four-question audit. Open to anyone (the talk's Segment 4). */
const AUDIT_PROMPT = `You're an operations analyst for real estate teams. Map my ops leader's week and show me what AI can take on.

1. My team: [number] agents, about [how many] closings a month, CRM: [name]
2. Who's in ops: [for example, one full-time ops leader and a part-time TC]
3. What eats their week, rough is fine: [list]
4. If they quit tomorrow, the first thing that breaks: [answer]

Then:
- Build their likely weekly task list. Start with what I gave you, then add tasks a team this size usually has, marked (added).
- Estimate hours per task, marked (est.), so the total fits the ops team I described. If I didn't say, assume one full-time person at about 45 hours.
- Sort every task into one bucket. RUN: AI does it end to end with light oversight. DRAFT: AI prepares it and a human approves it. OWN: a human keeps it.
- Anything sent to clients, agents, lenders, or title is DRAFT at most. Anything that sets or changes a contract date is DRAFT at most. Wire instructions, money, texting consent, fair housing review, and decisions about people are always OWN. When unsure, pick the safer bucket.

Show me:
1. A table: Task | Hours | Bucket | Why
2. Hours in RUN, DRAFT, and OWN, plus RUN and DRAFT together as a percent of the week
3. The first AI employee I should build, in two sentences
4. Three questions to ask my ops leader to correct this map`;

/** Kit C, the Contract-to-Close Coordinator's job description. */
const COORDINATOR_PROMPT = `You are the Contract-to-Close Coordinator for [Team Name], a real estate team in [City, State]. You support our ops leader on every new transaction. You draft; a human verifies and sends.

When I upload an executed purchase agreement, plus any addenda or counteroffers:

1. KEY TERMS. Pull the property address, buyers, sellers, purchase price, earnest money (amount, holder, due date), acceptance date, financing type, and every deadline: inspection, appraisal, financing, title review, HOA documents, final walkthrough, closing, and possession.
For each date, cite the contract section it came from. If a date is calculated, show the math and say whether the contract counts calendar or business days. If anything is missing, unclear, or changed by an addendum, flag it. Never guess.

2. TIMELINE. List every deadline in date order with its owner: our agent, the client, the lender, title, the other agent, or ops.

3. CHECKLIST. Build the file checklist from the Contract-to-Close Checklist in your knowledge, plus anything this contract adds.

4. DRAFTS. Draft our under-contract emails to the client, the lender, title, and the other agent, using our templates and tone. Put anything you don't know in [brackets]. Never include wire instructions or banking details.

5. VERIFY BEFORE SENDING. End with a short list of everything a human must check against the contract before any email goes out or any date goes on a calendar.

Format for a 60-second scan: headings and tables, no filler.`;

/** Kit E, the Retool Conversation script. Words the owner says, so it is copied, not opened in an app. */
const SCRIPT = `[Name], I want to talk about your seat, not your performance. When you stepped into this role, we had [X] agents and [Y] closings a month. We've grown, and your seat didn't grow with us. That's on me.

I don't want to hire around you, and I don't want to lose you. I want to take the repeatable work that's burying you and hand it to an AI assistant that you manage. You'd train it and check its work, the same way you'd train a new TC.

Before we build anything, let's agree where your time goes once you get it back. My vote is [agent accountability / client experience / owning the scorecard]. What's yours?

I took a first pass at mapping your week with AI, and I'm sure I got things wrong. Can you spend 10 minutes fixing it with real hours? Then we'll map it together.`;

/** Copy, then open a BLANK chat. Never a `?q=` prefill (D-032). */
const OPEN_CHAT: CopyOpen[] = [
  {
    label: 'Copy & Open ChatGPT',
    app: 'ChatGPT',
    href: 'https://chatgpt.com/',
    toast: 'Copied. Paste it into the new ChatGPT chat.',
  },
  {
    label: 'Copy & Open Claude',
    app: 'Claude',
    href: 'https://claude.ai/new',
    toast: 'Copied. Paste it into the new Claude chat.',
  },
];

export const RETOOL = {
  slug: 'retool',

  meta: {
    title: "Retool, Don't Replace: AI 101 for Team Owners · Amplified Impact",
    description:
      "Map your ops leader's week, build one AI employee, and plan a 30-day retool. The free kit from AI 101 for Team Owners.",
    url: 'https://www.amplifiedimpact.io/retool',
    siteName: 'Amplified Impact',
  },

  /** Where the visitor's place and fields are kept, apart from /ai101's and /voice-profile's. */
  stateKey: 'retool-v1',
  /** Where this device's opt-in is remembered. */
  unlockKey: 'retool-unlocked',

  // The talk's arc (its Run of Show): the pattern, the sort, the audit, the build, the conversation,
  // the plan, the ask. Each anchor is a link the deck or the chat can use: `/retool#audit` drops a
  // visitor straight onto the audit, for Segment 4's "Sarah drops the prompt link in the chat".
  screens: [
    { anchor: 'welcome', stage: 'Welcome', next: 'Start' },
    { anchor: 'three-doors', stage: 'The Pattern', next: 'Show Me the Sort' },
    { anchor: 'run-draft-own', stage: 'Run, Draft, Own', next: 'Map My Team' },
    { anchor: 'audit', stage: 'Your Task Map', count: '1 of 2', next: 'I Have My Map' },
    { anchor: 'read-your-map', stage: 'Your Task Map', count: '2 of 2', next: 'Get the Full Kit' },
    // The gate. Its Next shows only once this device has signed up; the form's button is the way on.
    { anchor: 'kit', stage: 'The Full Kit', next: 'Build My AI Employee' },
    { anchor: 'coordinator', stage: 'Your First AI Employee', count: '1 of 2', next: "It's Hired" },
    { anchor: 'first-file', stage: 'Your First AI Employee', count: '2 of 2', next: 'The People Side' },
    { anchor: 'retool-conversation', stage: 'The Retool Conversation', next: 'Make the Plan' },
    { anchor: 'thirty-day-plan', stage: 'The 30-Day Retool Plan', next: 'Last Thing' },
    // The last screen: no Next, so the footer shows Start Over.
    { anchor: 'two-ways', stage: 'Two Ways Forward' },
  ] satisfies Screen[],

  nav: AI101.nav,

  welcome: {
    logoAlt: 'Amplified Impact',
    eyebrow: 'Free Kit · AI 101 for Team Owners',
    title: "Retool, Don't Replace",
    // The talk's one message.
    intro: 'Your ops seat was built for a smaller team. Retool the seat instead of replacing the person.',
    buildsLead: "You'll leave with:",
    builds: [
      {
        name: "A map of your ops leader's week.",
        detail: ' What AI can run, what it can draft, and what stays yours.',
      },
      { name: 'One AI employee.', detail: ' A Contract-to-Close Coordinator, built from a blank screen.' },
      { name: 'A 30-day plan.', detail: ' And an answer on day 30: was it the person or the system?' },
    ],
    // Segment 1's promise, for a page.
    plain: 'If you can send a text, you can do everything here. ChatGPT or Claude, phone or laptop.',
    // A real link, so it works without JavaScript too.
    skip: { label: 'In the session? Skip to the audit', href: '#audit' },
  },

  doors: {
    heading: 'The seat outgrew the person',
    intro:
      "Your first ops hire was probably an admin or an EA. The team grew, and nobody redesigned the seat. Now that seat is buried in contract-to-close, onboarding, and CRM cleanup, and you're standing at three doors.",
    doors: [
      {
        title: 'Door A: Hire again',
        body: 'Another salary, another ramp, and two people sharing a seat built for one.',
      },
      {
        title: 'Door B: The hard conversation',
        body: 'You risk losing the person who knows where everything lives, over a seat nobody redesigned.',
      },
      { title: 'Door C: Retool the seat', body: 'Keep the person and rebuild the work around them.' },
    ],
    question:
      "Is it the person or the system? Most owners guess. By the end of this kit you'll have a way to stop guessing.",
    eos: 'Running EOS? Your ops leader probably still Gets it and Wants it. What broke is Capacity. AI adds capacity to a seat without adding a salary.',
  },

  sort: {
    heading: 'Run, Draft, Own',
    // "AI 101 in one line."
    intro:
      "AI is a brilliant new hire with zero context. It does exactly what you trained it to do and guesses confidently at everything you didn't.",
    buckets: [
      {
        title: 'Run',
        body: 'AI does it end to end with light oversight.',
        examples: 'Deadline reminders, under-contract checklists, CRM tagging, weekly pipeline reports.',
      },
      {
        title: 'Draft',
        body: 'AI prepares it and a human approves.',
        examples: 'Client status updates, onboarding emails, listing descriptions, MLS input.',
      },
      {
        title: 'Own',
        body: 'A human keeps it.',
        examples: 'Negotiations, agent coaching, hard conversations, compliance sign-off.',
      },
    ],
    // The talk's slide 3 sorts with "the same two questions, in order. The first yes decides the
    // bucket; two noes mean Run." The slide's own wording was not in the talk's notes, so these two are
    // Kit B's own rules, asked as questions (D-046): the page and the prompt sort the same way.
    questionsHeading: 'Sort any task with two questions, in order. The first yes decides the bucket.',
    questions: [
      [
        'Does it touch money, wire instructions, texting consent, fair housing review, or a decision about a person? ',
        { strong: 'Own.' },
      ],
      [
        'Does it go to a client, an agent, a lender, or title, or set or change a contract date? ',
        { strong: 'Draft.' },
      ],
      ['Two noes? ', { strong: 'Run.' }, ' When unsure, pick the safer bucket.'],
    ] as Inline[][],
    never:
      'Three things never leave Own: wire instructions, consent for automated texting under TCPA, and fair housing review of listing language.',
  },

  audit: {
    heading: "Map your ops leader's week",
    intro: 'Four questions, from memory. Rough is fine. AI fills in the rest and marks what it assumed.',
    fields: [
      { name: 'agents', label: 'Agents on your team', placeholder: '25' },
      { name: 'closings', label: 'Closings a month, about', placeholder: '30' },
      { name: 'crm', label: 'Your CRM', placeholder: 'Follow Up Boss' },
      {
        name: 'opsTeam',
        label: "Who's in ops",
        placeholder: 'one ops leader, a part-time TC',
      },
      {
        name: 'weekEaters',
        label: 'What eats their week',
        hint: 'Rough is fine.',
        placeholder: 'contract-to-close, agent onboarding, CRM cleanup',
        rows: 3,
      },
      {
        name: 'breaksFirst',
        label: 'If they quit tomorrow, the first thing that breaks',
        hint: 'In the session? Paste what you typed in the chat at the start.',
        placeholder: 'contract-to-close',
      },
    ] satisfies FillField[],
    open: OPEN_CHAT,
    thenHeading: 'Then, in the new chat:',
    then: [['Paste.'], ['Fill in any blank still in [brackets].'], ['Send.']] as Inline[][],
    showPrompt: 'See the full prompt',
    note: 'It works on free ChatGPT and free Claude.',
  },

  read: {
    heading: 'Read your map',
    intro: "It's a first draft. Your ops leader corrects it in Week 1. That's when it becomes real.",
    steps: [
      [
        { strong: 'Strike one task' },
        " marked (added) that your team doesn't have. AI drafts the map; you own the truth.",
      ],
      [
        { strong: 'Overrule one bucket.' },
        ' It put client updates in Run? Would you let AI send that unread? No. Draft.',
      ],
      [{ strong: 'Find Run plus Draft' }, ' as a share of the week.'],
      [
        { strong: 'Multiply those hours' },
        " by what your ops leader costs per hour. Don't post it anywhere. Just look at it.",
      ],
      [
        { strong: 'Name the biggest cluster' },
        ' AI employee number one. Every team has contract-to-close, which is the one this kit builds.',
      ],
    ] as Inline[][],
    session: 'In the session? Drop your Run plus Draft percentage in the chat.',
  },

  /** The opt-in, its own screen part way down. Every screen after it opens once the visitor signs up. */
  gate: {
    logoAlt: 'Amplified Impact',
    eyebrow: 'Free · The Full Kit',
    heading: 'Get the full kit',
    body: 'Build your first AI employee, the script for the talk with your ops leader, and the 30-day plan. Tell us where to send updates, and the rest is yours.',
    fields: { firstName: 'First name', email: 'Email', teamSize: 'Team size' },
    teamSizes: TEAM_SIZE_OPTIONS,
    december: 'Tell me about the December leadership track.',
    button: 'Get the Kit',
    // Submitting is the opt-in: email consent and agreement to the Terms and Privacy Policy (D-041).
    legal: [
      'By signing up, you agree to our ',
      { link: 'Terms of Service', href: '/terms' },
      ' and ',
      { link: 'Privacy Policy', href: '/privacy' },
      ` and to emails from ${RETOOL_SENDERS}. Unsubscribe anytime.`,
    ] as Inline[],
    success: "You're in. The full kit is open.",
    /** The id the no-JavaScript 303 lands on: the steps, which the CSS then shows with `:target`. */
    unlockedAnchor: 'unlocked',
  },

  coordinator: {
    heading: 'Hire your Contract-to-Close Coordinator',
    intro: 'You already know how to hire. An AI employee gets the same four things a new TC gets.',
    parts: [
      { name: 'A job description.', detail: ' The instructions below.' },
      { name: 'A training binder.', detail: ' Your checklist and templates.' },
      { name: 'A first assignment.', detail: ' An executed purchase agreement.' },
      { name: 'A manager.', detail: ' You, checking its work.' },
    ],
    fieldsLead: 'Start with the job description. Fill in two blanks, then pick your app.',
    fields: [
      { name: 'teamName', label: 'Your team name', placeholder: 'The Rivera Group' },
      { name: 'cityState', label: 'City, State', placeholder: 'Austin, TX' },
    ] satisfies FillField[],
    pickLabel: 'The app you use',
    claude: {
      tab: 'Claude',
      open: {
        label: 'Copy & Open Claude',
        app: 'Claude',
        href: 'https://claude.ai/projects',
        toast: 'Copied. Make the Project, then paste into Instructions.',
      } satisfies CopyOpen,
      // As /ai101's Save step has it (D-037): name it, skip the description, then Instructions.
      steps: [
        [
          'Click ',
          { strong: 'New project' },
          ', top right. Name it ',
          { strong: 'Contract-to-Close Coordinator' },
          '.',
        ],
        ['Leave the description blank and click ', { strong: 'Create project' }, '.'],
        ['Paste into ', { strong: 'Instructions' }, ' on the right side, not the description.'],
      ] as Inline[][],
    },
    // A ChatGPT Project, not the talk's "custom GPT": OpenAI retires custom GPTs on Dec 11, 2026, and
    // personal plans can no longer make one; Projects have instructions and files on every plan,
    // free included (OpenAI's help center, checked 2026-10-22, D-046). There is no address that
    // starts one, so the button opens ChatGPT and the steps start from its sidebar.
    chatgpt: {
      tab: 'ChatGPT',
      open: {
        label: 'Copy & Open ChatGPT',
        app: 'ChatGPT',
        href: 'https://chatgpt.com/',
        toast: 'Copied. Make the Project, then paste into its instructions.',
      } satisfies CopyOpen,
      steps: [
        [
          'Click ',
          { strong: 'New project' },
          ' in the sidebar. Name it ',
          { strong: 'Contract-to-Close Coordinator' },
          '.',
        ],
        ['Open the ', { strong: '•••' }, ' menu, then ', { strong: 'Project settings' }, '.'],
        ['Paste into ', { strong: 'Instructions' }, '.'],
      ] as Inline[][],
    },
    showPrompt: 'See the full job description',
    // The three lines the talk reads aloud.
    keyLines:
      'The three lines that matter most: cite the contract section for every date, never guess, and end with Verify Before Sending.',
  },

  firstFile: {
    heading: 'Train it, then give it a file',
    binder: {
      heading: 'The training binder',
      // One file each: free ChatGPT Projects hold five (D-046).
      intro: "Add these to the Project as files, one each: the binder you'd hand a new TC on day one.",
      items: [
        'Your contract-to-close checklist',
        'Four email templates: under contract, inspection scheduled, clear to close, closing week',
        'Three real emails your ops leader sent that you love, for tone',
        'Preferred lender and title contacts, with no client data',
      ],
    },
    assignment: {
      heading: 'The first assignment',
      body: 'Upload an executed purchase agreement. Out comes the key-dates timeline with sections cited, the file checklist, and drafts to the client, the lender, title, and the other agent.',
    },
    manager: {
      heading: 'The manager',
      body: "Check one date against the contract. Then fix one thing in the job description. You don't fire a new TC for one miss. You update the binder.",
    },
    guardrails:
      "Practice on a fictional contract first. Keep wire instructions out of every template. Check your AI account's data settings before you upload a real client file.",
    // The seam: said plainly, as the talk says it, without the pitch.
    crm: "This version doesn't touch your CRM. Connecting it so files open themselves is build work, different for every CRM.",
    next: {
      heading: 'The next seats',
      items: [
        'An Agent Onboarding Guide',
        'A Listing Launch Coordinator (fair housing review stays Own)',
        'A Lead Follow-Up Coordinator (texting consent stays Own)',
        'A weekly meeting prep assistant',
      ],
    },
  },

  conversation: {
    heading: 'Bring your ops leader in',
    intro:
      'The tech is the easy part. Rollouts die when the person in the seat feels it is being done to them. Four moves, in this order:',
    moves: [
      'Name the seat, not the person: "We grew and your seat didn\'t. That\'s on me."',
      'Make them the manager of the AI, not its replacement. They train it and check its work.',
      'Agree where the recovered hours go before you build anything.',
      'Measure it together for 30 days.',
    ],
    scriptLead:
      'Fill in the script. Say it in your own words, but keep the order: the seat, the help, the hours, the ask.',
    fields: [
      { name: 'opsName', label: 'Your ops leader', placeholder: 'Jordan' },
      { name: 'agentsThen', label: 'Agents when they started', placeholder: '12' },
      { name: 'closingsThen', label: 'Closings a month then', placeholder: '15' },
      {
        name: 'hoursTo',
        label: 'Where their time goes next',
        hint: 'Agent accountability, client experience, owning the scorecard, or your own.',
        placeholder: 'agent accountability',
      },
    ] satisfies FillField[],
    copy: { label: 'Copy the Script', toast: 'Copied. Say it in your own words.' },
    showScript: 'The script',
    worried:
      'If they\'re worried: "This is how your seat becomes sustainable. You\'ll be the person on our team who knows how to run AI, and that makes you harder to replace, not easier."',
    honest:
      "Retool fixes Capacity. It can't fix Get It or Want It. If the seat works on day 30, it was the system. If it still doesn't, you'll have that hard conversation with data instead of a hunch.",
  },

  plan: {
    heading: 'Your 30-day retool plan',
    intro:
      'One AI employee, four weeks, and a day-30 answer to the question underneath: was it the person or the system?',
    measureLabel: 'Measure',
    // Kit D, a week to a card. Week 1's "(Kit E)" is "(the script)": the page has no kit letters.
    weeks: [
      {
        week: 'Week 1',
        focus: 'Map',
        doThis:
          "Share the why with your ops leader (the script). Hand them today's draft map to correct with real hours. Re-run it together, agree on buckets, and pick AI employee number one.",
        measure: 'Baseline: minutes per new file, or weekly hours on that cluster',
      },
      {
        week: 'Week 2',
        focus: 'Build',
        doThis:
          'Build it with the four parts. Test it on three recently closed files, redacted, and compare its output to what actually happened. Fix the job description.',
        measure: 'Errors caught in testing',
      },
      {
        week: 'Week 3',
        focus: 'Run',
        doThis:
          'Use it on every new file next to the old process. Log minutes and every correction. Update the job description on Friday.',
        measure: 'Minutes per file against baseline; corrections per file',
      },
      {
        week: 'Week 4',
        focus: 'Decide',
        doThis: 'Compare to baseline. Decide in writing where the recovered hours go. Pick AI employee number two.',
        measure: "Hours back per week; your ops leader's workload rating, 1 to 10, before and after",
      },
    ],
    dayThirty:
      "On day 30: if the seat works now, it was the system. If it still doesn't, you have data for a fair conversation about the person.",
    eos: 'Running EOS? Make the retool a Rock and put minutes per file on your scorecard.',
  },

  forward: {
    heading: 'Two ways forward',
    yourself: {
      title: 'Run it yourself',
      body: 'Take the kit and run the 30 days yourself. You have everything you need.',
      // Back to the audit, for the map Week 1 starts from.
      link: { label: 'Back to your task map', href: '#audit' },
    },
    review: {
      title: 'Build it with us',
      body: "Book a free 20-minute Retool Review. Bring your task map. You'll leave knowing which AI employee to build first, what it takes, and whether you need help at all.",
      // The booking link (D-046). Empty until Connor sets it up: the card then shows `pending`, the
      // talk's own "Type RETOOL" ask, in place of a button.
      button: { label: 'Book a Retool Review', href: '' },
      pending: 'Type RETOOL in the session chat for the booking link.',
    },
  },

  auditPrompt: { id: 'retool_audit', label: 'The four-question audit prompt', text: AUDIT_PROMPT } satisfies Prompt,
  coordinatorPrompt: {
    id: 'retool_coordinator',
    label: 'The Contract-to-Close Coordinator job description',
    text: COORDINATOR_PROMPT,
    // The prompt's own words: what the Coordinator writes where it doesn't know something.
    literal: ['[brackets]'],
  } satisfies Prompt,
  scriptPrompt: { id: 'retool_script', label: 'The Retool Conversation script', text: SCRIPT } satisfies Prompt,
} as const;
