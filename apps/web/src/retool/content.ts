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
// audit, checking its answer and its build steps (D-047) is open, so the room can do the work block
// mid-call; the Contract-to-Close Coordinator (Kit C), the 30-day plan (Kit D) and the Retool
// Conversation script (Kit E) sit after the gate. Kit A (the note to Sarah), the run of show and the
// Q&A prep are the speaker's, not the room's, and are not on the page.
//
// The prompts (Kits B, C and E) are Connor's word for word, but for one blank: Kit B's second
// "[number]" is "[how many]", because a placeholder is filled by its exact text (`UI.slots` in
// `../ai101/content.ts`), and two "[number]"s could only ever hold the same value. The other words are
// the talk's, cut to what reads on a phone, and the page's own where a comment says so. The build
// steps prompt is newer: Connor's ask from the live session, with five lines from this kit under it
// (`BUILD_PROMPT` has which, D-047, D-049).
//
// THE WORDS (D-048, D-049) are for team owners new to AI, on a phone, during a call. Every step is one
// action that says what to tap or type and where. Nothing leans on a pronoun the reader must resolve:
// "the AI", "the AI's response", "that same chat", not "it" and "its". A term is said in full the
// first time (task map, AI employee, Project). House rules, as on /ai101: no em dashes.

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
 * The build steps (D-047), asked in the SAME chat as the map (D-049), so the map and every fix typed
 * under it are already there: nothing to copy out of the chat and paste back. The first paragraph is
 * the page's own: which AI employee, the one the map recommends or the one the visitor asked for
 * instead. The second is the ask Connor typed live after his own map came back, his words as he said
 * them, made into sentences. The lines under it are the page's own (D-047, D-048, D-049): a Project,
 * not a custom GPT, and say so before a paid step; the four parts a new hire gets, the ops leader as
 * manager (the Coordinator screen); the map's buckets (Kit B's rules); say so before anything needs a
 * connection the visitor cannot make, and give a version that works without it; the switch that stops
 * training, before any real client data; practice first with no wires (the guardrails); parts that can
 * be stopped and picked up; and plain words, with where to look when a button's name has changed.
 */
const BUILD_PROMPT = `Now help me build the first AI employee from the task map above. Use the one you recommended, or the one I said I'd rather build.

I have no clue how to get started on building this. Give me a simple step-by-step instruction list, as comprehensive as possible, that I can follow to get this built. Make it so that a 10th grader could follow this on their own.

- Build it as a Project in this app, with no code, not a custom GPT. Explain what a Project is in one sentence. If a step needs a paid plan, tell me before that step.
- Give it what a new hire gets: a job description, a training binder, a first assignment, and a manager. The manager will be my ops leader. Write the job description out in full so I can paste it in.
- Keep my map's buckets. A human approves anything marked DRAFT before it goes out. Anything marked OWN stays with a person.
- If this AI employee would need to connect to my CRM, email, or texts, tell me first. Then give me a version that works when I paste in or upload what it needs.
- Before I use any real client information, show me how to turn off the setting that lets this app learn from my chats.
- Have me practice on a made-up example first, and keep wire instructions out of every file.
- Start with a list of what to gather. Split the steps into short parts with a heading for each, so I can stop after any part and pick up later.
- Use plain words with no tech terms. One action per step, and tell me exactly what to tap, click, or type. If you're not sure what a button is called today, tell me where on the screen to look.`;

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

/**
 * Kit E, the Retool Conversation script. Words the owner says, so it is copied, not opened in an app.
 * Connor's word for word but for one clause: "Before we build anything" is "Before we use it on real
 * work", because the owner has already built the AI employee by now (Connor, 2026-10-22, D-049).
 */
