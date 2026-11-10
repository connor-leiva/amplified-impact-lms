// Every word on /ai-brain-tuneup that is its own: the landing page for AI Brain Tune-Up, a skill
// (`skills/ai-brain-tuneup/`, version 1.0) in the AI Brain set, that audits the Claude or ChatGPT workspace
// an agent, team leader or ops person already has (Project instructions, project knowledge files, memory,
// Instructions for Claude and custom styles, or a ChatGPT project, memory and custom instructions) and
// hands back flags, a bottom line, a findings table that quotes each stale, conflicting, vague or private
// line, a Missing table, a ranked fix list, rewritten Project instructions, a keep, change or remove memory
// list, a before and after diff and Check Before Sending. What every skill page says the same way is in
// `skill-page.ts` (D-052).
//
// The skill is paid (in the Amplified Skill Library, not in `FREE_SKILLS`), so the built page shows its
// hero and sample with the Skill Library card in place of the sign-up and the setup, and `content.ts`
// takes "Free" off its title, description and eyebrow (D-082). The words below are written as a free
// page, for the day Connor names it free, as every skill page's are.
//
// The words come from the skill itself (SKILL.md and references/claude-workspace.md,
// chatgpt-workspace.md and tune-up-rules.md), its page notes, and its graded runs (the practice set at 10
// of 10, eval 1, a messy team ops workspace, at 11 of 11, and eval 2, a mostly fine workspace whose style
// fights its instructions, at 9 of 9, all passing the objective checks), so the page promises what the
// skill does. The sample is sample.md, the graded practice run, cut only by whole rows, columns, items and
// sentences; the rewrite's lines are shown without their leading list marker, and the diff as a two-column
// table of its removed and added lines.
//
// What the page holds to, as SKILL.md does: drafts only, never changes a project, file, memory, style or
// setting; never repeats a phone number, password, code, account or wire number it finds; never invents a
// fact (a gap is a question and a [placeholder]); keeps the user's own wording, compliance lines and voice
// QUICK CARD word for word; adds the house fair housing, texting consent and drafts-only lines when they
// are missing, and says they are general, not checked against any state's rules.
//
// Calls left open, and how the page handles them:
//   - Custom styles: Claude's styles article returned "not found" on 2026-11-10, and secondary sources say
//     styles moved into skills. The page says "a custom style, or the skill it became" and that the move
//     isn't confirmed on Claude's help center.
//   - Memory: the copy paths are Claude's help center's (2026-11-02 and 2026-11-05). A real memory
//     write-out's layout is untested; the practice file is our guess at it.
//   - ChatGPT: OpenAI's help center blocks direct reading, so its click paths come from search results and
//     learn.chatgpt.com (page-notes.md says which). The ChatGPT version was not run inside ChatGPT.
//   - The AI Brain set's other two pages (first-time setup and the team brain) aren't registered yet, so
//     this page doesn't link them; the integrator adds the cross-links. The note points to /voice-profile.
//   - `setupMinutes` is an estimate (page-notes gives none): 10, as on the other skill pages with a
//     ChatGPT version.
//
// The extra Claude step (Memory off for the tune-up chat) is Claude's help center's "Turn off memory for
// a single chat" (updated 2026-11-05), so nothing the tune-up flags for removal is saved to memory.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const AI_BRAIN_TUNEUP: Guide = skillPage({
  slug: 'ai-brain-tuneup',
  skill: 'ai-brain-tuneup',
  title: 'AI Brain Tune-Up',

  meta: {
    title: 'AI Brain Tune-Up: A Free AI Skill · Amplified Impact',
    description:
      'Paste in your AI’s project instructions, files and memory and get back every stale, conflicting, vague or missing line, quoted, with clean instructions to paste back in. A free skill for Claude and ChatGPT. It changes nothing itself.',
  },

  eyebrow: 'Free AI Skill · For Agents, Team Leaders and Ops',
  // page-notes.md, "One-Line Promise".
  lede: 'Paste in what your AI already knows about you, your project’s instructions, its files and its memory, and get back every stale, conflicting, vague or missing line, quoted, with clean instructions to paste back in.',
  outcome: { n: '03', title: 'Paste Back a Clean Brain', body: 'Every problem line quoted, a ranked fix list, and instructions ready to paste.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. Either one only reads what you paste in and never changes your project, memory or settings.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophes, as on every page).
    prompt: 'Tune up my Claude project. Attached are my project instructions, my two knowledge files and my memory, written out by Claude.',
    note: [
      'There are four files from a made-up agent’s Claude project: messy project instructions, an old 2025 business plan, a current listing checklist, and memory written out by Claude, with a seller’s phone number in it. Every name and number in them is made up. The sample on this page was run on November 10, 2026. Look for the old brokerage and the transaction coordinator who left, the email length conflict, the texting line with no consent, and the phone number flagged but never repeated. ',
    ],
  },

  // claude-workspace.md, "Memory" (Turn off memory for a single chat) and "Running the Tune-Up".
  extraClaudeSteps: [
    {
      title: 'Turn Memory Off for the Tune-Up Chat',
      body: [
        'Start a new chat outside the project you’re tuning. Before your first message, click ',
        { strong: '+' },
        ' in the message box, then click ',
        { strong: 'Memory' },
        ' to turn it off for this chat.',
      ],
      note: [
        'Then nothing from the tune-up, including the details it flags for removal, is saved to your memory. You can’t change it once the chat starts. Outside the project, your old instructions don’t steer the audit.',
      ],
    },
  ],

  real: {
    // SKILL.md, section 1; page-notes.md, "What to Upload".
    body: ['Copy your own pieces out of your AI app (where to find each one is below), start a new chat the same way, attach or paste them, and say this.'],
    prompt: 'Tune up my AI workspace. Here are my project instructions, my files and my memory.',
    note: [
      'Before you paste anything back, check every fact, placeholder and decision in the ',
      { strong: 'Check before sending' },
      ' list against your own pieces.',
    ],
  },

  chatgpt: { paste: chatgptPaste('ai-brain-tuneup') },

  sections: [
    {
      // sample.md (the practice run, 10 of 10), shortened, in the output's own order and words, cut only
      // by whole rows, columns, items and sentences: Flags 1 to 3; the bottom line in full; 7 of 12
      // findings in four of five columns; the first three fixes, each cut to whole sentences; 10 lines of
      // the rewrite; 5 of 11 memory rows in three of five columns; 6 lines of the diff; 3 check items.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What a tune-up looks like',
      body: 'What the AI wrote from the practice files: a made-up agent’s Claude project with messy instructions, an old business plan, a current checklist and memory. They’re the same files you practise on in setup.',
      title: 'AI Brain Tune-Up: My Real Estate Assistant (Jamie Testerson, Testerson Home Team)',
      note: 'Made-up example. Shortened: 7 of 12 findings, three fixes, part of the rewrite, the memory list and the diff, and three check items. The bottom line is whole.',
      blocks: [
        { h: 'Flags' },
        {
          p: [
            { strong: 'Private detail found:' },
            ' one client’s phone number, in memory (M10). It is flagged for removal below and not repeated anywhere in this tune-up.',
          ],
        },
        {
          p: [
            { strong: 'Compliance lines added:' },
            ' no piece has a fair housing, texting consent or drafts-only line, so the rewrite adds all three house lines. The house lines are general; state rules were not checked. Ask your broker if your state or brokerage needs more.',
          ],
        },
        {
          p: [
            { strong: 'Two decisions are yours:' },
            ' how long client emails should be (finding 3) and your current goal (finding 6).',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'Your workspace has 12 findings (1 privacy, 2 conflicts, 3 stale, 5 vague and 1 line pointing to a file that isn’t there), and it has no compliance lines at all. The biggest problem is that nothing limits texts to people who agreed to them, while line 14 tells the AI to text every new lead first. Fix first: delete the memory item that holds your seller’s phone number, then paste the rewrite, which keeps your texting line inside a consent rule and adds the fair housing, texting consent and drafts-only lines.',
          ],
        },
        { h: 'Findings' },
        {
          table: {
            caption: 'Seven of 12 findings',
            head: ['#', 'Type', 'Exact line', 'Where it lives'],
            rows: [
              [
                '1',
                'Privacy',
                '“Jamie is listing the Mockridge home on Sample Creek Lane in Kaysville. The seller, Alex Mockridge, prefers texts after 5 PM at [client phone number removed].”',
                'Memory, M10',
              ],
              ['2', 'Conflict (compliance)', '“Always text new leads first, then email if they don’t answer.”', 'Project instructions, line 14'],
              [
                '3',
                'Conflict',
                '“Keep client emails under 100 words.” against “Jamie likes long, detailed client emails that walk through every comp and every number.”',
                'Project instructions, line 7; Memory, M6',
              ],
              [
                '4',
                'Stale (settled)',
                '“Fakewood Realty Group” against “In March 2026, Jamie moved the team from Fakewood Realty Group to Placeholder Peak Realty.” and “Testerson Home Team, Placeholder Peak Realty”',
                'Knowledge: 2025 Business Plan, line 2; Memory, M2; Knowledge: Listing Launch Checklist, line 2 (updated October 14, 2026)',
              ],
              [
                '6',
                'Stale (ask)',
                '“2025 Goals” and “Jamie’s goal for the year is 30 closings.”',
                'Knowledge: 2025 Business Plan, line 4 (goals on lines 5 to 8); Memory, M9',
              ],
              ['7', 'Vague', '“Be professional.”', 'Project instructions, line 4'],
              ['10', 'Missing', '“Use the brand colors and logo from the brand file.”', 'Project instructions, line 12'],
            ],
          },
        },
        { h: 'Ranked fix list' },
        {
          items: [
            'Delete the seller’s phone number from memory (finding 1). Settings > Your Claude, “Manage” next to Your memory, open the topic with the Mockridge listing, and select “Delete.”',
            'Keep texting inside a consent rule (finding 2 and the Missing compliance lines). If you’d rather the AI never draft texts to new leads, delete that line instead.',
            'Decide on email length (finding 3): under 100 words (instructions, line 7), or long and detailed, walking through every comp and every number (memory, M6). Fill the email length placeholder in the rewrite with your choice, then change or delete M6 to match.',
          ],
        },
        { h: 'Rewritten project instructions' },
        {
          items: [
            'Brokerage: Placeholder Peak Realty (since March 2026).',
            'Market: Davis County, Utah.',
            'Team: Pat Placeholder (buyer’s agent) and Casey Mockwell (transaction coordinator since August 2026).',
            'CRM: Follow Up Boss.',
            '[Voice: paste your voice profile QUICK CARD here (amplifiedimpact.io/voice-profile), or say in a line or two how client emails should sound.]',
            '[Email length: keep client emails under 100 words, or make them long and detailed, walking through every comp and every number? Pick one.]',
            'Text new leads first only when I tell you they agreed to get texts from me, then email if they don’t answer. Without that, email first.',
            'Fair housing: Describe properties, never people. No comments on who a home or area suits, neighborhood demographics, school quality or safety. Point to official sources instead.',
            'Texting consent: Draft a text only to someone I say agreed to get texts from me. Every marketing text names me and ends with “Reply STOP to opt out.”',
            'Drafts only: Everything you write is a draft for me to read first. Never send, post or text anything, and never write to my CRM.',
          ],
        },
        { h: 'Clean memory list' },
        {
          table: {
            caption: 'Five of 11 memory items',
            head: ['#', 'Memory item', 'Action'],
            rows: [
              ['M2', '“In March 2026, Jamie moved the team from Fakewood Realty Group to Placeholder Peak Realty.”', 'Keep'],
              ['M6', '“Jamie likes long, detailed client emails that walk through every comp and every number.”', 'Decide'],
              ['M9', '“Jamie’s goal for the year is 30 closings.”', 'Change'],
              [
                'M10',
                '“Jamie is listing the Mockridge home on Sample Creek Lane in Kaysville. The seller, Alex Mockridge, prefers texts after 5 PM at [client phone number removed].”',
                'Remove',
              ],
              ['M11', '“Jamie is helping buyers Sam and Lee Exampleton look in Layton under $550,000.”', 'Remove'],
            ],
          },
        },
        { h: 'Before and after' },
        {
          table: {
            caption: 'Six lines of the diff',
            head: ['', 'Line'],
            rows: [
              ['Removed', 'Keep client emails under 100 words.'],
              [
                'Added',
                '[Email length: keep client emails under 100 words, or make them long and detailed, walking through every comp and every number? Pick one.]',
              ],
              ['Removed', 'Write follow-up notes in my CRM notes format.'],
              ['Added', 'Write follow-up notes in my Follow Up Boss notes format: [paste one note you like, as the example].'],
              ['Removed', 'Always text new leads first, then email if they don’t answer.'],
              [
                'Added',
                'Text new leads first only when I tell you they agreed to get texts from me, then email if they don’t answer. Without that, email first.',
              ],
            ],
          },
        },
        { h: 'Check before sending' },
        {
          items: [
            '“Market: Davis County, Utah”: memory M1.',
            'Private details removed: one client phone number, memory M10. Delete it in memory (fix 1); it may also sit in the chat where you first shared it.',
            'The diff: checked both ways. Its unchanged and added lines read exactly as the rewrite, and its unchanged and removed lines read exactly as your original instructions.',
          ],
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order", items 1 to 8, in its order; page-notes.md, "What Comes Back".
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags, first',
          body: 'Private details it found, by kind and place, never the value; compliance lines it added; decisions waiting on you; placeholders; and any piece it didn’t get, with the checks that skipped.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: how many findings of each kind, the biggest problem, and the one fix to make first.',
        },
        {
          title: 'A findings table',
          body: 'Every stale, conflicting, vague or private line, quoted exactly, with where it lives and why it matters. Then what’s missing, like your market or your compliance lines, each with a question for you.',
        },
        {
          title: 'A ranked fix list',
          body: 'Private details first, then compliance, conflicts, stale facts, missing basics and vague lines, each with where to make the change. When only you can decide, it gives the options and doesn’t pick.',
        },
        {
          title: 'Rewritten instructions',
          body: 'Ready to paste. Your own lines stay word for word; only the problem lines change. Where only you know the answer, there’s a [placeholder] with the question. Your voice profile QUICK CARD stays exactly as it is.',
        },
        {
          title: 'A clean memory list',
          body: 'Every memory item quoted, marked Keep, Change, Remove or Decide, with the reason and where to make the change.',
        },
        {
          title: 'A before and after diff',
          body: 'Every line of your instructions, marked unchanged, removed or added, checked against the rewrite both ways.',
        },
        {
          title: 'Check before sending',
          body: 'Every fact it moved and where it came from, every placeholder, every decision, and where each piece gets pasted.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own, and page-notes.md's, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI reads and drafts. You decide and paste.',
      items: [
        {
          label: 'Run',
          title: 'The AI reads every line',
          body: 'Numbers each line of each piece, sweeps for phone numbers, passwords and account numbers, sorts each problem, and checks the diff against the rewrite.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The fix list, the rewritten instructions, the memory list and the diff. Nothing changes in your project, memory or settings until you paste it or delete it yourself.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Every decision when two lines disagree, every answer behind a placeholder, every change in your account, and any compliance wording question for your broker. The AI never asks for, repeats or keeps passwords, account, routing or wire numbers, or client contact details.',
        },
      ],
    },
    {
      // page-notes.md, "What the Person Needs"; claude-workspace.md (projects on every plan, five on Free;
      // memory defaults). No prices.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on. Projects are on every Claude plan, five on Free. Memory is on by default for Free, Pro, Max and Ultra.',
          tag: 'Team or Enterprise: an owner turns on skills and memory',
        },
        {
          title: 'Or a ChatGPT Project',
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. The ChatGPT version audits a ChatGPT project’s instructions and files, memory and custom instructions.',
        },
        {
          title: 'The pieces of your workspace',
          body: 'Your project’s instructions, its files, your memory, and your account-wide instructions or custom style if you have them. Copy them out of the app; you don’t retype anything.',
          tag: '“Where to get each piece” shows how',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond your plan. No connectors and no other accounts. Run it monthly, or when your drafts start drifting.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where Each Piece Comes From": Claude's help center and the
      // ChatGPT sources, checked 2026-11-10.
      kind: 'list',
      heading: 'Where to get each piece',
      items: [
        {
          title: 'Claude: project instructions',
          body: 'Open the project and its instructions box (Set project instructions). Select all, copy, and paste it into the tune-up chat.',
        },
        {
          title: 'Claude: project files',
          body: 'Attach the original files from your computer. Claude’s help center doesn’t show a way to download them back out of a project. If a .md file won’t attach, paste its text.',
        },
        {
          title: 'Claude: memory',
          body: 'Open Settings, then Your Claude, and click Manage next to Your memory to copy each topic. Or, in a chat inside the project, ask: “Write out your memories of me verbatim, exactly as they appear in your memory.” Each project has its own memory, so ask inside it.',
        },
        {
          title: 'Claude: account-wide instructions',
          body: 'Click your initials in the lower left, then Settings, then Your Claude, then Instructions. Copy the box. These reach every chat, inside projects too.',
        },
        {
          title: 'Claude: a custom style',
          body: 'If your chat box still has a style menu, open the style and copy its instructions. Claude may have turned styles into skills; if yours became one, open it in Customize > Skills and copy what it shows. That move isn’t confirmed on Claude’s help center yet.',
        },
        {
          title: 'ChatGPT: project instructions and files',
          body: 'In the project, click the three dots (•••), then Project settings, and copy the Instructions box. Attach the project’s files from your computer.',
        },
        {
          title: 'ChatGPT: memory and custom instructions',
          body: 'Open Settings, then Personalization. Copy your custom instructions, then open Manage memories and copy the list.',
        },
        {
          title: 'Don’t upload a full data export',
          body: 'Both apps’ exports hold every chat you’ve ever had. Copy only the pieces above.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say to It".
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach or paste your pieces, then paste these words with them. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'A full tune-up',
          items: [
            'Tune up my Claude project. Here are my project instructions, my knowledge files and my memory.',
            'Here’s my team ops project and my account instructions from Settings. Clean it up.',
          ],
        },
        {
          label: 'When something keeps going wrong',
          items: [
            'My AI keeps using my old brokerage. Here’s everything it knows about me. What’s wrong?',
            'Audit my instructions against my memory. Which lines disagree?',
          ],
        },
        {
          label: 'Just one piece',
          items: ['Just the memory list, please.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, FAQ; SKILL.md, sections 5 and 8.
          q: 'Why not just ask the AI to clean up its own instructions?',
          a: [
            'You can, but a general cleanup tends to paraphrase your lines, pick a side when two disagree, and fill gaps with guesses. This one quotes every line exactly, keeps your wording where it isn’t the problem, leaves every decision and missing fact to you as a [placeholder], never repeats a private detail, keeps your QUICK CARD and your compliance lines, and gives you a diff that matches the rewrite.',
          ],
        },
        {
          // page-notes.md, FAQ; claude-workspace.md, "Memory".
          q: 'Will it delete things from my memory?',
          a: [
            'No. It gives you a keep, change or remove list and where to make each change. You make the change in Settings, or by telling the AI in a regular chat. Deleting a chat doesn’t remove the memory made from it, so delete the memory itself.',
          ],
        },
        {
          // tune-up-rules.md, section 5.
          q: 'What are the compliance lines it adds?',
          a: [
            'Three lines: fair housing (describe properties, never people), texting consent (text only people who agreed, and end marketing texts with “Reply STOP to opt out”) and drafts only. If you already have your own, it keeps yours word for word. The house lines are general, not checked against any state’s rules, so your broker has the last word on wording.',
          ],
        },
        {
          // tune-up-rules.md, section 2; SKILL.md, section 2.
          q: 'What if my workspace has a client’s phone number or a password in it?',
          a: [
            'It flags each one by kind and place, like “a client phone number, memory item 10,” and never repeats it. The fix says where to delete it. If a password sat in your workspace, the fix says to change it in the account it opens.',
          ],
        },
        {
          // page-notes.md, "What the Person Needs" and "Tested and Not Tested".
          q: 'How often should I run it, and what was tested?',
          a: [
            'Monthly, or sooner when drafts start getting things wrong: after a brokerage move, a team change or a new year’s goals. We tested it in Claude on three made-up workspaces. We haven’t tried it inside ChatGPT or on real workspaces yet, so run the practice files first.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'No voice profile yet? Make one with ',
        { link: 'our free guide', href: '/voice-profile', sameTab: true },
        '. Once its QUICK CARD is in your project, the tune-up keeps it word for word.',
      ],
    },
  ],

  unlockKey: 'aibt-unlocked',
});
