// Every word on /fub-pipeline-review that is its own: the landing page for FUB Pipeline Review, a skill
// (`skills/fub-pipeline-review/`, version 1.0) that runs a real estate team leader's or ops leader's weekly
// Follow Up Boss pipeline review from the exports they download: this week's People export, a Deals report
// export when the team uses Follow Up Boss Deals, and last week's People export to see what moved. It hands
// back flags, a bottom line, the pipeline by stage with aging worked out per record, what moved, the four
// "needs a decision this week" lists, conversion by lead source and by agent with every numerator and
// denominator, each agent's counts, questions for each agent, odd rows flagged and Check Before Sending.
// What every skill page says the same way is in `skill-page.ts` (D-052).
//
// The skill is paid (in the Amplified Skill Library, not in `FREE_SKILLS`), so the built page shows its
// hero and sample with the Skill Library card in place of the sign-up and the setup, and `content.ts`
// takes "Free" off its title, description and eyebrow (D-082). The words below are written as a free
// page, for the day Connor names it free, as every skill page's are.
//
// The words come from the skill itself (SKILL.md and references/review-rules.md and fub-exports.md), its
// page notes, and its graded runs (case 1, the full practice set, at 11 of 11; case 2, a People export
// only with odd rows, at 10 of 10; both passing the objective checks), so the page promises what the skill
// does. The sample is sample.md, the graded practice run, cut only by whole rows, columns, items and
// sentences, with straight apostrophes set as curly ones.
//
// What the page holds to, as SKILL.md does: read only, never changes a stage, assigns a lead, adds a tag or
// task or sends anything; where a fix belongs in Follow Up Boss it gives the owner the steps. It never
// invents a stage, source, date or deal value, flags odd rows instead of fixing them, never judges or ranks
// an agent, and never repeats an email address, phone number or note.
//
// Calls left open, and how the page handles them:
//   - Connor's filter: Follow Up Boss Reporting (Agent Activity, Lead Source, Appointment and Deals reports,
//     the default Met/Appt Set Smart List) and Sisu already show activity, closed deals and lead source
//     return. The first FAQ says so and says what this adds (one dated decision list across every agent,
//     aging per record with the math, last week against this week, the meeting questions). Connor confirms
//     it earns its place.
//   - Whether Last Communication and Last Activity come through with Export All Columns is not confirmed
//     (the help center doesn't list them). The real-file note says to turn those columns on first, and the
//     FAQ on real exports says the skill says when one is missing.
//   - The stale line is 7 days by default; Follow Up Boss's own Met/Appt Set list uses 6. The page says 7
//     and that you can change it.
//   - Conversion is by current stage, a floor, and Follow Up Boss's Lead Source report and Sisu stay the
//     source of record. The page says both.
//   - Siblings: the skill's description names fub-automation-audit and agent-1on1-prep, which aren't
//     registered pages yet, so the note links only to /database-health-check.
//   - Plans: Claude's help center lists skills on every plan, Claude's docs on Pro and up; ChatGPT needs data
//     analysis, which its free plan limits. No ChatGPT Free numbers. The ChatGPT version has not been run
//     inside ChatGPT.
//
// Export click paths are page-notes.md's, from Follow Up Boss's help center, read through search excerpts
// on 2026-11-10. `setupMinutes` is an estimate (page-notes gives none): 10, as on the other skill pages with
// a ChatGPT version.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const FUB_PIPELINE_REVIEW: Guide = skillPage({
  slug: 'fub-pipeline-review',
  skill: 'fub-pipeline-review',
  title: 'FUB Pipeline Review',

  meta: {
    title: 'FUB Pipeline Review: A Free AI Skill · Amplified Impact',
    description:
      'Attach your Follow Up Boss export and walk into your pipeline meeting with every stage counted and aged, a dated list of what needs a decision this week, and the question to ask each agent. A free skill for Claude and ChatGPT. It only reads.',
  },

  eyebrow: 'Free AI Skill · For Team Leaders and Ops',
  // page-notes.md, "One-Line Promise".
  lede: 'Attach this week’s Follow Up Boss export (and last week’s, and your Deals report if you use FUB Deals) and walk into your pipeline meeting with every stage counted and aged, a dated list of what needs a decision this week, and the question to ask each agent.',
  outcome: { n: '03', title: 'Run the Meeting', body: 'What needs a decision this week, with the dates worked out, and a question for each agent.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. Either one reads your exports and never changes anything in Follow Up Boss.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word.
    prompt:
      'Pipeline meeting is tomorrow morning. Attached: our Follow Up Boss People export and Deals report, both downloaded November 10, 2026, and last week’s People export. Run the pipeline review.',
    note: [
      'There are three files: a made-up team’s People export from this week and last week (54 people and 5 agents, in the layout of Follow Up Boss’s export) and its Deals report. Every name, email, phone number and note in them is made up. The prompt names the download date, so the day counts run to November 10, 2026 whatever day you practise.',
    ],
  },

  real: {
    body: [
      'Start a new chat the same way, attach this week’s People export (and last week’s and your Deals report, if you have them), and say this with your own date.',
    ],
    prompt:
      'Pipeline meeting is [day]. Attached: our Follow Up Boss People export, downloaded [date], last week’s export and our Deals report. Run the pipeline review.',
    // page-notes.md, "What to Upload": Follow Up Boss's "Export Contacts to a Spreadsheet" (updated
    // 2026-04-21), read through search excerpts 2026-11-10. The Deals report steps are in the FAQ.
    note: [
      'In Follow Up Boss, open ',
      { strong: 'People' },
      ' and use the ',
      { strong: 'Columns' },
      ' menu to turn on Stage, Source, Agent, Created, ',
      { strong: 'Last Communication' },
      ', ',
      { strong: 'Last Activity' },
      ' and Tags. Then check the box next to Name, choose ',
      { strong: 'Select All' },
      ', click ',
      { strong: 'Export' },
      ', check ',
      { strong: 'Export All Columns' },
      ', and click ',
      { strong: 'Yes, Export People' },
      '. Save it with the date in its name, so next week you can attach it as last week’s.',
    ],
  },

  chatgpt: { paste: chatgptPaste('fub-pipeline-review') },

  sections: [
    {
      // sample.md (the practice run, case 1 at 11 of 11), shortened, in the output's own order and words,
      // cut only by whole rows, columns, items and sentences: three flags; the bottom line in full; the
      // pipeline table's pipeline stages in six of its eight columns; five of nine stage changes; every
      // item of lists 1, 2 and 4 and three of seven in list 3; the lead source table in four of its six
      // columns and five of its eight rows, with its caveat's first and third sentences; one agent's
      // questions; the odd rows in three columns; four check lines. Left out: What I Used, deals by stage,
      // conversion by agent, by agent, the Smart List steps.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What a pipeline review looks like',
      body: 'What Claude wrote from the practice files: a made-up team’s Follow Up Boss People export from this week and last week, and its Deals report. They’re the same files you practise on in setup.',
      title: 'Pipeline Review: As of Tuesday, November 10, 2026',
      note: 'Made-up example. Shortened: parts of most sections, one agent’s questions, and four rows of the check list.',
      blocks: [
        { h: 'Flags' },
        {
          items: [
            'As of 11/10/2026: you said the People export and Deals report were downloaded November 10, 2026, and their file names carry 2026-11-10. Every day count runs to that date.',
            'Stale means nothing logged in more than 7 days (the default; tell me another number and I’ll rerun). Follow Up Boss’s own Met/Appt Set Smart List uses 6.',
            '3 odd rows, listed under Odd Rows. None was fixed.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'Of 54 people in this week’s export, 26 are in active stages, and the decision list holds 2 deals past their expected close date, 3 appointment-stage people with no next step in the export, 7 hot or active people with nothing logged in more than 7 days, and 2 stages with no movement. Start with Ferdinand Rattlecap’s deal at 77 Marzipan Ct (Pending, Otis Marmaduke), 11 days past its 10/30/2026 expected close. Since last week’s export, 9 people changed stage, 3 are new, and 1 is no longer in the export.',
          ],
        },
        { h: 'Pipeline by stage' },
        {
          table: {
            caption: 'Pipeline stages, with days since the last communication logged',
            head: ['Stage', 'Now', 'Last week', 'Within 7 days', 'More than 7 days', 'None logged'],
            rows: [
              ['Lead', '6', '8', '1', '1', '4'],
              ['Attempted Contact', '7', '5', '3', '4', '0'],
              ['Spoke with Customer', '5', '6', '3', '1', '1'],
              ['Appointment Set', '3', '2', '2', '1', '0'],
              ['Met with Customer', '3', '3', '0', '2', '1'],
              ['Showing Homes', '3', '4', '2', '1', '0'],
              ['Listing Agreement', '2', '3', '2', '0', '0'],
              ['Active Listing', '3', '2', '3', '0', '0'],
              ['Submitting Offers', '2', '2', '2', '0', '0'],
              ['Under Contract', '5', '5', '3', '2', '0'],
            ],
          },
        },
        {
          p: [
            '“None logged” means nothing is logged in Follow Up Boss. Calls and texts from a personal phone don’t show unless someone logs them.',
          ],
        },
        { h: 'What moved since last week' },
        {
          table: {
            caption: 'Five of the nine stage changes',
            head: ['Person', 'Agent', 'Last week', 'This week'],
            rows: [
              ['Ignatius Tumblewick', 'Clementine Puddleby', 'Spoke with Customer', 'Appointment Set'],
              ['Winifred Waffleton', 'Juniper Fogwhistle', 'Under Contract', 'Closed'],
              ['Clover Dewdrop', 'Hazel Tinkersnap', 'Showing Homes', 'Under Contract'],
              ['Montgomery Elderwhistle', 'Otis Marmaduke', 'Listing Agreement', 'Active Listing'],
              ['Dorothea Gobbledy', 'Juniper Fogwhistle', 'Spoke with Customer', 'Nurture'],
            ],
          },
        },
        {
          p: [
            { strong: 'In last week’s export, not in this week’s (1): ' },
            'Kipling Rumbleford (Otis Marmaduke, Lead last week). Deleted, merged, moved out of view or outside the export’s filter: the export doesn’t say which.',
          ],
        },
        { h: '1. Deals past their expected close date (2)' },
        {
          items: [
            'Ferdinand Rattlecap, 77 Marzipan Ct (Pending; Otis Marmaduke): expected close 10/30/2026, 11 days past (11/10/2026 minus 10/30/2026 = 11 days). In Pending since 09/22/2026 (11/10/2026 minus 09/22/2026 = 49 days). Price as exported: 538000.',
            'Petunia Quillby, 418 Gumdrop Way (Under Contract; Barnaby Crumpet): expected close 11/06/2026, 4 days past (11/10/2026 minus 11/06/2026 = 4 days). In Under Contract since 09/28/2026 (11/10/2026 minus 09/28/2026 = 43 days). Price as exported: 412500.',
          ],
        },
        { h: '2. Appointment set, no next step in the export (3)' },
        {
          p: [
            'Each is in an appointment stage, in the same stage as last week’s export, with no open deal in the Deals export and nothing logged in more than 7 days.',
          ],
        },
        {
          items: [
            'Rufus Puddingstone (Met with Customer; Hazel Tinkersnap): no communication logged.',
            'Pemberton Quibblesworth (Appointment Set; Juniper Fogwhistle): last communication 10/21/2026 (11/10/2026 minus 10/21/2026 = 20 days).',
            'Tilda Fizzlebottom (Met with Customer; Barnaby Crumpet): last communication 10/27/2026 (11/10/2026 minus 10/27/2026 = 14 days).',
          ],
        },
        { h: '3. Hot or active, nothing logged in more than 7 days (7)' },
        {
          items: [
            'Bertram Puddlejump (Nurture, tagged Hot; Clementine Puddleby): last communication 10/10/2026 (11/10/2026 minus 10/10/2026 = 31 days); the lead’s own Last Activity is 11/02/2026, after the last communication.',
            'Henrietta Hobnob (Attempted Contact, tagged Hot; Hazel Tinkersnap): last communication 10/20/2026 (11/10/2026 minus 10/20/2026 = 21 days); the lead’s own Last Activity is 11/09/2026, after the last communication.',
            'Wendell Crumbleton (Showing Homes; Barnaby Crumpet): last communication 10/24/2026 (11/10/2026 minus 10/24/2026 = 17 days); the lead’s own Last Activity is 11/08/2026, after the last communication.',
          ],
        },
        { h: '4. Stages with no movement since last week (2)' },
        {
          items: [
            'Met with Customer: the same 3 people as last week, and no one entered or left: Tilda Fizzlebottom, Rufus Puddingstone, Posy Bumbershoot (all three are also above).',
            'Submitting Offers: the same 2 people as last week, and no one entered or left: Ambrose Sprocketton, Esmeralda Inkwhistle.',
          ],
        },
        { h: 'Conversion by lead source' },
        {
          table: {
            caption: 'People added 08/12/2026 through 11/10/2026, by the stage each is in now',
            head: ['Lead source', 'Added', 'Appointment or further', 'Under contract or closed'],
            rows: [
              ['Zillow', '11', '4 / 11 = 36.4%', '1 / 11 = 9.1%'],
              ['Realtor.com', '8', '3 / 8 = 37.5%', '1 / 8 = 12.5%'],
              ['Website', '8', '3 / 8 = 37.5%', '0 / 8 = 0.0%'],
              ['Facebook', '6', '0 / 6 = 0.0%', '0 / 6 = 0.0%'],
              ['All', '39', '16 / 39 = 41.0%', '2 / 39 = 5.1%'],
            ],
          },
        },
        {
          p: [
            'These rates go by current stage, so anyone who reached an appointment and later went to Nurture, Rejected or Trash counts only in the last column: the rates are a floor. For closed-deal conversion and lead source return, Follow Up Boss’s Lead Source report and Sisu stay the source of record; this is a snapshot for the meeting.',
          ],
        },
        { h: 'Questions for each agent' },
        { p: [{ strong: 'Otis Marmaduke' }] },
        {
          items: [
            'Ferdinand Rattlecap, 77 Marzipan Ct (Pending, expected close 10/30/2026, 11 days past): what is the new expected close date, and what is it waiting on?',
            'Delphine Fluffernutter (Spoke with Customer, last communication 10/30/2026, 11 days ago): what is the plan for this week?',
          ],
        },
        { h: 'Odd rows (flagged, not fixed)' },
        {
          table: {
            caption: 'Each left as is for a person to fix in Follow Up Boss',
            head: ['Name', 'What’s odd', 'How it was treated'],
            rows: [
              ['Leopold Whiffletree', 'Last Activity 11/14/2026 is after the as-of date 11/10/2026', 'Not used; check the record'],
              ['Millicent Twiddlesworth', 'No stage in the row', 'Counted under (no stage); left out of the decision list'],
              ['Ottoline Velveteen, 9 Toffee Ln', 'Stage Closed with no close date', 'Left as is; not counted anywhere a close date is needed'],
            ],
          },
        },
        { h: 'Check before sending' },
        {
          items: [
            'As-of date: 11/10/2026, from your message (“downloaded November 10, 2026”) and the file names. Stale: more than 7 days (default). Conversion period: 08/12/2026 through 11/10/2026 (default).',
            'Deal stages read by name: Buyer Agreement, Listed, Pending and Under Contract as open; Closed as closed; Fell Through as fell through. If Listed or Buyer Agreement means something else on your team, tell me and I’ll rerun.',
            'Rates: every rate above shows its numerator and denominator; they count people by current stage.',
            'Privacy: no email address, phone number or note text appears in this review. The attached pipeline_review.md holds lead names: share it only with the people in the meeting.',
          ],
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order".
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags and a bottom line',
          body: 'The date every day count runs to and where it came from, anything missing and what it stopped, and odd rows. Then three sentences: the active pipeline, what’s on each decision list, the first item to discuss, and what moved.',
        },
        {
          title: 'The pipeline by stage',
          body: 'How many people are in each stage, now and last week, how many were last contacted within 7 days, how many longer, how many have nothing logged, and the oldest, with the math written out. Deals by stage with days in stage.',
        },
        {
          title: 'What moved since last week',
          body: 'Every stage change, person by person, the people new this week, and the people no longer in the export. Only with last week’s export. Without it, the skill says movement wasn’t checked.',
        },
        {
          title: 'Needs a decision this week',
          body: 'Deals past their expected close date. People with an appointment set and no next step in the export. Hot or active leads with nothing logged in more than 7 days. Stages where no one entered or left since last week. Each with its dates and the math.',
        },
        {
          title: 'Conversion, with the math',
          body: 'By lead source and by agent, for the period you choose, every rate with its numerator and denominator, such as “4 / 11 = 36.4%.”',
        },
        {
          title: 'Questions for each agent',
          body: 'For the meeting, one per record: what’s the next step, and when? Each agent’s counts beside them, facts only.',
        },
        {
          title: 'Odd rows, flagged',
          body: 'A closed deal with no close date, a date after the export date, a date that isn’t a date. Listed for a person to fix, never fixed.',
        },
        {
          title: 'Check before sending',
          body: 'Every date, stage reading, deal and rate to confirm before the review goes to your meeting, plus the file with every count.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own and page-notes.md's, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI counts. Your agents give next steps. You decide.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the counting',
          body: 'Reads your exports, reads each stage, works out every date difference and rate with code, matches last week’s people to this week’s, and builds the lists and questions.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The review, the questions for each agent, and Smart List steps when a fix belongs in Follow Up Boss. Nothing is changed or sent.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'What happens to each lead and deal, every change in Follow Up Boss, and any judgment about an agent’s work. The AI never ranks or judges anyone.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need". No ChatGPT limits as numbers.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on, so Claude can count from your files. Claude’s help center lists skills on every plan, Free included, but we haven’t tested Free.',
          tag: 'Team or Enterprise: an owner turns on code execution',
        },
        {
          title: 'Or a ChatGPT plan',
          body: 'The ChatGPT version goes in a Project, a folder in ChatGPT that keeps instructions and files together. It needs data analysis, which ChatGPT’s free plan limits.',
        },
        {
          title: 'Follow Up Boss export rights',
          body: 'The Account Owner, or a user the owner gave Can Export. An agent’s export holds only that agent’s people. Deals only if your team uses Follow Up Boss Deals.',
        },
        {
          title: 'No connector needed',
          body: 'A connector links the AI to another app. You don’t need one: the skill works from your exports and never changes anything in Follow Up Boss.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say".
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat, attach your exports, and paste. In ChatGPT, start the chat inside the Project. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'To start, with your exports attached',
          items: [
            'Pipeline meeting is tomorrow. This week’s FUB export, last week’s and our Deals report are attached. Run the pipeline review.',
            'Here’s our Follow Up Boss export. What needs a decision this week?',
          ],
        },
        {
          label: 'To change the settings',
          items: ['Run the review with 10 days instead of 7 for stale, and conversion for October.'],
        },
        {
          label: 'In the same chat, after the review',
          items: ['Just the questions for each agent.', 'Give me the Smart List steps for list 3 so we can watch it in Follow Up Boss.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, "What Follow Up Boss Reporting and Sisu Already Give, and What This Adds".
          q: 'Follow Up Boss and Sisu already have reports. Why this?',
          a: [
            'They already show a lot: Follow Up Boss’s reports cover each agent’s leads, lead sources and closed deals, appointments, and each deal’s stage and close date, and its default Met/Appt Set list shows appointments with no communication in 6 days. Sisu turns that activity into dashboards against goals and reports lead source return. This skill adds one dated list of what needs a decision this week across every agent, the math behind every date, last week against this week person by person, and a question for each agent. For official conversion and lead source return, those reports stay the source of record.',
          ],
        },
        {
          // references/review-rules.md, "Aging"; references/fub-exports.md.
          q: 'What does “no communication logged” mean?',
          a: [
            'Nothing is logged in Follow Up Boss. Calls and texts from an agent’s personal phone don’t show unless someone logs them. So the skill asks the agent about the next step. It never calls a lead ignored.',
          ],
        },
        {
          // references/fub-exports.md, "Last Week's People Export"; case 2's run.
          q: 'Why does it need last week’s export?',
          a: [
            'Follow Up Boss doesn’t keep a weekly snapshot of everyone’s stage. With last week’s file, the skill lists every stage change and every stage where no one moved. Without it, it says nothing about what moved. Save each week’s export with the date in its name.',
          ],
        },
        {
          // SKILL.md, Guardrails; case 2's run.
          q: 'Will it tell me which agent is underperforming?',
          a: [
            'No. It gives each agent’s counts and dates and the questions for the meeting. A judgment about a person is yours, made with them in a 1:1. It never ranks agents.',
          ],
        },
        {
          // page-notes.md, "What to Upload": "Deals Report" and "Exporting reports to a spreadsheet", read
          // through search excerpts 2026-11-10.
          q: 'Where does the Deals report come from?',
          a: [
            'In Follow Up Boss, open ',
            { strong: 'Reporting' },
            ' and the Deals report. Set the users, time frame and filters in the upper right, use ',
            { strong: '+ Add Columns' },
            ' under the graph to add Price, then click the export icon and export to CSV. To keep buyer and seller deals apart, export each pipeline on its own.',
          ],
        },
        {
          // page-notes.md, "What Was and Wasn't Tested".
          q: 'Has it been tried on real exports?',
          a: [
            'Not yet. It was tested on made-up files laid out the way Follow Up Boss’s help center describes its exports. The help center doesn’t say whether Last Communication and Last Activity come through when you export all columns, so turn them on in the People view first. If one is missing, the skill says so and what it couldn’t check. We haven’t tried the ChatGPT version inside ChatGPT yet.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Cleaning up or re-engaging your whole database rather than this week’s pipeline? ',
        { link: 'Database Health Check', href: '/database-health-check', sameTab: true },
        ' is built for that.',
      ],
    },
  ],

  unlockKey: 'fubpr-unlocked',
});
