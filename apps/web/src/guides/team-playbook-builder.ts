// Every word on /team-playbook-builder that is its own: the landing page for the Team Playbook Builder,
// Connor's free Claude skill (`skills/team-playbook-builder/`) that turns a real estate team's own SOPs,
// policy manual and training transcripts into a playbook skill each agent adds to their own Claude
// account, plus a conflicts list, a gaps list, a 25-question test set and a message to agents with
// install steps. What every skill page says the same way is in `skill-page.ts` (D-052).
//
// The words come from the skill itself (SKILL.md and references/agent-install.md, source-handling.md
// and playbook-template.md), its page notes, its graded runs (the practice run 12 of 12, evals 1 to 3
// all passed, plus a reviewer's second runs of eval 2 and the practice) and the build and review
// reports, so the page promises what the skill does. For team leaders, owners and ops staff: Connor
// presents the Forum skills to team leaders on November 13 to 15.
//
// Claude only (skill.json): the skill's output is a Claude skill, and its upload checks, install steps
// and sharing options are Claude's. ChatGPT supports the same skill format, but no playbook has been
// tried there, so the page says so and promises nothing in ChatGPT (page-notes.md, "Why There's No
// ChatGPT Version"). So no `chatgpt`, and `chatgptPaste` is not imported (lint fails an unused import).
//
// Plans, as page-notes.md "What the Person Needs" has them (checked 2026-11-08): Claude's help center
// and pricing page list skills on every plan, Free included; the claude.com docs and the platform docs
// leave Free out. The page states both, says a Free account that can't add a skill needs a paid plan,
// and never promises Free. The connectors (Google Drive, Microsoft 365, ClickUp) are optional, read
// only and untested, and the page says so.
//
// Not tested, so not promised: uploading a generated playbook to a live Claude account, asking an
// installed playbook its 25 questions, connector reads, long real manuals, sets over 20 files, and
// attaching a .vtt file in claude.ai (the runs read the practice files as text). `setupMinutes` is an
// estimate (page-notes.md gives none): 10, as on the other skill pages with a practice run.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { skillPage } from './skill-page';