const SCRIPT = `[Name], I want to talk about your seat, not your performance. When you stepped into this role, we had [X] agents and [Y] closings a month. We've grown, and your seat didn't grow with us. That's on me.

I don't want to hire around you, and I don't want to lose you. I want to take the repeatable work that's burying you and hand it to an AI assistant that you manage. You'd train it and check its work, the same way you'd train a new TC.

Before we use it on real work, let's agree where your time goes once you get it back. My vote is [agent accountability / client experience / owning the scorecard]. What's yours?

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

/**
 * How to paste, said once, in full, the first time the page asks for it (D-049). A phone and a
 * computer paste differently, and the room is on both: Zoom on a laptop, the AI on either.
 */
const PASTE: Inline[] = [
  'Paste into the message box at the bottom of the screen, where you type. On a phone: press and hold the box, then tap ',
  { strong: 'Paste' },
  '. On a computer: click the box, then press ',
  { strong: 'Ctrl+V' },
  ' (',
  { strong: 'Cmd+V' },
  ' on a Mac).',
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
  // The map runs straight into building the AI employee it picked (D-047), as Connor walked it live:
  // make the map, fix it and pick the AI employee, then ask that same chat how to build it, and build
  // it (D-049: Connor chose "build right away" over building in Week 2). All three are open, before the
  // gate, so the room does the whole work block with no form. After the gate: the ready-made
  // Coordinator first, for a map that picked contract-to-close (whose owner skipped the build steps),
  // with a link past it for everyone else; then the talk with the ops leader, about an AI employee
  // that already exists; then the plan.
  screens: [
    { anchor: 'welcome', stage: 'Welcome', next: 'Start' },
    { anchor: 'three-doors', stage: 'The Problem', next: 'Show Me the Buckets' },
    { anchor: 'run-draft-own', stage: 'Run, Draft, Own', next: 'Map My Team' },
    { anchor: 'audit', stage: 'Your Task Map', count: '1 of 2', next: 'I Have My Map' },
    { anchor: 'read-your-map', stage: 'Your Task Map', count: '2 of 2', next: 'Next: Build It' },
    { anchor: 'build-steps', stage: 'Your AI Employee', next: 'Get the Full Kit' },
    // The gate. Its Next shows only once this device has signed up; the form's button is the way on.
    { anchor: 'kit', stage: 'The Full Kit', next: 'Continue' },
    { anchor: 'coordinator', stage: 'Optional: A Ready-Made One', count: '1 of 2', next: 'Next: The Binder' },
    { anchor: 'first-file', stage: 'Optional: A Ready-Made One', count: '2 of 2', next: 'Next: The Talk' },
    { anchor: 'retool-conversation', stage: 'Talk With Your Ops Leader', next: 'Make the Plan' },
    { anchor: 'thirty-day-plan', stage: 'Your 30-Day Plan', next: 'Last Step' },
    // The last screen: no Next, so the footer shows Start Over.
    { anchor: 'two-ways', stage: "What's Next" },
  ] satisfies Screen[],

  nav: AI101.nav,

  welcome: {
    logoAlt: 'Amplified Impact',
    eyebrow: 'Free Kit · AI 101 for Team Owners',
    title: "Retool, Don't Replace",
    // The talk's one message, said without the "seat" (D-049).
    intro:
      "Your ops leader's job was built for a smaller team. Instead of replacing the person, rebuild the job, with AI taking some of the work.",
    buildsLead: "When you're done, you'll have:",
    builds: [
      {
        name: "A task map of your ops leader's week.",
        detail: ' A list of which tasks AI can do, which AI can draft for you to check, and which stay with a person.',
      },
      // "Whether that be a contract to close coordinator or whatever is important in your world" (D-047).
      {
        name: 'Your first AI employee.',
        detail:
          " An AI employee is ChatGPT or Claude, set up with written instructions to do one job on your team, like drafting your under-contract emails. You'll get step-by-step instructions to build one.",
      },
      {
        name: 'A 30-day plan.',
        detail: " In a month, you'll have real numbers on whether the problem is the person or the job.",
      },
    ],
    // Said up front, so nobody meets a sign-up page or a long build unwarned (D-048, D-049).
    plain:
      "Getting your task map and build steps takes about 15 minutes. Building your AI employee takes longer, and it's easiest on a computer. You'll need a free ChatGPT or Claude account, and you can make one along the way. If you can send a text, you can do this.",
    // A real link, so it works without JavaScript too.
    skip: { label: 'On a live call? Skip ahead to make your task map', href: '#audit' },
  },

  // The talk's "three doors", as three options (D-049). The letters stay, so A, B or C in the chat
  // still matches the slide.
  doors: {
    heading: 'The job outgrew the person',
    intro:
      'Your first ops hire was probably an assistant. Then the team grew, but nobody redesigned the job. Now your ops leader is buried in contract-to-close, onboarding, and CRM cleanup. You have three options:',
    doors: [
      {
        title: 'Option A: Hire a second person',
        body: 'Another salary, months of training, and two people sharing a job that was built for one.',
      },
      {
        title: 'Option B: Have the hard conversation',
        body: 'A performance talk, or letting your ops leader go. You could lose the person who knows where everything is, because of a job nobody redesigned.',
      },
      {
        title: 'Option C: Retool the job',
        body: "Keep the person, and change the job so AI takes some of the work. That's what retool means.",
      },
    ],
    question: 'So is the problem the person or the job? Most owners guess. This kit gives you a way to find out.',
  },

  sort: {
    heading: 'Run, Draft, Own',
    // "AI 101 in one line."
    intro:
      'AI is like a smart new hire on their first day. It does exactly what you teach it, and it guesses at everything else. So every task goes into one of three groups, called buckets:',
    buckets: [
      {
        title: 'Run',
        body: 'AI does the task. You check the work now and then.',
        // Not the talk's "deadline reminders": a contract date is Draft by the page's own rule (D-049).
        examples: 'Under-contract checklists, CRM tagging, weekly pipeline reports, meeting agendas.',
      },
      {
        title: 'Draft',
        body: 'AI writes it. You read it, then you send it.',
        examples: 'Client status updates, onboarding emails, listing descriptions, MLS input.',
      },
      {
        title: 'Own',
        body: 'A person does it, not AI.',
        examples: 'Negotiations, agent coaching, hard conversations, compliance sign-off.',
      },
    ],
    // Kit B's own rules (D-046), so the page and the prompt sort alike. Told as the rule AI follows,
    // not set as a quiz: the visitor never sorts a task, the prompt does (D-048).
    questionsHeading:
      "You won't sort anything yourself. In a few minutes, ChatGPT or Claude will sort every task using these rules:",
    questions: [
      ['Money, wire instructions, or a decision about a person, like hiring or pay? ', { strong: 'Own.' }],
      [
        'Anything sent to a client, an agent, a lender, or title, or anything that sets or changes a contract date? ',
        { strong: 'Draft.' },
      ],
      [
        'Everything else? ',
        { strong: 'Run.' },
        " When the AI isn't sure, the AI picks the bucket where a person checks more.",
      ],
    ] as Inline[][],
    never:
      "Three things always stay with a person: wire instructions, getting a lead's OK before you send them automatic texts, and checking listing wording for fair housing.",
  },

  audit: {
    heading: "Map your ops leader's week",
    intro:
      "Type an answer in each box below. Rough guesses are fine. The gray words in each box are only examples. ChatGPT or Claude will use your answers to make a task map. A task map is a table of your ops leader's weekly tasks, the hours each task takes, and the bucket (Run, Draft, or Own) each task goes in.",
    // The labels are questions, each answered in the box under it (D-049). The hints are how Connor
    // coached each question live (D-047).
    fields: [
      { name: 'agents', label: 'How many agents are on your team?', placeholder: '25' },
      { name: 'closings', label: 'About how many closings do you have a month?', placeholder: '30' },
      { name: 'crm', label: 'Which CRM do you use?', placeholder: 'Follow Up Boss' },
      {
        name: 'opsTeam',
        label: 'Who works in ops?',
        hint: 'Job titles are enough.',
        placeholder: 'one ops leader, a part-time TC',
      },
      {
        name: 'weekEaters',
        label: "What takes up most of your ops leader's week?",
        hint: 'Add a rough percent to each if you can, like the example.',
        placeholder: 'agent questions 25%, onboarding 20%, contract-to-close',
        rows: 3,
      },
      {
        name: 'breaksFirst',
        label: 'If your ops leader quit tomorrow, what would break first?',
        hint: 'Pick the thing that would hurt the most. On a live call? If you answered this in the Zoom chat at the start of the call, type the same answer here.',
        placeholder: 'contract-to-close',
      },
    ] satisfies FillField[],
    // What the buttons do, and to read the steps first, said before them: a button takes the visitor
    // away from this page (D-048, D-049).
    pick: 'Read the four steps under the buttons first, because the button takes you away from this page. Then tap Copy & Open ChatGPT or Copy & Open Claude. The button copies your answers and opens that app. Use the one you have an account with. No account yet? Either one is free.',
    open: OPEN_CHAT,
    thenHeading: 'Then, in ChatGPT or Claude:',
    // One action a step (D-048). The last brings them back here; the next two screens use that same
    // chat (D-049). ChatGPT lets a visitor chat signed out and does not keep that chat (OpenAI's help
    // center, checked 2026-10-22), so step 1 is to sign in either way.
    then: [
      [
        { strong: "Sign in, or sign up if you're new." },
        " A free account works. Sign in even if ChatGPT lets you skip it, because ChatGPT only saves chats when you're signed in, and you'll need this chat again.",
      ],
      PASTE,
      [
        { strong: 'Tap the send arrow next to the message box.' },
        ' The AI takes about a minute to answer. Wait until the AI stops writing.',
      ],
      [
        { strong: 'Come back to this page.' },
        " On a phone, switch back to Safari or Chrome. If this page isn't showing, tap the tabs button and pick this page. On a computer, click this page's tab at the top of the window. Keep the ChatGPT or Claude chat open, because you'll type in that same chat on the next two screens.",
      ],
    ] as Inline[][],
    showPrompt: 'Optional: see exactly what the button copies',
  },

  // Every fix is words typed into the same chat, so none needs a skill the page never taught (D-048).
  // Only the fixes the build uses (D-049): the map's guesses, the Draft bucket (the build keeps the
  // map's buckets), and the AI employee to build, asked after the fixes so the answer counts them. The
  // talk's "multiply those hours by what your ops leader costs" builds nothing, so it is not here.
  read: {
    heading: "Check the AI's response",
    intro:
      "The AI's response is a first try, so some of it will be wrong. Go back to the ChatGPT or Claude chat, and type each fix below into that same chat. Where you see [brackets], type your own words instead, with no brackets. For example: \"Remove agent birthday cards. We don't do that.\" Tap the send arrow after each fix. Skip any fix you don't need. The fixes take about two minutes.",
    steps: [
      // The first is Connor's own wording, word for word (2026-10-22).
      [
        { strong: "Remove what doesn't apply to your ops team." },
        ' Tasks marked (added) in the response are guesses the AI made about your team. If one isn\'t something your team does, type: "Remove [task]. We don\'t do that."',
      ],
      [
        { strong: 'Make sure you read every message before it goes out.' },
        ' In the AI\'s table, look at the Bucket column. Any task that sends an email or text to a client, an agent, a lender, or title should say Draft. If one says Run instead, type: "Move [task] to Draft."',
      ],
      // "Take stock of what this recommendation was" (D-047), asked after the fixes, which can change it.
      [
        { strong: 'Ask the AI which AI employee to build first.' },
        ' Type: "With my fixes, which AI employee should I build first?" The AI\'s answer names one job, like a Contract-to-Close Coordinator. That job is your first AI employee. Want a different one? Type: "I\'d rather build [your choice] first."',
      ],
    ] as Inline[][],
    session:
      "On a live call? Right under the table in the AI's response, find the percent for Run and Draft together. Type that percent in the Zoom chat.",
  },

  /**
   * The build (D-047), asked in the same chat (D-049): one copy, one paste, then follow the steps now.
   * The talk's "a simple step-by-step instruction list" for the AI employee the map picked, "so that a
   * 10th grader could follow this". Open, like the audit it follows.
   */
  build: {
    heading: 'Build your AI employee',
    // First, so an owner whose map picked contract-to-close skips to the ready-made one instead of
    // building a second version of it.
    skip: 'Did the AI pick contract-to-close? Skip this screen. The full kit, next, has a Contract-to-Close Coordinator that is already written for you. Tap Get the Full Kit at the bottom of this screen.',
    intro:
      "Ask the AI how to build your AI employee. Building an AI employee means setting up a Project in ChatGPT or Claude. A Project is a folder in the app that keeps an AI employee's instructions and files together. Ask in the same chat as your task map, because that chat already has your map and your fixes.",
    copyLead:
      "Tap Copy the Request. The button copies a message asking the AI for build steps. The button doesn't open ChatGPT or Claude.",
    copy: { label: 'Copy the Request', toast: 'Copied. Paste it into the chat with your task map.' },
    thenHeading: 'Then:',
    then: [
      [
        { strong: 'Go back to the ChatGPT or Claude chat with your task map.' },
        ' On a phone, switch to that app or tab. On a computer, click that tab at the top of the window.',
      ],
      [{ strong: 'Paste the request into the message box,' }, ' the same way as before.'],
      [{ strong: 'Tap the send arrow.' }],
      [
        { strong: "Follow the AI's steps, one at a time." },
        ' A computer is easiest for this part. Need to stop? The steps stay saved in that same chat. Stuck on a step? In that same chat, type: "I\'m stuck on step [number]."',
      ],
    ] as Inline[][],
    lost: [
      { strong: 'Closed the chat?' },
      ' Open ChatGPT or Claude. On a phone, tap the menu button in the top left corner first. Then tap the chat with your task map in your list of past chats.',
    ] as Inline[],
    // The rule that guards real client files, for every owner building their own: they never see the
    // Coordinator screens, where the exact switches are (D-049). The request asks the AI to show it too.
    safety:
      "Before you put any real client information into ChatGPT or Claude, turn off the setting that lets the app learn from your chats. The AI's steps will show you how.",
    showPrompt: 'Optional: see exactly what the button copies',
  },

  /** The opt-in, its own screen part way down. Every screen after it opens once the visitor signs up. */
  gate: {
    logoAlt: 'Amplified Impact',
    eyebrow: 'Free · The Full Kit',
    heading: 'Get the full kit',
    // Your own build steps are open on the screen before (D-047); the kit's AI employee is the ready-made one.
    body: 'Sign up to get the rest of the free kit: a ready-made Contract-to-Close Coordinator, a script for talking with your ops leader, and a 30-day plan. Type your first name and email, pick your team size, then tap Get the Kit.',
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
    success: "You're in. The rest of the kit is open.",
    /** The id the no-JavaScript 303 lands on: the steps, which the CSS then shows with `:target`. */
    unlockedAnchor: 'unlocked',
  },

  // The ready-made one (D-049): for the owner whose map picked contract-to-close, who skipped the build
  // screen. Said so up front, with a link past both of its screens for everyone who built their own.
  coordinator: {
    heading: 'The Contract-to-Close Coordinator',
    intro:
      "Optional: use this AI employee if the AI picked contract-to-close. The Coordinator's instructions are already written, so you can use them instead of the AI's build steps.",
    skip: {
      label: 'Built a different AI employee? Skip to the talk with your ops leader',
      href: '#retool-conversation',
    },
    partsLead: "The Coordinator gets the same four things you'd give a new transaction coordinator (TC):",
    parts: [
      { name: 'A job description.', detail: ' The instructions below.' },
      { name: 'A training binder.', detail: ' Your checklist and email templates.' },
      { name: 'A first assignment.', detail: ' A signed purchase agreement.' },
      { name: 'A manager.', detail: " Your ops leader, checking the Coordinator's work." },
    ],
    fieldsLead:
      "Do this part on a computer. Setting up a Project is hard on a phone. A Project is a folder in ChatGPT or Claude that keeps an AI employee's instructions and files together. Type your team's name and your city and state in the two boxes below, then tap the app you use.",
    fields: [
      { name: 'teamName', label: "Your team's name", placeholder: 'The Rivera Group' },
      { name: 'cityState', label: 'City and state', placeholder: 'Austin, TX' },
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
      // checked 2026-10-22, D-048). The name box has no "Name" label, so "the first box" (D-049).
      steps: [
        ['Click ', { strong: 'New project' }, ' in the top right.'],
        [
          'In the first box, type ',
          { strong: 'Contract-to-Close Coordinator' },
          '. Leave the second box blank, and click ',
          { strong: 'Create project' },
          '.',
        ],
        ['On the right side, click ', { strong: 'Set project instructions' }, '.'],
        ['Paste the instructions, then click ', { strong: 'Save instructions' }, '.'],
      ] as Inline[][],
    },
    // A ChatGPT Project, not the talk's "custom GPT": OpenAI retires custom GPTs on Dec 11, 2026, and
    // personal plans can no longer make one; Projects have instructions and files on every plan,
    // free included (OpenAI's help center, checked 2026-10-22, D-046). There is no address that
    // starts one, so the button opens ChatGPT and the steps start from its sidebar. Naming one ends
    // with Create project, and the instructions with Save (checked 2026-10-22, D-049).
    chatgpt: {
      tab: 'ChatGPT',
      open: {
        label: 'Copy & Open ChatGPT',
        app: 'ChatGPT',
        href: 'https://chatgpt.com/',
        toast: 'Copied. Make the Project, then paste into its instructions.',
      } satisfies CopyOpen,
      steps: [
        ['On the left side of ChatGPT, click ', { strong: 'New project' }, '.'],
        [
          'Type ',
          { strong: 'Contract-to-Close Coordinator' },
          ' as the name, then click ',
          { strong: 'Create project' },
          '.',
        ],
        [
          'Click the three dots (',
          { strong: '•••' },
          ') at the top right of the Project page, then click ',
          { strong: 'Project settings' },
          '.',
        ],
        [
          'Click in the ',
          { strong: 'Instructions' },
          ' box, paste the instructions, then click ',
          { strong: 'Save' },
          '.',
        ],
      ] as Inline[][],
    },
    showPrompt: 'Optional: see the full instructions',
    // The three lines the talk reads aloud, said as what they do (D-048), and what they do not do (D-049).
    keyLines:
      'Why the Coordinator is safer: its instructions tell the AI to show which part of the contract each date came from, to flag anything unclear instead of guessing, and to end with a list for you to check. The AI can still get a date wrong, so a person still checks every date.',
  },

  firstFile: {
    heading: 'Give the Coordinator its files and a first contract',
    // First on the screen, before anything is uploaded (D-049). The paths are each help center's,
    // checked 2026-10-22: ChatGPT's account menu, Data controls, and Done; Claude's Privacy, whose
    // switch has been "Help improve Claude" and is now "Help Improve our AI models", so the copy names
    // only its first words. A thumbs up or down can send a chat for training even after opting out
    // (OpenAI's Data controls FAQ).
    guardrails: [
      { strong: 'Before you upload anything, turn off the setting that lets the app learn from your chats.' },
      ' In ChatGPT: click your name in the bottom left corner, then Settings, then Data controls. Turn off ',
      { strong: 'Improve the model for everyone' },
      ', then click Done. In Claude: click your name in the bottom left corner, then Settings, then Privacy. Turn off the switch that starts with ',
      { strong: 'Help improve' },
      ". Practice on a made-up contract first: a blank purchase agreement from your state, filled in with fake names. Keep wire instructions out of every file. In chats with real client files, don't tap thumbs up or thumbs down.",
    ] as Inline[],
    binder: {
      heading: 'The training binder',
      // Four files: free ChatGPT Projects hold five (D-046, D-049).
      intro:
        "Upload four files to the Project, one for each item below. Put all four email templates in one document, and all three emails in another. Free ChatGPT allows only 5 files in a Project. To turn emails into a file, paste them into a Word or Google document and save it. Together, the four files are the binder you'd hand a new TC on day one.",
      // Where each app takes files, per its help center, checked 2026-10-22: Claude's "+" in the
      // knowledge panel on the right; ChatGPT's Sources tab, where project files moved in Feb 2026 (D-048).
      how: [
        [
          'In Claude: on the Project page, click the ',
          { strong: '+' },
          ' on the right side. Upload one file at a time.',
        ],
        ['In ChatGPT: open the Project, and click the ', { strong: 'Sources' }, ' tab. Add one file at a time.'],
      ] as Inline[][],
      items: [
        'Your contract-to-close checklist',
        'Four email templates: under contract, inspection scheduled, clear to close, and closing week',
        "Three emails your ops leader sent that you both love, with client names taken out, so the AI learns your team's tone",
        'Your preferred lender and title contacts, with no client information',
      ],
    },
    assignment: {
      heading: 'The first assignment',
      body: 'Start a new chat inside the Project. Click the + button next to the message box, and pick your made-up contract. Type "Here\'s a new contract." and tap the send arrow. The AI replies in the chat with the key dates it found, a checklist for the file, and draft emails for you to check. The AI doesn\'t send anything. When the AI gets the made-up contract right, try a real one.',
    },
    manager: {
      heading: 'The manager: your ops leader',
      body: "Your ops leader checks every date against the contract before the date goes on a calendar. If the AI got something wrong, open the Project's instructions, the same place you pasted them. Add one sentence at the end that tells the AI what to do instead. For example: \"Count inspection days as business days.\" You wouldn't fire a new TC for one mistake. You'd coach them.",
    },
    // The seam: said plainly, as the talk says it, without the pitch.
    crm: "This AI employee doesn't connect to your CRM, so you upload each contract yourself. Connecting the AI employee to your CRM is a bigger job, and the steps are different for every CRM.",
  },

  // The talk, for an owner who has already built (D-049: Connor chose "build right away"). Kit E's
  // "Before we build anything" is "Before we use it on real work" to match (SCRIPT, above).
  conversation: {
    heading: 'Talk with your ops leader',
    intro:
      'Setting up the AI is the easy part. The change only works if your ops leader feels the change is happening with them, not to them. Do these four things, in this order:',
    moves: [
      'Talk about the job, not the person. Say: "We grew, and your job didn\'t grow with us. That\'s on me."',
      "Make your ops leader the AI employee's boss. The AI isn't replacing your ops leader. Your ops leader teaches the AI and checks the AI's work.",
      'Agree on where their saved hours will go before the AI does any real work.',
      'Track the hours saved together for 30 days, using the plan on the next screen.',
    ],
    scriptLead:
      "Fill in the four boxes. Your answers fill in the blanks in the script below. The script is what you'll say to your ops leader. Use your own words, but keep the same order. Want the script handy? Tap Copy the Script, then paste the script into your phone's Notes app.",
    fields: [
      { name: 'opsName', label: "Your ops leader's first name", placeholder: 'Jordan' },
      {
        name: 'agentsThen',
        label: 'How many agents were on your team when your ops leader started?',
        placeholder: '12',
      },
      { name: 'closingsThen', label: 'About how many closings a month did you have back then?', placeholder: '15' },
      {
        name: 'hoursTo',
        label: 'Where you want their saved time to go',
        hint: "For example: agent accountability, client experience, or tracking the team's numbers.",
        placeholder: 'agent accountability',
      },
    ] satisfies FillField[],
    copy: { label: 'Copy the Script', toast: 'Copied. Say it in your own words.' },
    showScript: 'The script',
    worried:
      'If they seem worried, ask what worries them, and listen. Then you can say: "This is how your job becomes sustainable. You\'ll be the person on our team who knows how to run AI, and that makes you harder to replace, not easier."',
    honest:
      "AI can give your ops leader time back. AI can't fix everything. If things still aren't working on day 30 of your plan, you'll have real numbers, not a hunch, for an honest conversation about what comes next.",
  },

  plan: {
    heading: 'Your 30-day plan',
    intro: 'Four weeks, one AI employee. Day 1 is the day you talk with your ops leader.',
    measureLabel: 'Track',
    // Kit D, a week to a card, in plain words (D-048), for an owner who has already built (D-049): the
    // talk is Week 1 and testing Week 2, where Kit D has Map and Build. Week 3 is "Use", not the talk's
    // "Run", which on this page is a bucket.
    weeks: [
      {
        week: 'Week 1',
        focus: 'Talk',
        doThis:
          "Use the script to talk with your ops leader. Open your task map chat, and show them the task map and the AI employee you built. Make your ops leader its manager. Ask them the three questions at the end of the AI's response, and type their fixes into that same chat. Ask your ops leader to rate their workload from 1 to 10, and write the number down.",
        measure: 'How long that work takes today, and the 1 to 10 workload number',
      },
      {
        week: 'Week 2',
        focus: 'Test',
        doThis:
          "Your ops leader tests the AI employee on three old examples from closed deals, with client names blacked out. Each time the AI gets something wrong, your ops leader adds one sentence to the AI employee's instructions.",
        measure: 'Each mistake the AI employee made',
      },
      {
        week: 'Week 3',
        focus: 'Use',
        doThis:
          "Your ops leader uses the AI employee for every new task of that kind, and still checks each task the usual way. Write down how long each task takes and every fix. Every Friday, add that week's fixes to the AI employee's instructions.",
        measure: 'How long the work takes now, compared with Week 1',
      },
      {
        week: 'Week 4',
        focus: 'Decide',
        doThis:
          'Compare this week\'s hours with Week 1. Ask your ops leader for the 1 to 10 workload number again. Check that the saved hours went where you agreed, and write down where they went. Then pick the next AI employee together. In your task map chat, type: "What should we build next?"',
        measure: "Hours saved each week, and your ops leader's workload number, before and after",
      },
    ],
    // Under Week 4, where every reader sees it as Week 4 says to pick the next one (D-049).
    next: {
      heading: 'More AI employees to build later',
      items: [
        'An Agent Onboarding Guide',
        'A Listing Launch Coordinator (a person still checks listing wording for fair housing)',
        "A Lead Follow-Up Coordinator (a person still gets a lead's OK before automatic texts)",
        'A weekly meeting prep assistant',
      ],
    },
    dayThirty:
      'On day 30: if your ops leader is saving hours and the workload number went down, the problem was the job. If not, you have real numbers for a fair conversation about the person.',
  },

  forward: {
    heading: 'Two ways forward',
    yourself: {
      title: 'Do it yourself',
      body: 'Follow the 30-day plan on your own. Your task map and build steps are saved in your ChatGPT or Claude chat. Bookmark this page so you can come back each week.',
      link: { label: 'See the 30-day plan again', href: '#thirty-day-plan' },
    },
    review: {
      title: 'Get help from us',
      body: "Book a free 20-minute call with us, called a Retool Review. Have your task map chat open on the call. We'll look at the AI employee you picked, help with any step you're stuck on, and tell you whether you need help at all.",
      // The booking link (D-046). Empty until Connor sets it up: the card then shows `pending`, the
      // talk's own "Type RETOOL" ask, in place of a button.
      button: { label: 'Book a Retool Review', href: '' },
      pending: 'On a live call? Type RETOOL in the Zoom chat to get the booking link.',
    },
  },

  auditPrompt: { id: 'retool_audit', label: 'The four-question audit prompt', text: AUDIT_PROMPT } satisfies Prompt,
  buildPrompt: { id: 'retool_build', label: 'The build instructions request', text: BUILD_PROMPT } satisfies Prompt,
  coordinatorPrompt: {
    id: 'retool_coordinator',
    label: 'The Contract-to-Close Coordinator job description',
    text: COORDINATOR_PROMPT,
    // The prompt's own words: what the Coordinator writes where it doesn't know something.
    literal: ['[brackets]'],
  } satisfies Prompt,
  scriptPrompt: { id: 'retool_script', label: 'The Retool Conversation script', text: SCRIPT } satisfies Prompt,
} as const;
