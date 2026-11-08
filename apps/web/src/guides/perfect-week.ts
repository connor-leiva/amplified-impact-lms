// Every word on /perfect-week that is its own: the landing page for Perfect Week, Connor's own free
// Claude skill (`skills/perfect-week/`, version 1.1, uploaded 2026-11-08) that plans a working week from
// someone's real calendar and task list, and only after a clear yes builds it in Google Calendar with
// no guests or invites. What every skill page says the same way is in `skill-page.ts` (D-052).
//
// The words come from the skill itself (SKILL.md and references/calendar-build.md and
// reading-exports.md), its page notes and its graded runs (three evals and the practice run, all passed,
// plus a second reviewer's runs of case 2 and the practice prompt), so the page promises what the skill
// does. The sample is sample.md, the graded practice run, cut only by whole items and sentences.
//
// Claude only (skill.json): the skill's core is the calendar build with notifications off, the plan
// page and code that reads the exports, which a ChatGPT Project can't do. The practice needs no
// connector (two made-up exports, attached file by file), so connecting Google Calendar is this
// skill's own step (`extraClaudeSteps`), after the practice, as page-notes.md says.
//
// Plans and the connector, as page-notes.md "What You Need" and the review found them on 2026-11-08:
//   - Skills: Claude's help center lists them on every plan, Free included; Claude's docs say Pro and up.
//     The page states both and never says "Pro or higher" as a fact.
//   - The Google Calendar connector: the help center says all users and that it can create events;
//     Claude's docs say Pro and up and read only; the connector listing says it can create events. The
//     page says the pages differ and that without it the person gets the plan and an .ics file to
//     import (SKILL.md step 8, references/calendar-build.md). It never promises the build on Free.
//   - No direct link to Customize > Connectors: no source checked one, so that step has no button.
//
// `setupMinutes` is an estimate from the steps (page-notes gives none). The export click paths are
// page-notes.md's, each from the vendor's help center (checked 2026-11-08); Asana's menu labels could
// not be checked, so the page says to look in Asana's help center.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { skillPage } from './skill-page';

