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
// audit, reading its map and its build steps (D-047) is open, so the room can do the work block
// mid-call; the Contract-to-Close Coordinator (Kit C), the 30-day plan (Kit D) and the Retool
// Conversation script (Kit E) sit after the gate. Kit A (the note to Sarah), the run of show and the
// Q&A prep are the speaker's, not the room's, and are not on the page.
//
// The prompts (Kits B, C and E) are Connor's word for word, but for one blank: Kit B's second
// "[number]" is "[how many]", because a placeholder is filled by its exact text (`UI.slots` in
// `../ai101/content.ts`), and two "[number]"s could only ever hold the same value. The other words are
// the talk's, cut to what reads on a phone, and the page's own where a comment says so. The build
// steps prompt is newer: Connor's ask from the live session, with four lines from this kit under it
// (`BUILD_PROMPT` has which, D-047).
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
4. Three questions to ask my ops leader to correct this map

Write it all in plain language for someone new to AI: short sentences, no tech terms. Keep each Why to a few words so the table fits on a phone.`;

/**
 * The build steps (D-047): the map, pasted in, and the ask Connor typed live after his own map came
 * back, his words as he said them, made into sentences. The first four lines under it are the page's
 * own, each from this kit: build it in a Project, give it the four parts a new hire gets (the
 * Coordinator screen), keep the map's buckets (Kit B's rules), and practice first with no wires (the
 * guardrails). The fifth asks for plain words, one action a step (D-048).
 */
const BUILD_PROMPT = `Here's the task map AI made of my ops leader's week:

[paste your whole map here]

I can see the first AI employee to build. I have no clue how to get started on building this. Give me a simple step-by-step instruction list, as comprehensive as possible, that I can follow to get this built. Make it so that a 10th grader could follow this on their own.

