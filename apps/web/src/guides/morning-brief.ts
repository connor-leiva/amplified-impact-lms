// Every word on /morning-brief that is its own: the landing page for Morning Brief (`skills/morning-brief/`,
// version 1.0, D-108), the AI Accelerator's week 2 flagship, Team Owner version. One page each weekday
// morning: at most three owner priorities, the decisions waiting on the owner, the next owned actions, and
// every item with no owner or no date flagged with the words that left it open, never filled in.
//
// THREE LANES, ONE BRIEF. The PM's brief asks for a Grok Bot template with a Claude or ChatGPT fallback,
// so the page's app switch has three buttons, Grok Bot first and checked to start (`download.grok`,
// drawn by `appSetups` in `render.ts`). The Grok Bot steps are the Grok Bot shelf's own (`grokSetup`,
// D-100), reading the skill's own template, `skills/morning-brief/grok/SKILL.md`, at build time for its
// name and its routine. The Claude and ChatGPT steps are every skill page's (`skillPage`, D-052). It is
// not on the Grok Bot shelf: it is one skill with three ways in, and one card in the main list.
//
// The skill is paid (in the Amplified Skill Library, not in `FREE_SKILLS`), so the built page shows its
// hero, its sample and the whole guided setup under the Skill Library card, each file a button to the
// Skill Library (D-082, D-101), and `content.ts` takes "Free" off its title, description and eyebrow.
// The words below are written as a free page, as every skill page's are.
//
// The words come from the skill itself (SKILL.md, references/brief-rules.md and inputs.md, the Grok Bot
// template), its page notes and its graded runs (practice 12 of 12, case 1 11 of 11, case 2 9 of 9,
// case 3 11 of 11, every run passing the objective checks). The sample is sample.md, the practice run,
// cut only by whole sentences, items, rows and columns. No income or results claim, no ROI story, no
// invented statistic: the brief quotes the team's own reports and never recalculates them.
//
// House rules: no em dashes, short plain sentences, contractions, one action a step, Title Case buttons.

import { isFreeSkill } from '@ai/core/skills';
import type { Guide } from './content';
import { grokSetup } from './grok-page';
import { chatgptPaste, skillGrokTemplate, skillPage } from './skill-page';

const SLUG = 'morning-brief';
const MINUTES = 15;

/** The Grok Bot lane: the shelf's seven steps, on the skill's own template (D-108). */
const GROK_STEPS = grokSetup({
  title: 'Morning Brief',
  text: skillGrokTemplate(SLUG),
  file: `${SLUG}-grok.zip`,
  free: isFreeSkill(SLUG),
  apps: ['Google Drive', 'Google Sheets'],
  // docs.x.ai/grok-bot/computer-and-apps, read 2026-11-11: it names Google Calendar among the apps, and
  // neither ClickUp nor Asana.
  appsNote: [
    'Add ',
    { strong: 'Google Calendar' },
    ' too, but only if your calendar is already there. Task list in ClickUp or Asana? Connect apps may not list them, so have your operator save a CSV export to the folder below each morning, or add a connector you trust with ',
    { strong: 'Add a custom connector' },
    ' at the bottom of Connect apps.',
  ],
  connectNote: [
    'Then make one folder in Google Drive called ',
    { strong: 'Morning Brief' },
    '. That’s where the morning’s numbers, the task list and any meeting transcript go.',
  ],
  firstResult:
    'Compare it with the example on this page. A good first result is one page in the chat: at most three priorities with their reasons, the decisions, the next owned actions and every open item, with nothing filled in and nothing changed.',
});