export const PERFECT_WEEK: Guide = skillPage({
  slug: 'perfect-week',
  title: 'Perfect Week',

  meta: {
    title: 'Perfect Week: A Free Claude Skill · Amplified Impact',
    description:
      'Attach your calendar and task list, and Claude plans a week that fits inside your working hours, with a summary for your manager. Claude never invites anyone or touches meetings with other people. A free Claude skill.',
  },

  eyebrow: 'Free Claude Skill · For Agents and Teams',
  // page-notes.md, "The Promise", without promising the calendar build, which depends on the connector.
  lede: 'Claude turns your real calendar and task list into a week that fits inside your working hours, and puts nothing on your calendar until you say yes.',
  outcome: { n: '03', title: 'Get a Week That Fits', body: 'Inside your hours, with a summary for your manager.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. Claude plans first, never invites anyone, and never touches meetings with other people.',
  setupMinutes: 5,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophes, as on every page).
    prompt:
      'Plan my perfect week. I’m a team leader and I’m behind on everything. Nothing is connected here; my Google Calendar export and my ClickUp export are attached. I work 8 to 5 Mountain, Monday to Friday, and I’m out by 3:30 on Thursdays for school pickup. Lunch at noon, 30 minutes. No evenings or weekends for project work; listing appointments and the odd open house are client time. Morgan, my ops manager, can take about 4 hours a week. Tatum runs our transactions. Plan through December 18; I’m off November 26 and 27. Pat (the owner) wants me at about 5 hours a week on recruiting, and the Monday huddle and Tuesday team meeting stay. Go straight through to the summary for Pat; I’ll look before anything goes on my calendar.',
    // page-notes.md: the .txt rename is the fallback, since Claude's upload list doesn't name .ics.
    note: [
      'Every name, address and date in them is made up. If Claude won’t take the .ics file, rename it so its name ends in .txt and attach it again. Already connected Google Calendar? Switch it off for this chat (',
      { strong: '+' },
      ', then ',
      { strong: 'Connectors' },
      ') so Claude plans from the practice files only. ',
    ],
  },

  // page-notes.md, "What You Need": the connect path (Claude's docs and help center, checked 2026-11-08)
  // and the wording it says the page should use, since Anthropic's pages disagree.
  extraClaudeSteps: [
    {
      title: 'Connect Google Calendar',
      body: [
        'Optional. A connector links Claude to another app. To have Claude add the blocks to your calendar for you, click ',
        { strong: 'Customize' },
        ' on the left side of Claude, then ',
        { strong: 'Connectors' },
        '. Find ',
        { strong: 'Google Calendar' },
        ', click ',
        { strong: 'Connect' },
        ', and sign in to Google.',
      ],
      note: [
        'Anthropic’s own pages differ on which plans have this connector and on whether it can add events. If you can’t connect it, or it can only read your calendar, Claude gives you the plan and a calendar file to import instead. Everything before this step works with no connector at all. On a Team or Enterprise plan, an owner adds the connector first.',
      ],
    },
  ],

  real: {
    body: [
      'Start a new chat in Claude, attach your calendar export (an .ics file) and your task list (a CSV file or spreadsheet), and say this. “Where to get your files,” below, shows how to export each one.',
    ],
    prompt: 'Plan my perfect week.',
    // SKILL.md step 1 (intake first), the per-chat switch for a connector, and step 7's check list.
    note: [
      'Connected Google Calendar? Switch it on for the chat instead (',
      { strong: '+' },
      ', then ',
      { strong: 'Connectors' },
      ') and attach just your task list. Claude asks a few questions first, like your hours and your end date. Before your summary goes to your manager, check every date, hour total, name and ask in the ',
      { strong: 'Check before sending' },
      ' list.',
    ],
  },

  sections: [
    {
      // sample.md (the practice run, 12 of 12 expectations), shortened, in the output's own order and
      // its own words, cut only by whole items and sentences: the bottom line, three reads, two days of
      // the week, the hours table, the holds and three flags, the task check with its weekly table and
      // the six moves, Morgan's load, the summary for Pat in full, one check line, and Before the
      // calendar. Left out: the fixed-meeting list, the task-by-task table and the projects table.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What a plan looks like',
      body: 'What Claude wrote from the practice files: a made-up team leader named Jordan, with a made-up calendar and task list. Nothing was connected, and nothing went on a calendar. They’re the same files you practise on in setup.',
      title: 'Jordan’s Perfect Week: Plan Through December 18',
      note: 'Made-up example. Shortened: a few lines from each step, and the summary for Pat in full.',
      blocks: [
        { h: 'Bottom line' },
        {
          p: [
            'It fits. Your task list needs about 50 hours through December 18 and the week below gives you 113 hours of focus blocks, so the problem isn’t the total; it’s that nothing has a home yet. Before anything else: two overdue items, a double-booking on Monday Nov 16, and two meetings still sitting on your days off.',
          ],
        },
        {
          p: [
            'Your intake answers covered everything I needed, so I went straight through steps 2 to 7 as you asked and stopped before the calendar. Plan page: ',
            { strong: 'Jordan’s Perfect Week' },
            ' (plan-page.html, attached). Nothing was connected and nothing was changed.',
          ],
        },
        { h: 'What I read' },
        {
          items: [
            'Placeholder: “Focus time,” Wed 1:00 to 2:30. The plan gives it a job.',
            'No reply yet: Lunch & Learn: 2027 Loan Programs (Thu Nov 12, 12:00 to 1:00) and Friendsgiving potluck (Wed Nov 18, 12:00 to 1:30). Are you going? You already declined the brokerage happy hour, so it’s not in your week.',
            'Contract deadlines posted by Transactions: Due Diligence Deadline (Fri Nov 13) and Settlement Deadline (Fri Nov 20), 210 Testwood Drive. For planning only; confirm dates with your transactions team.',
          ],
        },
        { h: 'Your week' },
        {
          p: [
            'Week A is the week of Nov 9, Nov 23 and Dec 7; Week B is Nov 16, Nov 30 and Dec 14 (your 1:1s alternate). New blocks are in plain text; existing meetings are in bold.',
          ],
        },
        {
          p: [
            { strong: 'Mon: ' },
            '8:00 Launch, 8:15 Comms sweep, 8:30 Huddle prep, ',
            { strong: '9:00 Team Huddle' },
            ', 9:30 to 11:30 Recruiting (a coffee or 4 to 6 recruit calls), 11:30 Open time, 12:00 Lunch, 12:30 to 2:30 Leadership project, 2:30 Break, 2:45 to 4:15 Your listings, 4:15 Comms sweep, 4:45 Shutdown.',
          ],
        },
        {
          p: [
            { strong: 'Thu: ' },
            '8:00 Launch, 8:15 Comms sweep, 8:30 Your listings (past-client calls from your CRM list), 9:30 1:1 prep, ',
            { strong: '10:00 1:1 Avery' },
            ' (Week A) or ',
            { strong: '1:1 Riley' },
            ' (Week B), 10:30 Hold: 1:1 Quinn Notreal (Week A, new), 11:00 to 12:00 Recruiting, 12:00 Lunch, 12:30 Open time, ',
            { strong: '1:00 TIMEBLOCK: Recruiting calls' },
            ', 2:00 Open time, 2:45 Comms sweep, 3:15 Shutdown, done 3:30.',
          ],
        },
        {
          table: {
            caption: 'Where the hours go (Week A, 43.5 hours: 8:00 to 5:00 Monday to Friday, Thursday to 3:30)',
            head: ['Area', 'Hours'],
            rows: [
              ['Leadership and coaching (6 of it project time, the rest prep and the two new holds)', '9.5'],
              ['Recruiting (4.5 new plus your existing Thursday calls block; Pat’s target is about 5)', '5.5'],
              ['Your listings', '5.5'],
              ['Operations and finance', '2.25'],
              ['Marketing', '2'],
              ['Rituals (launch, comms sweeps, shutdown, weekly review)', '6.75'],
              ['Lunch and breaks', '3'],
              ['Open time (about an hour a day, unassigned on purpose)', '5.5'],
              ['Existing meetings (3.0 in Week B)', '3.5'],
            ],
          },
        },
        {
          p: [
            { strong: 'Two new holds: ' },
            'Avery, Riley and Casey already have a standing meeting with you; Quinn and Drew don’t, under any name. So the plan adds Hold: 1:1 Quinn Notreal (every other Thu 10:30) and Hold: 1:1 Drew Fakely (every other Wed 3:00). No invites go out; you invite them when you’re ready.',
          ],
        },
        { p: [{ strong: 'Flagged on the board:' }] },
        {
          items: [
            'Mon Nov 16, 9:00: your coffee with Kit Prospectson (9:00 to 9:45) overlaps the Team Huddle. It’s your meeting with Kit, so you move it; 9:45 fits inside your recruiting block.',
            'Thu Nov 26 and Fri Nov 27 (your days off): your Thursday recruiting calls block and the Friday ops sync with Morgan are still on the calendar. The sync has Morgan on it, so you cancel or move it. The recruiting block is yours; I can remove that one date when we build if you say so.',
            'Tue Nov 10, 5:30 pm listing appointment and Sat Nov 21 open house are outside your hours. They’re client time, so they stay; their prep sits inside your week.',
          ],
        },
        { h: 'Task check' },
        {
          p: [
            'It fits. Your task list needs 50.25 hours through Dec 18 (47.75 hours of your own estimates plus 2.5 hours of mine for the agent check-ins), and your focus blocks give 113. The rest of that time is for work no task list holds: recruit calls toward Pat’s 5 hours, past-client calls, agent questions. Before fixes, two weeks spike: 14.5 hours come due the week of Nov 30 and 17.5 the week of Dec 14 (all 10 recruiting coffees are dated Dec 18).',
          ],
        },
        {
          table: {
            caption: 'Hours by week, through Dec 18',
            head: ['Week', 'Due that week, before fixes', 'Your work as placed, after fixes', 'Focus-block hours'],
            rows: [
              ['Nov 9', '6.75 h', '15.5 h', '20.25 h'],
              ['Nov 16', '5.5 h', '11.75 h', '18.75 h'],
              ['Nov 23 (3 days)', '2 h', '3.5 h', '13 h'],
              ['Nov 30', '14.5 h', '2 h', '20 h'],
              ['Dec 7', '3 h', '2 h', '21 h'],
              ['Dec 14', '17.5 h', '2 h', '20 h'],
            ],
          },
        },
        {
          p: [
            '“After fixes” includes about 2 recruiting coffees a week (none Thanksgiving week), so the 10 coffees spread out instead of landing on Dec 18.',
          ],
        },
        { p: [{ strong: 'The moves:' }] },
        {
          items: [
            'Hand five items to Morgan: 5.5 hours one-time plus 15 minutes a week (details under Hand-offs).',
            'Send the two transaction tasks back to Tatum. Updating the under-contract tracker and the compliance file review are the transactions team’s work, not hours in your week.',
            'Clear the two overdue items this week: receipts in Wednesday’s ops block, the October P&L in Friday’s sync with Morgan.',
            'Pull the Dec 4 work forward: the goals draft, the checklists and the presentation refresh all land before Thanksgiving, so Dec 4 isn’t a crunch.',
            'Move “Review business plan draft with Pat” from Dec 11 to the Dec 18 monthly review, if Pat agrees.',
            'Park “Rewrite team website bio” (no due date) to next quarter.',
          ],
        },
        { h: 'Hand-offs' },
        {
          p: [
            { strong: 'Morgan Placeholder, operations manager' },
            ' (cap: the 4 hours a week you said Morgan can take on). Load by week: 1.25, 1.25, 1.75, 2.25, 0.25, 0.25 hours. The highest week (Nov 30) is under the 4-hour cap. Hand these over in Friday’s ops sync, and ask Morgan whether that load works before you count on it.',
          ],
        },
        { h: 'Summary for Pat' },
        {
          p: [
            'Attached: summary.pdf, “Jordan’s Perfect Week: Plan Through December 18.” It carries the week board, hours by area, the project timeline with hours by week, Morgan’s load against the cap, and the asks. It leaves out your personal appointments, the gym, client details and anything with a dollar figure. The text, if you’d rather paste it:',
          ],
        },
        { p: [{ strong: 'Jordan’s Perfect Week: Plan Through December 18' }] },
        { p: ['A proposed weekly template for Nov 9 to Dec 18 (off Nov 26 and 27), built from my calendar and task list.'] },
        {
          p: [
            { strong: 'The week:' },
            ' launch, comms sweeps and shutdown every day; the Monday huddle and Tuesday team meeting stay where they are. Leadership project time Mon, Wed and Fri (6 hours a week), recruiting about 5.5 hours a week including my Thursday calls, my own listings 5.5 hours, operations 2.25, marketing 2, and about an hour a day of open time. 1:1s every other week for all five agents, with new holds for Quinn and Drew.',
          ],
        },
        {
          p: [
            { strong: 'Projects:' },
            ' the 2027 business plan and budget (draft ready for our Dec 18 review), the onboarding playbook’s first 30 days (outline by Nov 20, checklists by Dec 4, CRM video by Dec 11), the listing presentation refresh (by Dec 4) and 10 recruiting coffees by Dec 18. Nothing is late, with 18 hours of room from Nov 30 on.',
          ],
        },
        {
          p: [
            { strong: 'Hand-offs:' },
            ' Morgan takes five items (5.5 hours one-time, at most 2.25 hours in any week). Two transaction tasks go back to the transactions team.',
          ],
        },
        { p: [{ strong: 'The asks:' }] },
        { p: ['1. Move the business plan review from Dec 11 to the Dec 18 monthly review, or find an hour before Dec 11.'] },
        {
          p: ['2. Agree the recruiting target as about 5 hours in a normal week (5.5 planned) and 3.5 hours Thanksgiving week.'],
        },
        { p: ['3. Agree that Morgan takes the five items above.'] },
        { h: 'Check before sending' },
        {
          items: [
            'The asks: three, as listed. Check Morgan has agreed to the five items before Pat sees ask 3.',
          ],
        },
        { h: 'Before the calendar' },
        {
          p: [
            { strong: 'Not built.' },
            ' There’s no calendar connector in this chat, so I’ve stopped here and nothing has been added to your calendar. When you’re ready, two ways forward:',
          ],
        },
        {
          items: [
            'Connect Google Calendar (Customize, then Connectors), turn it on in this chat, and say yes to the scope below. I re-read your calendar first, fit the blocks around anything new, and build them with no guests and notifications off.',
            'Or I make a calendar file (.ics) of these blocks. You import it into a new “Perfect Week” calendar in Google Calendar, so one delete removes it all.',
          ],
        },
        {
          p: [
            { strong: 'What stays exactly as it is:' },
            ' every meeting with other people, your own named blocks, the gym, your personal appointments, the contract deadlines, and your “Focus time” placeholder unless you ask me to clear it.',
          ],
        },
        {
          p: [
            { strong: 'The three house rules:' },
            ' no guests on anything I create, and notifications off on every change; no edits, moves, deletes or RSVPs on anything with other people on it; your own events stay unless you say otherwise.',
          ],
        },
        { p: [{ strong: 'What would you change in the week before we go further?' }] },
      ],
    },
    {
      // SKILL.md's steps 1 to 8 and "Output, In This Order", in their order; page-notes.md "What Comes Back".
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'A few questions first',
          body: 'Your working hours, hard stops like school pickup, evenings, who can take work, your end date and days off, and anything your manager already agreed. Claude never asks for what your files already say.',
        },
        {
          title: 'Your calendar, sorted',
          body: 'Meetings with other people stay exactly where they are, and so do your own named blocks, like a listing appointment. Placeholders like “Focus time” get a job. Invites you haven’t answered come back as a question.',
        },
        {
          title: 'Your perfect week, on a plan page',
          body: 'A weekly template inside your hours, on one plan page Claude adds to at each step: a short launch and shutdown each day, lunch, focus blocks that each have a specific job, prep right before the meeting it feeds, and about an hour a day left open. Week A and Week B if your 1:1s alternate, with the hours added up by area. Double-bookings and meetings outside your hours are flagged, never moved.',
        },
        {
          title: 'A task check',
          body: 'Every task gets a place, an action (do it, hand it off, re-date it or park it) and hours. Then the hours you need against the hours your blocks give, week by week, with any gap shown plainly. Contract file work goes back to your transactions team.',
        },
        {
          title: 'Projects through your end date',
          body: 'Bigger projects broken into pieces and placed week by week, earliest due date first, with room to grow and a list of what moves to next quarter first.',
        },
        {
          title: 'Hand-offs',
          body: 'Who takes what, with each person’s weekly hours against what they can take on. No one to hand work to? A short list to raise with your manager instead.',
        },
        {
          title: 'A summary for your manager',
          body: 'A PDF with the week, hours by area, the project timeline, the hand-offs and your asks, leaving out personal appointments, client details and dollar figures. Then a Check before sending list of every date, hour total, name and ask.',
        },
        {
          title: 'On your calendar, after your yes',
          body: 'With Google Calendar connected, and only after a clear yes: repeating blocks with no guests and notifications off, fitted around anything new, then what was added, changed and left alone, and how to undo it. Without a connector that can add events: a calendar file to import.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own, and page-notes.md's.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'Claude plans. You decide.',
      items: [
        {
          label: 'Run',
          title: 'Claude does the math',
          body: 'Reads your calendar and task list, sorts every meeting, adds up the hours, and lays out the week, the task check and your projects.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The plan page, the summary for your manager, and every calendar block. Nothing goes on your calendar until you’ve read the plan and said a clear yes.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'What you take on, hand off, re-date or drop, and who takes what. Every conversation with your manager, team and clients. Claude never invites anyone, and never moves or answers a meeting with other people on it.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need", and its sources (checked 2026-11-08). Plans as the help center and
      // docs each say them; the connector as page-notes.md says the page should put it.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 5 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on. Claude’s help center lists skills on every plan, Free included.',
          tag: 'Team or Enterprise: an owner turns them on',
        },
        {
          title: 'A computer, once',
          body: 'To set it up on claude.ai or the Claude desktop app, and to export your calendar. Google Calendar’s phone app can’t export.',
        },
        {
          title: 'Your calendar and task list',
          body: 'Your calendar as an .ics file from Google Calendar or Outlook, and your task list as a CSV file or spreadsheet. Nothing to type. The list below shows where to get each one.',
          tag: 'No connector needed to plan',
        },
        {
          title: 'Google Calendar, to build the week',
          body: 'A connector links Claude to another app. To have Claude add the blocks to your calendar, connect Google Calendar. Anthropic’s pages differ on which plans have it and whether it can add events. Without it, Claude gives you a calendar file to import.',
          tag: 'Team or Enterprise: an owner adds it first',
        },
        {
          title: 'Optional connectors',
          body: 'With the ClickUp or Asana connector, Claude can read your tasks instead of a file. With Granola, Claude reads your recent meeting notes for standing 1:1s and promises you made. We haven’t tested these yet.',
          tag: 'Granola transcripts need a paid Granola plan',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond your Claude plan, and no other accounts to make.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where It Comes From": each vendor's help center, checked
      // 2026-11-08 (Asana's would not load, so the page sends people there).
      kind: 'list',
      heading: 'Where to get your files',
      items: [
        {
          title: 'Google Calendar',
          body: 'On a computer, under My calendars on the left, point to your calendar and click More, then Settings and sharing, then Export calendar. One .ics file downloads. The phone app can’t do this, and a work account’s admin can turn exporting off.',
        },
        {
          title: 'Outlook',
          body: 'In classic Outlook for Microsoft 365, open your calendar, then click File, Save Calendar, More Options. Set the dates from today through the end of your plan, then click OK and Save.',
        },
        {
          title: 'ClickUp',
          body: 'In your List or Table view, click Customize (upper right), then Export, All columns, CSV, Download. Set Subtasks to “As separate tasks” first. The Free Forever and Unlimited plans allow five exports in all, and Core only a trial.',
        },
        {
          title: 'Todoist',
          body: 'On the web, open the project, click the three dots (top right), then Import & export, then Export to CSV.',
        },
        {
          title: 'Asana',
          body: 'Export the project to CSV from the project’s menu. We couldn’t check Asana’s current menu names, so if you can’t find it, look in Asana’s help center.',
        },
        {
          title: 'A spreadsheet',
          body: 'In Google Sheets, click File, Download, then Comma-separated values (.csv). An Excel file attaches as it is.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say to It", without the one with made-up names and dates to edit, and
      // with "ClickUp tasks" as "task list", since any export works.
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat in Claude, attach your files, and paste. Claude stops after each step so you can change things. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'To start, with your files attached',
          items: [
            'Plan my perfect week. My calendar export and task list are attached.',
            'I have too many meetings and never get to my big projects. Can you time-block my week?',
            'Does my workload even fit in 9 to 5? No evenings.',
          ],
        },
        {
          label: 'In the same chat',
          items: [
            'Go straight through to the summary. I’ll look before anything goes on my calendar.',
            'Make a summary I can send my team leader.',
          ],
        },
        {
          label: 'After you’ve read the plan, with Google Calendar connected',
          items: ['Looks good. Build it in my Google Calendar.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // SKILL.md step 8's three rules; page-notes.md FAQ 1 and 4, "What It Won't Do".
          q: 'Will Claude invite anyone or change my meetings?',
          a: [
            'No. Claude never adds guests, and every change it makes goes out with notifications off, so nobody gets an email. It never moves, edits, deletes or answers a meeting with other people on it, including showings and listing appointments with clients. A new meeting the plan needs, like a 1:1, goes on as a hold that says no invite went out, and you invite people when you’re ready. Your own events stay unless you say otherwise.',
          ],
        },
        {
          // page-notes.md, "What You Need": the help center and Claude's docs disagree on Free, for skills
          // and for the connector. Free is untested. No build promised on Free.
          q: 'Do I need a paid plan?',
          a: [
            'Claude’s help center lists skills on every plan, Free included. Claude’s developer docs list them on Pro and up, so if your Free account shows no way to add a skill, that’s why. Anthropic’s pages also differ on which plans have the Google Calendar connector. We haven’t tested this skill on Free. On any plan where the skill works, the planning runs from your exported files with no connector, and you get a calendar file to import.',
          ],
        },
        {
          // SKILL.md step 8 and references/calendar-build.md (the import file); page-notes.md, Outlook users.
          // Importing the file is untested.
          q: 'What if I can’t connect Google Calendar, or I use Outlook?',
          a: [
            'You still get the whole plan from your exported calendar. After you say yes to the blocks, Claude makes a calendar file (.ics) of them. You import it into a new calendar of its own, so deleting that one calendar removes them all. Outlook.com and Outlook on the web can import it too: ',
            { strong: 'Calendar, Add calendar, Upload from file' },
            '. Claude doesn’t add blocks to Outlook directly. We haven’t tested importing the file yet.',
          ],
        },
        {
          // page-notes.md: Claude's upload list names CSV, TXT, JSON and XLSX, not .ics. Untested as is.
          q: 'Claude won’t take my .ics file.',
          a: [
            'Rename it so its name ends in .txt and attach it again. It’s plain text inside, so Claude reads it the same way. Claude’s help center doesn’t list .ics among the files it takes, and we haven’t tested attaching one as it is.',
          ],
        },
        {
          // page-notes.md FAQ 5; SKILL.md step 8 (the closing tag, every event ID recorded).
          q: 'Can I undo it?',
          a: [
            'Yes. Every block Claude adds says “From your plan” in its description, with the date Claude added it, so the set is easy to find. In the chat where the blocks were built, Claude has every event’s ID and can remove the whole set in one pass, with notifications off. An imported file goes into its own calendar, which you can delete in Google Calendar’s settings.',
          ],
        },
        {
          // page-notes.md, "What It Won't Do"; SKILL.md guardrails.
          q: 'What won’t Perfect Week do?',
          a: [
            'Claude never sends email or invites, and won’t change your task tool or CRM unless you ask. It won’t fill your evenings or weekends unless you offer specific ones, with a cap. If the work doesn’t fit your hours, Claude says so and helps you take it to your manager. Contract deadlines are shown for planning only: your transactions team owns them. A prospecting block protects the time, and the call list stays in Follow Up Boss or your CRM. Claude makes no promise that a better week brings more closings or income.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Want your inbox and meetings turned into replies and follow-ups? ',
        { link: 'Inbox and Meeting Follow-Through', href: '/inbox-meeting-follow-through', sameTab: true },
        ' is the skill for that.',
      ],
    },
  ],

  unlockKey: 'pw-unlocked',
});
