// Every word on /task-sync-starter: the landing page for the Task Sync Starter Kit, Connor's free
// PDF for real estate team owners and operators, sent to people who comment on his Reel (ManyChat).
// DECISIONS.md D-038.
//
// THIS IS THE ONLY FILE TO EDIT WHEN THE COPY CHANGES. `render.ts` turns it into the page's HTML at
// build time; nothing here is markup. The words come from the kit itself (its cover, page 2 and its
// three steps), so the page promises exactly what the PDF delivers.
//
// House rules, as on /ai101: no em dashes, short plain sentences.

/** A run of inline copy: text, `{ strong }`, or `{ link }` (a page of this site, opened in a new tab). */
export type Inline = string | { strong: string } | { link: string; href: string };

/** Who the consent names, as the waitlist does (D-034): one string, so it never drifts. */
const SENDERS = 'Amplified Impact, Spring B and its affiliated companies, Spring, and Connor';

export const PAGE = {
  meta: {
    title: 'Task Sync Starter Kit · Amplified Impact',
    description:
      'Turn every promise from your team meetings into a task with an owner, a due date and the next step. A free starter kit for real estate team owners and operators.',
    url: 'https://www.amplifiedimpact.io/task-sync-starter',
    siteName: 'Amplified Impact',
  },

  hero: {
    logoAlt: 'Amplified Impact',
    eyebrow: 'Free Starter Kit · For Real Estate Team Owners and Operators',
    title: 'Task Sync Starter Kit',
    lede: 'Turn every promise from your team meetings into a task with an owner, a due date and the next step.',
    steps: [
      { n: '01', title: 'Connect Your Tools', body: 'Meeting notes, email and your task list.' },
      { n: '02', title: 'Copy the Prompt', body: 'One set of instructions, built for real estate teams.' },
      { n: '03', title: 'Run It Every Morning', body: 'The plan is waiting when you sit down.' },
    ],
  },

  /** The opt-in. Its anchor is the link ManyChat or a slide can point at. */
  optIn: {
    anchor: 'get-the-kit',
    heading: 'Get the free kit',
    body: 'Tell us where to send updates and the kit is yours. Eight pages, as a PDF.',
    fields: { firstName: 'First name', email: 'Email' },
    button: 'Get the Kit',
    // Submitting is the opt-in: email consent and agreement to the Terms and Privacy Policy, said in
    // full under the button, exactly as the /ai101 waitlist says it (D-034).
    legal: [
      'By getting the kit, you agree to our ',
      { link: 'Terms of Service', href: '/terms' },
      ' and ',
      { link: 'Privacy Policy', href: '/privacy' },
      ` and to emails from ${SENDERS}. Unsubscribe anytime.`,
    ] as Inline[],
  },

  /** What the visitor sees once they have opted in (and on every visit after, on that device). */
  download: {
    anchor: 'download',
    heading: "It's yours.",
    body: 'Save it to your phone or laptop, and keep it next to your next team meeting.',
    button: 'Download Here',
    // A plain file, so it works the same with or without the page's script. The `download` name is
    // what the browser saves it as.
    href: '/downloads/task-sync-starter-kit.pdf',
    filename: 'Task Sync Starter Kit - Amplified Impact.pdf',
    // Instagram's and Facebook's in-app browsers open a PDF instead of saving it. Shown there only.
    inApp:
      'In the Instagram app? If the PDF opens instead of saving, tap the ••• menu and choose Open in browser, then download it there.',
  },

  example: {
    eyebrow: 'What This Kit Does',
    heading: 'One sentence from a team meeting, turned into a task',
    body: 'Paste in your team meeting notes and get back every commitment as a task with an owner, due date, priority and steps. Run it by hand after any meeting, or set it to run on its own every weekday morning.',
    quote: 'Maria, can you get the Hendersons’ inspection response drafted before their deadline Thursday?',
    quoteSource: 'Said in Monday’s team meeting',
    task: {
      title: 'Draft the Hendersons’ inspection response',
      rows: [
        { label: 'Owner', value: 'Maria (TC)' },
        { label: 'Due', value: 'Wednesday, the business day before the deadline' },
        { label: 'Priority', value: 'Urgent. A contract deadline inside 2 business days' },
        {
          label: 'Subtasks',
          value:
            'Pull the inspection report. Confirm repair asks with the listing agent. Send the draft for signatures.',
        },
        { label: 'Source', value: 'Monday team meeting, with the quote' },
      ],
    },
  },

  inside: {
    heading: "What's inside",
    items: [
      {
        title: 'Connect your tools',
        body: 'Granola, Fathom, Gmail, Outlook, ClickUp, Asana, Notion and more, with the exact connector for each.',
      },
      {
        title: 'The Task Sync Prompt',
        body: 'One set of instructions for real estate teams: owners, due dates, priorities, subtasks and contract deadlines.',
      },
      {
        title: 'Run it every weekday morning',
        body: 'A Claude scheduled task, so the plan is waiting when you sit down.',
      },
      {
        title: 'Tips for cleaner results',
        body: 'The small meeting habits that make every task land with the right person.',
      },
    ],
  },

  need: {
    heading: 'What you need',
    note: 'About 20 minutes to set up',
    items: [
      { title: 'A Claude account', body: 'Any plan works to start. Running it on a schedule needs a paid plan.' },
      { title: 'Meeting notes', body: 'Or a transcript, from any AI notetaker or your own typing.' },
      { title: 'A place for tasks', body: 'ClickUp, Asana, Notion, or a plain checklist.' },
    ],
  },

  footer: {
    byline: 'By Connor Leiva',
    links: [
      { link: 'Terms of Service', href: '/terms' },
      { link: 'Privacy Policy', href: '/privacy' },
    ],
  },
} as const;

/** What the page's script needs at runtime (`main.ts` imports only this). */
export const UI = {
  errors: {
    firstName: 'Enter your first name.',
    email: 'Enter a valid email address.',
    generic: 'Something went wrong. Try again.',
  },
  /** localStorage: this device already opted in, so the kit shows straight away. */
  unlockedKey: 'tss-unlocked',
} as const;