- Build it as a Project in this app, with no code.
- Give it what a new hire gets: a job description, a training binder, a first assignment, and a manager. Write the job description out in full so I can paste it in.
- Keep my map's buckets. A human approves anything marked DRAFT before it goes out. Anything marked OWN stays with a person.
- Have me practice on a made-up example first, and keep wire instructions out of every file.
- Use plain words with no tech terms. One action per step, and tell me exactly what to tap, click, or type.`;

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
  //
  // The map runs straight into its build steps (D-047), as Connor walked it live: "I have my map",
  // read it, then paste the whole map back in and get a step-by-step build for the AI employee it
  // picked. All three are open, before the gate, so the room does the whole work block with no form.
  screens: [
    { anchor: 'welcome', stage: 'Welcome', next: 'Start' },
    { anchor: 'three-doors', stage: 'The Pattern', next: 'Show Me the Buckets' },
    { anchor: 'run-draft-own', stage: 'Run, Draft, Own', next: 'Map My Team' },
    { anchor: 'audit', stage: 'Your Task Map', count: '1 of 3', next: 'I Have My Answer' },
    { anchor: 'read-your-map', stage: 'Your Task Map', count: '2 of 3', next: 'Get My Build Steps' },
    { anchor: 'build-steps', stage: 'Your Task Map', count: '3 of 3', next: 'Get the Full Kit' },
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
      // "Whether that be a contract to close coordinator or whatever is important in your world" (D-047).
      { name: 'Your first AI employee.', detail: ' Step-by-step build instructions for the one your map picks.' },
      { name: 'A 30-day plan.', detail: ' And an answer on day 30: was it the person or the system?' },
    ],
    // Segment 1's promise, for a page.
    // Said up front, so nobody meets a sign-up page on screen four unwarned (D-048).
    plain:
      "You'll need a free ChatGPT or Claude account and about 15 minutes. If you can send a text, you can do this.",
    // A real link, so it works without JavaScript too.
    skip: { label: 'In the session? Skip to your task map', href: '#audit' },
  },

  doors: {
    heading: 'The seat outgrew the person',
    intro:
      "Your first ops hire was probably an assistant. The team grew, and nobody redesigned the job. Now that seat is buried in contract-to-close, onboarding, and CRM cleanup, and you're standing at three doors.",
    doors: [
      {
        title: 'Door A: Hire again',
        body: 'Another salary, months of training, and two people sharing a job built for one.',
      },
      {
        title: 'Door B: The hard conversation',
        body: 'You risk losing the person who knows where everything lives, over a job nobody redesigned.',
      },
      { title: 'Door C: Retool the seat', body: 'Keep the person and rebuild the work around them.' },
    ],
    question:
      "Is it the person or the system? Most owners guess. By the end of this kit you'll have a way to stop guessing.",
  },

  sort: {
    heading: 'Run, Draft, Own',
    // "AI 101 in one line."
    intro:
      'AI is like a smart new hire on day one. It does exactly what you teach it, and it guesses at everything else. So every task goes in one of three buckets.',
    buckets: [
      {
        title: 'Run',
        body: 'AI does it. You spot-check.',
        examples: 'Deadline reminders, under-contract checklists, CRM tagging, weekly pipeline reports.',
      },
      {
        title: 'Draft',
        body: 'AI writes it. You read it, then send.',
        examples: 'Client status updates, onboarding emails, listing descriptions, MLS input.',
      },
      {
        title: 'Own',
        body: 'You do it.',
        examples: 'Negotiations, agent coaching, hard conversations, compliance sign-off.',
      },
    ],
    // Kit B's own rules (D-046), so the page and the prompt sort alike. Told as the rule AI follows,
    // not set as a quiz: the visitor never sorts a task, the prompt does (D-048).
    questionsHeading: "You don't sort anything. AI does it on the next screen, with this rule:",
    questions: [
      ['Money, wire instructions, or a decision about a person? ', { strong: 'Own.' }],
      ['Anything sent to a client, an agent, a lender, or title, or any contract date? ', { strong: 'Draft.' }],
      ['Everything else? ', { strong: 'Run.' }, ' Not sure? It picks the safer bucket.'],
    ] as Inline[][],
    never:
      'Three things always stay with a person: wire instructions, permission to send automated texts, and fair housing checks on listing wording.',
  },

  audit: {
    heading: "Map your ops leader's week",
    intro: 'Fill in six quick boxes. Guesses are fine. AI fills in the rest.',
    fields: [
      { name: 'agents', label: 'Agents on your team', placeholder: '25' },
      { name: 'closings', label: 'Closings a month, about', placeholder: '30' },
      { name: 'crm', label: 'Your CRM', placeholder: 'Follow Up Boss' },
      // The hints are how Connor coached each question live (D-047).
      {
        name: 'opsTeam',
        label: "Who's in ops",
        hint: 'Job titles are enough.',
        placeholder: 'one ops leader, a part-time TC',
      },
      {
        name: 'weekEaters',
        label: 'What eats their week',
        hint: 'Rough guesses are fine. Percentages help.',
        placeholder: 'agent questions 25%, onboarding 20%, contract-to-close',
        rows: 3,
      },
      {
        name: 'breaksFirst',
        label: 'If they quit tomorrow, the first thing that breaks',
        hint: 'The thing that would hurt most. In the session? Use what you typed in the chat at the start.',
        placeholder: 'contract-to-close',
      },
    ] satisfies FillField[],
    // What the buttons do, said before them (D-048).
    pick: 'Then tap one button. It copies your answers and opens the app. Use the one you already have.',
    open: OPEN_CHAT,
    thenHeading: 'Then, in the app:',
    // One action a step, each the tap itself (D-048). The last brings them back here, where the build
    // steps start from its answer (D-047).
    then: [
      ['Sign in if it asks. A free account works.'],
      ['Press and hold the message box, then tap ', { strong: 'Paste' }, '.'],
      ['Tap ', { strong: 'Send' }, '. The answer takes about a minute.'],
      ['Come back to this page. Leave that chat open.'],
    ] as Inline[][],
    showPrompt: 'See the full prompt',
  },

  read: {
    // Every fix is words to type into the same chat, so none needs a skill the page never taught
    // (D-048): strike a guess, overrule a bucket, price the hours (the AI does the math), find its pick.
    heading: 'Check its answer',
    intro: 'AI made some guesses. Fix them by typing into that same chat. It takes two minutes.',
    steps: [
      [
        { strong: "Remove what's wrong." },
        ' Tasks marked (added) are its guesses. If one isn\'t something your team does, type: "Remove [task]. We don\'t do that."',
      ],
      [
        { strong: "Move what you'd want to read first." },
        ' If it has AI sending something to a client or an agent on its own, type: "Move [task] to Draft."',
      ],
      [
        { strong: "See what it's worth." },
        ' Optional. Type: "My ops leader costs about $35 an hour. What are the Run and Draft hours worth in a year?" Use their real number.',
      ],
      // "Take stock of what this recommendation was" (D-047). The build steps on the next screen start from it.
      [{ strong: 'Find its pick.' }, ' Near the end, it names the first AI employee to build. That comes next.'],
    ] as Inline[][],
    session:
      'In the session? Near the end, find the percent of the week AI can help with. Type it in the session chat.',
  },

  /**
   * The build steps (D-047), the step Connor added live: "copy and paste your entire output into the
   * tool", and it asks for "a simple step-by-step instruction list" for the AI employee the map picked,
   * "so that a 10th grader could follow this". Open, like the audit it follows.
   */
  build: {
    heading: 'Get your build steps',
    intro: 'Now turn that answer into simple, step-by-step instructions for building your first AI employee.',
    // Asking for the whole map again gathers the fixes typed on the screen before into one answer
    // to copy (D-048).
    getHeading: 'First, get the answer:',
    get: [
      ['Go back to that chat and type: "Show me the whole map again, with my fixes."'],
      ['Under its answer, tap the copy button (two little squares).'],
      ['Come back here. Press and hold the box below, then tap ', { strong: 'Paste' }, '.'],
    ] as Inline[][],
    fields: [
      {
        name: 'taskMap',
        label: 'The whole answer from your chat',
        placeholder: 'Paste the whole answer here',
        rows: 5,
      },
    ] satisfies FillField[],
    pick: 'Then tap one button. It copies everything and opens a new chat.',
    open: OPEN_CHAT,
    thenHeading: 'Then, in the new chat:',
    then: [
      ['Press and hold the message box, then tap ', { strong: 'Paste' }, '.'],
      ['Tap ', { strong: 'Send' }, '.'],
      ['Follow its steps one at a time. Stuck? Tell it which step, in that same chat.'],
    ] as Inline[][],
    showPrompt: 'See the full prompt',
    // The way on, to the gate: the ready-made one, for the teams whose map picked contract-to-close.
    kit: 'Want one already written? The full kit has a Contract-to-Close Coordinator ready to paste in.',
  },

  /** The opt-in, its own screen part way down. Every screen after it opens once the visitor signs up. */
  gate: {
    logoAlt: 'Amplified Impact',
    eyebrow: 'Free · The Full Kit',
    heading: 'Get the full kit',
    // Your own build steps are open on the screen before (D-047); the kit's AI employee is the ready-made one.
    body: 'A Contract-to-Close Coordinator ready to paste in, the script for the talk with your ops leader, and the 30-day plan. Tell us where to send updates, and the rest is yours.',
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
    fieldsLead: 'This part is easiest on a laptop. Fill in two boxes, then pick your app.',
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
        toast: 'Copied. Make the Project, then paste into its instructions.',
      } satisfies CopyOpen,
      // As /ai101's Save step has it (D-037): name it, skip the description, then Instructions. The
      // button names are Claude's help center's ("Set project instructions", "Save instructions",
      // checked 2026-10-22, D-048).
      steps: [
        [
          'Click ',
          { strong: 'New project' },
          ', top right. Name it ',
          { strong: 'Contract-to-Close Coordinator' },
          '.',
        ],
        ['Leave the description blank. Click ', { strong: 'Create project' }, '.'],
        [
          'On the right, click ',
          { strong: 'Set project instructions' },
          '. Paste, then click ',
          { strong: 'Save instructions' },
          '.',
        ],
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
        ['Click the ', { strong: '•••' }, ' menu at the top, then ', { strong: 'Project settings' }, '.'],
        ['Click in the ', { strong: 'Instructions' }, ' box and paste.'],
      ] as Inline[][],
    },
    showPrompt: 'See the full job description',
    // The three lines the talk reads aloud, said as what they do (D-048).
    keyLines:
      'What keeps it safe: it shows where in the contract each date came from, it never guesses, and it ends with a list for you to check before anything goes out.',
  },

  firstFile: {
    heading: 'Train it, then give it a contract',
    binder: {
      heading: 'The training binder',
      // One file each: free ChatGPT Projects hold five (D-046).
      intro: "Upload these to the Project, one file each. It's the binder you'd hand a new TC on day one.",
      // Where each app takes files, per its help center, checked 2026-10-22: Claude's "+" in the
      // knowledge panel on the right; ChatGPT's Sources tab, where project files moved in Feb 2026 (D-048).
      how: [
        ['In Claude: on the Project page, click the ', { strong: '+' }, ' on the right side and upload each one.'],
        ["In ChatGPT: open the Project's ", { strong: 'Sources' }, ' tab and upload each one.'],
      ] as Inline[][],
      items: [
        'Your contract-to-close checklist',
        'Four email templates: under contract, inspection scheduled, clear to close, closing week',
        'Three real emails your ops leader sent that you love, for tone',
        'Preferred lender and title contacts, with no client data',
      ],
    },
    assignment: {
      heading: 'The first assignment',
      body: 'Start a new chat inside the Project. Attach a signed purchase agreement with the + button, and send it. You get back every key date, the file checklist, and draft emails to the client, the lender, title, and the other agent.',
    },
    manager: {
      heading: 'The manager',
      body: "Check one date against the contract yourself. If it got something wrong, add a line to its instructions that fixes it. You don't fire a new TC for one mistake. You coach them.",
    },
    // "Check your data settings", made the exact switch in each app (their help centers, checked
    // 2026-10-22, D-048).
    guardrails: [
      "Practice on a made-up contract first. Keep wire instructions out of every file. Before you upload a real client's contract, stop the app from learning from your chats. ChatGPT: Settings, then Data controls, then turn off ",
      { strong: 'Improve the model for everyone' },
      '. Claude: Settings, then Privacy, then turn off ',
      { strong: 'Help improve Claude' },
      '.',
    ] as Inline[],
    // The seam: said plainly, as the talk says it, without the pitch.
    crm: "This version doesn't connect to your CRM. You upload each contract yourself. Connecting it to your CRM is a bigger build, different for every CRM.",
    next: {
      heading: 'The next seats',
      items: [
        'An Agent Onboarding Guide',
        'A Listing Launch Coordinator (a person still does the fair housing check)',
        'A Lead Follow-Up Coordinator (a person still handles texting permission)',
        'A weekly meeting prep assistant',
      ],
    },
  },

  conversation: {
    heading: 'Bring your ops leader in',
    intro:
      "The tech is the easy part. This only works if your ops leader feels it's done with them, not to them. Four moves, in this order:",
    moves: [
      'Name the seat, not the person: "We grew and your seat didn\'t. That\'s on me."',
      'Make them the manager of the AI, not its replacement. They train it and check its work.',
      'Agree where their saved hours go before you build anything.',
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
      "AI can give them time back. It can't make someone care about the job. If it still isn't working on day 30, you'll know it's the person, and you'll have proof.",
  },

  plan: {
    heading: 'Your 30-day retool plan',
    intro: "One AI employee, four weeks. On day 30 you'll know: was it the person or the system?",
    measureLabel: 'Track',
    // Kit D, a week to a card, in plain words (D-048). Week 1's "(Kit E)" is "(the script)": the page has
    // no kit letters. Week 3 is "Use", not the talk's "Run", which on this page is a bucket.
    weeks: [
      {
        week: 'Week 1',
        focus: 'Map',
        doThis:
          "Talk to your ops leader first (the script). Show them today's answer and have them fix the hours. Agree on the first AI employee to build.",
        measure: 'How long one new file takes today',
      },
      {
        week: 'Week 2',
        focus: 'Build',
        doThis:
          'Build it, using the steps you got. Test it on three old, closed files with client names blacked out. Fix its instructions wherever it got something wrong.',
        measure: 'The mistakes it made',
      },
      {
        week: 'Week 3',
        focus: 'Use',
        doThis:
          'Use it on every new file, next to your usual way. Write down how long each file takes and every fix. Update its instructions every Friday.',
        measure: 'Time per file, compared with Week 1',
      },
      {
        week: 'Week 4',
        focus: 'Decide',
        doThis:
          'Compare with Week 1. Decide, in writing, where the saved hours go. Pick the next AI employee to build.',
        measure: "Hours saved each week, and your ops leader's workload, 1 to 10, before and after",
      },
    ],
    dayThirty:
      "On day 30: if the job works now, it was the system. If it still doesn't, you have proof for a fair talk about the person.",
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
  buildPrompt: { id: 'retool_build', label: 'The build steps prompt', text: BUILD_PROMPT } satisfies Prompt,
  coordinatorPrompt: {
    id: 'retool_coordinator',
    label: 'The Contract-to-Close Coordinator job description',
    text: COORDINATOR_PROMPT,
    // The prompt's own words: what the Coordinator writes where it doesn't know something.
    literal: ['[brackets]'],
  } satisfies Prompt,
  scriptPrompt: { id: 'retool_script', label: 'The Retool Conversation script', text: SCRIPT } satisfies Prompt,
} as const;
