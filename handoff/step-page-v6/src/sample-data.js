// Sample props for <StepPage>, built from the mockup (mockup/step-2.html), word for word.
// Shapes follow the LMS view-models in apps/web/src/routes/learn/Step.vm.ts (StepVM, PillVM,
// ChecklistLayoutVM, CheckItemVM, CalloutVM, AccordionVM) so the real loader can fill them directly.
import { chapters, cues } from './sample-cues.js';

export const sampleStep = {
  week: 0,
  n: 2,
  back: { label: 'Foundations', href: '#' },
  railLabel: 'Week 0 steps',
  /** PillVM[]: status is the LMS's own 'done' | 'progress' | 'waiting' | 'idle'; `on` marks the current step. */
  pills: [
    { n: 1, title: 'Fill In Your Intake and Name Your Operator', status: 'done', on: false, href: '#' },
    { n: 2, title: 'Watch the Orientation', status: 'progress', on: true, href: '#' },
    { n: 3, title: 'Start Your Time Baseline', status: 'idle', on: false, href: '#' },
    { n: 4, title: 'Get Your AI Ready', status: 'idle', on: false, href: '#' },
    { n: 5, title: 'Set Up Your AI Brain', status: 'waiting', on: false, href: '#' },
    { n: 6, title: 'Connect Your Data', status: 'idle', on: false, href: '#' },
    { n: 7, title: 'Lock the Guardrails', status: 'idle', on: false, href: '#' },
    { n: 8, title: 'Run the Ready Check and Your Test Hire', status: 'idle', on: false, href: '#' },
  ],
  eyebrow: 'Week 0 · Step 2',
  title: 'Watch the Orientation',
  lede: 'The goal of this step is that both of you know how a week runs and what an AI hire is before we start building. Watch it together if you can.',
  /** The three tags under the lede: time, role, due. */
  tags: [
    { icon: 'clock', label: '30 min' },
    { icon: 'users', label: 'Owner and operator' },
    { icon: 'cal', label: 'Due Mon, Nov 30, 12:00 PM MT' },
  ],
  video: {
    id: 'w0-02-orientation',
    title: 'Watch the Orientation',
    sectionLength: '7 min 49 s',
    clock: '7:49',
    durationS: 468.87,
    playLabel: 'Play the orientation',
    src: 'media/w0-02-orientation-narrated-v5.mp4',
    type: 'video/mp4',
    poster: 'media/w0-02-orientation-narrated-v5-poster.jpg',
    captions: 'media/w0-02-orientation-narrated-v5.vtt',
    chapters,
    cues,
    /** The item that checks itself at `autoAt` of the video. */
    autoCheckItem: 's2-watch',
    autoAt: 0.9,
  },
  /** CheckItemVM-like. `callouts` render as their own list row right after the item, as in the mockup. */
  items: [
    {
      id: 's2-watch', title: 'Watch the video', role: null,
      detail: 'It checks itself off once you’ve watched most of it.',
      checked: false,
      action: { type: 'play', label: 'Play from 0:00', seconds: 0 },
      autoLabel: 'Checks itself at 90%',
      subchecks: [],
      callouts: [{ kind: 'tip', label: 'Tip', text: 'Short on time? The chapters let you jump to how a week runs and what an AI hire is.' }],
    },
    {
      id: 's2-words', title: 'Know these five words', role: 'Each of you',
      detail: 'Skill, AI hire, seat card, guardrails and the AI Office.',
      checked: false,
      action: { type: 'card', openLabel: 'Open the five words', closeLabel: 'Hide the five words' },
      card: [
        { id: 'skill', term: 'Skill', short: 'A playbook we load into your AI.' },
        { id: 'ai-hire', term: 'AI hire', short: 'A skill that runs on a schedule and leaves a draft on one person’s desk.' },
        { id: 'seat-card', term: 'Seat card', short: 'A hire’s job description.' },
        { id: 'guardrails', term: 'Guardrails', short: 'The settings that keep your hires read and draft only.' },
        { id: 'ai-office', term: 'AI Office', short: 'A folder in your Google Drive where your hires read and save their work.' },
      ],
      subchecks: [], callouts: [],
    },
    {
      id: 's2-rhythm', title: 'Save the first live build', role: 'Each of you',
      detail: 'Wed, Dec 2, 2026, 12:00 to 1:30 PM MT. Every live build is on Wednesday.',
      checked: false,
      action: { type: 'calendar', label: 'Add to calendar' },
      subchecks: [], callouts: [],
    },
    {
      id: 's2-questions', title: 'Write down your questions', role: 'Each of you',
      detail: 'Bring them to office hours, or send them to us now.',
      checked: false,
      action: { type: 'link', label: 'Ask us', href: '#' },
      subchecks: [], callouts: [],
    },
  ],
  accordions: [
    {
      index: 0, title: 'How a week runs', open: false,
      body: [
        'Before the live build, by Tuesday night, your operator runs that week’s skill and the owner reads what it finds.',
        'Wednesday is the live build, 90 minutes, 12:00 to 1:30 PM MT: the question, live reads, the hire lab and the commit.',
        'After the build, your hire’s first run lands and the owner signs its seat card.',
        'Office hours follow the live build, 60 minutes, to get any setup unstuck.',
        'The checkpoint closes the week: the signed seat card, a screenshot of the first run and the minutes the hire took over.',
      ],
    },
  ],
  stepDone: false,
  next: { n: 3, title: 'Start Your Time Baseline', meta: 'Owner · 20 min, over two weeks', href: '#' },
  due: 'Due Mon, Nov 30, 12:00 PM MT',
  /** "On this page". `styles` is the mockup's review-only section; drop it in the LMS. */
  jumps: [
    { id: 'watch', label: 'Watch' },
    { id: 'checklist', label: 'Your checklist' },
    { id: 'reference', label: 'Reference' },
    { id: 'styles', label: 'Text styles (review)' },
  ],
  forStep: [
    { id: 'system-prompt', icon: 'key', title: 'System prompt', meta: '6 lines · about 63 tokens', view: true, copyText: 'System prompt' },
  ],
  help: [
    { icon: 'mail', title: 'Email support', meta: 'support@amplifiedimpact.io', href: '#' },
    { icon: 'radio', title: 'Office hours', meta: 'Thu, Dec 3 · 12:00 PM MT', href: '#' },
  ],
};

/** The chrome words, as the mockup prints them. The LMS has these in STEP (Step.vm.ts). */
export const sampleLabels = {
  watch: 'Watch',
  chapters: 'Chapters',
  scrollLeft: 'Scroll chapters left',
  scrollRight: 'Scroll chapters right',
  scrollStepsLeft: 'Scroll steps left',
  scrollStepsRight: 'Scroll steps right',
  showTranscript: 'Show transcript',
  hideTranscript: 'Hide transcript',
  copyTranscript: 'Copy transcript',
  copied: 'Copied',
  copy: 'Copy',
  view: 'View',
  backToCurrent: 'Back to current',
  transcript: 'Transcript',
  yourChecklist: 'Your checklist',
  reference: 'Reference',
  onThisPage: 'On this page',
  checklist: 'Checklist',
  forStep: 'For this step',
  stillStuck: 'Still stuck?',
  markDone: 'Mark step done',
  stepDone: 'Step done',
  undo: 'Undo',
  nextKicker: 'Next',
  checkProgress: 'Checklist progress',
  checked: 'checked',
  of: 'of',
};
