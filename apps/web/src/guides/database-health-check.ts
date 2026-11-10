// Every word on /database-health-check that is its own: the landing page for the Database Health
// Check, Connor's free skill (`skills/database-health-check/`) that turns a team's CRM contact export
// into a health report, a cleanup worklist for ops or a VA, and four to six groups to work this month,
// with drafts. What every skill page says the same way is in `skill-page.ts` (D-052).
//
// The words come from the skill itself (SKILL.md and its references), its page notes, its graded runs
// and the build and review reports, so the page promises what the skill does. For team leaders, owners
// and ops staff: Connor presents the Forum skills to team leaders on November 13 to 15.
//
// Three calls are Connor's (open in the review) and the page does not make them:
//   - consent recorded from a website form or an open house sign-in: the page says only that the skill
//     drafts texts just for contacts whose export shows documented consent, and flags the rest. The
//     sample leaves out the run's consent breakdown and its question about it;
//   - texts going out one at a time: the page says texts are drafts the agent sends, never a mass text;
//   - merges across agents: the page says the skill lists them for the team to decide and never merges.
//
// Plan facts are page-notes.md's: Claude's help center lists skills on every plan while Claude's docs
// list Pro and up, so Free is unconfirmed and untested; ChatGPT needs data analysis, which its free
// plan limits. ChatGPT Free's file and upload numbers came only from search excerpts, so the page states
// none of them. The ChatGPT version has not been run inside ChatGPT, and the page says the skill was
// tested in Claude.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const DATABASE_HEALTH_CHECK: Guide = skillPage({
  slug: 'database-health-check',
  title: 'Database Health Check',

  meta: {
    title: 'Database Health Check: A Free AI Skill · Amplified Impact',
    description:
      'Upload your CRM export and get a health report, a cleanup list for your VA, and the groups worth calling or emailing this month, with the messages drafted. A free skill for Claude or ChatGPT. It never changes your CRM.',
  },

  eyebrow: 'Free AI Skill · For Team Leaders and Ops',
  // page-notes.md, "One-Line Promise".
  lede: 'Upload your CRM export and get back a health report, a cleanup list for your VA, and the groups worth calling or emailing this month, with the messages drafted.',
  outcome: { n: '03', title: 'Clean Up and Reach Out', body: 'A cleanup list for your VA, and drafts your team reads first.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. Either one reads your export and never changes anything in your CRM.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt": PRACTICE-followupboss-people-export.csv attached.
    prompt: 'Here’s our Follow Up Boss export. Run a database health check and give me a plan to work it.',
    note: [
      'The practice file is a made-up Follow Up Boss export: 500 contacts and five agents. Every name, email and phone number in it is made up. ',
    ],
  },

  real: {
    body: [
      'Start a new chat the same way, attach your own CRM export (and your closed deals, if you have them), and say this.',
    ],
    prompt: 'Here’s our CRM export. Run a database health check and give me a plan to work it.',
    // page-notes.md: Follow Up Boss's "Export Contacts to a Spreadsheet" and "Users, Roles & Permissions",
    // checked 2026-11-08. "As the owner or an admin so the file holds everyone" is page-notes.md's and
    // references/fub-and-crm-exports.md's (an agent sees only their own leads).
    note: [
      'To export from Follow Up Boss, open ',
      { strong: 'People > All People' },
      ', check the box next to ',
      { strong: 'Name' },
      ', choose ',
      { strong: 'Select All' },
      ', click ',
      { strong: 'Export' },
      ' (the downward arrow), check ',
      { strong: 'Export All Columns' },
      ', then click ',
      { strong: 'Yes, Export People' },
      '. Export as the Account Owner, or as an admin the owner gave the Can Export permission, so the file holds every contact.',
    ],
  },

  chatgpt: { paste: chatgptPaste('database-health-check') },

  sections: [
    {
      // sample.md (the practice run), shortened: its bottom line, part of the health report, the
      // worklist's top actions and the first one, the six groups, one group in full with its call opener
      // and email, three of its seven questions, and part of the check list. Left out on purpose: how
      // the Text Consent yes values were recorded, its question and its check line, and the line on
      // sending texts one at a time (Connor's calls).
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What a health check looks like',
      body: 'What Claude wrote from the practice file: a made-up Follow Up Boss export with 500 contacts and five made-up agents.',
      title: 'Database Health Check, as of 2026-11-08',
      note: 'Made-up example. Shortened: part of the report and the worklist, one of its six groups in full, three of its seven questions, and part of the check list.',
      blocks: [
        { h: 'Bottom line' },
        {
          p: [
            'Your Follow Up Boss export holds 500 contacts as of 2026-11-08. The three biggest problems are 66 leads added 30+ days ago that were never contacted, 61 live contacts with a missing or invalid phone, and 54 active-stage contacts who have gone quiet for 90+ days. Merge duplicates first: 24 records (4.8%) sit in 12 merge groups, and Follow Up Boss keeps the main record’s stage and agent when it merges, so stage and assignment fixes made before merging would be wasted.',
          ],
        },
        { h: 'Health report' },
        {
          p: [
            { strong: 'Likely duplicates: ' },
            '12 merge groups (24 records) share an email or phone under the same or a near-identical name. One phone number sits on 7 different people’s records, which looks like an office or lender line typed into contacts, so it’s flagged for review rather than merged. In 6 of the merge groups (12 records) the records have different assigned agents: a merge keeps one record’s agent, so the team decides who keeps each of those contacts before ops merges.',
          ],
        },
        {
          p: [
            { strong: 'Active-stage contacts with no communication in 90+ days: ' },
            '94 of 216 (43.5%): 54 gone quiet and 40 with no communication on record.',
          ],
        },
        {
          p: [
            { strong: 'Never contacted (Is Contacted = No, added 30+ days ago): ' },
            '66. Top sources: Zillow 14, Referral 11, Import 8, Sphere 7. Referrals and sphere contacts nobody called are the ones to look at first.',
          ],
        },
        {
          table: {
            caption: 'Contact info (some rows)',
            head: ['Check', 'Contacts', '%'],
            rows: [
              ['No email', '34', '6.8%'],
              ['No phone', '61', '12.2%'],
              ['Phone not a valid 10-digit US number', '8', '1.6%'],
              ['Do Not Call tag', '6', '1.2%'],
              ['No valid email and no valid phone', '8', '1.6%'],
            ],
          },
        },
        { h: 'Cleanup worklist' },
        {
          p: [
            'cleanup_worklist.csv, 205 rows, one per record that needs work. It’s the only file with names, emails and phone numbers; share it only with whoever does the cleanup.',
          ],
        },
        {
          table: {
            caption: 'Rows by action (the top five of twelve)',
            head: ['Action', 'Rows'],
            rows: [
              ['Agent Follow-Up Or Pond Decision', '79'],
              ['Fill Missing Phone', '28'],
              ['Review New-Lead Stage', '26'],
              ['Merge Candidate', '24'],
              ['Fill Missing Email', '16'],
            ],
          },
        },
        {
          p: [
            { strong: 'Merge Candidate (24 rows) first. ' },
            'Sort by Duplicate Group and check the record marked Suggested Main Record. Where the Reason says the records have different agents, wait for the team to decide who keeps the contact.',
          ],
        },
        { h: 'Re-engagement segments' },
        { p: ['Six segments, in priority order. A contact can match two; work them in this order.'] },
        {
          items: [
            'Back On The Site (31)',
            'Past Clients, No Touch In 12+ Months (18)',
            'Sphere, No Touch In 12+ Months (16)',
            'Stalled Pipeline, No Touch In 90+ Days (53)',
            'Never-Worked Leads (56)',
            'Quiet Nurture, No Touch In 180+ Days (79)',
          ],
        },
        { h: 'Past Clients, No Touch In 12+ Months (18)' },
        {
          p: [
            { strong: 'Smart List: ' },
            'Stage includes Closed, Past Client; Last Communication was more than 12 months ago. Second list: Last Communication is empty (5).',
          ],
        },
        { p: ['Emailable 14, callable 15, textable 0.'] },
        {
          p: [
            { strong: 'Why: ' },
            'these are people the team already closed with. Follow Up Boss’s default Past Clients list uses Closed and 90 days; this catches the ones a year or more past due.',
          ],
        },
        { p: [{ strong: 'Next move: ' }, 'call list by assigned agent, then a personal email.'] },
        { p: [{ strong: 'No text: ' }, 'none of these 18 shows a yes in Text Consent.'] },
        {
          p: [
            { strong: 'Call opener: ' },
            '“Hi [First Name], it’s [Agent Name] with [Team or Brokerage Name]. It’s been too long, and I wanted to say thanks again and see how the house is treating you. Is there anything about the home or the market I can help with?”',
          ],
        },
        {
          email: {
            subject: 'Thinking Of You And Your Home',
            body: [
              'Hi [First Name],',
              'It’s been a while, and I wanted to thank you again for trusting me with your move. I hope the home has been good to you.',
              'If it would help, I’m happy to put together a home value review or answer any questions about the market. And if someone you know is thinking about buying or selling, I’d be glad to talk with them.',
              '[Agent Name]',
              'To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]. This is a marketing email from [Agent Name], [Brokerage Name].',
            ],
          },
        },
        { h: 'Questions for the team' },
        {
          items: [
            'What separates Closed from Past Client? You use both stages (30 and 23) plus four spellings of a past client tag, and Follow Up Boss’s default Past Clients list only looks at Closed.',
            'Is 90 days your follow-up standard? It’s this skill’s default; give me yours and I’ll rerun.',
            'Who keeps the contact in the 6 merge groups split across agents? Merging keeps the main record’s agent, so the team makes that call, not ops.',
          ],
        },
        { h: 'Check before sending' },
        {
          items: [
            'Segment sizes and filter values against Follow Up Boss before sending. If a Smart List count is far off, fix the filter first.',
            'Do Not Call: scrub every call list and text list against the National Do Not Call Registry and your internal list before use. Follow Up Boss has no built-in scrub.',
            'Quiet hours: calls and texts between 8 a.m. and 8 p.m. in the recipient’s time zone, and no calls or voicemails on a Sunday or a legal holiday.',
            'Worklist: 205 rows hold names and phone numbers; share it only with the people doing the cleanup. Nothing in Follow Up Boss was changed.',
          ],
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order", and the two files it attaches.
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'A bottom line',
          body: 'Three sentences at most: how many contacts you have, the three biggest problems with their counts, and the one cleanup to do first.',
        },
        {
          title: 'What the AI used',
          body: 'The file, the settings (your team’s rules, or defaults marked as defaults), the columns behind each check, and anything missing from your export.',
        },
        {
          title: 'A health report',
          body: 'Counts and percentages: contacts by stage, source and agent; missing or bad emails and phones; likely duplicates; active leads gone quiet; leads never contacted; past clients and sphere untouched for a year; stage problems; unassigned contacts; messy tags; and how many contacts have text consent on record.',
        },
        {
          title: 'A cleanup worklist',
          body: 'A spreadsheet file with one row for each record that needs work, with the fix and the reason. It’s the only file with names, emails and phone numbers. Duplicates that two agents own are marked for your team to decide. The report also shows how your VA works the first three fixes in your CRM.',
        },
        {
          title: 'Four to six groups to work',
          body: 'The report calls them segments. Each comes with its Follow Up Boss Smart List filter (a saved search), its size, how many can be emailed, called or texted, the agents who own most of it, and the next move.',
        },
        {
          title: 'Questions for your team',
          body: 'Wherever the data shows a missing rule, such as what separates Closed from Past Client, or who keeps a contact two agents both have.',
        },
        {
          title: 'Drafts for each group',
          body: 'An email, a call opener for call lists, and a text only for contacts whose export shows documented consent. Texts are drafts an agent sends, never a mass text.',
        },
        {
          title: 'Check before sending',
          body: 'Every count, filter and placeholder to confirm, plus the Do Not Call scrub, quiet hours for calls and texts, and your email’s unsubscribe link and postal address.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own and page-notes.md's, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI counts. Your team decides.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the counting',
          body: 'Reads your export and does every count with code, not by eye. Finds duplicates and stage problems, sizes each group, and builds the cleanup worklist.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The Smart List filters, the plan for each group, the questions for your team, emails, call openers, and texts for contacts with documented consent. Texts are drafts an agent sends, never a mass text.',
        },
        {
          label: 'Own',
          title: 'Always your team’s',
          body: 'Every merge, stage change, reassignment, pond move and archive in your CRM. Who keeps a contact two agents share, and who gets called. Texting consent, the Do Not Call scrub, and the fair housing review of every message. Bank, wire and loan details in your export: the AI ignores them and never repeats them.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need". No ChatGPT limits as numbers: they came only from search excerpts.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on, so Claude can run the counts on your file. Claude’s help center lists skills on every plan, Free included, but we haven’t tested Free. A big export uses more of your plan’s usage.',
          tag: 'Team or Enterprise: an owner turns on code execution',
        },
        {
          title: 'Or a ChatGPT plan',
          body: 'The ChatGPT version goes in a Project, a folder in ChatGPT that keeps instructions and files together. It needs data analysis, which runs the counts. ChatGPT’s free plan limits data analysis, so big exports work best on a paid plan.',
        },
        {
          title: 'A computer',
          body: 'Follow Up Boss saves your export to your computer as a CSV, a spreadsheet file. A computer is the easy way to get the file and attach it.',
        },
        {
          title: 'Your CRM export',
          body: 'From Follow Up Boss, by the Account Owner or an admin the owner gave the Can Export permission. Or another CRM’s export of every contact, with every column. A closed-deal export helps, but isn’t needed.',
        },
        {
          title: 'No connector needed',
          body: 'A connector links the AI to another app, like your CRM. You don’t need one: the skill works from your export. If a CRM connector is on, the skill never changes a record through it.',
        },
        {
          title: 'Nothing else to pay for',
          body: 'No cost beyond your Claude or ChatGPT plan and your CRM.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say".
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat, attach your export, and paste. In ChatGPT, start the chat inside the Project. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'To start, with your export attached',
          items: [
            'Here’s our Follow Up Boss export. Run a database health check and give me a plan to work it.',
            'Clean up our CRM: give my VA a worklist of duplicates and bad stages.',
          ],
        },
        {
          label: 'With your closed deals attached too',
          items: [
            'Here’s our CRM export and our closed deals from Sisu. Which past clients haven’t heard from us in a year?',
          ],
        },
        {
          label: 'In the same chat, after the first report',
          items: [
            'Our follow-up standard is 60 days and leads go to the pond after 45. Run it again with our rules.',
            'Which groups should my agents call this month, and what should they say?',
          ],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // SKILL.md, Guardrails; page-notes.md, "What It Won't Do".
          q: 'What won’t it do?',
          a: [
            'The skill never changes, merges, reassigns or deletes a record in your CRM, even with a connector. Where two agents have the same person, it lists those duplicates for your team to decide and never merges them. It never sends an email or a text. It doesn’t route, score or reassign leads (Follow Up Boss and Sisu do that). It never groups contacts by age, family status or anything else the data doesn’t say, and it never promises results from working a group.',
          ],
        },
        {
          // page-notes.md, FAQ; references/fub-and-crm-exports.md (no built-in consent column).
          q: 'Will it text my leads?',
          a: [
            'No. Texts are drafts an agent sends, never a mass text. The skill drafts texts only for contacts whose export shows documented consent, and flags the rest. Follow Up Boss has no consent column of its own, so teams that track consent use a custom field or a tag. If your export has no consent field, you get no text drafts, and the report tells you how to add one.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, Guardrails ("Conservative defaults"); the shared outreach-rules.md,
          // Conservative Defaults.
          q: 'Why is it stricter than the law?',
          a: [
            'It uses our conservative defaults. Every email carries the full footer, including the line that says it’s a marketing email. No calls or voicemails go on a Sunday or a legal holiday. Consent that names only a portal, a lead company or “real estate professionals,” and not your team or brokerage, means no texts until your broker confirms it covers you. And it never offers a reward of any kind for a review. You can calibrate these with your own legal counsel: tell the AI what your counsel approved, and it follows that and says so in Check Before Sending.',
          ],
        },
        {
          // page-notes.md, "What You Need": Claude's help center and docs disagree on Free; ChatGPT's
          // free plan has data analysis only as "Limited" (chatgpt.com/pricing).
          q: 'Which plan do I need?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list skills on Pro and up. If your Free account shows no way to add a skill, that’s why. In ChatGPT, a plan with data analysis: the free plan limits it, so big exports work best on a paid plan. We tested the skill with Claude. We haven’t tried it on Claude’s free plan or in ChatGPT yet. In either app, run the practice file first.',
          ],
        },
        {
          // page-notes.md, FAQ and the Columns tip ("Filtering contacts").
          q: 'Our export doesn’t have Last Communication.',
          a: [
            'The report says so up front, reads the dates in the calls, texts and notes columns instead, and marks those checks approximate. Next time, before you export, open ',
            { strong: 'People' },
            ' in Follow Up Boss, click ',
            { strong: 'Columns' },
            ' in the upper right, and check ',
            { strong: 'Last Communication' },
            ' and ',
            { strong: 'Last Activity' },
            '. That may bring them through.',
          ],
        },
        {
          // page-notes.md, FAQ; case 2 was a made-up export from another CRM.
          q: 'We’re not on Follow Up Boss.',
          a: [
            'The skill is built to read other CRMs’ exports too, such as KW Command, GoHighLevel or Brivity. It matches your columns by name (Lead Status, Owner, Last Contacted and so on) and shows that match at the top of the report, so you can correct it. We’ve tested it only on a made-up export from another CRM, so check that match first. The group filters come back in plain words for your CRM. Export every contact with every column; your CRM’s help center shows how.',
          ],
        },
        {
          // page-notes.md, FAQ; Anthropic's Privacy Center; Follow Up Boss's export email.
          q: 'What happens to our client data?',
          a: [
            'Turn off training before you upload real contacts. The setup steps show where. The chat and the report show only counts, stages, sources, tags and agent names. Names, emails and phone numbers go only in the cleanup worklist file, so share it only with whoever does the cleanup. The skill ignores birthday, bank, wire and loan columns. Follow Up Boss also emails your Account Owner after every export.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Working a list of agents to recruit, not clients? ',
        { link: 'Recruiting Prep', href: '/recruiting-prep', sameTab: true },
        ' is built for that.',
      ],
    },
  ],

  unlockKey: 'dhc-unlocked',
});
