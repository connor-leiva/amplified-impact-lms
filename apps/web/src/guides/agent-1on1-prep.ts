// Every word on /agent-1on1-prep that is its own: the landing page for Agent 1:1 Prep, a skill
// (`skills/agent-1on1-prep/`, version 1.0) that preps a real estate team leader or coach for a coaching
// one-on-one with one agent, from that agent's monthly numbers (a Sisu report, a Follow Up Boss report or the
// team's tracker), their goals or business plan, last time's one-on-one notes and the leader's notes. It hands
// back flags, a bottom line, the numbers against the agent's own goal with the pace arithmetic done in code,
// what changed since the last one-on-one, last time's commitments with their status exactly as given, open
// coaching questions, one to three possible focus areas as options, a suggested agenda, a recap template and
// Check Before Sending. What every skill page says the same way is in `skill-page.ts` (D-052).
//
// The skill is paid (in the Amplified Skill Library, not in `FREE_SKILLS`), so the built page shows its
// hero and sample with the Skill Library card in place of the sign-up and the setup, and `content.ts`
// takes "Free" off its title, description and eyebrow (D-082). The words below are written as a free
// page, for the day Connor names it free, as every skill page's are.
//
// The words come from the skill itself (SKILL.md and references/prep-rules.md and exports.md), its page
// notes, and its graded runs (case 1, the full practice set, at 10 of 10; case 2, a four-agent tracker with
// no goals, a health detail, a split question and a comparison with a named agent, at 10 of 10; both passing
// the objective checks), so the page promises what the skill does. The sample is sample.md, the graded
// practice run, cut only by whole rows, columns, items and sentences, with straight apostrophes set as
// curly ones.
//
// What the page holds to, as SKILL.md does: facts, not judgments. It never labels the agent, predicts their
// year or compares them with another agent; it never marks a commitment done unless the notes say so; a
// missing goal means no pace math; health, family, personal, HR and pay details stay out; it is not a
// performance review or a write-up and never proposes changing splits or pay; it never sends anything.
//
// Calls left open, and how the page handles them:
//   - Connor's filter: Sisu already shows each agent's dashboard and accountability (the Agent
//     Accountability Report's Personal Pacer and On Pace labels, the Personal Dashboard's goals and
//     conversion). The first FAQ says so and says the value is the prep: the pace math against the agent's
//     own goal written out, the commitments carried forward, and the questions. Connor confirms it earns
//     its place.
//   - The title keeps the colon ("Agent 1:1 Prep"); it breaks no check or YAML here. Connor may prefer
//     "Agent One-on-One Prep".
//   - The Agent Accountability Report's download file type is not confirmed, and no Sisu screen is known to
//     download month-by-month numbers in one file. The real-file note names the team's tracker first and
//     the report second; the FAQ on real files says so.
//   - Without monthly goals, annual goals are prorated evenly; Sisu's Personal Pacer may not be. An FAQ
//     says why the two can differ.
//   - Siblings: the note links to /fub-pipeline-review, /l10-meeting-prep, /team-pnl-review and
//     /recruiting-prep, all registered pages.
//   - Plans: Claude's help center lists skills on every plan, Claude's docs on Pro and up; ChatGPT needs data
//     analysis, which its free plan limits. No ChatGPT Free numbers. The ChatGPT version has not been run
//     inside ChatGPT.
//
// Sisu click paths and terms are page-notes.md's, from Sisu's knowledge base, checked 2026-11-10.
// `setupMinutes` is an estimate (page-notes gives none): 10, as on the other skill pages with a ChatGPT
// version.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const AGENT_1ON1_PREP: Guide = skillPage({
  slug: 'agent-1on1-prep',
  skill: 'agent-1on1-prep',
  title: 'Agent 1:1 Prep',

  meta: {
    title: 'Agent 1:1 Prep: A Free AI Skill · Amplified Impact',
    description:
      'Attach one agent’s monthly numbers, their goals and your notes from last time, and walk into your coaching one-on-one with the pace math written out against their own goal, last time’s commitments carried forward and the questions to ask. A free skill for Claude and ChatGPT. Facts, not judgments.',
  },

  eyebrow: 'Free AI Skill · For Team Leaders and Coaches',
  // page-notes.md, "One-Line Promise".
  lede: 'Attach one agent’s monthly numbers, their goals and your notes from last time, and walk into your coaching one-on-one with the pace math written out against their own goal, last time’s commitments carried forward, and the questions to ask.',
  outcome: { n: '03', title: 'Run the One-on-One', body: 'Their numbers against their own goal, last time’s commitments, and the questions to ask.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. Either one reads your files and never sends anything or changes anything in Sisu.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word.
    prompt:
      'Prep my one-on-one with Marigold Fizzwhistle, Thursday, November 12 at 10:00 AM, 30 minutes. Attached: her Sisu numbers (pulled November 10, 2026), her 2026 goals and my notes from our last one-on-one. My notes for this one: she texted me on 10/29 that she finished calling the Q3 buyers. I haven’t seen the listing presentation draft yet. She says the 10/18 open house at 41 Snickerdoodle Ct brought in 3 buyer leads.',
    note: [
      'There are three files: a made-up agent’s monthly numbers for 2026 in a Sisu-style layout, her 2026 goals, and the notes from her last one-on-one. Every name and number in them is made up. The prompt names the day the numbers were pulled, so the math runs through October 2026 whatever day you practise.',
    ],
  },

  real: {
    body: [
      'Start a new chat the same way, attach the agent’s numbers, their goals and your notes from last time, and say this with your own details.',
    ],
    prompt:
      'Prep my one-on-one with [agent] on [day] at [time]. Attached: their numbers (pulled [date]), their goals and my notes from our last one-on-one. My notes for this one: [anything new].',
    // page-notes.md, "What to Upload": Sisu's "Agent Accountability Report Overview" and "Setting Goals for
    // Your Agents and Your Team", checked 2026-11-10.
    note: [
      'The numbers can be your team’s tracker, or Sisu’s ',
      { strong: 'Agent Accountability Report' },
      ' with ',
      { strong: 'Scope' },
      ' set to the agent and a date range, downloaded with the icon at the top. Their goals are in Sisu under ',
      { strong: 'Account > Performance > Goals' },
      ', or in their business plan. Without goals, you still get their numbers and their own monthly averages, with no pace math.',
    ],
  },

  chatgpt: { paste: chatgptPaste('agent-1on1-prep') },

  sections: [
    {
      // sample.md (the practice run, case 1 at 10 of 10), shortened, in the output's own order and words,
      // cut only by whole rows, columns, items and sentences: four flags; the bottom line in full; the
      // numbers table in five of its six columns; the ratio row for met to signed; the what-changed table in
      // four of its six rows; two notes lines; the commitments table in full; four of eight questions; the
      // three focus options without their opening questions; the agenda in full; the recap without one of its
      // two commitment lines and its closing note; four check lines. Left out: the month-by-month table, the averages table, the rest of
      // the recap and the other check lines.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What a one-on-one prep looks like',
      body: 'What Claude wrote from the practice files: a made-up agent’s monthly numbers, her 2026 goals and the notes from her last one-on-one. They’re the same files you practise on in setup.',
      title: 'One-on-One Prep: Marigold Fizzwhistle, Thursday, November 12, 2026',
      note: 'Made-up example. Shortened: parts of most sections, four of the eight questions, and four rows of the check list.',
      blocks: [
        { h: 'Flags' },
        {
          items: [
            'As of 11/10/2026: you said the numbers were pulled November 10, 2026. The pace window is January through October 2026 (10 months, the last full month). November 2026 is a partial month: shown apart and left out of the pace math.',
            'Goals: her seven 2026 annual production goals and two planned rates, each found word for word in her goals file. The file has no monthly goals, so each annual goal is prorated evenly by month (no seasonality).',
            'Columns: every measure was read by its own column name; nothing to confirm.',
            'Left out: 2 personal or pay details from her goals file. They don’t appear anywhere below; whether and how to raise them is yours.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'Through October 2026, Marigold has 20 closed units against a prorated goal of 20.0 (100.0%) and $221,035 GCI against $225,000 (98.2%), with signed agreements furthest under at 33 against 40.0 (82.5%) and appointments set at 85 against 100.0 (85.0%). Since your 10/08/2026 one-on-one, October added 5 appointments set, 2 signed, 3 under contract and 2 closings, and signed moved from 86.1% to 82.5% of its prorated goal. Of last time’s three commitments, your notes say she finished the Q3 buyer calls and you haven’t seen the listing presentation draft yet, and the October appointments commitment has no status given.',
          ],
        },
        { h: 'Numbers against goal' },
        {
          table: {
            caption: 'January through October 2026, against her 2026 goals prorated evenly',
            head: ['Measure', 'Year to date', 'Prorated goal', 'Pace', 'To reach the annual goal'],
            rows: [
              ['Appointments Set', '85', '120 x 10 / 12 = 100.0', '85 / 100.0 = 85.0%', '(120 minus 85) / 2 months left = 17.5 a month'],
              ['Appointments Met', '72', '96 x 10 / 12 = 80.0', '72 / 80.0 = 90.0%', '(96 minus 72) / 2 months left = 12.0 a month'],
              ['Signed', '33', '48 x 10 / 12 = 40.0', '33 / 40.0 = 82.5%', '(48 minus 33) / 2 months left = 7.5 a month'],
              ['Under Contract', '25', '30 x 10 / 12 = 25.0', '25 / 25.0 = 100.0%', '(30 minus 25) / 2 months left = 2.5 a month'],
              ['Closed Units', '20', '24 x 10 / 12 = 20.0', '20 / 20.0 = 100.0%', '(24 minus 20) / 2 months left = 2.0 a month'],
              ['Closed Volume', '$8,841,500', '$10,800,000 x 10 / 12 = $9,000,000', '$8,841,500 / $9,000,000 = 98.2%', '($10,800,000 minus $8,841,500) / 2 months left = $979,250 a month'],
              ['GCI', '$221,035', '$270,000 x 10 / 12 = $225,000', '$221,035 / $225,000 = 98.2%', '($270,000 minus $221,035) / 2 months left = $24,482 a month'],
            ],
          },
        },
        {
          p: [
            '“To reach the annual goal” is what her goal needs in November and December, not a forecast. Appointments met to signed is 33 / 72 = 45.8%, under her plan’s 50%; Sisu’s own conversion figures stay the source of record.',
          ],
        },
        { h: 'What changed since the last one-on-one' },
        {
          table: {
            caption: 'Through September 2026 (at your 10/08/2026 one-on-one) and through October 2026',
            head: ['Measure', 'Through September 2026', 'October 2026', 'Pace then', 'Pace now'],
            rows: [
              ['Appointments Set', '80', '5', '80 / 90.0 = 88.9%', '85 / 100.0 = 85.0%'],
              ['Appointments Met', '67', '5', '67 / 72.0 = 93.1%', '72 / 80.0 = 90.0%'],
              ['Signed', '31', '2', '31 / 36.0 = 86.1%', '33 / 40.0 = 82.5%'],
              ['Closed Units', '18', '2', '18 / 18.0 = 100.0%', '20 / 20.0 = 100.0%'],
            ],
          },
        },
        {
          items: [
            'She texted you on 10/29 that she finished calling the Q3 buyers (commitment 1).',
            'She says the 10/18 open house at 41 Snickerdoodle Ct brought in 3 buyer leads. That’s her report, from your notes; the export doesn’t show leads.',
          ],
        },
        { h: 'Last time’s commitments' },
        {
          table: {
            caption: 'Word for word from the notes of the 10/08/2026 one-on-one',
            head: ['#', 'Commitment', 'Status, as given', 'From the numbers'],
            rows: [
              ['1', 'Call or text the 14 buyers she met in Q3 who haven’t signed, by October 31.', '“she texted me on 10/29 that she finished calling the Q3 buyers” (your notes)', 'Nothing in the export.'],
              ['2', 'Set at least 8 appointments in October.', 'No status given.', 'The export shows 5 appointments set in October 2026.'],
              ['3', 'Send Cosmo a draft of her updated listing presentation before our next one-on-one.', '“I haven’t seen the listing presentation draft yet” (your notes)', 'Nothing in the export.'],
            ],
          },
        },
        { h: 'Open coaching questions' },
        {
          items: [
            'You finished calling the 14 Q3 buyers who hadn’t signed. What came out of those calls, and which of them are worth another conversation?',
            'Commitment 2 was at least 8 appointments set in October, and the export shows 5. How do you see October, and what did it tell you about where your appointments come from?',
            'Of 72 appointments met this year, 33 signed (33 / 72 = 45.8%), and your plan used 50%. What happens in the appointments that don’t end in a signed agreement?',
            'What do you want to focus on for November and December, and what do you need from me before our next one-on-one?',
          ],
        },
        { h: 'Possible focus areas (your call)' },
        {
          items: [
            'Signed agreements. 33 / 40.0 = 82.5% of the prorated goal (48 x 10 / 12 = 40.0). Appointments met to signed is 33 / 72 = 45.8%, under her plan’s 50%. October: 2, against her January to September average of 31 / 9 = 3.4 a month.',
            'Appointments set. 85 / 100.0 = 85.0% of the prorated goal (120 x 10 / 12 = 100.0). October: 5, against 80 / 9 = 8.9 a month.',
            'Appointments met. 72 / 80.0 = 90.0% of the prorated goal (96 x 10 / 12 = 80.0). October: 5, against 67 / 9 = 7.4 a month.',
          ],
        },
        { p: ['These are options from the numbers, not a verdict; pick one, or none.'] },
        { h: 'Agenda' },
        {
          table: {
            caption: 'A suggested order; change it to yours',
            head: ['Time', 'Minutes', 'Part'],
            rows: [
              ['10:00 AM to 10:05 AM', '5', 'Her wins and what’s on her mind (she goes first)'],
              ['10:05 AM to 10:10 AM', '5', 'Numbers against her goal'],
              ['10:10 AM to 10:15 AM', '5', 'Last time’s commitments'],
              ['10:15 AM to 10:25 AM', '10', 'The focus you pick'],
              ['10:25 AM to 10:30 AM', '5', 'New commitments, what she needs from you, and the next one-on-one’s date'],
            ],
          },
        },
        { h: 'Recap template (fill in after)' },
        {
          email: {
            subject: 'Our One-On-One Recap And Next Steps',
            body: [
              'Hi Marigold,',
              'Thanks for our time on Thursday, November 12. Here’s what we agreed.',
              'What we looked at: [Numbers We Looked At]',
              'Last time’s commitments:',
              '1. Call or text the 14 buyers she met in Q3 who haven’t signed, by October 31: [Update From Today]',
              '2. Set at least 8 appointments in October: [Update From Today]',
              '3. Send Cosmo a draft of her updated listing presentation before our next one-on-one: [Update From Today]',
              'The focus we picked: [Focus]',
              'Your commitments:',
              '1. [Commitment] by [Date]',
              'What I’ll do: [Your Commitment]',
              'Next one-on-one: [Date and Time]',
              'Cosmo',
            ],
          },
        },
        { h: 'Check before sending' },
        {
          items: [
            'As of 11/10/2026: from your message (“pulled November 10, 2026”) and the file name. Pace window: January through October 2026.',
            'Goals, each quoted from her goals file, such as “Closed units: 24” and “Appointment met to signed: 50%.” Prorated evenly by month: the file gives no monthly goals.',
            'Commitments: word for word from the 10/08/2026 notes. Statuses for 1 and 3 are quoted from your message; 2 has no status given.',
            'Left out: the 2 personal or pay details in her goals file appear nowhere in this prep or the recap.',
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
          body: 'The files read, the month the numbers run to, how the goals were read, and anything left out for privacy or pay. Then three sentences: where the agent stands against their own goal, what changed, and last time’s commitments.',
        },
        {
          title: 'Numbers against their own goal',
          body: 'Year to date, the prorated goal, the pace and the difference, each with the math written out, such as “24 x 10 / 12 = 20.0” and “20 / 20.0 = 100.0%,” plus what the annual goal needs each month left. No goal, no pace math, and it says so.',
        },
        {
          title: 'What changed since last time',
          body: 'Their year to date then and now, each month since against their own monthly average, and anything new from your notes, labeled.',
        },
        {
          title: 'Last time’s commitments',
          body: 'Word for word, with the status exactly as your notes give it, or “No status given.” Never marked done unless your notes say so.',
        },
        {
          title: 'Questions and focus options',
          body: 'Five to eight open questions tied to the numbers and the commitments, and one to three possible focus areas, as options for you to choose.',
        },
        {
          title: 'An agenda and a recap',
          body: 'A suggested agenda with times, and a recap template to fill in after the meeting and send, with blanks for what you agree.',
        },
        {
          title: 'Check before sending',
          body: 'Every number, goal, status and date to confirm, with where each came from, plus the file with every sum.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own and page-notes.md's, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI does the math. The agent owns their commitments. You decide.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the math',
          body: 'Reads the numbers, goals and notes, works out every total, prorated goal and pace with code, and lines up last time’s commitments with their status as given.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The questions, the focus options, the agenda and the recap template. Nothing is sent.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'The focus, what to raise and how, and any judgment about the agent’s work. Pay, splits and HR stay with you, your broker and HR.',
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
          body: 'With skills and code execution on, so Claude can do the math from your files. Claude’s help center lists skills on every plan, Free included, but we haven’t tested Free.',
          tag: 'Team or Enterprise: an owner turns on code execution',
        },
        {
          title: 'Or a ChatGPT plan',
          body: 'The ChatGPT version goes in a Project, a folder in ChatGPT that keeps instructions and files together. It needs data analysis, which ChatGPT’s free plan limits.',
        },
        {
          title: 'The agent’s numbers',
          body: 'Your team’s tracker, a Sisu report or a Follow Up Boss report, by month. Their goals from Sisu or their business plan, if they have them.',
        },
        {
          title: 'No connector needed',
          body: 'A connector links the AI to another app. You don’t need one: the skill works from your files and never changes anything in Sisu or your CRM.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say".
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat, attach your files, and paste. In ChatGPT, start the chat inside the Project. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'To start, with your files attached',
          items: [
            'Prep my one-on-one with [agent] on [day] at [time]. Their numbers, their goals and my notes from last time are attached.',
            'Here’s our team tracker. Prep my 1:1 with [agent] tomorrow; we never set their goals in Sisu.',
          ],
        },
        {
          label: 'In the same chat, after the prep',
          items: ['Make the agenda 45 minutes.', 'Just the questions and the focus options.', 'Draft the recap from what we agreed: [what you agreed].'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, "What Sisu Already Gives, and What This Adds".
          q: 'Sisu already shows pacing. Why this?',
          a: [
            'Sisu already shows each agent’s numbers against their pacer and goal, and it stays the source of record. This skill does the prep: it writes the math out against the agent’s own goal so you can walk them through it, works from a spreadsheet too, puts the months since your last one-on-one beside their own average, carries last time’s commitments forward, and gives you the questions and a recap.',
          ],
        },
        {
          // references/prep-rules.md, "The Pace Math"; references/exports.md, "The Agent's Goals".
          q: 'Why doesn’t my number match Sisu’s pacer?',
          a: [
            'Without monthly goals, the skill spreads the annual goal evenly by month, so 24 closings a year is 20.0 through October. Sisu may spread goals by month with seasonality. Attach the monthly goals and the skill uses them.',
          ],
        },
        {
          // references/prep-rules.md, "Goals"; case 2's run.
          q: 'What if the agent has no goals?',
          a: [
            'You get their year to date, their own monthly averages and the count ratios, and one line saying there’s no pace math without a goal and how to add one. It never makes up a goal.',
          ],
        },
        {
          // SKILL.md, Guardrails; case 2's run.
          q: 'Will it tell me if they’re underperforming, or how they compare with my other agents?',
          a: [
            'No. It gives facts against the agent’s own goal and their own months. A judgment is yours, made in the conversation. It won’t name or compare other agents, even when their numbers are in the same file.',
          ],
        },
        {
          // references/prep-rules.md, "Privacy and the Leader's Notes".
          q: 'What happens to personal things in my notes?',
          a: [
            'Health, family, personal, HR and pay details stay out of the prep and the recap. One line tells you something was left out, so you decide whether and how to raise it. It never writes a review or a write-up, and never suggests changing a split.',
          ],
        },
        {
          // page-notes.md, "What Was and Wasn't Tested".
          q: 'Has it been tried on real files?',
          a: [
            'Not yet. It was tested on made-up files: a Sisu-style monthly layout and a team tracker. Sisu’s help center shows a download icon on the Agent Accountability Report but doesn’t say what kind of file it makes, so a team tracker is the surest start. We haven’t tried the ChatGPT version inside ChatGPT yet.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Running the weekly pipeline meeting or the team’s L10 instead of a one-on-one? ',
        { link: 'FUB Pipeline Review', href: '/fub-pipeline-review', sameTab: true },
        ' and ',
        { link: 'L10 Meeting Prep', href: '/l10-meeting-prep', sameTab: true },
        ' are built for those. For the team’s money, ',
        { link: 'Team P&L Review', href: '/team-pnl-review', sameTab: true },
        '; for a recruiting conversation, ',
        { link: 'Recruiting Prep', href: '/recruiting-prep', sameTab: true },
        '.',
      ],
    },
  ],

  unlockKey: 'a1on1-unlocked',
});
