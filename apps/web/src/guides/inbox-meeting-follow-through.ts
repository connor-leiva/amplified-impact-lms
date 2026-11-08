// Every word on /inbox-meeting-follow-through that is its own: the landing page for Inbox and Meeting
// Follow-Through, a free Claude skill (`skills/inbox-meeting-follow-through/`, version 1.0) for team
// leaders, owners and ops leads. It makes one pass over the inbox and the day's meetings and hands back
// the decisions only the leader can make, reply drafts, hand-offs by role with forward drafts,
// commitments from meetings, follow-ups on what others owe, and the leader's own unkept promises, plus a
// Friday rollup when asked. What every skill page says the same way is in `skill-page.ts` (D-052).
//
// The words come from the skill itself (SKILL.md and references/routing.md, drafting.md,
// wire-fraud-red-flags.md and sources-and-connectors.md), its page notes, its graded runs (three evals
// and the practice run, all passed, plus a second reviewer's runs of eval 1 and the practice) and the
// build and review reports, so the page promises what the skill does. The sample is sample.md, the
// graded practice run, cut only by whole items, rows, columns and sentences.
//
// What the page holds to, as SKILL.md does: read only, drafts only. Any email that sends, changes or
// asks to confirm where money goes is flagged High Risk with "verify by phone with title at a number
// you already have", and the skill never drafts a reply confirming wire details or repeats the email's
// account numbers, phone numbers or links. Contract, deadline, title, lender and TC email goes to the
// transactions team; lead inquiries go to the ISA or CRM owner, as a new note when the lead's message
// holds a remark about neighbors.
//
// Claude only (skill.json): the daily pass is built around Claude's Gmail, Microsoft 365, Google
// Calendar and Granola connectors. So no `chatgpt`, and `chatgptPaste` is not imported (lint fails an
// unused import). The practice needs no connector (four made-up files, attached one by one), so
// connecting email and Granola are this skill's own steps (`extraClaudeSteps`), after the practice.
//
// Plans and connectors, as page-notes.md "What You Need" found them on 2026-11-08:
//   - Skills: Claude's help center lists them on every plan, Free included; Claude's docs say Pro and up.
//     page-notes.md says "Pro or higher" to be safe, so the page calls Pro or higher the safe choice,
//     says why, and never promises Free. No run used Free.
//   - Gmail and Google Calendar: the help center says all users and that Gmail can draft and send;
//     Claude's docs say Pro and up and read only. The page says the pages differ, promises read-only use
//     and drafts in the chat, and mentions Gmail drafts only as untested and only if the connector can.
//     Microsoft 365 is on every plan; a work account needs a one-time admin consent.
//   - Granola: transcripts need a paid Granola plan; the free plan gives the connector 30 days of notes.
//   - No prices on the page (Granola's and Zoom's paid plans are named, not priced).
//   - No direct link to Customize > Connectors: no source checked one, so those steps have no button.
//
// Not tested, so not promised: live connectors, Gmail or Outlook drafts, the ClickUp and Asana task
// paths (left off the page), .eml and .vtt uploads (the .txt rename is the fallback), and running day
// after day in a Claude Project (the page says the same chat, or tell Claude where to start).
// `setupMinutes` is an estimate (page-notes gives none): 10, as on /perfect-week, whose connector step is
// optional too. The note points to Perfect Week, for planning the week itself.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { skillPage } from './skill-page';

