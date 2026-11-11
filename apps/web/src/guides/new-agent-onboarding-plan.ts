// Every word on /new-agent-onboarding-plan that is its own: the landing page for New Agent Onboarding Plan, a
// skill (`skills/new-agent-onboarding-plan/`, version 1.0) that writes down how a real estate team brings a new
// agent up to standard, once, as a versioned onboarding setup (its standards, who does what, its checkpoints
// and its first 30 days, with three tests and a runbook), then dates each new hire's first 30 days from it.
// It is the AI Accelerator's week 7 flagship (D-109). What every skill page says the same way is in
// `skill-page.ts` (D-052).
//
// The skill is paid (in the Library, not in `FREE_SKILLS`), so the built page shows its hero and sample with
// the Library card and the guided setup under it (D-082, D-101), and `content.ts` takes "Free" off its title,
// description and eyebrow. The words below are written as a free page, for the day it is named free, as every
// skill page's are.
//
// The words come from the skill itself (SKILL.md and its references), its page notes and its graded runs
// (case 1, the practice set, 12 of 12; case 2, missing inputs, 10 of 10; case 3, misleading and conflicting
// inputs, 12 of 12; case 4, setup mode, 10 of 10), so the page promises what the skill does. The sample is
// sample.md, the graded practice run, cut only by whole rows, items and sentences.
//
// What the page holds to, as SKILL.md does: every standard, step and owner comes from the team's documents
// or the leader's answers; missing, conflicting and misleading inputs are shown, never filled in; licensed
// steps wait for the license; personal details stay out; no results claims; nothing is sent. The
// conservative defaults are named as defaults the leader can calibrate with counsel (D-101).
//
// Calls left open, and how the page handles them:
//   - Not tested in a fresh session or inside ChatGPT: the runs were the builder following SKILL.md. The FAQ on
//     testing says the practice files and three hard cases were tested, not real team documents.
//   - Plans: Claude's help center lists skills on every plan (checked 2026-11-11); Free is untested, as on
//     every skill page. ChatGPT needs data analysis to date the plan, which its free plan limits.
//   - Siblings: the note links /recruiting-prep, /team-playbook-builder and /agent-1on1-prep, all registered.
//
// `setupMinutes`: 10, as on the other skill pages with a ChatGPT version. House rules: no em dashes, short
// plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const NEW_AGENT_ONBOARDING_PLAN: Guide = skillPage({
  slug: 'new-agent-onboarding-plan',
  skill: 'new-agent-onboarding-plan',
  title: 'New Agent Onboarding Plan',

  meta: {
    title: 'New Agent Onboarding Plan: A Free AI Skill · Amplified Impact',
    description:
      'Write down how your team brings a new agent up to standard, once. Then get each new hire’s first 30 days dated, owned and checked, with every gap and conflict shown to you instead of filled in. A free skill for Claude and ChatGPT.',
  },

  eyebrow: 'Free AI Skill · For Team Leaders and Ops',
  // page-notes.md, "One-Line Promise".
  lede: 'Write down how your team brings a new agent up to standard, once. Then get each new hire’s first 30 days dated, owned and checked, with every gap and conflict shown to you instead of filled in.',
  outcome: { n: '03', title: 'Run Their First 30 Days', body: 'Your standards, your checkpoints and your people, dated for each new hire.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. Either one reads your team’s documents and never sends anything or adds anything to your calendar.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word.
    prompt:
      'Build an onboarding plan for Juniper Quillfeather. She starts Monday, December 7, 2026 as a buyer’s agent. She’s been licensed 4 years and is transferring from Brightwater Example Realty; Hollis confirmed her license is active with Copperleaf as of December 1. Odette Brambleworth is her mentor. Our handbook, checklist and roles list are attached.',
    note: [
      'There are three files: a made-up team’s agent handbook, its new agent checklist and its roles list. Every name and number in them is made up. Look for Day 30 on Tuesday, January 5, 2027, three checkpoints moved off Sundays, and the second buyer consultation shadow left out for an agent licensed four years. ',
    ],
  },

  real: {
    body: [
      'Start a new chat the same way, attach your own onboarding checklist and handbook, and say this. Claude builds your team’s onboarding setup, with three tests and a runbook. Save the setup, run the three tests, then use it for every new hire.',
    ],
    prompt: 'Set up our onboarding from these documents.',
    // SKILL.md, Pick the Mode and Plan Mode; references/setup-mode.md, The Runbook and Keeping the Setup.
    note: [
      'For each new hire, attach the setup and say: “Build an onboarding plan for [name]. They start [day] as a [role]. [Broker] confirmed the license is active.” Nothing written down? Say “Interview me and set up our onboarding.” Check every date, owner and standard in the ',
      { strong: 'Check before sending' },
      ' list against your documents.',
    ],
  },

  chatgpt: { paste: chatgptPaste('new-agent-onboarding-plan') },

  sections: [
    {
      // sample.md (the practice run, case 1 at 12 of 12), shortened, in the output's own order and words, cut
      // only by whole rows, items and sentences: the bottom line in full; three of the four Needs Your Answer
      // items; five rows of the plan at a glance; three of the six standards; the checkpoints in two of their
      // columns, with the date and the owner set in one column for a phone; Week 1 in three of its columns and
      // six of its eleven rows; the welcome note without its who-to-ask list and two of its paragraphs; three
      // lines of the check list.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What an onboarding plan looks like',
      body: 'What Claude wrote from the practice files: a made-up team’s handbook, checklist and roles list, and a made-up new agent. They’re the same files you practise on in setup.',
      title: 'Onboarding Plan: Juniper Quillfeather, Buyer’s Agent',
      note: 'Made-up example. Shortened: parts of most sections, Weeks 2 to 4, and the note to the checkpoint owners.',
      blocks: [
        { h: 'Bottom line' },
        {
          p: [
            'Juniper Quillfeather starts Monday, December 7, 2026 as a buyer’s agent, licensed four years and confirmed active with Copperleaf Example Realty as of December 1 (your message), and her Day 30 is Tuesday, January 5, 2027. Her plan has 22 dated steps over four weeks, nothing held, with checkpoints on Monday, December 14 (Week One Review), Monday, December 21 (buyer consultation role-play) and Tuesday, January 5 (Day 30 Review); three steps moved off Sundays. First decision: Day 14 is a Sunday, so the role-play checkpoint moved to Monday, December 21; keep it there or hold it Friday, December 18 to meet the handbook’s “by Day 14.”',
          ],
        },
        { h: 'Needs your answer' },
        {
          items: [
            'Day 14 falls on a Sunday (decide: Rosalind). The checklist puts the role-play checkpoint on Day 14 (row 22), which is Sunday, December 20, so the plan moved it to Monday, December 21. The handbook says buyer’s agents “pass the buyer consultation role-play with their mentor by Day 14” (section 4). Keep Monday, December 21, or hold it Friday, December 18?',
            'Thursday training has no owner in your documents (decide: Rosalind). The office is closed Thursday, December 24 (section 3): does training meet that week?',
            'Named, not attached: the Buyer Consultation Checklist. It scores Checkpoint 2 (handbook section 4, checklist row 22). Attach it if you want the plan to show what’s scored.',
          ],
        },
        { h: 'Plan at a glance' },
        {
          table: {
            caption: 'From your message and the dates code',
            head: ['Item', 'Detail'],
            rows: [
              ['Start (Day 1)', 'Monday, December 7, 2026'],
              ['Day 30', 'Tuesday, January 5, 2027'],
              ['License', 'Active with Copperleaf Example Realty as of December 1; Hollis confirmed it (your message)'],
              ['Mentor', 'Odette Brambleworth (your message)'],
              ['Onboarding days', 'Monday through Friday; closed December 24 and federal holidays (handbook section 3)'],
            ],
          },
        },
        { h: 'Standards by Day 30' },
        {
          table: {
            caption: 'From the handbook, section 4, with her variant from section 5',
            head: ['#', 'Standard'],
            rows: [
              ['1', 'Log every lead and client contact in Follow Up Boss the same day.'],
              ['2', 'Pass the buyer consultation role-play with her mentor by Day 14, scored on the team’s Buyer Consultation Checklist.'],
              ['3', 'Shadow one buyer consultation and one listing appointment. Agents licensed two years or more “do one buyer consultation shadow (the Day 5 shadow) instead of two.”'],
            ],
          },
        },
        { h: 'Checkpoints' },
        {
          table: {
            caption: 'The result is recorded by the owner at each checkpoint',
            head: ['Checkpoint', 'Date and owner'],
            rows: [
              ['1: Week One Review', 'Monday, December 14 (Day 7 is Sunday, December 13), Rosalind Puddingstone'],
              ['2: Buyer Consultation Role-Play', 'Monday, December 21 (Day 14 is Sunday, December 20), Odette Brambleworth and Rosalind Puddingstone'],
              ['3: Day 30 Review', 'Tuesday, January 5, 2027, Rosalind Puddingstone'],
            ],
          },
        },
        { h: 'Week 1 (Days 1 to 7)' },
        {
          table: {
            caption: 'Dates from the dates code. Monday, December 7 to Sunday, December 13',
            head: ['Date', 'Step', 'Owner'],
            rows: [
              ['Mon Dec 7', 'Welcome meeting: the team, the standards and this checklist', 'Rosalind'],
              ['Mon Dec 7', 'Logins: Google Workspace email, Follow Up Boss and the shared drive', 'Barnaby'],
              ['Mon Dec 7', 'Send your W-9 and direct deposit form through the secure upload link (never by email)', 'Barnaby'],
              ['Tue Dec 8', 'Follow Up Boss training, part 1: stages, tags and logging every contact', 'Barnaby'],
              ['Wed Dec 9', 'Meet your mentor and set weekly mentor time for Days 1 to 30', 'Odette'],
              ['Fri Dec 11', 'Shadow a buyer consultation', 'Odette'],
            ],
          },
        },
        { h: 'Welcome note to Juniper' },
        {
          email: {
            subject: 'Welcome to Thistledown: Your First 30 Days',
            body: [
              'Hi Juniper,',
              'We’re glad you’re joining us. Your first day is Monday, December 7, and here’s how your first 30 days are set up.',
              'Day 1 starts with a welcome meeting with me: the team, our standards and the new agent checklist. Barnaby will get your email, Follow Up Boss and shared drive logins working, and you’ll send your W-9 and direct deposit form through the secure upload link, never by email.',
              'Your mentor is Odette Brambleworth. You’ll meet on Wednesday, December 9 and set your weekly mentor time.',
              'Your checkpoints:',
              'Monday, December 14: Week One Review, with me',
              'Monday, December 21: buyer consultation role-play, with Odette and me',
              'Tuesday, January 5: Day 30 Review, with me',
              'See you on the 7th.',
              'Rosalind',
            ],
          },
        },
        { h: 'Check before sending' },
        {
          items: [
            'Moves: Checkpoint 1, Day 7, from Sunday, December 13 to Monday, December 14; Checkpoint 2, Day 14, from Sunday, December 20 to Monday, December 21; the sphere list check, Day 21, from Sunday, December 27 to Monday, December 28.',
            'Experience: “licensed 4 years” (your message), so the second buyer consultation shadow (Day 19, checklist row 26, “Skip if licensed two years or more”) is left out, per handbook section 5.',
            'Closed days in the window: Thursday, December 24 (handbook section 3); Friday, December 25, Christmas Day; Friday, January 1, 2027, New Year’s Day. Federal holidays only; state holidays were not checked.',
          ],
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order", both modes.
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Your team’s onboarding setup, once',
          body: 'Your standards by Day 30, who does what, your checkpoints and your first 30 days, in one versioned file with the source of every line. Gaps, conflicts and stale documents come first, for you to settle.',
        },
        {
          title: 'Three tests and a runbook',
          body: 'A normal case, a missing-input case and a misleading case, fitted to your team, with what a safe result looks like. Then a one-page runbook, so someone else can run it and fix it.',
        },
        {
          title: 'Each new hire’s plan',
          body: 'Their standards, who does what, their checkpoints with dates and owners, and their first 30 days week by week. Dates come from code, and every step moved off a weekend or holiday is listed.',
        },
        {
          title: 'What it won’t fill in',
          body: 'Anything missing, conflicting or misleading goes first, under Needs your answer, with who decides. A license your roster calls pending holds the licensed steps. A results target never becomes a standard.',
        },
        {
          title: 'Two drafts',
          body: 'A welcome note to the new agent and a note to the people who own the checkpoints. Nothing is sent.',
        },
        {
          title: 'Check before sending',
          body: 'Every date, owner and standard, with where it came from, plus every held step and every placeholder.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own and page-notes.md's, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI writes it down and dates it. You decide.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the sorting',
          body: 'Reads every document, sorts each rule into standards, owners, checkpoints and steps, finds the gaps and conflicts, and dates the plan with code.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The setup, its tests and runbook, each plan, the welcome note and the checkpoint owners’ note. Nothing is sent.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Every standard, which version wins a conflict, who owns each checkpoint, and every decision about a person. Your broker confirms the license and owns anything legal.',
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
          body: 'With skills and code execution on, so Claude can read your files and date the plan. Claude’s help center lists skills on every plan, Free included, but we haven’t tested Free.',
          tag: 'Team or Enterprise: an owner turns on code execution',
        },
        {
          title: 'Or a ChatGPT plan',
          body: 'The ChatGPT version goes in a Project, a folder in ChatGPT that keeps instructions and files together. It needs data analysis to date the plan, which ChatGPT’s free plan limits.',
        },
        {
          title: 'Your onboarding documents',
          body: 'Your checklist, your handbook and your roles list, in whatever form you keep them. Nothing written down? It interviews you instead.',
        },
        {
          title: 'No connector needed',
          body: 'A connector links the AI to another app. You don’t need one: the skill works from your files and never adds anything to a calendar or a task tool.',
        },
      ],
    },
    {
      // references/setup-mode.md, "What to Attach"; page-notes.md, "What to Upload".
      kind: 'list',
      heading: 'Where to get your documents',
      items: [
        {
          title: 'Your onboarding checklist',
          body: 'A spreadsheet, a PDF or a Word file, as it is. A Google Doc or Sheet downloads with File > Download.',
        },
        {
          title: 'Your agent handbook',
          body: 'The parts on standards, meetings, leads and new agents are enough.',
        },
        {
          title: 'Your roles list',
          body: 'Who is in each role and how to reach them by team channel. No personal phone numbers needed.',
        },
        {
          title: 'A Team Playbook Builder playbook',
          body: 'If you built one, its topic files count as team documents.',
        },
        {
          title: 'The new hire’s details',
          body: 'Typed into the chat: their name, role, start date, experience and license status.',
        },
      ],
    },
    {
      // references/setup-mode.md, "The Three Tests"; the course plan's week 7 test standard.
      kind: 'list',
      heading: 'Tested three ways before you rely on it',
      items: [
        {
          title: 'Normal inputs',
          body: 'A complete, made-up new hire. A safe result has every step from your setup and nothing else, dated, with an owner on every checkpoint.',
        },
        {
          title: 'Missing inputs',
          body: 'No start date, no license status, no mentor. A safe result has Day numbers only, a placeholder for each, and every licensed step held.',
        },
        {
          title: 'Misleading inputs',
          body: 'A license claim your files contradict, leads asked for on Day 1, a closings target and a personal detail. A safe result holds, quotes both sides, and leaves the target and the detail out.',
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
            'Set up our onboarding from these documents.',
            'Build an onboarding plan for [name]. They start [day] as a [role]. [Broker] confirmed the license is active. [Mentor] is their mentor.',
            'We don’t have anything written down. Interview me and set up our onboarding.',
          ],
        },
        {
          label: 'In the same chat, after it answers',
          items: ['Here’s the new checklist. Update the setup.', 'Just the welcome note and the checkpoint owners’ note.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // SKILL.md, "Fail Safe"; page-notes.md, FAQs.
          q: 'Why does it leave so many blanks?',
          a: [
            'Because a guess is worse than a blank. A plan that invents a standard teaches the wrong standard with confidence. Each blank is under Needs your answer, with who decides.',
          ],
        },
        {
          // references/compliance-defaults.md, "License Holds".
          q: 'Why won’t it put a new agent on leads right away?',
          a: [
            'It holds leads, showings and client calls until you confirm the license is active with your brokerage, and then it follows your own lead rule. What an agent may do before that is your state’s and your broker’s call.',
          ],
        },
        {
          // references/compliance-defaults.md; D-101's note.
          q: 'Why is it stricter than the law?',
          a: [
            'It holds licensed steps until you confirm the license, names fair housing training only as your documents or broker do, flags set hours and penalties for your broker or counsel, and keeps calls off Sundays and legal holidays. These are conservative defaults, stricter than the law in places. You can calibrate them with your own legal counsel: tell it your counsel approved a different rule, and it follows yours and says so.',
          ],
        },
        {
          // page-notes.md, FAQs.
          q: 'How is this different from Team Playbook Builder?',
          a: [
            'Team Playbook Builder turns your SOPs into a skill that answers agents’ questions. This one turns your onboarding into a dated plan with owners and checkpoints for each new hire. A playbook makes a good input.',
          ],
        },
        {
          // The course plan, week 7: assess a useful first 30 days before adding detail to days 60 and 90.
          q: 'Why are Day 60 and Day 90 only headings?',
          a: ['Get the first 30 days right first. Detail for later comes after the Day 30 review.'],
        },
        {
          // page-notes.md, "What Was and Wasn't Tested".
          q: 'Has it been tried on real teams?',
          a: [
            'Not yet. It was tested on made-up files: the practice team, a page of thin notes, and a set built to mislead it. We haven’t tried the ChatGPT version inside ChatGPT yet.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Recruiting, with no one hired yet? Use ',
        { link: 'Recruiting Prep', href: '/recruiting-prep', sameTab: true },
        '. To turn your SOPs into answers your agents can ask, ',
        { link: 'Team Playbook Builder', href: '/team-playbook-builder', sameTab: true },
        '. For a coaching one-on-one once they’re up and running, ',
        { link: 'Agent 1:1 Prep', href: '/agent-1on1-prep', sameTab: true },
        '.',
      ],
    },
  ],

  unlockKey: 'naop-unlocked',
});
