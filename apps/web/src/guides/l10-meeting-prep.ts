// Every word on /l10-meeting-prep that is its own: the landing page for L10 Meeting Prep, a skill
// (`skills/l10-meeting-prep/`, version 1.0) that preps a real estate team's integrator or team leader for
// the weekly EOS Level 10 Meeting from what they export or paste: the scorecard (Ninety, Bloom Growth,
// formerly Traction Tools, or a spreadsheet), the rocks, last week's to-dos, the issues list and the
// headlines. It hands back the agenda with times, every number against its own goal, empty cells flagged
// for their owners, rocks with the status each owner gave, the to-do completion rate with its arithmetic,
// a suggested IDS order, possible drop-downs, a note to owners and Check Before Sending. What every skill
// page says the same way is in `skill-page.ts` (D-052).
//
// The skill is paid (in the Amplified Skill Library, not in `FREE_SKILLS`), so the built page shows its
// hero and sample with the Skill Library card in place of the sign-up and the setup, and `content.ts`
// takes "Free" off its title, description and eyebrow (D-082). The words below are written as a free
// page, for the day Connor names it free, as every skill page's are.
//
// The words come from the skill itself (SKILL.md and references/l10-agenda.md, prep-rules.md and
// exports.md), its page notes, and its graded runs (case 1 at 11 of 11, case 2 at 11 of 11, the practice
// run at 10 of 10, every run passing the objective checks), so the page promises what the skill does. The
// sample is sample.md, the graded practice run, cut only by whole rows, items and sentences; the note to
// owners is whole.
//
// What the page holds to, as SKILL.md does: read only, never writes to Ninety, Bloom Growth or a
// spreadsheet, never sends the note. It never fills an empty cell, never calls a rock on or off track,
// never adds an issue, and never judges a person. The agenda is EOS Worldwide's published one, cited in the
// skill with a Last verified date; the page names EOS Worldwide only as the agenda's source and says the
// skill isn't affiliated with it, Ninety or Bloom Growth.
//
// Calls left open, and how the page handles them:
//   - Ninety's own Meetings tool already runs the L10 (agenda, live timer, scorecard, rocks, headlines,
//     open to-dos, issue voting; Ninety's "Introduction to Meetings," 2026-10-07). The FAQ says so and
//     says what this adds (who still owes a number or status, the completion rate worked out, a
//     suggested IDS order, the whole page for spreadsheet teams). Connor confirms it earns its place.
//   - The 90% to-do line: quoted once, from an EOS Worldwide blog post, for the team's rate only. The
//     page mentions it only in the FAQ, as the post's figure.
//   - Real exports: no real Ninety or Bloom Growth download has been run. Bloom's help center names its
//     CSVs but not their columns. The page says the skill shows which column it read for what, and the
//     FAQ says real exports are untested.
//   - Plans: Claude's help center lists skills on every plan, Claude's docs on Pro and up; ChatGPT needs
//     data analysis, which its free plan limits. No ChatGPT Free numbers. The ChatGPT version has not been
//     run inside ChatGPT.
//
// Export click paths are page-notes.md's, each from the vendor's help center, checked 2026-11-10.
// `setupMinutes` is an estimate (page-notes gives none): 10, as on the other skill pages with a ChatGPT
// version. The note points to Inbox and Meeting Follow-Through, the sibling for pulling commitments out
// of meetings afterward (SKILL.md's description names it).
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const L10_MEETING_PREP: Guide = skillPage({
  slug: 'l10-meeting-prep',
  skill: 'l10-meeting-prep',
  title: 'L10 Meeting Prep',

  meta: {
    title: 'L10 Meeting Prep: A Free AI Skill · Amplified Impact',
    description:
      'Attach your scorecard, rocks, to-dos and issues list, and walk into your weekly L10 with the agenda timed, every number checked against its own goal, and nothing missing filled in by guesswork. A free skill for Claude and ChatGPT. It only reads.',
  },

  eyebrow: 'Free AI Skill · For Integrators and Team Leaders',
  // page-notes.md, "One-Line Promise".
  lede: 'Attach your scorecard, rocks, to-dos and issues list, and walk into your L10 with the agenda timed, every number checked against its own goal, and nothing missing filled in by guesswork.',
  outcome: { n: '03', title: 'Walk In Ready', body: 'The agenda timed, every number checked, and who still owes you one.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. Either one reads your exports and never changes anything in Ninety, Bloom Growth or your spreadsheet.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word.
    prompt: 'Prep our L10 for Tuesday, November 17 at 9:00 AM. Our scorecard, rocks, to-dos, issues list and headlines are attached.',
    note: [
      'There are five files: a made-up leadership team’s scorecard (13 weeks, in the layout of Ninety’s export), rocks, to-dos, issues list and headlines. Every name, street and number in them is made up. ',
    ],
  },

  real: {
    body: ['Start a new chat the same way, attach this week’s exports, and say this with your own day and time.'],
    prompt: 'Prep our L10 for [day] at [time]. Our scorecard, rocks, to-dos, issues list and headlines are attached.',
    // page-notes.md, "What to Upload": Ninety's "Printing and Exporting Scorecards" (updated 2026-09-16),
    // checked 2026-11-10. Bloom Growth's and the other exports are in the FAQ.
    note: [
      'To export the scorecard from Ninety, click ',
      { strong: 'Data' },
      ' in the left navigation, pick your team and the ',
      { strong: 'Weekly' },
      ' tab, set the ',
      { strong: 'Date Range' },
      ' to cover 13 weeks, click the ',
      { strong: '...' },
      ' at the far right of the toolbar, then ',
      { strong: 'Export as CSV' },
      '. Before the prep goes to your team, check the ',
      { strong: 'Check before sending' },
      ' list against your exports.',
    ],
  },

  chatgpt: { paste: chatgptPaste('l10-meeting-prep') },

  sections: [
    {
      // sample.md (the practice run, 10 of 10 planted checks), shortened, in the output's own order and
      // words, cut only by whole rows, items and sentences: the bottom line in full; one What I Used line;
      // the scorecard table in five of its seven columns (the week before and the 13-week count scroll out
      // of sight on a phone) and the empty cells; the rock table in three of four columns; the to-do rate
      // line; the first four rows of the suggested IDS order in three columns; two possible drop-downs;
      // the note to owners in full; and four check lines. Left out: the agenda (its times are in "What you
      // get back"), the headlines and the to-do table.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What an L10 prep looks like',
      body: 'What Claude wrote from the practice files: a made-up leadership team’s scorecard, rocks, to-dos, issues list and headlines. They’re the same files you practise on in setup.',
      title: 'L10 Prep: Butterbean & Bramble Leadership Team, Tuesday, November 17, 2026, 9:00 AM',
      note: 'Made-up example. Shortened: parts of most sections, four of eight issues, and four rows of the check list.',
      blocks: [
        { h: 'Bottom line' },
        {
          p: [
            'Last week (November 9 to 15, 2026), 4 of 10 measurables missed their goal, and Database Touches is empty for Hazel Snickerdoodle. Rocks as their owners gave them: On Track 3, Off Track 1, Done 1, and 1 with no status given; last week’s to-dos came in at 7 done / 10 = 70.0%. Suggested first issue for IDS: the Gingersnap Court seller who asked to cancel the listing agreement by Friday 11/20.',
          ],
        },
        { h: 'What I used' },
        {
          p: [
            'Week reviewed: 11/09/2026 to 11/15/2026. The column for 11/16/2026 to 11/22/2026 has no numbers yet, so it was left out.',
          ],
        },
        { h: 'Scorecard: week of November 9 to 15, 2026' },
        {
          table: {
            caption: 'Each measurable against its own goal',
            head: ['Measurable', 'Owner', 'Goal', 'This week', 'Result'],
            rows: [
              ['Leads Added', 'Wren Tumbletop', 'at least 60', '64', 'Hit'],
              ['Speed to Lead (Minutes)', 'Wren Tumbletop', 'at most 5', '7', 'Miss'],
              ['Conversations', 'Basil Thistlewaite', 'at least 150', '131', 'Miss'],
              ['Appointments Set', 'Wren Tumbletop', 'at least 12', '12', 'Hit'],
              ['Appointments Met', 'Basil Thistlewaite', 'at least 9', '7', 'Miss'],
              ['Buyer Agreements Signed', 'Basil Thistlewaite', 'at least 4', '4', 'Hit'],
              ['Listing Agreements Signed', 'Clementine Quillfeather', 'at least 2', '1', 'Miss'],
              ['New Pendings', 'Otis Puddlecomb', 'at least 3', '3', 'Hit'],
              ['Closings', 'Otis Puddlecomb', 'at least 2', '2', 'Hit'],
              ['Database Touches', 'Hazel Snickerdoodle', 'at least 200', '(empty)', 'Empty: owner to fill'],
            ],
          },
        },
        { h: 'Empty cells for owners' },
        {
          p: [
            'These stay empty until each owner gives the number. An empty cell is neither a hit nor a miss.',
          ],
        },
        {
          items: [
            'Database Touches, Hazel Snickerdoodle, 11/09/2026 to 11/15/2026 (the week reviewed)',
            'Appointments Met, Basil Thistlewaite, 10/12/2026 to 10/18/2026',
            'Speed to Lead (Minutes), Wren Tumbletop, 09/21/2026 to 09/27/2026',
          ],
        },
        { h: 'Rock review' },
        {
          table: {
            caption: 'Status exactly as each owner gave it in the file',
            head: ['Rock', 'Owner', 'Status given'],
            rows: [
              ['Launch the Past Client Event Calendar', 'Hazel Snickerdoodle', 'On Track'],
              ['Hire and Onboard a Second ISA', 'Marigold Fiddlesworth', 'Off Track'],
              ['Get the Listing Presentation Under 45 Minutes', 'Clementine Quillfeather', 'On Track'],
              ['Move Every Transaction Into One Checklist', 'Otis Puddlecomb', 'Done'],
              ['Rebuild the Buyer Consult Script', 'Basil Thistlewaite', 'No status given'],
              ['Clean Up the CRM Stages', 'Wren Tumbletop', 'On Track'],
            ],
          },
        },
        { h: 'To-do list' },
        {
          p: [
            { strong: 'Completion rate: 7 done / 10 with a status = 70.0%. ' },
            'Counted: the 10 to-dos due 11/11/2026 through 11/17/2026, the 7 days up to the meeting.',
          ],
        },
        { h: 'IDS: issues list and suggested order' },
        {
          p: [
            { strong: 'A suggestion only. ' },
            'The team picks its top three in the meeting. Order: a dated client, contract or money deadline first; then issues tied to this week’s misses or a rock its owner gave as off track; then the rest, oldest first.',
          ],
        },
        {
          table: {
            caption: 'The first four of eight',
            head: ['Order', 'Issue (as written)', 'Why here'],
            rows: [
              ['1', 'Seller on Gingersnap Court wants out of the listing agreement', 'A client asked to cancel by Friday 11/20'],
              ['2', 'Speed to lead slipping on weekend portal leads', 'Speed to Lead (Minutes) missed: 7 against at most 5'],
              ['3', 'Second ISA hire: two candidates declined', 'Rock “Hire and Onboard a Second ISA” given as Off Track'],
              ['4', 'Buyer agents not logging appointments met in the CRM', 'Appointments Met missed: 7 against at least 9'],
            ],
          },
        },
        { h: 'Possible drop-downs (not on the list)' },
        {
          items: [
            'Conversations: 131 against at least 150.',
            'Listing Agreements Signed: 1 against at least 2.',
          ],
        },
        { h: 'Note to owners (draft)' },
        {
          email: {
            subject: 'Scorecard Numbers And One Rock Status Needed Before Tuesday’s L10',
            body: [
              'Hi team,',
              'A few things are missing before our L10 on Tuesday, November 17 at 9:00 AM. Please add them before the meeting:',
              'Hazel: Database Touches for the week of 11/09.',
              'Basil: your rock status for Rebuild the Buyer Consult Script (on track or off track), and, if you have it, Appointments Met for the week of 10/12.',
              'Wren: if you have it, Speed to Lead (Minutes) for the week of 09/21.',
              'Thanks,',
              '[Your Name]',
            ],
          },
        },
        { h: 'Check before sending' },
        {
          items: [
            'Misses, each against its own goal in the file: Speed to Lead (Minutes) 7, goal <= 5; Conversations 131, goal >= 150; Appointments Met 7, goal >= 9; Listing Agreements Signed 1, goal >= 2.',
            'Empty cells: Database Touches 11/09 (Hazel Snickerdoodle), Appointments Met 10/12 (Basil Thistlewaite), Speed to Lead (Minutes) 09/21 (Wren Tumbletop). None was filled.',
            'Rocks: statuses copied from the file; Rebuild the Buyer Consult Script has no status given.',
            'Completion rate: 7 done / 10 with a status = 70.0%, to-dos due 11/11/2026 through 11/17/2026. Left out: one carried over (due 11/06/2026) and one not due yet (due 11/24/2026).',
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
          title: 'A bottom line',
          body: 'Three sentences at most: the week reviewed, the misses and empty cells, the rocks by status, the to-do completion rate, and the issue suggested first.',
        },
        {
          title: 'What the AI used',
          body: 'Each file, the week it reviewed, how it read each goal (and any it had to assume, for you to confirm), and anything missing.',
        },
        {
          title: 'The agenda, timed',
          body: 'EOS Worldwide’s seven sections in order with clock times from your start time: Segue, Scorecard, Rock Review, Headlines and To-Do List at 5 minutes each, IDS at 60, and Conclude. 90 minutes.',
        },
        {
          title: 'The scorecard',
          body: 'Each measurable against its own goal, in that goal’s own direction, with misses marked and how many of the last 13 weeks missed. Every empty cell is listed with its owner and never filled in.',
        },
        {
          title: 'Rocks and headlines',
          body: 'Each rock with the status its owner gave, or “no status given.” Headlines as given, with any personal detail, such as a health matter, left out.',
        },
        {
          title: 'Last week’s to-dos',
          body: 'Done or not done for each, and the team’s completion rate with the math written out. To-dos with no status are named and left out of the rate.',
        },
        {
          title: 'A suggested IDS order',
          body: 'Your issues list as written, ordered by dated client or money deadlines first, then issues tied to this week’s misses or an off-track rock, then the rest, each with its reason. A suggestion: your team picks.',
        },
        {
          title: 'A note to owners',
          body: 'When a number or a status is missing, a short message asking each owner for exactly what’s missing, for you to send.',
        },
        {
          title: 'Check before sending',
          body: 'Every miss, empty cell, assumed goal, status and date to confirm before the prep goes to your team, plus the file with every count.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own and page-notes.md's, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI counts. Your owners report. Your team decides.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the counting',
          body: 'Reads your exports, sorts the weeks, reads each goal, finds every miss and every empty cell, and counts the to-dos, all with code, not by eye.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The prep, the suggested IDS order, and the note asking owners for missing numbers or statuses. Nothing is sent.',
        },
        {
          label: 'Own',
          title: 'Always your team’s',
          body: 'Each owner’s numbers and rock status. What drops to the Issues List, which issues you IDS, and how they’re solved. The AI never fills a number, calls a rock, or judges anyone’s work.',
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
          title: 'Your exports',
          body: 'From Ninety or Bloom Growth (formerly Traction Tools), with a role that can export, or your team’s spreadsheet. Pasted lists work too.',
        },
        {
          title: 'No connector needed',
          body: 'A connector links the AI to another app. You don’t need one: the skill works from your exports and never changes anything in your EOS tool.',
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
            'Prep our L10 for Tuesday at 9:00 AM. Our Ninety exports are attached.',
            'Here’s our scorecard and issues list. What’s off track this week, and what should we IDS first?',
          ],
        },
        {
          label: 'With headlines to paste',
          items: ['Our L10 is Monday at 10. Bloom Growth export attached. Headlines: [paste them]'],
        },
        {
          label: 'In the same chat, after the prep',
          items: [
            'Just the scorecard: which numbers missed, and who still owes me a number?',
            'Write the note to the owners who haven’t put in their numbers.',
          ],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, FAQ; Ninety's "Introduction to Meetings" (2026-10-07), checked 2026-11-10.
          q: 'We already run our L10 in Ninety. Why this?',
          a: [
            'Ninety’s Meetings tool runs the L10 itself, with the agenda, a timer, the scorecard, rocks, headlines, open to-dos and issue voting. This is the prep before it: who still owes a number or a rock status, last week’s completion rate worked out, and a suggested order for IDS. Teams on a spreadsheet get the whole page.',
          ],
        },
        {
          // SKILL.md, Guardrails; case 2's run.
          q: 'Why won’t it fill in a missing number?',
          a: [
            'A filled-in number reads like a real one in the meeting. Only the owner can give it. So the skill leaves the cell empty, lists it with its owner and week, and drafts the note asking for it. It does the same for a rock with no status: it never calls a rock on or off track.',
          ],
        },
        {
          // references/exports.md, "How a Goal Is Read"; case 1's run.
          q: 'How does it decide what’s a miss?',
          a: [
            'Each measurable against its own goal, in that goal’s direction, such as “80+” or “<= 5.” When a goal has no direction, the skill says so, reads it from the measurable’s name (minutes and days read as “at most”), and lists it for you to confirm with the owner.',
          ],
        },
        {
          // page-notes.md, "What to Upload": Ninety's export articles (2026-04-24 to 2026-09-16) and Bloom
          // Growth's "Exporting Data," checked 2026-11-10.
          q: 'Where do the other exports come from?',
          a: [
            'In Ninety: ',
            { strong: 'Rocks' },
            ', then the ',
            { strong: '...' },
            ' and ',
            { strong: 'Download Excel' },
            '. ',
            { strong: 'To-Dos' },
            ' and ',
            { strong: 'Issues' },
            ' each have a Download button on the filter bar; for to-dos, turn on ',
            { strong: 'Archive' },
            ' first to include archived ones, and attach both downloads if you need both. In Bloom Growth: ',
            { strong: 'Meetings list' },
            ', the three dots by your meeting, then ',
            { strong: 'Export All' },
            '. Unzip it and attach the files. A spreadsheet works too, with an Owner and a Goal column.',
          ],
        },
        {
          // page-notes.md, "What Was and Wasn't Tested".
          q: 'Has it been tried on real exports?',
          a: [
            'Not yet. It was tested on made-up files laid out the way Ninety’s help center describes its exports, and on made-up files named the way Bloom Growth names its meeting export. Bloom doesn’t publish its columns, so the skill shows which column it read for what. Check that on your first run. We haven’t tried the ChatGPT version inside ChatGPT yet.',
          ],
        },
        {
          // references/l10-agenda.md; page-notes.md, FAQ.
          q: 'Is this from EOS Worldwide?',
          a: [
            'No. The agenda comes from EOS Worldwide’s public pages, and the skill cites them. EOS and the Level 10 Meeting belong to EOS Worldwide. The skill isn’t affiliated with EOS Worldwide, Ninety or Bloom Growth. One EOS Worldwide blog post calls a 90% to-do completion rate the minimum; the skill quotes it once, for the team’s rate, never for one person.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Pulling commitments out of meetings and email afterward? ',
        { link: 'Inbox and Meeting Follow-Through', href: '/inbox-meeting-follow-through', sameTab: true },
        ' is built for that.',
      ],
    },
  ],

  unlockKey: 'l10-unlocked',
});
