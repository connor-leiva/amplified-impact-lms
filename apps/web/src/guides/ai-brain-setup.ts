// Every word on /ai-brain-setup that is its own: the landing page for AI Brain Setup
// (`skills/ai-brain-setup/`, version 1.0), a skill that interviews an agent or team leader a few
// questions at a time and hands back their Claude setup, ready to paste: How I Like to Work (account
// Instructions), Project Instructions with a compliance section, an About My Business file for the
// project's knowledge, and Facts to Remember for memory, each labeled with exactly where it goes. What
// every skill page says the same way is in `skill-page.ts` (D-052). The skill is paid unless Connor
// decides otherwise (in the Amplified Skill Library, both sets), so the page is drawn with the Skill
// Library card in place of the sign-up and the setup (D-082); the free words and the setup below stay
// for the day it is free.
//
// The words come from the skill itself (SKILL.md and references/brain-templates.md, claude-workspace.md
// and utah-brain-notes.md), its page notes and its graded runs (the practice run 12 of 12, eval 1 13 of
// 13, eval 2 12 of 12, eval 3 5 of 5), so the page promises what the skill does. The sample is
// sample.md, the graded practice run, cut only by whole items, rows and lines; each block's lines are
// shown as list items, with a section heading run into its first line. Its straight quotes and
// apostrophes are written curly, as on every page.
//
// Where each piece goes in Claude is `references/claude-workspace.md`, read from Claude's help center on
// 2026-11-10: Instructions in Settings, Your Claude (every plan); projects on every plan, Free up to
// five; Set project instructions, Save instructions; + on the project page for knowledge; memory on by
// default on Free, Pro, Max and Ultra, the owner's call on Team and Enterprise; styles moving to skills.
// The ChatGPT places are `chatgpt/chatgpt-workspace.md` (search excerpts; OpenAI's help center blocks
// direct reads).
//
// What the page holds to, as SKILL.md does: the AI never changes a setting, saves a memory or logs in;
// the user pastes every block. Nothing invented: what the user didn't say stays a [placeholder]. No
// passwords, logins, account, routing, wire or Social Security numbers, and nothing about clients, in any
// block or in memory. The compliance section always carries fair housing, texting consent, drafts only
// and stay in lane.
//
// Calls left open, and how the page handles them:
//   - Free or paid: paid until Connor says otherwise; the page keeps its free words.
//   - Where to start chats: the skill puts the QUICK CARD in account Instructions so the voice follows
//     every chat, and keeps My Voice for long writing. skill-page.ts's practice note still says to start
//     chats in My Voice (shared by every page, not edited here). The page says only what the skill does.
//   - Claude Free: the help center says projects are on every plan, while one line says project
//     instructions are paid only. The page says the skill gives a fallback, and that Free is unconfirmed
//     for skills, as every skill page does.
//   - Utah: the Sunday and holiday line is house practice (13-25a-111 exempts licensees from
//     13-25a-103); the page says "house practice" and names no other Utah rule than the skill does.
//   - The sibling skills (AI Brain Tuneup, Team AI Brain) are built at the same time and may not be
//     registered, so the page names them in plain words and links only Team Playbook Builder and the voice
//     profile guide.
//   - Not tested in a live Claude or ChatGPT account; the page says so.
//
// `setupMinutes` is an estimate (page-notes gives about 10 for the skill): 10, as the other skill pages
// with a ChatGPT version say for the same shared steps.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const AI_BRAIN_SETUP: Guide = skillPage({
  slug: 'ai-brain-setup',
  skill: 'ai-brain-setup',
  title: 'AI Brain Setup',

  meta: {
    title: 'AI Brain Setup: A Free AI Skill · Amplified Impact',
    description:
      'Answer a few questions about your business and get your Claude setup back, ready to paste: your instructions, a business file, the facts to remember, and exactly where each one goes. Nothing about your clients, no passwords. A free skill for Claude and ChatGPT.',
  },

  // Non-breaking spaces keep the audience on one line at phone width, as /appointment-follow-up does.
  eyebrow: 'Free AI Skill · For Agents and Team Leaders',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Answer a few questions about your business, and the AI hands back your Claude setup ready to paste: your instructions, a business file, the facts to remember, and exactly where each one goes.',
  outcome: { n: '03', title: 'Paste It In Once', body: 'Four blocks, each labeled with where it goes. Every chat starts out knowing your business.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI drafts your setup. You paste it in, and it never changes a setting or logs in to anything.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word.
    prompt: 'Here are my interview answers and my voice QUICK CARD. Set up my AI brain.',
    note: [
      'There are two files: a made-up Utah agent’s typed answers to the 17 questions, and her made-up voice profile QUICK CARD. Every name, brokerage and number in them is made up. The sample on this page was run on Tuesday, November 10, 2026. On another day, the “Last updated” date changes. ',
    ],
  },

  real: {
    // SKILL.md, section 1: nothing given, so the interview runs a round at a time; "skip" becomes a
    // placeholder; "build it now" builds with what there is.
    body: [
      'Start a new chat the same way and say this. The AI asks a few questions at a time, in five short rounds. Skip any you’re not sure of. Have your voice profile’s QUICK CARD handy if you made one.',
    ],
    prompt: 'Set up my AI brain.',
    note: [
      'Never paste a password, an account number or a client’s details. Before you paste a block into Claude, check every fact in the ',
      { strong: 'Check Before Pasting' },
      ' list against what you said.',
    ],
  },

  chatgpt: { paste: chatgptPaste('ai-brain-setup') },

  sections: [
    {
      // sample.md (the practice run, 12 of 12 checks), shortened, in the output's own order and its own
      // words, cut only by whole items, rows and lines: all three flags, the bottom line, four of the
      // five rows of Where Everything Goes, seven lines of block 1 (the voice section to its first
      // line), block 2's compliance section whole and two of its four Utah lines, four sections of block
      // 3, block 4 whole, and five of the 19 rows of Check Before Pasting.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What the AI hands back',
      body: 'What the AI wrote from the practice files: a made-up Utah agent, Juniper Mockwell of Fakewater Realty Group, with her typed answers and her voice QUICK CARD. They’re the same files you practise on in setup.',
      title: 'AI Brain Setup: Juniper Mockwell',
      note: 'Made-up example. Shortened: one row of the table, parts of blocks 1, 2 and 3, Your Voice, Still To Fill In and most of Check Before Pasting left out. The flags, the bottom line, the compliance section and block 4 are whole.',
      blocks: [
        { h: 'Flags' },
        {
          p: [
            { strong: 'Rewritten on purpose:' },
            ' answer 4 described some of your clients by family status. Fair housing law covers familial status, and words that sort people that way can carry from your brain into an ad or a post. So the brain says “first-time buyers, and buyers moving out from Salt Lake for more space.”',
          ],
        },
        {
          p: [
            { strong: 'Utah mode:' },
            ' the compliance section carries Utah’s rules (checked 2026-11-10). Confirm them with your broker.',
          ],
        },
        { p: [{ strong: 'Placeholders:' }, ' none. Every block is filled from your 17 answers and your QUICK CARD.'] },
        { h: 'Bottom line' },
        {
          p: [
            'Your AI brain is built from all 17 of your answers and your QUICK CARD: four blocks, each labeled with exactly where it goes in Claude, with Utah’s rules in the compliance section. Nothing is left as a placeholder. Paste How I Like to Work into Settings, Your Claude, Instructions first, because every chat and every skill reads it.',
          ],
        },
        { h: 'Where everything goes' },
        {
          table: {
            caption: 'Where everything goes, 4 of 5 rows',
            head: ['Piece', 'Where it goes in Claude', 'How to get there', 'Plan notes'],
            rows: [
              [
                '1. How I Like to Work',
                'Instructions (account-wide): every chat, in every project',
                'Click your initials in the lower left corner, then Settings, then Your Claude (Account in the older layout). Paste it under Instructions (Instructions for Claude in the older layout).',
                'Every plan',
              ],
              [
                '2. Project Instructions',
                'The instructions of a new project named Juniper’s AI Brain',
                'Go to claude.ai/projects and click + New Project. Name it Juniper’s AI Brain, leave the description blank (Claude can’t see the name or description), and create it. On the project page, click Set project instructions, paste, then click Save instructions.',
                'Projects work on every plan. Free holds five projects at most',
              ],
              [
                '3. About My Business',
                'The project’s knowledge, as a file named About My Business.txt',
                'On the right side of the project page, click +, then upload About My Business.txt.',
                'Every plan. Up to 30MB a file; paid plans hold more',
              ],
              [
                '4. Facts to Remember',
                'Claude’s memory',
                'Start a new chat outside any project, paste the block and send it. Then open Settings, Your Claude, and click Manage next to Your memory to see what was saved.',
                'On by default on Free, Pro, Max and Ultra. On Team or Enterprise, your owner decides whether memory is on. With it off, these facts still live in About My Business',
              ],
            ],
          },
        },
        { h: 'Block 1: How I Like to Work' },
        { p: [{ strong: 'Paste into:' }, ' Settings, Your Claude, Instructions (account-wide). Click your initials in the lower left corner to get there.'] },
        {
          items: [
            'Who I am: Juniper Mockwell, solo agent at Fakewater Realty Group, with a part-time assistant. I work in Lehi, Saratoga Springs, Eagle Mountain and some American Fork, Utah.',
            'How I like answers: Short. Bullets are fine. Tell me the answer first.',
            'Drafts only. I read and send everything myself. Never send, post, or change my CRM.',
            'Client names and contact details live in Follow Up Boss. Never save anything about a client to memory.',
            'Fair housing: describe properties, never people.',
            'My hours: Mountain time, 8 to 6 on weekdays and Saturday mornings. Sign-off: Talk soon, Juniper',
            'MY VOICE (QUICK CARD): Write as me. I’m Juniper Mockwell, a real estate agent in Utah County who used to teach second grade and still explains things one step at a time.',
          ],
        },
        { h: 'Block 2: Project Instructions' },
        { p: [{ strong: 'Paste into:' }, ' the Juniper’s AI Brain project, Set project instructions, then Save instructions.'] },
        { p: [{ strong: 'COMPLIANCE (follow every line, every time)' }] },
        {
          items: [
            'Fair housing: describe properties, never people. No comments on who a home or an area suits, neighborhood demographics, school quality or safety; point to official sources instead.',
            'Texts (TCPA): draft a text only for someone I confirm gave documented consent to texts from me. A phone number is never consent. Every marketing text names me and ends “Reply STOP to opt out.” Honor every opt-out.',
            'Drafts only: never send, post, schedule or change anything in my CRM or any account. I send everything myself.',
            'Stay in lane: you’re not my attorney, broker, lender, CPA, inspector or appraiser. Send those questions to the right person. No guarantees about price, timing, appraisal or approval, and no income projections.',
            'No invented facts: every fact, number, date and name comes from me, my files or this chat. Unclear or missing: say so and use a [placeholder].',
            'Privacy: never ask for, repeat or keep passwords, logins, or account, routing, wire or Social Security numbers. If I paste one, tell me to remove it and don’t repeat it.',
            'Clients: never save anything about a client to memory. Client records stay in Follow Up Boss.',
          ],
        },
        { p: [{ strong: 'STATE RULES: UTAH (checked 2026-11-10; confirm with my broker)' }] },
        {
          items: [
            'Fair housing in Utah covers ten classes: race, color, religion, sex, national origin, familial status, source of income, disability, sexual orientation and gender identity (Utah Code 57-21-5). Never draft anything that expresses a preference about any of them.',
            'Calls and texts: the federal TCPA applies. Utah’s evening, Sunday and holiday limits (13-25a-103) don’t apply to licensees acting within the license (13-25a-111), but my house practice is no marketing calls or texts on Sundays or Utah legal holidays, and only 8 a.m. to 8 p.m. in their time zone.',
          ],
        },
        { h: 'Block 3: About My Business' },
        {
          p: [
            { strong: 'Paste into:' },
            ' the Juniper’s AI Brain project’s knowledge. Click + on the right side of the project page and upload it as About My Business.txt.',
          ],
        },
        {
          items: [
            'WHAT I’M KNOWN FOR: First-time buyers, and buyers moving out from Salt Lake for more space. A lot of new construction in Saratoga Springs.',
            'MY TOOLS: CRM: Follow Up Boss. Other tools: Google Workspace (Gmail and Calendar), DocuSign, UtahRealEstate.com for the MLS, Canva, ShowingTime.',
            'MY GOALS (as I stated them): 24 closings in 2027, up from 17 this year (2026). Get my past client database to 300 people. Post 3 times a week.',
            'WHAT THIS FILE NEVER HOLDS: Client names, contact details or deal details. Passwords, logins, or account, routing, wire or Social Security numbers.',
          ],
        },
        { h: 'Block 4: Facts to Remember' },
        {
          p: [
            { strong: 'Paste into:' },
            ' a new chat outside any project, so every project can use these. Send it, then check Settings, Your Claude, Manage next to Your memory.',
          ],
        },
        { p: ['Please remember these facts about me and my work:'] },
        {
          items: [
            'My name is Juniper Mockwell, and I sign as “Talk soon, Juniper.”',
            'I’m a solo agent at Fakewater Realty Group, with a part-time assistant, Bree.',
            'I work in Lehi, Saratoga Springs, Eagle Mountain and some American Fork, Utah.',
            'My CRM is Follow Up Boss. Client records live there, never in your memory.',
            'I want drafts only. I send everything myself.',
            'My time zone is Mountain.',
            'My business details are in the About My Business file in my Juniper’s AI Brain project.',
          ],
        },
        { h: 'Check before pasting' },
        {
          table: {
            caption: 'Check before pasting, 5 of 19 rows',
            head: ['Item in the blocks', 'Where it came from'],
            rows: [
              ['First-time buyers, and buyers moving out from Salt Lake for more space; new construction in Saratoga Springs', 'Answer 4, rewritten (see Flags)'],
              ['About half sphere and past clients, then Zillow Flex, then builder open houses', 'Answer 8. No percentages were given, and none were added'],
              ['The three brokerage rules', 'Answer 9, as you stated them. Confirm with your broker'],
              ['24 closings in 2027, up from 17; 300 people; 3 posts a week', 'Answer 12. “This year” is written as 2026, from today’s date'],
              ['No password, login, account number, or client name or contact detail in any block', 'Checked: none'],
            ],
          },
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order", items 1 to 10, in its order; page-notes.md, "What Comes Back".
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags, first',
          body: 'Only when they apply: anything left out on purpose (a pasted login, a client’s details, a team member’s personal detail), wording about people rewritten for fair housing, no QUICK CARD yet, a market outside Utah, notes for your plan, and how many blanks are left.',
        },
        { title: 'A bottom line', body: 'Three sentences at most: what was built, for whom, what’s left to fill in, and the one block to paste first.' },
        { title: 'Where everything goes', body: 'A table: each piece, its exact place in Claude, the clicks to get there, and what your plan allows.' },
        {
          title: 'How I Like to Work',
          body: 'For Claude’s account-wide Instructions, so every chat and every skill reads it: who you are, how you like answers, the house rules, your hours and sign-off, and your voice profile’s QUICK CARD at the end, word for word.',
        },
        {
          title: 'Project Instructions',
          body: 'For a new project named after you. Its compliance section always carries fair housing, texting consent, drafts only and stay in lane, plus your brokerage’s rules and your own limits as you stated them, and Utah’s rules in Utah.',
        },
        {
          title: 'About My Business',
          body: 'A plain text file for the project’s knowledge: you, your brokerage and team by role, your market, what you’re known for, your tools and CRM, where your business comes from, your rules, and your goals exactly as you said them.',
        },
        { title: 'Facts to Remember', body: 'Five to ten lines to paste into a new chat, so Claude’s memory has them in every project. Nothing about clients.' },
        { title: 'Your voice', body: 'Where your QUICK CARD went, or how to make one free with our voice profile guide.' },
        { title: 'Still to fill in', body: 'Every [placeholder] left in the blocks, with the one question that fills it.' },
        { title: 'Check before pasting', body: 'Every fact and number in the blocks, with the answer it came from, and a last check that no password or client detail is anywhere.' },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own, and page-notes.md's, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI asks and drafts. You decide and paste.',
      items: [
        {
          label: 'Run',
          title: 'The AI asks and sorts',
          body: 'Asks a few questions at a time. Checks every answer for passwords, client details and wording about people. Sorts each answer into the right block, and labels where each block goes.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The four blocks: How I Like to Work, Project Instructions, About My Business and Facts to Remember. Nothing goes into Claude until you paste it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Pasting every block, what Claude remembers, your brokerage’s and your state’s rules (confirm them with your broker), your plan and settings. The AI never asks for, repeats or keeps a password, an account number or a client’s details.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need"; references/claude-workspace.md for the plans. No prices.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan.',
          tag: 'Team or Enterprise: an owner turns on skills, code execution and memory',
        },
        {
          title: 'Or a ChatGPT Project',
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro. The ChatGPT version puts each block in ChatGPT’s own places: Custom Instructions, the project’s instructions and files, and Memory.',
        },
        {
          title: 'A computer, once',
          body: 'Add the skill on claude.ai or in the Claude desktop app, or set up the Project on the ChatGPT website. Pasting the blocks into settings is easiest on a computer too.',
        },
        {
          title: 'Your answers',
          body: 'Seventeen short questions in five rounds, about you, your team and tools, your rules, your goals and your voice. Skip any you’re not sure of. Already wrote your answers down? Paste them in.',
        },
        {
          title: 'Your voice profile, if you have one',
          body: 'Its QUICK CARD goes at the end of your instructions, word for word, so every chat sounds like you. No profile yet? The setup works without one.',
          tag: 'Free at our voice profile guide',
        },
        {
          title: 'Nothing about your clients',
          body: 'The setup is about you and your business. No passwords, no account numbers, no client names or phone numbers. Your client records stay in Follow Up Boss.',
        },
      ],
    },
    {
      // references/claude-workspace.md (Claude's help center, read 2026-11-10) and
      // chatgpt/chatgpt-workspace.md (OpenAI's help center through search excerpts, 2026-11-10).
      kind: 'list',
      heading: 'Where each piece goes',
      items: [
        {
          title: 'Instructions, for every chat',
          body: 'Claude’s account-wide Instructions apply to all your conversations, in every project. Click your initials in the lower left corner, then Settings, then Your Claude. How I Like to Work and your QUICK CARD go here.',
        },
        {
          title: 'A project, for your business',
          body: 'A project keeps its own instructions and files for every chat inside it. Projects work on every Claude plan, and Free holds five. Claude can’t see a project’s name or description, so the setup leaves those alone.',
        },
        {
          title: 'Project knowledge, for the details',
          body: 'Files you add on the right side of the project page, with the + button. About My Business goes here as a plain text file. Paid plans hold more.',
        },
        {
          title: 'Memory, for the short facts',
          body: 'Claude saves memory as you chat, and you can tell it what to remember. It’s on by default on Free, Pro, Max and Ultra; on Team and Enterprise, the owner decides. Deleting a chat doesn’t delete what Claude remembered from it, so check Settings, Your Claude, Manage next to Your memory.',
        },
        {
          title: 'Not a style',
          body: 'Claude’s help center now points to skills, not styles, for tone and format. Your voice goes in your instructions instead.',
        },
        {
          title: 'In ChatGPT',
          body: 'The same four blocks go to Custom Instructions, a Project’s instructions, the Project’s Sources tab and Memory. Custom Instructions hold about 1,500 characters, so if your QUICK CARD is already there, How I Like to Work goes at the top of the project’s instructions.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say".
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project) and paste these words. The AI asks the rest a few questions at a time.',
      groups: [
        { label: 'Starting from nothing', items: ['Set up my AI brain.', 'I just got Claude Pro. What goes in project instructions, and what goes in memory?'] },
        {
          label: 'With your answers or QUICK CARD ready',
          items: ['Here are my answers and my voice QUICK CARD. Set up my AI brain.'],
        },
        {
          label: 'For a team leader',
          items: ['I’m a team leader in Utah. Build my AI brain, and keep my agents’ personal stuff out of it.'],
        },
        { label: 'Just one piece', items: ['Just the project instructions, please.'] },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, FAQ; references/claude-workspace.md.
          q: 'Why four places? Isn’t one enough?',
          a: [
            'Each place reaches a different set of chats. Instructions reach every chat, so they hold how you like to work and your voice. A project’s instructions and files reach only that project’s chats, so they hold the business detail and the compliance section. Memory reaches every chat and grows as you go; the setup gives it a clean start. The table in your setup says which is which.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, section 2.
          q: 'Why won’t it remember my clients?',
          a: [
            'Client records belong in your CRM, with your team, your consent records and your history. A client’s number in Claude’s memory would show up in chats it has nothing to do with, and a text still needs that client’s documented consent. So the setup points to Follow Up Boss and keeps clients out. The AI drafts; it never sends a text.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, section 2; claude-workspace.md (deleting a chat doesn't remove
          // memories made from it).
          q: 'I pasted my password by accident. Now what?',
          a: [
            'The AI won’t repeat it or use it. Copy your setup, delete that chat, then open ',
            { strong: 'Settings, Your Claude' },
            ', click ',
            { strong: 'Manage' },
            ' next to Your memory, and delete anything that mentions it. Claude’s help center says deleting a chat doesn’t remove what Claude remembered from it. Then change the password.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, section 3; utah-brain-notes.md.
          q: 'Does it work outside Utah?',
          a: [
            'Yes. Everywhere, the compliance section carries fair housing, texting consent, drafts only and stay in lane. In Utah it adds Utah’s rules, checked on November 10, 2026, with the Sunday and holiday line marked as house practice. Outside Utah it says your state’s rules weren’t checked, with a blank to fill in after you ask your broker.',
          ],
        },
        {
          // page-notes.md, "Tested and Not Tested" and "What You Need".
          q: 'Which plan do I need, and what was tested?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. On Free, if you don’t see Set project instructions, the setup tells you where to put that block instead. In ChatGPT, a Project on Free, Go, Plus or Pro. We tested the skill in Claude on four made-up cases: a Utah agent, a Utah team leader, an agent who pasted a login and asked Claude to remember client numbers, and a first chat with nothing given. We haven’t tried it inside ChatGPT or pasted the blocks into a live account yet, so run the practice files first.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'No voice profile yet? ',
        { link: 'Our free voice profile guide', href: '/voice-profile', sameTab: true },
        ' makes your QUICK CARD. Running a team’s SOPs instead? ',
        { link: 'Team Playbook Builder', href: '/team-playbook-builder', sameTab: true },
        ' turns them into a playbook skill every agent installs.',
      ],
    },
  ],

  unlockKey: 'abs-unlocked',
});
