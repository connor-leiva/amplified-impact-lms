// Every word on /ops-time-audit that is its own: the landing page for The Ops Time Audit, Connor's
// free guide for real estate team owners and operators. DECISIONS.md D-039. What every guide page
// shares is in `content.ts`.
//
// The words come from the guide itself (its cover, page 2's example report and "What You Need", page
// 3's three doors, and page 8's pointer to the Task Sync Starter Kit), so the page promises exactly
// what the PDF delivers.

import type { Guide } from './content';

export const OPS_TIME_AUDIT: Guide = {
  slug: 'ops-time-audit',

  meta: {
    title: 'The Ops Time Audit · Amplified Impact',
    description:
      'Find out how many hours a week you’re burning on work AI should already be doing. A free guide for real estate team owners and operators.',
  },

  hero: {
    eyebrow: 'Free Guide · For Real Estate Team Owners and Operators',
    title: 'The Ops Time Audit',
    lede: 'Find out how many hours a week you’re burning on work AI should already be doing.',
    steps: [
      { n: '01', title: 'Pick Your Door', body: 'Connected tools, a CRM export or screenshots, or an interview.' },
      { n: '02', title: 'Run the Prompt', body: 'One prompt. Nothing to fill in. Paste it as is.' },
      { n: '03', title: 'Build the First One', body: 'Read the table, then build the one it names.' },
    ],
  },

  optIn: {
    anchor: 'get-the-guide',
    heading: 'Get the free guide',
    body: 'Tell us where to send updates and the guide is yours. Eight pages, as a PDF.',
    button: 'Get the Guide',
  },

  download: {
    heading: "It's yours.",
    // The prompt is two pages long: pasting it is easier on a laptop, beside Claude.
    body: 'Save it, then open it on a laptop next to Claude. The prompt is on pages 5 and 6.',
    href: '/downloads/ops-time-audit.pdf',
    filename: 'The Ops Time Audit - Amplified Impact.pdf',
  },

  sections: [
    {
      kind: 'report',
      eyebrow: 'What This Audit Does',
      heading: 'Every hour points to the evidence',
      body: 'Give Claude two weeks of evidence and this prompt. It sorts the work, estimates the hours, and names the one thing to automate first. It works whether or not your CRM connects to Claude.',
      title: 'What You Get Back',
      note: 'Example. Made-up numbers, real shape.',
      rows: [
        {
          category: 'Follow-up writing',
          hours: '6.5',
          evidence: '41 texts and 22 emails written by hand',
          tag: 'Draft',
          ready: 'Yes',
        },
        {
          category: 'Transaction coordination',
          hours: '4',
          evidence: '17 “missing doc” emails across 6 files',
          tag: 'Draft',
          ready: 'Partial',
        },
        {
          category: 'Meeting notes and action items',
          hours: '3',
          evidence: 'Notes typed after 9 recurring meetings',
          tag: 'Run',
          ready: 'Yes',
        },
        {
          category: 'Lead routing and assignment',
          hours: '2.5',
          evidence: '33 leads assigned by hand',
          tag: 'Run',
          ready: 'Partial',
        },
        {
          category: 'Reporting and scorecard assembly',
          hours: '2',
          evidence: 'Scorecard rebuilt weekly from 3 exports',
          tag: 'Run',
          ready: 'Yes',
        },
      ],
      verdict: {
        lead: 'Build this first: Follow-up writing.',
        body: 'It has more hours than any other AI-ready row, and every draft still goes out from your agents.',
      },
    },
    {
      kind: 'tiles',
      heading: 'Pick your door',
      note: 'Three ways in, one report out',
      items: [
        {
          label: 'Door A',
          title: 'Connected tools',
          body: 'Connect Gmail and Google Calendar, and Claude reads the last 14 days of sent email and meetings.',
          tag: 'Paid Claude plans',
        },
        {
          label: 'Door B',
          title: 'Files or screenshots',
          body: 'Upload a CSV export from any CRM, or three screenshots. No connector needed.',
          tag: 'Any Claude plan',
        },
        {
          label: 'Door C',
          title: 'Interview',
          body: 'Nothing to upload? Claude asks you eight questions, one at a time, and builds the table from your answers.',
          tag: 'Any Claude plan',
        },
      ],
    },
    {
      kind: 'list',
      heading: "What's inside",
      items: [
        {
          title: 'The Ops Time Audit Prompt',
          body: 'One prompt, nothing to fill in. It asks which door you’re using, then does the counting.',
        },
        {
          title: 'Where the evidence lives',
          body: 'What to export or screenshot in Follow Up Boss, Brivity, KW Command, GoHighLevel, Sierra Interactive, Lofty, BoomTown and Sisu, and who can export it.',
        },
        {
          title: 'How to read the table',
          body: 'Run, Draft or Own: who should be doing each kind of work from now on.',
        },
        {
          title: 'What to build first',
          body: 'The one category to build, who approves its output, and how to tell it worked.',
        },
      ],
    },
    {
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 15 minutes',
      cta: true,
      items: [
        {
          title: 'A Claude account',
          body: 'Any plan for files, screenshots or the interview. Gmail and Calendar need a paid plan.',
        },
        {
          title: 'Two weeks of evidence',
          body: 'A CRM export, three screenshots, or your answers to eight questions.',
        },
        { title: 'One sitting', body: 'Claude does the counting. You answer what it asks.' },
      ],
    },
    {
      kind: 'note',
      body: [
        'Meeting notes came out on top? ',
        { link: 'The Task Sync Starter Kit', href: '/task-sync-starter', sameTab: true },
        ' is already written.',
      ],
    },
  ],

  unlockKey: 'ota-unlocked',
};
