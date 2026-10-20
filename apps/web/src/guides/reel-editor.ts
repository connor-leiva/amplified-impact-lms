// Every word on /reel-editor that is its own: the landing page for the Reel Editor, Connor's free
// Claude skill that edits a talking-head video into a finished Reel. DECISIONS.md D-045. What every
// guide page shares is in `content.ts`.
//
// The words come from the skill itself (its README, SKILL.md and references), so the page promises
// exactly what the skill does. It is the first guide that is a skill rather than a PDF: the download
// is a ZIP that has to be added to Claude, so the unlocked card walks through that (`setup`), and on a
// phone it says to finish on a computer, with a way to send the page there (`handoff`). Uploading a
// skill is in Claude's Customize > Skills, which Claude's help center documents for the web.

import type { Guide } from './content';

/** Where "Send This to My Computer" points: the unlocked card, which `:target` shows on any device. */
const SEND_URL = 'https://www.amplifiedimpact.io/reel-editor#download';

export const REEL_EDITOR: Guide = {
  slug: 'reel-editor',

  meta: {
    title: 'Reel Editor: A Free Claude Skill · Amplified Impact',
    description:
      'Upload a talking-head video and Claude hands back a finished Reel: tight cuts, animated graphics, captions, sound effects and music. A free Claude skill.',
  },

  hero: {
    eyebrow: 'Free Claude Skill · For Reels, TikToks and Shorts',
    title: 'Reel Editor',
    lede: 'Upload a talking-head video, say “edit this into a Reel,” and Claude hands back a finished, upload-ready vertical video.',
    steps: [
      { n: '01', title: 'Add It to Claude', body: 'One file, about two minutes, once.' },
      { n: '02', title: 'Upload Your Video', body: 'A talking-head clip, under about 60 seconds.' },
      { n: '03', title: 'Post Your Reel', body: 'Cut, captioned, animated and mixed.' },
    ],
  },

  optIn: {
    anchor: 'get-the-skill',
    heading: 'Get the free skill',
    body: 'Tell us where to send updates and the skill is yours. It runs entirely inside Claude. No editing software.',
    button: 'Get the Skill',
  },

  download: {
    heading: 'It’s yours.',
    body: 'Set it up once, in about two minutes. It’s easiest on a computer.',
    // A plain file, so it works the same with or without the page's script. Saved under the name the
    // skill's README tells people to upload, and never unzipped: Claude takes the ZIP itself.
    href: '/downloads/reel-editor.zip',
    filename: 'reel-editor.zip',
    handoff: {
      body: 'On a phone or tablet? Adding a skill to Claude is easiest on a computer. Send yourself this page and finish there.',
      label: 'Send This to My Computer',
      href: `mailto:?subject=${encodeURIComponent('Reel Editor: add it to Claude on your computer')}&body=${encodeURIComponent(`Open this on your computer:\n${SEND_URL}`)}`,
      share: { title: 'Reel Editor: add it to Claude on your computer', url: SEND_URL },
    },
    inApp: 'In the Instagram app? Tap the ••• menu and choose Open in browser, then download it there.',
    setup: [
      {
        title: 'Turn On Code Execution',
        body: [
          'In Claude, open ',
          { strong: 'Settings > Capabilities' },
          ' and turn on ',
          { strong: 'Code execution and file creation' },
          '. Leave its network setting on the default.',
        ],
        action: { label: 'Open Claude Settings', href: 'https://claude.ai/settings/capabilities' },
        note: ['On a Team or Enterprise plan, an owner turns this on in Organization settings.'],
      },
      {
        title: 'Download the Skill',
        body: ['One ZIP file. ', { strong: 'Don’t unzip it.' }],
        action: 'download',
        note: [
          'On a Mac, Safari may unzip it for you. If you get a reel-editor folder, right-click it and choose Compress.',
        ],
      },
      {
        title: 'Add It to Claude',
        body: [
          'Open ',
          { strong: 'Customize > Skills' },
          ', click ',
          { strong: '+' },
          ', then ',
          { strong: 'Create skill > Upload a skill' },
          ', and choose the ZIP. Make sure it’s switched on.',
        ],
        action: { label: 'Open Claude Skills', href: 'https://claude.ai/customize/skills' },
      },
      {
        title: 'Make Your First Reel',
        body: [
          'Start a new chat, attach your video, and say this. Claude may ask two quick questions (look and music), then it works.',
        ],
        copy: 'Edit this into a Reel',
        note: ['If Claude pauses partway, reply ', { strong: 'continue' }, '. It picks up where it left off.'],
      },
    ],
  },

  sections: [
    {
      kind: 'list',
      heading: 'What you get back',
      items: [
        { title: 'Tight cuts', body: 'Dead air, retakes and false starts removed, with lip sync locked.' },
        {
          title: 'Animated graphics',
          body: 'They explain what you’re saying, timed to your words, kept below your face.',
        },
        { title: 'Kinetic captions', body: 'Synced word by word.' },
        {
          title: 'Sound effects and music',
          body: 'Original, made fresh on every run, and mixed under your voice at Instagram’s loudness target.',
        },
        {
          title: 'Two finished files',
          body: 'One with music, and one without, so you can add a trending sound inside Instagram or TikTok instead.',
        },
      ],
    },
    {
      kind: 'tiles',
      heading: 'Graphics that explain, not decorate',
      note: 'Timed to your words',
      columns: 2,
      items: [
        {
          label: 'You compare two things',
          title: 'Side by side',
          body: 'The old way gets an ✕. The better way lands as you say it.',
        },
        { label: 'You walk through a process', title: 'A flow', body: 'Up to four steps, left to right.' },
        { label: 'You list the rules', title: 'A checklist', body: 'Each one ticks as you say it.' },
        { label: 'You say a number', title: 'A count-up', body: 'The number climbs on its own full page.' },
      ],
    },
    {
      kind: 'tiles',
      heading: 'Two looks',
      note: 'Pick one per video',
      columns: 2,
      items: [
        {
          label: 'Editorial',
          title: 'Calm and premium',
          body: 'Clean graph-paper split screens and kinetic type. Like someone designed it.',
        },
        {
          label: 'Creator',
          title: 'Loud and fun',
          body: 'Emoji stickers, highlight-box captions, marker notes and punchy hits. Made in CapCut by someone with taste.',
        },
      ],
    },
    {
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 2 minutes to set up',
      cta: true,
      items: [
        { title: 'A paid Claude plan', body: 'Pro, Max, Team or Enterprise.' },
        { title: 'Code execution on', body: 'One switch in Claude’s settings. Step 1 shows you where.' },
        { title: 'A talking-head video', body: 'Vertical works best, under about 60 seconds.' },
      ],
    },
    {
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat, attach your video, and paste. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'To start',
          items: ['Edit this into a Reel', 'Make this more engaging with animations, sound effects and music'],
        },
        {
          label: 'Quick fixes, no full re-render',
          items: ['Make my voice louder', 'Turn the sound effects down', 'No music'],
        },
        {
          label: 'Other changes',
          items: ['Move the graphics lower', 'Make it look more like a creator edited it', 'Cleaner, less busy'],
        },
      ],
    },
    {
      kind: 'list',
      heading: 'For the best results',
      items: [
        {
          title: 'Film vertical',
          body: '9:16, with your face in the upper half of the frame. The graphics go below it.',
        },
        { title: 'Good light and a quiet room', body: 'The cuts and captions come from what Claude hears.' },
        { title: 'Under about 60 seconds', body: 'If the file is too big to upload, export it at 1080p.' },
        { title: 'In English', body: 'The transcription model is English-only.' },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // Claude's pricing page: Free includes code execution, file creation and skills; "Pro gives you
          // at least 5x more usage per 5-hour session than Free" (checked 2026-10-20, D-045).
          q: 'Does it work on Claude’s free plan?',
          a: [
            'It can, but it may not finish in one go. Free has the skills and code execution it needs, with much less usage: Pro gives at least 5 times more per session. A Reel uses a lot of it, so on Free, Claude may stop partway until your limit resets. For a full Reel in one go, use Pro or higher.',
          ],
        },
        {
          q: 'Claude stopped partway through.',
          a: ['Reply ', { strong: 'continue' }, '. It picks up where it left off.'],
        },
        {
          q: 'How long does it take?',
          a: [
            'The first run takes a few extra minutes while it sets up. After that, about 10 seconds of rendering per second of video, so a 45-second Reel takes about 8 minutes.',
          ],
        },
        {
          q: 'My video won’t upload.',
          a: ['It’s probably too big. Export it at 1080p, or keep it under about 60 seconds.'],
        },
        {
          q: 'My Mac unzipped the download.',
          a: [
            'Safari can do that on its own. Right-click the reel-editor folder, choose ',
            { strong: 'Compress' },
            ', and upload the new ZIP.',
          ],
        },
        {
          q: 'The skill is greyed out, or setup fails.',
          a: [
            'Code execution has to be on: ',
            { strong: 'Settings > Capabilities' },
            ', then ',
            { strong: 'Code execution and file creation' },
            '. Leave its network setting on the default, so Claude can download the tools it edits with. On a Team or Enterprise plan, an owner turns it on.',
          ],
        },
        {
          q: 'Can it match a style I like?',
          a: ['Yes. Upload that video or a few screenshots. Claude can’t open Instagram or TikTok links.'],
        },
        {
          q: 'Is the music safe to post?',
          a: ['Yes. The sound effects and music are made from scratch on every run, so there’s nothing to license.'],
        },
        {
          q: 'Does it work for TikTok and Shorts?',
          a: ['Yes. It makes a vertical video, ready for Reels, TikTok or Shorts.'],
        },
        {
          q: 'Do I need editing software?',
          a: ['No. It runs entirely inside Claude. No editing software, no GitHub, no Claude Code.'],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Built on ',
        { link: 'HyperFrames', href: 'https://www.npmjs.com/package/hyperframes' },
        ' (HeyGen, Apache-2.0), Whisper (OpenAI), NVIDIA Parakeet via sherpa-onnx, GSAP and Lucide icons. Claude downloads them inside its own sandbox when the skill runs; none are in the ZIP.',
      ],
    },
  ],

  unlockKey: 're-unlocked',
};