export const TEAM_PLAYBOOK_BUILDER: Guide = skillPage({
  slug: 'team-playbook-builder',
  title: 'Team Playbook Builder',

  meta: {
    title: 'Team Playbook Builder: A Free Claude Skill · Amplified Impact',
    description:
      'Upload your team’s SOPs, policy manual and training call transcripts, and get back a playbook your agents add to their own Claude, with the source behind every answer. Plus the gaps, the conflicts and 25 test questions. A free Claude skill.',
  },

  // No-break spaces keep "For Team Leaders and Ops" on one line on a phone.
  eyebrow: 'Free Claude Skill · For Team Leaders and Ops',
  // page-notes.md, "One-Line Promise", with "install" in plain words and no promise that texts stop.
  lede: 'Upload your team’s SOPs and get back a playbook your agents add to their own Claude, so they can ask it first and get your team’s written answer, with the section it came from.',
  outcome: { n: '03', title: 'Share It With Your Agents', body: 'After you check the gaps, the conflicts and the 25 test questions.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. This one reads your team’s documents and builds a second skill, your team playbook, for your agents to add. Claude never sends or shares anything for you.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word, and "What to look for".
    prompt: 'Build our team playbook from these five documents. The fee schedule applies to every agent on the team.',
    note: [
      'The five files are a made-up team’s policy manual, lead routing SOP, onboarding checklist, training call transcript and fee schedule. Every name, number and code in them is made up. Look for the pond rule conflict (10 days versus 14), pay timing and time off listed as gaps, and one agent’s own split left out. ',
    ],
  },

  real: {
    body: [
      'Start a new chat in Claude, attach your own documents (up to 20 files in one chat), and say this. “Where to get your documents,” below, shows how to get each kind.',
    ],
    prompt: 'Build our team playbook from these documents.',
    // SKILL.md step 2 (compensation held until the leader confirms) and step 6 (run the test set before
    // sharing); references/agent-install.md (the test set runs in a new chat with the playbook on).
    note: [
      'Your fee schedule stays out until you tell Claude it applies to every agent. Before you share the playbook, add it to your own Claude the same way you added this skill. Then ask it the 25 test questions Claude wrote, in a new chat. Check every number, date and dollar amount in the ',
      { strong: 'Check before sending' },
      ' list against your documents.',
    ],
  },

  sections: [
    {
      // sample.md (the practice run, 12 of 12 checks), shortened, in the output's own order and its own
      // words, cut only by whole items, rows, columns and sentences: the bottom line, Needs your answer,
      // the playbook's files (two of the table's four columns, without the SKILL.md row) and how it
      // behaves, the conflict, the top three gaps, the stale flag and two of four broker flags, three of
      // five removals, three of 20 answerable and three of five routed test questions, the message to
      // agents in full, and three rows of the check list. On a phone a three-column table of sentences
      // is a column of single words, so each table here has two: a test answer and a check line end
      // with "Source:" and the sample's own source, as the playbook's answers do, and the routed
      // questions leave out "A wrong answer would".
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What a playbook build looks like',
      body: 'What Claude wrote from the practice files: five made-up documents from a made-up team, the Lantern Lane Example Team. They’re the same files you practise on in setup.',
      title: 'Lantern Lane Example Team Playbook: Built and Checked',
      note: 'Made-up example. Shortened: two broker flags of four, three removals of five, six of the 25 test questions, and three lines of the check list.',
      blocks: [
        { h: 'Bottom line' },
        {
          p: [
            'I built lantern-lane-example-team-playbook from your 5 documents: 8 topic files that answer agents only from your own wording and name the section every time. The biggest problem is that your Policy Manual and your Lead Routing SOP give different pond rules (10 days versus 14 calendar days), so the playbook shows agents both until you pick one. Decide that first, then look at the three gaps new agents will hit in month one: when they get paid, what to do before a buyer’s first showing, and who covers their clients when they’re away.',
          ],
        },
        { h: 'Needs your answer' },
        {
          items: [
            'Pond rule: 10 days (Policy Manual 3.4, March 2, 2026) or 14 calendar days (Lead Routing and Pond SOP, January 12, 2026)? Tell me which and I’ll rebuild as version 1.1.',
            'Onboarding checklist: it’s dated June 3, 2024, more than 12 months ago. Is it still current? The playbook warns agents about its age until you confirm.',
            'Two buyer steps held out of the playbook (see Broker Review). Do you want to replace them with your current process?',
          ],
        },
        {
          p: [
            'The fee schedule is in, as you confirmed it applies to every agent. Section 4 (individual agreements) is not, and won’t be.',
          ],
        },
        { h: 'Your playbook skill' },
        {
          p: [
            { strong: 'File: ' },
            'lantern-lane-example-team-playbook.zip (one folder at the root, ready to upload). Check result: passed.',
          ],
        },
        {
          table: {
            caption: 'The playbook’s topic files',
            head: ['Topic', 'Owner'],
            rows: [
              ['Who owns what, source documents, what isn’t written yet', 'Team Leader'],
              ['Lead sources, routing, first contact, stages, the pond (CONFLICT)', 'ISA Manager'],
              ['Weeks 1 to 4, buyer steps (UNDER REVIEW), the first 90 days', 'Director of Operations'],
              ['After acceptance, who owns what, date changes, earnest money, closing gifts', 'Transaction Coordinator'],
              ['Canva templates, approvals, brokerage name, social', 'Marketing Coordinator'],
              ['Splits, fees, team cap', 'Team Leader'],
              ['Tuesday meeting, 90-day one on ones, Follow Up Boss habits', 'Team Leader'],
              ['Who decides, legal questions, client funds, fair housing', 'Team Leader'],
            ],
          },
        },
        {
          p: [
            { strong: 'How it behaves: ' },
            'it answers from these files only, ends every answer with “Source: [document], [section],” warns when a section is more than 12 months old, shows both sides of the pond conflict, sends contract, legal and compliance questions to the Managing Broker, and says “The playbook doesn’t cover that” plus the role to ask when your documents are silent.',
          ],
        },
        { h: 'Conflicts' },
        { p: [{ strong: 'When a lead goes back to the pond' }] },
        {
          items: [
            '01 Lantern Lane Policy Manual, section 3.4 (March 2, 2026): “a team lead with no logged contact in Follow Up Boss for 10 days returns to the Team Pond, where any agent in the Lead Rotation may claim it.”',
            '02 Lead Routing and Pond SOP, “The Pond” (January 12, 2026): “If an assigned team lead shows no logged call, text or email for 14 calendar days, a Follow Up Boss automation moves it to the Lantern Lane Pond.”',
            'Decision owner: Team Leader (the Policy Manual gives the Team Leader “conflicts between team documents”).',
          ],
        },
        { h: 'Gaps' },
        { p: [{ strong: 'The three a new agent hits first' }] },
        {
          items: [
            'When and how do I get paid after a closing? On the February 10, 2026 training call, the answer was “That isn’t written down anywhere yet... For now, ask Avery.” The fee schedule covers splits and fees but not timing. Likely owner: Team Leader.',
            'What do I do before a buyer’s first showing? Nothing current covers the buyer consultation, the written buyer agreement or preapproval. The only buyer steps are the two held for broker review. Likely owner: Team Leader, with the Managing Broker.',
            'Who covers my clients when I’m away? Policy Manual section 8, “Time Off and Coverage,” says “This section is being written. For now, talk to Avery.” Likely owner: Team Leader.',
          ],
        },
        {
          p: [
            'Every gap above is listed in the playbook’s routing.md under “Not Written Yet” with the role to ask. I didn’t write a policy for any of them.',
          ],
        },
        { h: 'Stale and broker review flags' },
        {
          p: [
            { strong: 'Stale: ' },
            '03 New Agent Onboarding Checklist, every row: dated June 3, 2024. The playbook’s onboarding file carries that date and tells agents to confirm with the Director of Operations.',
          ],
        },
        { p: [{ strong: 'For your broker (I don’t rule on these):' }] },
        {
          items: [
            'Two buyer steps held out of the playbook. Onboarding Checklist, Week 4: checking “the buyer agent compensation offered in the MLS” before each showing, and having the buyer sign the Buyer Agency Agreement “before you write an offer.” NAR’s practice changes took effect August 17, 2024: they removed offers of compensation from the MLS and require a written agreement with a buyer before touring a home. These steps look written for the old rules. The playbook tells agents the buyer steps are under review and sends them to you and the Managing Broker. Rules can differ by MLS and state, so confirm with your broker.',
            'Texting new leads. Policy Manual 3.2 says to “call or text a newly assigned lead within 5 minutes” and doesn’t mention consent. It’s in the playbook as written.',
          ],
        },
        { h: 'Left out' },
        {
          items: [
            '01 Policy Manual, section 2 (Roles table): phone numbers (three personal cell numbers and the brokerage office line). Agents are routed by role and Slack channel instead.',
            '03 Onboarding Checklist, Week 1, “Office access” row: an access code.',
            '05 Compensation and Fee Schedule 2026, section 4 (Individual Agreements): individual agent compensation. It stays out even though the schedule applies to everyone.',
          ],
        },
        { h: 'Test set: 25 questions' },
        { p: ['Run these in a new chat with the playbook switched on, before you share it.'] },
        {
          table: {
            caption: 'Should answer (3 of 20)',
            head: ['Question', 'Expected answer'],
            rows: [
              [
                'I got a lead notification. How long do I have to accept it?',
                '15 minutes in Follow Up Boss, or it goes to the next agent. Source: Lead Routing and Pond SOP, Routing Steps 4.',
              ],
              [
                'When’s the team meeting?',
                'Tuesdays, 9:30 to 10:30 AM, at the office or on Zoom; required for every agent in the Lead Rotation. Source: Policy Manual, 4.1.',
              ],
              [
                'Can I post my new listing on Instagram before it goes live?',
                'No. Don’t post a listing on social media before it is active in the MLS. Source: Policy Manual, 5.4.',
              ],
            ],
          },
        },
        {
          table: {
            caption: 'Should send to a person (3 of 5)',
            head: ['Question', 'The answer should name'],
            rows: [
              ['Can I add a clause to my buyer’s offer saying the seller pays for a home warranty?', 'The Managing Broker'],
              ['When will I get paid for my closing next week?', '“The playbook doesn’t cover that,” and the Team Leader'],
              [
                'How many days until an untouched lead goes back to the pond?',
                'Both versions (10 days, Policy Manual 3.4; 14 calendar days, Lead Routing and Pond SOP) and the Team Leader',
              ],
            ],
          },
        },
        { h: 'Message to agents (draft)' },
        { p: ['Read it over before you send it. I haven’t sent anything.'] },
        {
          email: {
            subject: 'Our Team Playbook Is Now In Claude',
            body: [
              'Hi team,',
              'I’ve turned our SOPs into a Claude skill, the Lantern Lane Example Team Playbook. Ask it how we do things (“when does a lead go to the pond?”, “what do I send transactions after acceptance?”) and it answers from our own documents and tells you which one.',
              'When it doesn’t know, it says so and tells you who to ask. Contract and legal questions still go to the Managing Broker.',
              'To add it (a few clicks, easiest on a computer):',
              '1. Download the attached lantern-lane-example-team-playbook.zip. Don’t unzip it.',
              '2. In Claude, go to Customize, then Skills. Click +, then + Create skill, then Upload a skill, and choose the ZIP.',
              '3. Make sure it’s switched on. If Claude says skills need code execution, turn on Code execution and file creation in Settings, then Capabilities.',
              'If an answer looks wrong or out of date, send me the question and the answer.',
              '[Team Leader Name]',
            ],
          },
        },
        { h: 'Check before sending' },
        {
          p: [
            'Every number, dollar amount, date and quoted rule in the playbook and the test set, with its source. Check each against your documents.',
          ],
        },
        {
          table: {
            caption: 'The check list (3 of 19)',
            head: ['Item', 'In the playbook'],
            rows: [
              ['Pond rule (CONFLICT)', '10 days versus 14 calendar days. Source: Policy Manual, 3.4; Lead Routing and Pond SOP, The Pond.'],
              ['Monthly team fee', '$85, charged on the 1st. Source: Fee Schedule, section 2.'],
              ['Closing gifts', 'Up to $100 per transaction; order at least 5 days before closing. Source: Training Call, 00:02:21.'],
            ],
          },
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order" (sections 1 to 10), in that order; page-notes.md "What Comes
      // Back", and its line on how the playbook behaves.
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'A bottom line',
          body: 'Three sentences at most: what Claude built, the biggest problem it found, and the one decision to make first.',
        },
        {
          title: 'Needs your answer',
          body: 'Blanks Claude couldn’t fill from your documents, whether your fee schedule applies to every agent, and each conflict as a one-line choice. Answer in the same chat and Claude rebuilds the playbook.',
        },
        {
          title: 'Your team playbook',
          body: 'A ZIP file named after your team, already checked against Claude’s upload rules, with a list of its topics and each topic’s owner and date. The playbook answers agents only from your documents and ends every answer with the document and section. It warns when a section is more than 12 months old, shows both sides of a conflict you haven’t settled, and sends contract, legal and compliance questions to your broker.',
        },
        {
          title: 'Conflicts',
          body: 'Where two documents, or a document and a training call, disagree: both quoted side by side, with their sources. Claude never picks the winner.',
        },
        {
          title: 'Gaps',
          body: 'Questions new agents ask that your documents don’t answer, with the role that likely owns each, and the three they’ll hit first on top. Plus documents your SOPs mention that you didn’t upload.',
        },
        {
          title: 'Stale sections and broker flags',
          body: 'Sections dated more than 12 months ago, or not dated. Items for your broker to review, such as texting consent, client funds, contract language, fair housing and buyer steps written before NAR’s August 2024 practice changes.',
        },
        {
          title: 'What was left out',
          body: 'Personal data and anyone’s own split or deal, listed by document and section only. Claude never repeats what it removed.',
        },
        {
          title: '25 test questions',
          body: 'For you to ask the playbook before you share it: 20 it should answer, each with the expected answer and source, and 5 it should send to a person.',
        },
        {
          title: 'A message to your agents',
          body: 'A draft with the steps to add the playbook, for you to read and send. Plus sharing steps that match your Claude plan.',
        },
        {
          title: 'Check before sending',
          body: 'Every number, dollar amount, date, deadline and quoted rule in the playbook and the test set, with its source, to check against your documents.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own and page-notes.md's, in the page's words; SKILL.md step 2 and its
      // guardrails for the wire, account and fair housing lines.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'Claude builds. You decide.',
      items: [
        {
          label: 'Run',
          title: 'Claude does the sorting',
          body: 'Reads every document in full, sorts it by topic, finds conflicts, gaps and stale sections, takes out personal data, and checks and packages the playbook.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The playbook, the 25 test questions and the message to agents. Nothing reaches an agent until you send it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Every policy, which version wins a conflict, whether a fee schedule applies to everyone, sharing the playbook, and any decision about a person. Texting consent, client funds and fair housing go to your broker. Wire and account numbers never go in the playbook.',
        },
      ],
    },
    {
      // page-notes.md, "What the Person Needs", and the build report's needs (computer, connectors,
      // accounts and cost). The Free wording is page-notes.md's: the help center lists Free, the docs
      // don't, so the page never promises it. "None if an owner adds it": a shared (not provisioned)
      // skill is off until each agent turns it on (references/agent-install.md).
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan, for you',
          body: 'With skills and code execution on, so Claude can read Word and Excel files and package the playbook. Claude’s help center lists skills on every plan, Free included, but Claude’s docs leave Free out. If your Free account has no way to add a skill, you need a paid plan.',
          tag: 'Team or Enterprise: an owner turns on code execution',
        },
        {
          title: 'Claude for each agent',
          body: 'Each agent adds the playbook to their own Claude account. Or, on your Claude Team or Enterprise plan, you share it with them, or an owner adds it for everyone.',
          tag: 'A few clicks each, or none if an owner adds it',
        },
        {
          title: 'A computer',
          body: 'Adding a skill to Claude is easiest on a computer, for you and for each agent. Once it’s added, it works in chat on the Claude phone app too.',
        },
        {
          title: 'Your team’s documents',
          body: 'Your policy manual, SOPs, onboarding checklist, fee schedule for all agents, brand rules, tech how-tos and training call transcripts. PDF, Word, Excel or text. Nothing to type.',
          tag: 'Up to 20 files in one chat',
        },
        {
          title: 'Connectors, if you want',
          body: 'A connector links Claude to another app. With Google Drive, Microsoft 365 or ClickUp connected, Claude can read your documents there, read only, instead of uploads. We haven’t tested these yet.',
          tag: 'Optional',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond your Claude plan, and no other accounts to make.',
          tag: 'Zoom transcripts need a paid Zoom account',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where It Comes From": each vendor's help center, checked
      // 2026-11-08. ClickUp's own export steps couldn't be checked, so the page sends people to the
      // connector or to ClickUp support. Otter, Fathom and Granola menus weren't checked.
      kind: 'list',
      heading: 'Where to get your documents',
      items: [
        { title: 'PDF, Word and Excel files', body: 'Attach them as they are.' },
        {
          title: 'Google Docs',
          body: 'Open the doc, click File, then Download, and choose PDF or Microsoft Word (.docx). Or, with the Google Drive connector on, click + in the chat, choose Add from Google Drive, and search for the doc or paste its link. Drive reads the words only, not pictures in the doc.',
        },
        {
          title: 'OneDrive or SharePoint',
          body: 'In Claude, open Customize, then Connectors. Find Microsoft 365 and click Add. Then ask Claude to read the folder.',
        },
        {
          title: 'ClickUp Docs',
          body: 'In Claude, open Customize, then Connectors. Click + next to Connectors, find ClickUp, click Connect and sign in. To export a Doc to a file instead, ask ClickUp support for the steps.',
        },
        {
          title: 'Zoom training calls',
          body: 'In the Zoom web portal, click Recordings & Transcripts, open the Cloud recordings tab, and click the meeting’s name. The transcript is the VTT file in the list of recording files. It needs a Pro, Business, Education or Enterprise Zoom account with cloud recording and audio transcription on.',
        },
        { title: 'Otter, Fathom or Granola', body: 'Export or copy the transcript as text.' },
      ],
    },
    {
      // page-notes.md, "Things to Say to It", all six.
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat in Claude, attach your documents, and paste. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'To start, with your documents attached',
          items: [
            'Build our team playbook from these documents.',
            'Here’s our agent handbook and onboarding checklist. My agents keep texting me the same questions. Make them something they can install.',
          ],
        },
        {
          label: 'In the same chat, to answer Claude’s questions',
          items: ['The fee schedule applies to every agent on the team.', 'Use the policy manual’s pond rule.'],
        },
        {
          label: 'Later, to update it or share it',
          items: [
            'Here’s our current playbook ZIP and the new lead routing SOP. Update it.',
            'We’re on a Claude Team plan. What’s the best way to get this to my agents?',
          ],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // SKILL.md step 1 (connectors read only), step 2 and Guardrails; page-notes.md, "What It Won't Do".
          q: 'What won’t it do?',
          a: [
            'Claude never writes a policy your documents don’t have, and never picks a winner when two documents disagree. It leaves out anyone’s own split or deal, phone numbers, personal emails, door and lockbox codes, passwords, and wire and account numbers. Your fee schedule stays out until you say it applies to every agent. Claude never sends the message to agents or shares the playbook. With a connector on, it only reads: it never writes to Google Drive, Microsoft 365, ClickUp or your CRM. The playbook sends contract, legal and compliance questions to your broker, and brokerage-wide questions to your brokerage. It explains your written rules. It doesn’t route leads, score agents or keep deal deadlines.',
          ],
        },
        {
          // page-notes.md, "What the Person Needs" and the ChatGPT FAQ; references/agent-install.md,
          // "How to Share It, by Plan".
          q: 'Which plan do my agents need?',
          a: [
            'Each agent needs their own Claude account with skills, or a seat on your Claude Team or Enterprise plan. Claude’s help center lists skills on every plan, Free included, but Claude’s docs leave Free out. If an agent on Free sees no way to add a skill, they need a paid plan. Agents who use only ChatGPT: ChatGPT now takes skills in the same format, but we haven’t tried a playbook there, so we can’t promise it works.',
          ],
        },
        {
          // page-notes.md FAQ; SKILL.md step 3; references/source-handling.md, "Conflicts".
          q: 'My documents disagree with each other. Will it guess?',
          a: [
            'No. Claude quotes both, with their sources, and asks you to choose. Until you do, the playbook shows agents both versions and sends them to the person who decides. Tell Claude your choice in the same chat, and it rebuilds the playbook as the next version.',
          ],
        },
        {
          // page-notes.md FAQ; references/agent-install.md, "Updating the Playbook" (the help center
          // doesn't say how to load a new ZIP into a shared skill).
          q: 'What happens when a policy changes?',
          a: [
            'In a new chat, attach your current playbook ZIP and the changed document, and say ',
            { strong: 'Update it' },
            '. Claude raises the version number and lists what changed. Agents on their own accounts delete the old playbook in ',
            { strong: 'Customize > Skills' },
            ' and upload the new ZIP. On a Team or Enterprise plan, people you shared it with get updates at their next use. Claude’s help center doesn’t say how to load a new ZIP into a shared skill, so if you don’t see a way, delete the old playbook, upload the new ZIP and share it again.',
          ],
        },
        {
          // page-notes.md FAQ ("We're not in Utah"); SKILL.md, the opening line.
          q: 'Does it work for any brokerage or state?',
          a: [
            'Yes. Every answer comes from your own documents, so it works for any team, brokerage or state. Claude doesn’t check your documents against state law. It flags items for your broker instead.',
          ],
        },
        {
          // page-notes.md FAQ; Anthropic's Privacy Center, as the setup step names the switch.
          q: 'Will our documents be used to train AI?',
          a: [
            'On Free, Pro, Max and Ultra, that depends on each person’s own setting: in Claude, ',
            { strong: 'Settings > Privacy' },
            ', the switch that starts with ',
            { strong: 'Help improve' },
            '. The setup steps show where. On Team and Enterprise, chats aren’t used for training by default. The playbook itself holds only team policies: no client data and no personal contact details.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Have a CRM export to clean up, not SOPs? ',
        { link: 'Database Health Check', href: '/database-health-check', sameTab: true },
        ' is the other skill for team leaders.',
      ],
    },
  ],

  unlockKey: 'tpb-unlocked',
});
