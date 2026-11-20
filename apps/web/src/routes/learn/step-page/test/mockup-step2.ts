// Week 0 step 2 as the v6 mockup draws it (handoff/step-page-v6/mockup/step-2.html and src/sample-data.js), as
// course data: the blocks a staff member enters in the Week Builder. Tests only (a `test/` folder), and the
// local acceptance setup loads the same blocks into a development database (handoff/step-page-v6/lms/).

import type { PathBlock, VideoBlock } from '@ai/core/course-types';

/** The video's uploads. The keys are whatever the bucket minted; the names and sizes are the files'. */
export interface MockupMedia {
  video: string;
  poster: string;
  transcript: string;
}

export const MOCKUP_CHAPTERS: { t: number; label: string }[] = [
  { t: 0, label: 'Welcome' },
  { t: 15.27, label: 'The starting line' },
  { t: 55.2, label: 'The eight steps' },
  { t: 90.93, label: 'How a week runs' },
  { t: 138.1, label: 'The live build' },
  { t: 177.4, label: 'After the build' },
  { t: 211.13, label: 'What an AI hire is' },
  { t: 255.13, label: 'The seat card' },
  { t: 279.63, label: 'A real seat card' },
  { t: 307.93, label: 'The seven tasks we time' },
  { t: 354.97, label: 'Read and draft only' },
  { t: 430.07, label: 'The AI Office' },
  { t: 444.87, label: 'What’s next' },
];

export function mockupVideo(media: MockupMedia): VideoBlock {
  return {
    type: 'video',
    id: 'w0-02-orientation',
    title: 'Play the orientation',
    source: { upload: media.video, name: 'w0-02-orientation-narrated-v5.mp4', size: 1, type: 'video/mp4' },
    poster: { upload: media.poster, name: 'w0-02-orientation-narrated-v5-poster.jpg', size: 80749, type: 'image/jpeg' },
    transcript: { upload: media.transcript, name: 'w0-02-orientation-narrated-v5.vtt', size: 10635, type: 'text/vtt' },
    chapters: MOCKUP_CHAPTERS,
  } as VideoBlock;
}

/** Step 2's path. `firstLiveBuild` is the session id of the first live build (Wed, Dec 2). */
export function mockupStep2Blocks(media: MockupMedia, firstLiveBuild: string): PathBlock[] {
  return [
    mockupVideo(media),
    { type: 'check', id: 's2-watch', title: 'Watch the video', detail: 'It checks itself off once you’ve watched most of it.', playAt: { t: 0 }, auto: { video: true, at: 0.9 } },
    { type: 'callout', kind: 'tip', text: 'Short on time? The chapters let you jump to how a week runs and what an AI hire is.' },
    {
      type: 'check',
      id: 's2-words',
      title: 'Know these five words',
      role: 'each',
      detail: 'Skill, AI hire, seat card, guardrails and the AI Office.',
      action: { type: 'card', terms: ['skill', 'ai-hire', 'seat-card', 'guardrails', 'ai-office'] },
    },
    {
      type: 'check',
      id: 's2-rhythm',
      title: 'Save the first live build',
      role: 'each',
      detail: 'Wed, Dec 2, 2026, 12:00 to 1:30 PM MT. Every live build is on Wednesday.',
      action: { type: 'calendar', sessionId: firstLiveBuild },
    },
    {
      type: 'check',
      id: 's2-questions',
      title: 'Write down your questions',
      role: 'each',
      detail: 'Bring them to office hours, or send them to us now.',
      action: { type: 'link', label: 'Ask us', href: 'mailto:support@amplifiedimpact.io' },
    },
    {
      type: 'accordion',
      title: 'How a week runs',
      body: [
        'Before the live build, by Tuesday night, your operator runs that week’s skill and the owner reads what it finds.',
        'Wednesday is the live build, 90 minutes, 12:00 to 1:30 PM MT: the question, live reads, the hire lab and the commit.',
        'After the build, your hire’s first run lands and the owner signs its seat card.',
        'Office hours follow the live build, 60 minutes, to get any setup unstuck.',
        'The checkpoint closes the week: the signed seat card, a screenshot of the first run and the minutes the hire took over.',
      ],
    },
  ];
}

/** Step 5 waits on another step, so its pill shows the dashed circle (the mockup's step 5). */
export const MOCKUP_STEP5_BLOCKS: PathBlock[] = [
  { type: 'check', id: 's5-brain', title: 'Set up your AI brain', dependsOn: ['step:4:s4-ready'] },
];
export const MOCKUP_STEP4_BLOCKS: PathBlock[] = [{ type: 'check', id: 's4-ready', title: 'Get your AI ready' }];

/** A 6-line system prompt of about 63 tokens ("6 lines · about 63 tokens"), with no fill-ins. */
export const MOCKUP_PROMPT = [
  'You are the Foundations assistant for this team.',
  'Answer from the AI Office and the course pages only.',
  'Read and draft. Never send, delete or change anything.',
  'Keep answers short and plain.',
  'Say when you are not sure, and say why.',
  'End with the next step.',
].join('\n');