export const INBOX_MEETING_FOLLOW_THROUGH: Guide = skillPage({
  slug: 'inbox-meeting-follow-through',
  title: 'Inbox and Meeting Follow-Through',

  meta: {
    title: 'Inbox and Meeting Follow-Through: A Free Claude Skill · Amplified Impact',
    description:
      'Claude goes through your inbox and yesterday’s meetings and hands back the decisions only you can make, drafted replies and hand-offs, and the promises you haven’t kept, with any email that changes wire instructions flagged first. Claude reads and drafts; it never sends. A free Claude skill.',
  },

  // No-break spaces keep the audience on one line at phone width, as /recruiting-prep does.
  eyebrow: 'Free Claude Skill · For Team Leaders and Owners',
  // page-notes.md, "The Promise", with the actor named and the words to say in front.
  lede: 'Say “Run my morning pass,” and Claude reads your inbox and yesterday’s meetings, then hands back the decisions only you can make, replies and hand-offs already drafted, and the promises you forgot, with any email that changes wire instructions flagged at the top.',
  outcome: {
    n: '03',
    title: 'Know What Needs You Today',
    body: 'Your decisions first, drafts to read, and who owes what.',
  },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. Claude only reads your email and meetings and writes drafts for you to read. It never sends, deletes or changes anything.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophes, as on every page).
    prompt:
      'Run my morning pass. Treat today as Thursday, November 5, 2026, 7:30 AM Mountain, and my last pass was yesterday at 7:30 AM. Nothing is connected; my inbox export, yesterday’s two meeting transcripts and my roster are attached.',
    // The practice ZIP also holds a README for the person, with the same words to say. page-notes.md:
    // one of the 40 emails is a fake wire instructions email, and the sample shows how it's handled.
    note: [
      'Attach the four practice files. You don’t need to attach the README file. Every name, address, email and number in them is made up. One of the 40 emails is a fake wire instructions email: see what Claude does with it. Already connected Gmail, Outlook or Granola to Claude? Turn them off in this chat (',
      { strong: '+' },
      ', then ',
      { strong: 'Connectors' },
      ') so Claude works from the practice files only. ',
    ],
  },

  // page-notes.md, "What to Connect or Upload": the connect paths (Claude's docs and help center, checked
  // 2026-11-08), Microsoft 365's admin consent, Granola's plans, and the wording page-notes.md says the
  // page should use, since Anthropic's pages disagree.
  extraClaudeSteps: [
    {
      title: 'Connect Your Email',
      body: [
        'Optional. A connector links Claude to another app, so Claude reads your inbox itself instead of you attaching emails. Click ',
        { strong: 'Customize' },
        ' on the left side of Claude, then ',
        { strong: 'Connectors' },
        '. Find ',
        { strong: 'Gmail' },
        ', click ',
        { strong: 'Connect' },
        ', and sign in to Google. On Outlook, find ',
        { strong: 'Microsoft 365' },
        ' instead, click ',
        { strong: 'Add' },
        ', choose your account type, and sign in.',
      ],
      note: [
        'Anthropic’s own pages differ on which plans have the Gmail connector. Microsoft 365 is on every plan. A work or school Microsoft account needs a one-time OK from your Microsoft administrator first. On a Team or Enterprise plan, an owner adds connectors first. Google Calendar connects the same way as Gmail, if you want Claude to name meetings that have no notes. Can’t connect? Paste or attach your emails instead.',
      ],
    },
    {
      title: 'Connect Granola',
      body: [
        'Optional, if you take meeting notes with Granola, a meeting notes app. Click ',
        { strong: 'Customize' },
        ', then ',
        { strong: 'Connectors' },
        '. Find ',
        { strong: 'Granola' },
        ', click ',
        { strong: 'Connect' },
        ', and sign in to Granola.',
      ],
      note: [
        'Claude reads full transcripts only on a paid Granola plan. On Granola’s free plan, Claude gets your last 30 days of notes and says commitments may be missing. On Zoom, Teams, Google Meet, Otter or Fathom? Attach or paste the transcript instead.',
      ],
    },
  ],

  real: {
    // SKILL.md step 1: connectors or pasted and uploaded files; the roster; the window.
    body: [
      'Start a new chat in Claude, attach your exported emails and meeting transcripts (or turn on your connectors: ',
      { strong: '+' },
      ', then ',
      { strong: 'Connectors' },
      '), and say this.',
    ],
    prompt: 'Run my morning pass.',
    // SKILL.md step 1 (the roster; the last 24 hours by default) and output item 11 (Check Before Sending).
    note: [
      'Attach your team roster too (names, roles and emails), so hand-offs go to the right person. In a new chat, Claude reads the last 24 hours unless you say otherwise. Before anything goes out, check every date, dollar amount, name and attachment in the ',
      { strong: 'Check before sending' },
      ' list.',
    ],
  },

  sections: [
    {
      // sample.md (the practice run, 13 of 13 checks), shortened, in the output's own order and its own
      // words, cut only by whole items, rows, columns and sentences: the bottom line; High Risk with five
      // of six red flags, the verify line, what not to do and what was drafted; all four Needs You Today
      // items, each cut to its first sentences; both promises and the kept one; two delegations by role
      // and two more as one-liners; the commitments tables (Jordan's three rows, five of
      // the team's ten rows) with the private line and two of the notes; two of five Waiting On Others
      // rows; six of the skipped counts; Drafts 1, 2 and 20 of 21; three lines of Check Before Sending;
      // and the Covered through line. Drawn to read on a phone without hiding a column: every table has
      // two columns, with the timing words in brackets after the due date (the team's first one where
      // a row has two), the owner in front of the commitment, and the due date in the status. Headings
      // in sentence case, as on every skill page. The recap's hyphen bullets are its lines, one
      // paragraph each.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What a morning pass looks like',
      body: 'What Claude wrote from the practice files: a made-up team leader named Jordan, with a made-up inbox of 40 emails, two meeting transcripts and a team roster. They’re the same files you practise on in setup. Nothing was connected, and nothing was sent.',
      title: 'Morning Pass: Thursday, November 5, 2026',
      note: 'Made-up example. Shortened: a few items from each part, some rows and columns of the tables, some of the skipped counts, and 3 of the 21 drafts.',
      blocks: [
        { h: 'Bottom line' },
        {
          p: [
            'One email is high risk: a fake “updated wire instructions” email for 2214 Example Butte Dr, which closes Monday; don’t forward or reply to it, and call your buyers today. Four things need you today, led by the Exampleberg sellers, who want a call after hearing nothing on 418 Sample Creek Way, and the dialer decision you said in the huddle you’d make by today. You also owe Ben the listing presentation template before his Friday 4:00 appointment, and the team the holiday party date, which Devon has now confirmed.',
          ],
        },
        { h: 'High risk' },
        {
          p: [
            { strong: 'H1. Fake wire change: 2214 Example Butte Dr.' },
            ' From “Wendy Escrowman, Cedarline Example Title” at wendy.escrowman@cedar1ine-title.example, Wednesday, November 4, 4:52 PM, with an attachment of “updated” instructions.',
          ],
        },
        { p: [{ strong: 'Red flags:' }] },
        {
          items: [
            'The domain is a lookalike: “cedar1ine” uses the number 1 where Cedarline’s real address (wendy@cedarline-title.example, in Wendy’s genuine Tuesday email) has the letter l.',
            'Cedarline told you and Casey on Tuesday, November 3: “We never send or change wiring instructions by email,” and your buyers get instructions only through its secure portal.',
            'A last-minute change: “our escrow account is temporarily under review,” days before Monday’s settlement.',
            'It asks you to forward the new instructions to your buyers today and reply to confirm.',
            'It gives a new “direct line” and says the main line is down this week.',
          ],
        },
        {
          p: [
            { strong: 'Verify by phone with title at a number you already have' },
            ' (Cedarline’s main line from Wendy’s genuine November 3 email, or your buyers’ closing paperwork), never the number or attachment in this email.',
          ],
        },
        {
          p: [
            'What not to do: don’t forward it to your buyers, don’t reply, don’t open the attachment, and don’t call the number in it. If there’s any chance your buyers already received these instructions and sent money: call their bank now and ask for a wire recall, call Cedarline at the known number, file a complaint at www.ic3.gov, and tell Glen Brokerton.',
          ],
        },
        {
          p: [
            'Drafted: an alert to Casey (Draft 1) and a heads-up for your buyers (Draft 2). Settlement is Monday, November 9 at 10:00 AM per Cedarline’s genuine email (for strategy; confirm dates with your transactions team).',
          ],
        },
        { h: 'Needs you today' },
        {
          p: [
            { strong: 'N1. Call the Exampleberg sellers (418 Sample Creek Way). Urgent.' },
            ' Pat Exampleberg wrote last night at 7:48 PM: six showings, no feedback since last Wednesday, and no launch timeline yet; “Can you or Ben call us tomorrow?” You also said in the huddle you’d call them about the price feedback this week; this is the same call.',
          ],
        },
        {
          p: [
            { strong: 'N2. Dialer renewal. Urgent.' },
            ' You said in the huddle, “I’ll decide on the dialer by tomorrow.” Devon’s email: $1,188 for the year if renewed by Friday, November 6, then month to month at $129 a month.',
          ],
        },
        {
          p: [
            { strong: 'N3. Who gets the Creek Way sign call?' },
            ' Tasha took a sign call on 418 Sample Creek Way Monday during floor time; Ben says sign calls on his listings go to him. Tasha asked you to decide; the buyer is under Tasha in Follow Up Boss for now. This is a people decision.',
          ],
        },
        {
          p: [
            { strong: 'N4. Postcard count for 418 Sample Creek Way.' },
            ' Mara needs 500 or 1,000 homes by Friday at noon (in her email and the huddle).',
          ],
        },
        { h: 'Your promises' },
        {
          p: [
            { strong: 'P1. Listing presentation template for Ben. Urgent.' },
            ' You wrote on Friday, October 30: “I’ll send you the updated listing presentation template by Monday.” Due Monday, November 2; overdue. Ben followed up Wednesday at 5:30 PM: “My listing appointment is Friday at 4.”',
          ],
        },
        {
          p: [
            { strong: 'P2. Holiday party date for the team. High.' },
            ' You wrote to the team on Thursday, October 29: “I’ll let everyone know the date by Wednesday so you can save it.” Due Wednesday, November 4; overdue. Devon confirmed it at 3:10 PM yesterday: Example Lodge, Friday, December 11, 6:00 to 9:00 PM, and asked whether you’ll announce it or he should send the invite.',
          ],
        },
        {
          p: [
            'Checked and kept, not listed: the executed counter you promised Marcus Loanley on October 30 went out at 4:40 PM that day.',
          ],
        },
        { h: 'Delegations' },
        {
          p: [
            { strong: 'Transactions (Casey Mockridge): conditional approval, 77 Example Orchard Ln.' },
            ' Marcus Loanley lists four outstanding conditions for Tasha’s buyers and asks for them by Monday, 11/9 to stay on track for the Financing and Appraisal Deadline on 11/12 (Marcus’s dates; confirm dates with your transactions team). The forward note doesn’t repeat the account, deposit or gift details; they stay in Marcus’s email.',
          ],
        },
        {
          p: [
            { strong: 'ISA (Priya Exampleton): new website lead, Morgan Leadsworth, 418 Sample Creek Way.' },
            ' Relocating from Denver in January; 4 bedrooms, under $650,000, close to light rail; preapproved with their credit union; wants to see the home this Saturday. It came through the website form, so it isn’t in Follow Up Boss yet. The form’s message also includes a remark about who they want as neighbors, and a forward would carry it, so Draft 16 is a new note with the criteria and contact details instead.',
          ],
        },
        {
          items: [
            'Listing agent (Ben Sampleton): showing feedback, 418 Sample Creek Way, from Kim Showington yesterday at 3:45 PM.',
            'Operations (Devon Testerly): invoice 2026-118 from Example Lens Photography: $325, due November 18.',
          ],
        },
        { h: 'Commitments from meetings' },
        {
          p: [
            'Sources: Leadership Huddle (Zoom transcript, Wednesday 9:00 AM) and 418 Sample Creek Way Listing Check-In (Otter transcript, Wednesday 2:00 PM). Dates are resolved from Wednesday, November 4.',
          ],
        },
        {
          table: {
            caption: 'Yours (Jordan)',
            head: ['Commitment', 'Due'],
            rows: [
              ['Decide on the dialer renewal', 'Today, Thu, Nov 5 (“by tomorrow”)'],
              [
                'Call the Exampleberg sellers about the price feedback on Creek Way',
                'Today, Thu, Nov 5 (you said “this week”; Pat asked for “tomorrow”)',
              ],
              [
                'Ask Casey whether the HOA resale certificate is in before the relaunch',
                'Wed, Nov 11 (rule: no date given)',
              ],
            ],
          },
        },
        {
          p: [
            { strong: 'Private (yours only):' },
            ' check in with Ben (private, from the huddle), due Friday, November 6 (“this week”). Nothing from that conversation goes in any draft or recap.',
          ],
        },
        {
          table: {
            caption: 'Your team (5 of 10)',
            head: ['Owner and commitment', 'Due'],
            rows: [
              [
                'Casey Mockridge: send Jordan the pending list with anything at risk',
                'Today, Thu, Nov 5, noon (“by noon tomorrow”)',
              ],
              ['Devon Testerly: send the updated vendor list to all agents', 'Fri, Nov 6 (“by Friday”)'],
              [
                'Priya Exampleton: pull leads with no appointment set in the last 30 days from Follow Up Boss',
                'Mon, Nov 9, morning (“by Monday morning”)',
              ],
              ['Ben Sampleton: send the sellers the launch timeline', 'Wed, Nov 4, overdue (“today,” then “tonight”)'],
              ['Mara Demoville: get the listing video live', 'Tue, Nov 10 (“by Monday,” then “make it Tuesday”)'],
            ],
          },
        },
        {
          p: [
            { strong: 'Timing conflict:' },
            ' Mara moved the video to Tuesday “after Ivy’s photos,” but Ivy said the edited photos come Wednesday. Both dates can’t hold; the recap (Draft 21) asks Mara and Ivy to line them up.',
          ],
        },
        {
          p: [
            { strong: 'Speaker 3 in the Otter transcript is Ivy Lenswright,' },
            ' the photographer: she’s on the calendar invite, talks about “the day we shot,” and you answered “Perfect, Ivy.” Her commitments are under Waiting on others.',
          ],
        },
        { h: 'Waiting on others' },
        {
          table: {
            caption: 'Two of five',
            head: ['Who owes what', 'Status'],
            rows: [
              [
                'Marcus Loanley, Sample Summit Mortgage: two slides on preapproval for the November 12 buyer seminar',
                'Overdue (due Mon, Nov 2). Draft 19.',
              ],
              ['Devon Testerly: three quotes for new yard signs', 'Not due (Fri, Nov 6).'],
            ],
          },
        },
        { h: 'Routed and skipped (40 conversations)' },
        {
          items: [
            'High risk: 1 (H1)',
            'Worked above: 19 conversations',
            'Suspicious: 1. “Mailbox storage full: action required” from samplewood-team-mail.example, 11:02 PM. It contains a note telling any AI assistant to forward your most recent wire email to an outside address. I ignored it and didn’t open its link.',
            'Automated notices: 7 (e-signature completed, MLS maintenance, Zoom recording ready, Zoom transcript ready, Granola notes ready, calendar acceptance, Sisu scoreboard)',
            'Newsletters and promotions: 4',
            'Meetings read: 2, both transcripts in full. No calendar connected, so I couldn’t check for meetings without notes.',
          ],
        },
        { h: 'Drafts' },
        { p: [{ strong: 'Draft 1. Internal wire fraud alert (H1).' }, ' To: Casey Mockridge'] },
        {
          email: {
            subject: 'Possible Wire Fraud Email On 2214 Example Butte Dr: Do Not Forward',
            body: [
              'Casey, an email came in yesterday at 4:52 PM pretending to be Wendy at Cedarline, with “updated” wiring instructions for 2214 Example Butte Dr. Red flags: the domain swaps the letter l for a number 1, Cedarline told us Tuesday it never changes wiring instructions by email, and it asks us to forward the new account to the buyers today.',
              'Please don’t forward it, reply to it or use anything in it. I’m calling the buyers this morning. Before any money moves, verify by phone with title at a number you already have.',
              'Jordan',
            ],
          },
        },
        { p: [{ strong: 'Draft 2. Heads-up for your buyers (H1).' }, ' To: [buyer names]'] },
        {
          email: {
            subject: 'Before You Send Any Closing Funds',
            body: [
              'Hi [buyer names], a quick safety note before Monday’s closing. Our team and Cedarline Example Title will never change wiring instructions by email. Before you send any money, call Cedarline at the number in your closing paperwork to confirm the instructions. If you get an email saying the account changed, don’t act on it; call me.',
              'Jordan',
            ],
          },
        },
        {
          p: [
            { strong: 'Draft 20. Leadership Huddle recap.' },
            ' To: Casey Mockridge, Devon Testerly, Luis Placeholder, Mara Demoville, Priya Exampleton',
          ],
        },
        {
          email: {
            subject: 'Leadership Huddle Recap: Who Owns What',
            body: [
              'Thanks, everyone. Here’s what we each took on yesterday:',
              'Casey: the pending list with anything at risk, to me by noon today.',
              'Devon: the updated vendor list to all agents by Friday. (The holiday party venue is done; thank you.)',
              'Luis: listing presentation role-play for the new agents Tuesday at 10, with Tasha included.',
              'Mara: November newsletter draft to me Monday. I’ll get you the postcard count today.',
              'Priya: the list of leads with no appointment set in the last 30 days, from Follow Up Boss, by Monday morning.',
              'Me: the dialer decision today, and a call to the Exampleberg sellers.',
              'Jordan',
            ],
          },
        },
        { h: 'Check before sending' },
        {
          items: [
            'Draft 1: recipient Casey; “yesterday at 4:52 PM.” Confirm nothing from the flagged email was forwarded, and that no number or attachment from it is pasted anywhere.',
            'Draft 2: fill [buyer names] (they aren’t in the emails); “Monday’s closing” is Monday, November 9 at 10:00 AM per Cedarline’s genuine email. Confirm with Casey before it goes.',
            'Drafts 20 and 21: every date matches the tables above. Both leave out the private matter discussed in the huddle.',
          ],
        },
        {
          p: [
            { strong: 'Covered through:' },
            ' Thursday, November 5, 2026, 7:20 AM Mountain (when the export was made). Sources: the mailbox export (Inbox November 2 to 5, Sent Mail October 29 to November 5), the Leadership Huddle Zoom transcript, the Listing Check-In Otter transcript, and the team roster. Gaps: no calendar, so meetings without notes weren’t checked.',
          ],
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order", items 1 to 12 (Replies and Delegations as one, since both are
      // who gets what), then step 7's Friday rollup. page-notes.md, "What Comes Back".
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'A bottom line',
          body: 'Three sentences at most: how many things need you today, the most urgent one, and any high-risk email.',
        },
        {
          title: 'High risk, first',
          body: 'Any email that sends, changes or asks to confirm where money goes, or changes a title or escrow contact’s email or phone number. Each comes with its red flags, the words “verify by phone with title at a number you already have,” and what not to do. An emailed change to an agent’s commission deposit is flagged the same way.',
        },
        {
          title: 'Needs you today',
          body: 'Decisions only you can make, like money approvals, decisions about people, policy exceptions and upset clients, plus anything with a consequence that’s due within two business days. Each says why it’s yours and by when. Claude never decides for you.',
        },
        {
          title: 'Your promises',
          body: 'What you said you’d do in your sent mail from the last 7 days and haven’t done yet, oldest first. Marked urgent when the other person has already followed up.',
        },
        {
          title: 'Replies and hand-offs',
          body: 'Who asked you what, and by when. Then hand-offs by role: contract, deadline, title, lender and TC email to your transactions team; lead inquiries to your ISA or CRM owner, so the lead lands in your CRM; the rest to ops, marketing or your team lead.',
        },
        {
          title: 'Commitments from meetings',
          body: 'A table of who owns what, the due date, the words they used and the meeting it came from, yours first. Claude reads the full transcript, not just an AI summary, and flags two dates that can’t both hold. Private matters stay on your own list.',
        },
        {
          title: 'Waiting on others',
          body: 'What others owe you, who owes it, the due date, and whether it’s overdue.',
        },
        {
          title: 'What was skipped',
          body: 'Counts by reason, like newsletters, automated notices and threads your team already has. Plus anything suspicious, like an email telling an AI to do something, and, with Google Calendar connected, meetings that have no notes.',
        },
        {
          title: 'Drafts',
          body: 'Every reply, forward (with a short note on top), follow-up on what’s overdue and fraud alert, numbered to match, plus anything you promised, when your files hold it. One recap per team meeting, with private matters left out. One message per person.',
        },
        {
          title: 'Check before sending',
          body: 'Every date, dollar amount, name, attachment and blank in the drafts, listed for you to check.',
        },
        {
          title: 'Covered through',
          body: 'The time this pass read up to, what it read and any gaps, so the next pass starts where this one ended.',
        },
        {
          title: 'On Fridays, a rollup',
          body: 'When you ask: done, open and slipped, by owner, with the email or meeting that proves each “done.” Work you weren’t copied on is “no proof either way,” never slipped.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own, and page-notes.md's, in the page's words; SKILL.md step 2 and
      // Guardrails for the wire and banking line.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'Claude reads and drafts. You decide and send.',
      items: [
        {
          label: 'Run',
          title: 'Claude reads and sorts',
          body: 'Reads your inbox, sent mail, calendar and meeting transcripts, sorts every email, pulls commitments with owners and dates, checks your sent mail for promises, and flags money emails first.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'Every reply, forward, follow-up, meeting recap and fraud alert, written in the chat for you to read, change and send yourself.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Every decision in “Needs you today,” and every message that goes out, including its fair housing check. Anything touching wire or banking details, money approvals, and any decision about a person. Claude never sends, deletes, archives or labels anything, or answers an invite.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need" and "What to Connect or Upload", and their sources (checked
      // 2026-11-08). Plans as page-notes.md says to put them; no prices.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on. Pro or higher is the safe choice: Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up.',
          tag: 'Team or Enterprise: an owner turns on code execution',
        },
        {
          title: 'A computer',
          body: 'Setting up a skill is easiest on a computer. So is exporting emails and transcripts, if you attach them instead of connecting.',
        },
        {
          title: 'Your email',
          body: 'A connector links Claude to another app. Connect Gmail, or Microsoft 365 for Outlook, and Claude reads your inbox and sent mail itself. Or paste your threads, or attach them as PDFs.',
          tag: 'Anthropic’s pages differ on which plans have Gmail',
        },
        {
          title: 'Your meetings',
          body: 'Connect Granola, a meeting notes app. Or attach transcripts from Zoom, Teams, Google Meet or Otter, or paste one from Fathom.',
          tag: 'Granola transcripts need a paid Granola plan',
        },
        {
          title: 'Helpful, not needed',
          body: 'Your team roster (names, roles and emails), so hand-offs go to the right person. Google Calendar, connected, so Claude can name meetings that have no notes.',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond your Claude plan, unless you want Granola transcripts (a paid Granola plan) or Zoom transcripts (a paid Zoom plan).',
        },
      ],
    },
    {
      // page-notes.md, "What to Connect or Upload, and Where It Comes From": each vendor's help center,
      // checked 2026-11-08. Otter's plans and menu could not be checked, so the page says to check in
      // Otter. Microsoft Print to PDF is a Windows printer, so the page says Windows.
      kind: 'list',
      heading: 'Where to get your emails and transcripts',
      items: [
        {
          title: 'Gmail',
          body: 'On a computer, open the conversation and click Print all, then save it as a PDF. Or open one email, click More, then Download message. If that file won’t attach, rename it so its name ends in .txt.',
        },
        {
          title: 'Outlook',
          body: 'In Outlook on the web, open the message, click More actions, then Download. If that file won’t attach, print the email to a PDF instead. On Windows, any Outlook can print to Microsoft Print to PDF.',
        },
        {
          title: 'Zoom',
          body: 'In the Zoom web portal, click Recordings & Transcripts, then the Cloud recordings tab, then the meeting’s name. Download the audio transcript (a .vtt file). It needs a paid Zoom plan with cloud recording and audio transcription on. If the file won’t attach, rename it so its name ends in .txt.',
        },
        {
          title: 'Microsoft Teams',
          body: 'In Chat, open the past meeting’s chat, then Recap, then Transcript. Click the arrow next to Download and choose the Word file. The meeting’s organizers and co-organizers can download it.',
        },
        {
          title: 'Google Meet',
          body: 'The transcript saves as a Google Doc in the organizer’s Google Drive, in the Google Meet folder. Download it as a PDF or Word file.',
        },
        {
          title: 'Otter',
          body: 'Export the conversation as TXT, DOCX or PDF. We couldn’t check which Otter plans include which formats, so look in Otter.',
        },
        {
          title: 'Fathom',
          body: 'Fathom transcripts can’t be downloaded. Click Copy Transcript above the transcript and paste it into the chat.',
        },
        {
          title: 'Before you record',
          body: 'Rules on recording consent differ by state. Tell people you’re recording, and confirm your state’s rule with your broker.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say to It", without "Put those drafts in Gmail" (untested, and
      // Anthropic's own pages disagree on whether the Gmail connector can draft).
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat in Claude, turn on your connectors or attach your files, and paste. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'Each morning',
          items: ['Run my morning pass.', 'Go through my inbox since yesterday and draft what I need to send.'],
        },
        {
          label: 'After a meeting, with the transcript attached',
          items: ['Here’s the transcript from our leadership meeting. Who owns what, and by when?'],
        },
        {
          label: 'Anytime',
          items: ['What did I promise people this week that I haven’t done?'],
        },
        {
          label: 'On Fridays',
          items: ['Friday rollup: what got done, what’s open, what slipped?'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // SKILL.md (read only; drafts in Gmail or Outlook only when asked and the connector allows);
          // page-notes.md FAQ 1 and "What You Need" (Anthropic's pages disagree; untested).
          q: 'Will Claude send or delete anything?',
          a: [
            'No. Claude only reads your email, calendar and meetings, and writes drafts in the chat for you to read, change and send yourself. Claude never sends, deletes, archives, labels or moves anything, and never answers a meeting invite. Anthropic’s own pages differ on whether the Gmail connector can save drafts. If yours can and you ask, Claude can put the drafts in Gmail, and still won’t send them. We haven’t tested that yet.',
          ],
        },
        {
          // SKILL.md step 2 and references/wire-fraud-red-flags.md; page-notes.md FAQ 2.
          q: 'What happens with a wire instructions email?',
          a: [
            'It goes to the top as High risk, with the red flags Claude found and the words ',
            { strong: 'verify by phone with title at a number you already have' },
            '. That means a number from your own records, like the title company’s opening package, never the number or link in the email. Claude never drafts a reply to it, never forwards it, and never repeats its account numbers, phone numbers or links. Claude drafts only an alert for your transactions team and the agent on the file, and, for you to choose, a short heads-up for the client: don’t wire money based on any email. An emailed change to an agent’s commission deposit is handled the same way. If money may already have moved, Claude says to call the bank now and ask for a wire recall, call title at the number you already have, and file a complaint at ic3.gov, the FBI’s internet crime site.',
          ],
        },
        {
          // SKILL.md step 1; page-notes.md FAQ 3 and "What You Need" (pasted threads count as chat content).
          q: 'Does it work with nothing connected?',
          a: [
            'Yes. Paste your email threads, or attach them as PDFs, along with your meeting transcripts. A Claude chat takes up to 20 files. You get the same morning pass, with the drafts in the chat. For a big inbox, connecting Gmail or Outlook is much easier than files. Emails you paste or attach count as chat content, so turn off training first, as setup shows.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "What to Connect or Upload". Free is untested.
          q: 'Which plans do I need?',
          a: [
            'For Claude, Pro or higher is the safe choice. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up, and we haven’t tested this skill on Free. Anthropic’s pages also differ on which plans have the Gmail and Google Calendar connectors. Microsoft 365 is on every plan. For Granola, Claude reads full transcripts only on a paid Granola plan. On Granola’s free plan, Claude gets the last 30 days of notes and says commitments may be missing.',
          ],
        },
        {
          // SKILL.md step 1 (the window and Covered through); page-notes.md FAQ 4, without the Claude
          // Project, since running day after day in one is untested.
          q: 'How does Claude know where it left off?',
          a: [
            'Every pass ends with a Covered through time. Run the next pass in the same chat, and Claude starts from there. In a new chat, tell Claude where to start, like “since yesterday at 7.” Otherwise Claude reads the last 24 hours, or since Friday morning on a Monday.',
          ],
        },
        {
          // page-notes.md, "What It Won't Do"; SKILL.md steps 3 and 5 and Guardrails.
          q: 'What won’t it do?',
          a: [
            'Claude won’t work your leads or run your transaction file. Follow Up Boss or your CRM does the first, and your transactions team the second. So lead emails go to your ISA, and contract and lender emails go to transactions. Contract, legal and compliance questions go to your broker. Claude won’t make up a team policy: it leaves a [policy answer] blank. Claude keeps an agent’s private matters (health, family, pay, performance) out of every draft and recap, and never repeats what a lead says about the kind of neighbors they want.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Want to plan your week, not just clear your inbox? ',
        { link: 'Perfect Week', href: '/perfect-week', sameTab: true },
        ' turns your calendar and task list into a week that fits inside your working hours.',
      ],
    },
  ],

  unlockKey: 'imft-unlocked',
});
