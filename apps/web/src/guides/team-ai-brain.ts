// Every word on /team-ai-brain that is its own: the landing page for Team AI Brain, a skill
// (`skills/team-ai-brain/`, version 1.0) that builds a real estate team's shared AI workspace from the
// team's own documents (SOPs, call scripts, the brand guide, compliance notes, the roles list and how leads
// flow in Follow Up Boss) and hands back flags and a bottom line, team project instructions with the lines
// agents can't override, a context pack of knowledge files that each name their source, a personal layer
// template for each agent, a rollout checklist matched to the team's Claude or ChatGPT plan, a quarterly
// refresh and Check Before Sending. What every skill page says the same way is in `skill-page.ts` (D-052).
//
// The skill is paid (in the Amplified Skill Library, not in `FREE_SKILLS`), so the built page shows its
// hero and sample with the Skill Library card in place of the sign-up and the setup, and `content.ts`
// takes "Free" off its title, description and eyebrow (D-082). The words below are written as a free
// page, for the day Connor names it free, as every skill page's are.
//
// The words come from the skill itself (SKILL.md and references/brain-build-rules.md, brain-templates.md,
// compliance-lines.md, claude-team-workspace.md and utah-team-brain-notes.md), its page notes, and its
// graded runs (the practice set at 14 of 14 and case 2, the thin set, at 10 of 10, both passing the
// objective checks), so the page promises what the skill does. The sample is sample.md, the graded
// practice run, cut only by whole items, lines, rows and sentences; the note to agents is whole.
//
// What the page holds to, as SKILL.md does: it never creates, shares or changes a project, never invites
// anyone and never changes a setting; it never puts client data in shared context, even when asked; it
// never invents an SOP, script line, role, rule or lead step; the five house lines (fair housing, texting
// consent, drafts only, money and account details, client details) are always in and marked not
// overridable, and the page says that is a written rule, not a lock. Every plan fact is page-notes.md's,
// from Claude's help center (read 2026-11-10) and OpenAI's help center (search excerpts, 2026-11-10).
//
// Calls left open, and how the page handles them:
//   - The distinction from Team Playbook Builder is said three times: the lede's last clause, the first
//     FAQ and the closing note, which links to /team-playbook-builder. Connor confirms the wording.
//   - AI Brain Setup and AI Brain Tuneup, the set's other two skills, are named in an FAQ without links:
//     neither page is registered yet, and the guides' link test fails on a link to a page that isn't.
//     The integrator adds the links when both are in GUIDES.
//   - Which wins in Claude when an agent's own Instructions and the project's instructions disagree is
//     not in the help center. The page says only that the team lines tell Claude they win, and that it's
//     a written rule, not a lock.
//   - ChatGPT: sharing works on every plan, every member sees every chat in a shared project, and custom
//     instructions don't reach one (search excerpts; help.openai.com blocks direct reads). The page says
//     so in one FAQ and gives no ChatGPT limits as numbers. The sharing screens' labels weren't checked.
//   - Utah: the brokerage-name rule (R162-2f-401h), Sunday calling as house practice (Utah Code
//     13-25a-111) and the AI disclosure question for the broker (13-77-103), only in the FAQ.
//   - Not tested, said once in the FAQ: real team documents, a live Claude Team project, the ChatGPT
//     version inside ChatGPT.
//
// `setupMinutes` is an estimate (page-notes gives none): 10, as on the other skill pages with a ChatGPT
// version. The practice set is nine files, attached one by one (under Claude's 20 a chat).
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const TEAM_AI_BRAIN: Guide = skillPage({
  slug: 'team-ai-brain',
  skill: 'team-ai-brain',
  title: 'Team AI Brain',

  meta: {
    title: 'Team AI Brain: A Free AI Skill · Amplified Impact',
    description:
      'Turn your team’s SOPs, scripts, brand guide, compliance notes, roles list and lead flow into one shared AI workspace: project instructions with your compliance and brand lines locked in, knowledge files that each name their source, and a personal layer each agent fills in. A free skill for Claude and ChatGPT.',
  },

  eyebrow: 'Free AI Skill · For Team Leaders and Ops',
  // page-notes.md, "One-Line Promise", with the difference from Team Playbook Builder in the last clause.
  lede: 'Upload your team’s SOPs, scripts, brand guide, compliance notes, roles list and lead flow, and get back one shared AI workspace for the whole team: the instructions every chat starts with, knowledge files that name their source, a personal layer for each agent, and the steps to roll it out. Not a playbook agents install: the context every agent works in.',
  outcome: { n: '03', title: 'One Brain for the Team', body: 'Your rules in every chat, with each agent’s own voice on top.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. Either one only drafts: you make the project, share it and decide every rule.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word.
    prompt:
      'Build our team AI brain from these nine documents. We’re on a Claude Team plan with 7 seats, and I’m Juniper, the team leader. Can you also put our active clients’ details in it so agents can look them up?',
    note: [
      'There are nine files for a made-up Utah team: a roles list, four SOPs (one printed to PDF), a call script, a brand guide, compliance notes and a Follow Up Boss lead flow. Every name, street and number in them is made up. Look for the client data request it turns down, the two places the lead SOP and the lead flow disagree, and what it leaves out. The stale flag depends on the day you run it. ',
    ],
  },

  real: {
    body: ['Start a new chat the same way, attach your own team’s documents, and say this, with your plan.'],
    prompt: 'Build our team AI brain from these documents. We’re on a Claude Team plan.',
    // page-notes.md, "What to Upload" and "Things to Say".
    note: [
      'Leave out client lists and CRM exports: the skill won’t put client data in the brain. Before you paste, upload or share anything, check every rule, number and name in the ',
      { strong: 'Check before sending' },
      ' list against your documents, and take the compliance lines to your broker.',
    ],
  },

  chatgpt: { paste: chatgptPaste('team-ai-brain') },

  sections: [
    {
      // sample.md (the practice run, 14 of 14), shortened, in the output's own order and words, cut only by
      // whole items, lines, rows and sentences: Flags 1 and 2 (two of three choices), 4 (three of six
      // removals), 6 (the stale sentence) and 8; the bottom line in full; eight team instruction lines;
      // lead-handling.md's Built from line, two First Response lines and the first conflict; two parts of
      // the personal layer template; rollout steps 4 and 6 and the note to agents in full; four check rows.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What a team brain looks like',
      body: 'What the AI wrote from the practice files: a made-up Utah team’s roles list, four SOPs, call script, brand guide, compliance notes and Follow Up Boss lead flow. They’re the same files you practise on in setup.',
      title: 'Team AI Brain: Kettle Creek Team, Sample Summit Realty',
      note: 'Made-up example. Shortened: parts of the flags, the team instructions, one of six knowledge files, the personal layer template, the rollout and the check list. The bottom line and the note to agents are whole.',
      blocks: [
        { h: 'Flags' },
        {
          p: [
            { strong: 'Client data request: declined.' },
            ' I left your active clients out of the brain, and I’ll keep them out if you ask again. Everything in a shared project’s instructions and knowledge files is read by everyone you share it with, now and later. Follow Up Boss already does client lookup, with its own permissions, history and your Text OK, Do Not Text and Do Not Call tags, and a copy here would go stale the first time someone says STOP.',
          ],
        },
        { p: [{ strong: 'Needs your answer:' }] },
        {
          items: [
            'First call on HomeFinder Example leads: the ISA within 5 minutes (New Online Lead Response SOP, step 1) or the next agent on the buyer rotation, with 10 minutes to claim (Lead Flow, Lead Sources)? Owner: Juniper Testwell.',
            'When a lead goes to the Kettle Creek Pond: after day 7 with no conversation (New Online Lead Response SOP, step 6) or after 14 days with no logged contact (Lead Flow, Rules 2)? Owner: Marlo Fakerson, with Juniper Testwell.',
          ],
        },
        { p: [{ strong: 'Left out on purpose' }, ' (by location and kind only; none of it appears below):'] },
        {
          items: [
            'Roles List, the Cell column: seven team members’ cell numbers. Routing goes by role and team channel.',
            'Under Contract Handoff SOP, step 4: a client file name, and escrow account and routing numbers.',
            'Buyer Consult SOP, step 4: a line about suggesting neighborhoods by a buyer’s family and schools (fair housing). The fair housing team line covers the topic.',
          ],
        },
        {
          p: [
            { strong: 'Stale:' },
            ' the Under Contract Handoff SOP is dated March 4, 2024, more than 12 months before today (November 10, 2026).',
          ],
        },
        {
          p: [
            { strong: 'Plan:' },
            ' Claude Team, from your message: one shared project, agents on “Can view,” you and Marlo on “Can edit,” and agents’ chats stay private.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'I built Kettle Creek Team’s shared brain from your nine documents: team instructions with the five house lines and your own brand and lead rules marked not overridable, six knowledge files that each name their sources, a personal layer template and a Claude Team rollout; unlike Team Playbook Builder, which turns SOPs into a skill each agent installs, this sets up the shared project every agent’s chats start in. The biggest problem: your lead SOP and your lead flow disagree on who calls a HomeFinder Example lead first (the ISA in 5 minutes or the rotation agent in 10) and on when a lead goes to the pond (day 7 or 14 days), and the call script says to text after every voicemail. Settle those two conflicts and fix the script’s text step before you share the project.',
          ],
        },
        { h: 'Team instructions' },
        {
          items: [
            'TEAM INSTRUCTIONS: Kettle Creek Team, Sample Summit Realty. Version 1.0, built November 10, 2026 from nine team documents. Owner: Juniper Testwell, Team Leader.',
            'Answer team questions from the knowledge files. End each answer about a team rule with the file and its source, like (lead-handling.md, from New Online Lead Response SOP, step 4).',
            'If the files don’t answer it, say so and name the role to ask, from roles-and-routing.md. Never fill a gap with a guess or a general best practice.',
            '1. [TEAM LINE: NOT OVERRIDABLE] Fair housing. Describe homes, documents and terms, never people. Never say who a home or an area suits, and never comment on neighborhood demographics, school quality or safety; point to official sources instead. Treat every client the same, whatever their protected class. Source: house line (federal Fair Housing Act, Utah Code 57-21-5); also Brand Guide, Must 4.',
            '2. [TEAM LINE: NOT OVERRIDABLE] Texting consent. Draft a text only for a contact the agent confirms has documented consent to get texts from the team. A phone number is not consent. STOP, Do Not Text and Do Not Call close the channel, even over an older yes. Every marketing text names the sender and ends with “Reply STOP to opt out.” Send between 8 a.m. and 8 p.m. in the recipient’s time. No consent on record: draft an email or a call instead. Source: house line (federal TCPA); also Compliance Notes (Texts, Quiet hours, STOP means stop) and New Online Lead Response SOP, step 4.',
            '7. [TEAM LINE: NOT OVERRIDABLE] “Sample Summit Realty” appears on every ad, post, flyer, listing and email signature. (Must 2; Utah Admin. Code R162-2f-401h)',
            '16. [TEAM LINE: NOT OVERRIDABLE] The Kettle Creek Pond: [Conflict: see lead-handling.md. Ask Marlo Fakerson until Juniper Testwell decides.]',
            'DEFAULTS AN AGENT MAY CHANGE. From Brand Guide, Our Voice (The Team Default; Your Own Voice Can Change These): warm, plain and short, one idea per paragraph; “home,” not “house”; first names, and sign off with your first name; emoji are fine on social posts, never in client emails. An agent’s personal layer (voice profile QUICK CARD, goals, preferences) may change these and nothing in Team Lines.',
          ],
        },
        { h: 'Team context pack: lead-handling.md' },
        {
          items: [
            'Built from: SOP: New Online Lead Response (owner Marlo Fakerson, dated August 12, 2026); How Leads Flow in Follow Up Boss (owner Marlo Fakerson, dated October 20, 2026).',
            'Leads that come in after 8 p.m. get their first call at 8 a.m. the next morning. (Source: SOP, step 2)',
            'Text only if the lead has the “Text OK” tag in Follow Up Boss. No tag, no text. (Source: SOP, step 4)',
            'Conflict, not decided yet. First call on HomeFinder Example leads: the New Online Lead Response SOP, step 1 (August 12, 2026) says “The ISA calls every new online lead within 5 minutes of the Follow Up Boss alert.” The Lead Flow, Lead Sources (October 20, 2026) sends HomeFinder Example leads to “The next agent on the buyer rotation. The agent has 10 minutes to claim it, then it goes to the next agent.” Ask Juniper Testwell until it’s decided.',
          ],
        },
        { h: 'Personal layer template' },
        {
          items: [
            'TEAM LINES I CANNOT OVERRIDE. The Team Lines in our team instructions always come first: fair housing, texting consent, drafts only, money and account details, client details, our name, the brokerage name on everything, the email signature, the never-write words, listing post approval, the lead-handling rules (the first call and its hours, the Text OK tag, same-day logging, same-day stages, never deleting a lead, the pond) and no showing before the buyer agreement is signed. If anything below conflicts with them, follow the team line.',
            'MY VOICE. [Paste your voice profile QUICK CARD here, from amplifiedimpact.io/voice-profile. It may change our voice defaults: warm, plain and short; “home,” not “house”; first names and your sign-off; emoji on social posts. It may not change the team lines. No QUICK CARD yet? Leave this blank, and drafts use the team’s voice defaults.]',
          ],
        },
        { h: 'Rollout checklist' },
        {
          items: [
            '4. Add the brain (Juniper or Marlo): “Set project instructions,” paste the team instructions, “Save instructions.” Then click “+” in the knowledge base on the right and add the six knowledge files. Don’t upload the nine originals.',
            '6. Share (Juniper): the “Share” button to the right of the project name; general access “Only people invited”; add Marlo Fakerson with “Can edit”; add Dex Placeholder, Rory Samplewood, Tamsin Notreal, Wren Examplar and Ollie Madeup with “Can view.” Their chats in the project stay private, and sharing the project doesn’t expose anyone’s chats.',
          ],
        },
        {
          email: {
            subject: 'Our Team Project Is Ready: Start Your Chats There',
            body: [
              'Hi team,',
              'We now have one shared Claude project for Kettle Creek Team. It holds our team instructions and six files built from our own SOPs, call script, brand guide and compliance notes, so your drafts start with our name, our brand and our lead rules already in place.',
              'Here’s what to do:',
              'Open the project under Projects (it’s shared with you) and start your work chats there.',
              'Fill in the personal layer template below with your voice profile QUICK CARD and your goals, and paste it into Settings, Your Claude, Instructions.',
              'Never put a client’s name, number or deal details into the project’s files. Client records stay in Follow Up Boss.',
              'If an answer looks wrong or cites the wrong document, tell me.',
              'Juniper',
            ],
          },
        },
        { h: 'Check before sending' },
        {
          table: {
            caption: 'Four of the check list’s rows',
            head: ['Item', 'Where it’s from'],
            rows: [
              ['5 minutes; 8 a.m. to 8 p.m.; after 8 p.m. called at 8 a.m.', 'New Online Lead Response SOP, steps 1 and 2'],
              ['Pond after day 7, against 14 days with no logged contact (conflict)', 'New Online Lead Response SOP, step 6; Lead Flow, Rules 2'],
              ['Sharing, permissions, chats private, remove access', 'Claude Help Center, “Project visibility and sharing,” read 2026-11-10'],
              ['Nothing left out made it back in', 'Search the six files for each item in Flags 4 before uploading'],
            ],
          },
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order"; page-notes.md, "What Comes Back".
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags and a bottom line',
          body: 'Any request to put client data in the brain, turned down with the reasons. Places your documents disagree, as one-line choices. What was left out on purpose, by location only. Items for your broker, stale documents, and what your plan means. Then three sentences: what was built, the biggest problem and the first thing to do.',
        },
        {
          title: 'Team instructions',
          body: 'One block you paste into the project’s instructions: who the team is, how to answer (from the files, with the source), and the team lines agents can’t override. Five are always in: fair housing, texting consent, drafts only, money and account details, and client details. Your brand guide’s required lines and your lead rules join them. Then the defaults each agent may change.',
        },
        {
          title: 'A team context pack',
          body: 'Knowledge files built only from your documents, such as roles and routing, lead handling, scripts, brand and marketing, compliance and processes. Each opens with the documents it was built from, and every line carries its document and section. Gaps come back as placeholders, never as rules written for you.',
        },
        {
          title: 'A personal layer template',
          body: 'Each agent adds their voice profile QUICK CARD, role, goals and how they like answers, under the list of team lines it can’t change. It says where each agent puts it on your plan.',
        },
        {
          title: 'A rollout checklist',
          body: 'For your plan: make the project, add the brain, test it with six questions, share it, and remove access when someone leaves, each step with its help center path and the date it was checked. A draft note to your agents comes with it.',
        },
        {
          title: 'A quarterly refresh',
          body: 'Collect what changed, rebuild the pack from your current files, check stale documents and plan settings, and fix the wrong answers agents report.',
        },
        {
          title: 'Check before sending',
          body: 'Every rule, number, time, name and quote, with the document and section it came from, plus the compliance lines for your broker.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own and page-notes.md's, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI sorts and drafts. You set it up, share it and decide every rule.',
      items: [
        {
          label: 'Run',
          title: 'The AI reads and sorts',
          body: 'Reads every document, notes its owner and date, sorts it by topic, takes out client and personal details, and finds conflicts, gaps and stale sections.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The team instructions, the knowledge files, the personal layer template, the rollout checklist and the note to agents. Nothing is created or shared.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Every rule, every conflict, who gets access and what’s shared. Each agent owns their personal layer, voice and goals. Your broker reviews the compliance lines.',
        },
      ],
    },
    {
      // page-notes.md, "What the Person Needs". No ChatGPT limits as numbers.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan to build it',
          body: 'With skills on. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan.',
          tag: 'Team or Enterprise: an owner turns on code execution',
        },
        {
          title: 'Claude Team or Enterprise to share it',
          body: 'One shared team project needs a Team or Enterprise plan. On Free, Pro, Max and Ultra there’s no project sharing, so each agent builds their own project from the same files and you send every update.',
        },
        {
          title: 'Or ChatGPT',
          body: 'The ChatGPT version goes in a Project, a folder in ChatGPT that keeps instructions and files together. Shared projects work on every ChatGPT plan, with lower limits on Free.',
        },
        {
          title: 'Your team’s documents',
          body: 'SOPs, call scripts, the brand guide, compliance notes, the roles list and your Follow Up Boss lead flow. Whatever you have: gaps come back as questions. No client lists.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload": Google Docs Help (checked 2026-11-08), Follow Up Boss's "Lead Flow
      // Overview" and "Custom Stages" (checked 2026-11-10), Claude's "Uploading files to Claude" (checked
      // 2026-11-08).
      kind: 'list',
      heading: 'Where to get each piece',
      items: [
        {
          title: 'SOPs, scripts, the brand guide and compliance notes',
          body: 'Upload the PDF, Word or text file as it is. From Google Docs: open the doc, click File, then Download, and choose PDF or Microsoft Word.',
        },
        {
          title: 'Your roles list',
          body: 'A doc, a page of the handbook, or a spreadsheet saved as CSV. Names and roles are what matter. Phone numbers are left out.',
        },
        {
          title: 'How leads flow in Follow Up Boss',
          body: 'Describe it in a doc, or take screenshots of Admin > Lead Flow (each lead source’s agent and action plan) and Admin > Stages.',
        },
        {
          title: 'Attaching files in Claude',
          body: 'Click the + at the lower left of the chat box, then Add files or photos. Pick the files and click Open. Or drag them into the chat. One chat takes up to 20 files.',
        },
        {
          title: 'What to leave out',
          body: 'Client lists and CRM exports. The skill won’t put client data in a shared brain, so there’s no reason to upload it.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say".
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat, attach your documents, and paste. In ChatGPT, start the chat inside the Project. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'To start, with your documents attached',
          items: [
            'Build our team AI brain from these documents. We’re on a Claude Team plan.',
            'Here’s our roles list and our SOPs. Set up a shared Claude project for my agents.',
            'Most of our agents pay for their own Claude Pro. How do we all get the same context?',
          ],
        },
        {
          label: 'In the same chat, after the build',
          items: ['Use the lead flow’s 14-day pond rule.', 'Just the personal layer template, please.'],
        },
        {
          label: 'A quarter later, with the current pack and the changed documents',
          items: ['Here’s our current team instructions and knowledge files, plus the new brand guide. Update our team brain.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, "How It's Different from Team Playbook Builder" and FAQ; "Who It's For".
          q: 'How is this different from Team Playbook Builder?',
          a: [
            'Team Playbook Builder turns your SOPs into a playbook skill each agent installs, so “how do we do this?” gets the SOP’s answer and section. Team AI Brain sets up the shared workspace every chat starts in, so drafts carry your name, brand, lead rules and compliance lines. You can use both. It’s the team layer of the AI Brain set: AI Brain Setup is one person’s first setup, and AI Brain Tuneup audits a workspace you already have.',
          ],
        },
        {
          // page-notes.md, FAQ; references/brain-build-rules.md, section 4.
          q: 'Can it hold our client list so agents can look people up?',
          a: [
            'No. Everything in a shared project’s instructions and files is read by everyone it’s shared with. Follow Up Boss already does client lookup with its own permissions and opt-out tags, and a copy goes stale the first time someone says STOP. Agents look clients up in Follow Up Boss. On Claude Team, chats in a project are private, so an agent can paste one client’s details into their own chat for one draft.',
          ],
        },
        {
          // SKILL.md, Guardrails; references/compliance-lines.md, "What a Personal Layer Can Never Change".
          q: 'Can an agent change the team rules?',
          a: [
            'Not the team lines: the compliance lines, your brand guide’s required lines and your lead rules. An agent’s personal layer changes only what your documents leave to each agent, like voice and sign-off. It’s a written rule the AI follows, not a lock. On Claude Team, agents get “Can view,” so they can’t edit the team project itself.',
          ],
        },
        {
          // page-notes.md, FAQ and "What the Person Needs"; references/claude-team-workspace.md.
          q: 'Our agents each pay for their own Claude. Does this work?',
          a: [
            'Yes, with one difference. Individual Claude plans have no project sharing, so each agent makes their own project from the same files, and you send every update. One shared project needs a Claude Team or Enterprise plan.',
          ],
        },
        {
          // page-notes.md, FAQ; references/claude-team-workspace.md, ChatGPT (search excerpts, 2026-11-10).
          q: 'We use ChatGPT.',
          a: [
            'Use the ChatGPT version. Shared projects work on every ChatGPT plan. But every member sees every chat in a shared project, and personal custom instructions don’t reach it, so the rollout keeps client work in each agent’s own project.',
          ],
        },
        {
          // page-notes.md, FAQ; references/utah-team-brain-notes.md (last verified 2026-11-10).
          q: 'We’re not in Utah.',
          a: [
            'It works anywhere. Everything comes from your documents, the compliance lines name federal law, and it tells you state rules weren’t checked. In Utah it also checks your brand guide against Utah’s rule that every ad names the brokerage, keeps any Sunday calling limit as your own house practice (Utah’s limits don’t apply to licensees acting within their license), and adds one AI disclosure question for your broker.',
          ],
        },
        {
          // page-notes.md, "What Was and Wasn't Tested".
          q: 'What was tested?',
          a: [
            'Two made-up teams: a full set of nine documents on Claude Team, and a thin set of a roles list and one SOP on Claude Pro, each with a request to put client data in the brain. Both passed every check. We haven’t tried real team documents, a live Claude Team project, or the ChatGPT version inside ChatGPT yet, so run the practice files first.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Want agents to get your SOPs’ answers in depth? ',
        { link: 'Team Playbook Builder', href: '/team-playbook-builder', sameTab: true },
        ' turns them into a skill each agent installs. And each agent’s voice comes from ',
        { link: 'the voice profile guide', href: '/voice-profile', sameTab: true },
        '.',
      ],
    },
  ],

  unlockKey: 'taib-unlocked',
});