const BASE = skillPage({
  slug: SLUG,
  title: 'Morning Brief',

  meta: {
    title: 'Morning Brief: A Free Grok Bot Template and AI Skill · Amplified Impact',
    description:
      'One page every weekday morning: your top three, the decisions waiting on you, and who owns each next step. A free Grok Bot template, with the same brief for Claude and ChatGPT. It flags any task with no owner or no date, and never fills one in.',
  },

  eyebrow: 'Free Grok Bot Template and AI Skill · For Team Owners',
  // page-notes.md, "One-Line Promise", in the page's voice.
  lede: 'One page, every weekday morning. Your top three, the decisions waiting on you, and who owns each next step. If nobody owns it or there’s no date, it says so. It never fills one in.',
  outcome: { n: '03', title: 'Own the Day', body: 'Three priorities, the decisions, and every loose end named.' },
  optInBody:
    'Tell us where to send updates and the brief is yours: a Grok Bot template that runs every weekday, and the same brief as a skill for Claude or a ChatGPT Project. It reads your numbers and your task list, and it changes nothing.',
  setupMinutes: MINUTES,

  practice: {
    // practice/README.md and page-notes.md, "Practice Prompt", with the page's apostrophes.
    prompt:
      'Morning brief for Thursday, November 12, 2026. I’m Hollis. The task register, last month’s Lead-Source ROI, Monday’s pipeline review, yesterday’s huddle and our roster are attached.',
    note: [
      'There are five files: a made-up team’s task register, last month’s Lead-Source ROI, Monday’s pipeline review, yesterday’s huddle and the roster. Every name, street and number in them is made up. ',
    ],
  },

  real: {
    body: ['Each morning, start a new chat the same way, attach that morning’s files, and say this.'],
    prompt: 'Morning brief for today. This week’s numbers, our task register and yesterday’s meeting transcript are attached.',
    // references/inputs.md: ClickUp's "Export List and Table views," checked 2026-11-08.
    note: [
      'To export from ClickUp, open the List or Table view, click ',
      { strong: 'Customize' },
      ', then ',
      { strong: 'Export' },
      ', then ',
      { strong: 'All columns' },
      ', ',
      { strong: 'CSV' },
      ', ',
      { strong: 'Download' },
      '. Before the note goes to your team, check the ',
      { strong: 'Check before sending' },
      ' list against your files.',
    ],
  },

  chatgpt: { paste: chatgptPaste(SLUG) },

  sections: [
    {
      // sample.md (the practice run, 12 of 12 planted checks), shortened, in the output's own order and
      // words, cut only by whole sentences, items, rows and columns: the bottom line in full; the three
      // with their first two sentences; two of the five decisions; the actions table in four of five
      // columns; the open table in three of five columns; the note in full; three check lines.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What a morning brief looks like',
      body: 'What came back from the practice files: a made-up team owner’s task register, last month’s Lead-Source ROI, Monday’s pipeline review, yesterday’s huddle and the roster. They’re the same files you practise on in setup.',
      title: 'Morning Brief: Quillberry Home Team, Thursday, November 12, 2026',
      note: 'Made-up example. Shortened: two of five decisions, some columns, and three rows of the check list.',
      blocks: [
        { h: 'Bottom line' },
        {
          p: [
            'Your three today are the Lantern Moss Lane marketing budget (due today, and Juno’s photographer booking waits on it), the October lead-source review with the bookkeeper (past due since Tue Nov 10), and the Zillow Flex renewal decision (due Fri Nov 13). Six actions owned by others are due by Friday. Five items have no owner or no date, including the Gumdrop Glen sellers’ follow-up that nobody took.',
          ],
        },
        { h: 'Today’s three' },
        {
          items: [
            'Approve the Lantern Moss Lane marketing budget. Why it’s here: rule 1, due today (Thu Nov 12; you said “I’ll approve it Thursday” in Wednesday’s huddle), and Juno’s photographer booking (T-108) is blocked on it: “Waiting on budget approval from Hollis.”',
            'Review October lead-source numbers with the bookkeeper. Why it’s here: rule 1, past due (due Tue Nov 10).',
            'Decide on the Zillow Flex renewal. Why it’s here: rule 2, due Fri Nov 13, within the next two business days (“The renewal decision is due to them Friday,” huddle, 00:00:04).',
          ],
        },
        { h: 'Decisions needed' },
        {
          items: [
            'Decide on the Zillow Flex renewal, by Fri Nov 13. Lead-Source ROI, October 2026: Zillow Flex $2,600.00 spend, 2 closes, $1,300.00 cost per close. The same report lists $340.00 of untagged spend (a Zillow charge on Oct 9, not mapped to Zillow Flex) and 2 October closings with no lead source; Pip’s tagging task (T-111) is due the same day, Fri Nov 13.',
            'Decide whether to look at Facebook Ads now or keep watching it. Lead-Source ROI, October 2026: $1,310.00 spend, 0 closes; the report calls this “a fact about this month, not a recommendation to cancel the source.”',
          ],
        },
        { h: 'Next owned actions' },
        {
          table: {
            caption: 'Past due, due today, and due Fri Nov 13',
            head: ['Action', 'Owner', 'Due', 'Done when'],
            rows: [
              ['Order the inspection report copy for the Teaspoon Terrace file', 'Odette Bramblecombe', 'Wed Nov 11 (past due)', 'Not stated: set it before you accept'],
              ['Send the Gumdrop Glen sellers the price conversation summary', 'Nettle Ashcombe', 'Thu Nov 12 (today)', 'Summary emailed to both sellers and logged in Follow Up Boss'],
              ['Call back the three weekend portal leads with no first touch', 'Tobin Fernsby', 'Thu Nov 12 (today; said “tomorrow” on Nov 11)', 'Each lead has a logged call in Follow Up Boss'],
              ['Book the photographer for Lantern Moss Lane', 'Juno Pebblewick', 'Fri Nov 13 (blocked until the budget is approved)', 'Shoot booked and confirmed by email'],
              ['Tag the two October closings that have no lead source', 'Pip Larkhaven', 'Fri Nov 13 (said “by Friday”)', 'Both closings tagged in Follow Up Boss and Lead-Source ROI rerun'],
              ['Confirm Saturday’s showing tour with the Whistlewood buyers', 'Saffron Quillby', 'Fri Nov 13', 'Not stated: set it before you accept'],
            ],
          },
        },
        { h: 'Open: no owner or no date' },
        { p: ['None of these was filled in: only your team can say who owns them and by when. The note below asks.'] },
        {
          table: {
            caption: 'Flagged, never filled in',
            head: ['Item', 'Missing', 'As written'],
            rows: [
              ['Follow up with the Gumdrop Glen sellers about the showing feedback', 'Owner and date', '“Someone should follow up with them next week about the feedback.”'],
              ['Get the Puddle Duck Way appraisal status from the lender', 'Date', 'Due: blank. “Yep, I’ll call them.”'],
              ['Update the buyer consultation script', 'Owner', 'Owner: “TBD” (due 11/18/2026). “We should probably revisit the buyer consult script at some point too.”'],
              ['Schedule the second ISA interview', 'Date', 'Due: blank; notes: “next week sometime.” Huddle: “let’s do that next week sometime.”'],
              ['Reconcile the closings count between the scorecard and Follow Up Boss', 'Owner', 'Owner: “Team” (due 11/13/2026)'],
            ],
          },
        },
        { h: 'Note to owners (draft)' },
        {
          email: {
            subject: 'Owners And Dates Needed For Five Items',
            body: [
              'Hi team,',
              'A few items from this week don’t have an owner or a date yet. Could you reply with who’s taking each one and by when?',
              'The Gumdrop Glen sellers’ follow-up on the showing feedback (raised in Wednesday’s huddle): who’s taking it, and on what date?',
              'Odette: by what date can you have the Puddle Duck Way appraisal status from the lender?',
              'The buyer consultation script update (due Nov 18): who owns it?',
              'Pip: what date works for the second ISA interview?',
              'The closings count, scorecard against Follow Up Boss (due Nov 13): who owns it?',
              'Thanks,',
              'Hollis',
            ],
          },
        },
        { h: 'Check before sending' },
        {
          items: [
            'Dates worked out from words in Wednesday’s huddle (Nov 11): “Friday” (Hollis, the Zillow Flex renewal) and “by Friday” (Pip) are Fri Nov 13; “tomorrow” (Tobin) and “Thursday” (Hollis) are Thu Nov 12; “Monday” (Nettle, with Saffron covering) is Mon Nov 16.',
            'Done when not stated: T-104 and T-116.',
            'Stale inputs: none.',
          ],
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order".
      kind: 'list',
      heading: 'What you get back',
      items: [
        { title: 'A bottom line', body: 'Three sentences at most: your top three in a phrase each, and how many items have no owner or no date.' },
        {
          title: 'Today’s three',
          body: 'At most three things only you can do or decide, each with the rule that picked it and where it came from. Fewer than three qualify? You get fewer.',
        },
        { title: 'Decisions needed', body: 'What your reports flag, as plain questions, with every number quoted exactly from its report and period.' },
        { title: 'Next owned actions', body: 'What your team owes by the end of the next business day: the owner, the date, and what done looks like.' },
        { title: 'Open: no owner or no date', body: 'Every loose end, with the words that left it open and the question that closes it. Nothing filled in.' },
        { title: 'A note to owners', body: 'A short draft asking who owns each open item and by when, for you to send.' },
        { title: 'Check before sending', body: 'Every date, number and quote in the brief, any stale input, and any task with no definition of done.' },
      ],
    },
    {
      // SKILL.md's Run, Draft and Own, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI sorts. Your team owns. You decide.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the sorting',
          body: 'Reads your numbers, your task list and any transcript. Sorts what’s past due, due today and waiting on you, and picks the three by fixed rules.',
        },
        { label: 'Draft', title: 'You read it first', body: 'The brief and the note to owners. Nothing is sent, and nothing changes in your task list.' },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'What matters today, who does the work and by when, and every money, client and people call. You accept a task only when it has an owner, a date and a definition of done.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need".
      kind: 'tiles',
      heading: 'What you need',
      note: `About ${MINUTES} minutes to set up`,
      cta: true,
      columns: 2,
      items: [
        {
          title: 'Grok Bot',
          body: 'A plan that includes Grok Bot, with Google Drive and Google Sheets connected. It runs the brief every weekday on its own.',
          tag: 'Check Settings > Usage & Billing',
        },
        { title: 'Or Claude or ChatGPT', body: 'The same brief, run by hand each morning: a skill in Claude, or a Project in ChatGPT.' },
        { title: 'Your task list', body: 'The one your team already uses. A ClickUp or Asana export, a Google Sheet, or a pasted list.' },
        { title: 'Someone to refresh it', body: 'An operator who drops this week’s numbers and the task export in one folder at the same time each morning.' },
      ],
    },
    {
      // page-notes.md, "Things to Say".
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat, attach that morning’s files, and paste. In ChatGPT, start the chat inside the Project. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'Each morning, with the files attached',
          items: [
            'Morning brief for today. The task register, this week’s pipeline review and yesterday’s huddle are attached.',
            'Morning brief. No numbers this week, just our task list: [paste it]',
          ],
        },
        {
          label: 'In the same chat, after the brief',
          items: ['Just the open items: what has no owner or no date?', 'Write the note to the owners.', 'Why are these my top three?'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // SKILL.md, Guardrails; case 3's run.
          q: 'Why won’t it just assign the loose ends?',
          a: [
            'A filled-in owner reads like a real one. The loose end looks handled when nobody agreed to it. So the brief flags it, quotes the words that left it open, and drafts the note that asks. That holds even when you ask it to fill them in.',
          ],
        },
        {
          // references/brief-rules.md, "Choosing the Top Three".
          q: 'How does it pick my top three?',
          a: [
            'Three rules, in order. Past due or due today. Due in the next two business days, or a closing in that window waits on it. A client waiting, or a deal past its expected close. Inside a rule, what a client or a closing waits on comes first, then what blocks someone else. Each pick says which rule and which fact, so you can explain it.',
          ],
        },
        {
          q: 'Grok Bot, Claude or ChatGPT: which do I set up?',
          a: [
            'Grok Bot if you want it to run on its own every weekday. Claude or ChatGPT if you’d rather run it by hand. They follow the same rules and give you the same page.',
          ],
        },
        {
          q: 'Is this another inbox?',
          a: [
            'No. It reads the task list you already have and changes nothing. Once a task has an owner, a date and a definition of done, add it to your own system.',
          ],
        },
        {
          // references/inputs.md, "This Week's Numbers".
          q: 'Where do the numbers come from?',
          a: [
            'Last month’s ',
            { link: 'Lead-Source ROI', href: '/lead-source-roi', sameTab: true },
            ', this week’s ',
            { link: 'FUB Pipeline Review', href: '/fub-pipeline-review', sameTab: true },
            ', or your own scorecard. Any one is enough. It quotes them exactly and never recalculates them.',
          ],
        },
        {
          // docs.x.ai/grok-bot/computer-and-apps, read 2026-11-11.
          q: 'Grok Bot can’t find my task list.',
          a: [
            'Grok Bot’s docs don’t name ClickUp or Asana among its apps. Have your operator save a CSV export to the Morning Brief folder in Google Drive each morning, or add a connector you trust with ',
            { strong: 'Add a custom connector' },
            '.',
          ],
        },
        {
          // page-notes.md, "What Was and Wasn't Tested".
          q: 'Has it been tried on real files?',
          a: [
            'Not yet. It was tested on made-up files shaped like a ClickUp export, a Google Sheet, a pasted list and Zoom, Otter and Teams transcripts. We haven’t run it inside Grok Bot, Claude or ChatGPT yet, so check your first brief against your files. Tell us what you find at ',
            { link: 'support@amplifiedimpact.io', href: 'mailto:support@amplifiedimpact.io', sameTab: true },
            '.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Going through email and meetings instead? ',
        { link: 'Inbox and Meeting Follow-Through', href: '/inbox-meeting-follow-through', sameTab: true },
        ' is built for that.',
      ],
    },
  ],

  unlockKey: 'morning-brief-unlocked',
});

export const MORNING_BRIEF: Guide = {
  ...BASE,
  hero: {
    ...BASE.hero,
    steps: [
      { n: '01', title: 'Set It Up Once', body: `In Grok Bot, Claude or ChatGPT, about ${MINUTES} minutes.` },
      { n: '02', title: 'Practise First', body: 'On a made-up team we include.' },
      { n: '03', title: 'Own the Day', body: 'Three priorities, the decisions, and every loose end named.' },
    ],
  },
  download: { ...BASE.download, grok: { label: 'Grok Bot', setup: GROK_STEPS } },
  facts: ['Free', `About ${MINUTES} minutes to set up`, 'Grok Bot, Claude or ChatGPT'],
};
