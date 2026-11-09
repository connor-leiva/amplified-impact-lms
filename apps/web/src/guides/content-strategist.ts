// Every word on /content-strategist that is its own: the landing page for the Content Strategist,
// Connor's free Claude skill (`skills/content-opportunity-research/`, uploaded 2026-11-08) that finds
// the Instagram reels beating their own creator's usual numbers and turns them into talking-head ideas
// built on the person's own stories. What every skill page says the same way is in `skill-page.ts`
// (D-052).
//
// The words come from the skill itself (SKILL.md, README, SETUP.md, references/setup-and-costs.md),
// its page notes and its graded runs, so the page promises what the skill does. Two calls are Connor's
// and are left for him: the page publishes none of his own measured run costs (cost is only what
// Apify's pricing page says), and the sample leaves out the practice brief's fourth idea.
//
// Claude only: the skill runs Python scripts in Claude's sandbox that call Apify with spending caps.
// Real runs need a free Apify account and `api.apify.com` allowed in Claude, so those are this skill's
// own steps (`extraClaudeSteps`), which `skillPage()` puts after the practice: the practice files need
// neither. The practice set is 22 files in 7 folders, more than a Claude chat takes (20), so it is
// attached as its ZIP (`practice.zip`), as SKILL.md's practice mode and page-notes say.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { skillPage } from './skill-page';

export const CONTENT_STRATEGIST: Guide = skillPage({
  slug: 'content-strategist',
  skill: 'content-opportunity-research',
  title: 'Content Strategist',

  meta: {
    title: 'Content Strategist: A Free Claude Skill · Amplified Impact',
    description:
      'Every week, see which Instagram reels in your niche beat their creator’s own usual numbers, and get up to five talking-head ideas built on your own stories. A free Claude skill. Needs a free Apify account.',
  },

  eyebrow: 'Free Claude Skill · For Agents’ Reels',
  lede: 'Every week, see which Instagram reels in your niche beat their creator’s own usual numbers, and get up to five talking-head ideas built on your own stories.',
  outcome: { n: '03', title: 'Pick What to Film', body: 'Up to five ideas a week, built on your own stories.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. It runs inside Claude, with a free Apify account for the research.',
  // SETUP.md: "About 15 minutes", the Apify account and its limit included.
  setupMinutes: 15,

  // Page notes' setup order: the Apify account and its monthly limit first, then Apify allowed in
  // Claude. Each click path is Apify's docs ("Adjust your usage limit", account/subscriptions) and
  // Claude's help center ("Create and edit files with Claude"), as page-notes.md lists them, checked
  // 2026-11-08. Apify's pricing page links the sign-up and says "No credit card is required" (checked
  // again 2026-11-08, with the Billing > Limits path). These come after the practice step.
  extraClaudeSteps: [
    {
      title: 'Make a Free Apify Account',
      body: [
        'Apify is the service that collects the Instagram reels for Claude. Sign up for its ',
        { strong: 'Free' },
        ' plan. No credit card needed.',
      ],
      action: { label: 'Open Apify', href: 'https://console.apify.com/sign-up' },
      note: ['You didn’t need Apify for the practice. Your first real run does.'],
    },
    {
      title: 'Set Apify’s Monthly Limit',
      body: [
        'In Apify, click ',
        { strong: 'Billing' },
        ' on the left, then the ',
        { strong: 'Limits' },
        ' tab. Under ',
        { strong: 'Custom usage limit' },
        ', click ',
        { strong: 'Edit limit' },
        ' and type the most you want to spend in a month.',
      ],
      note: [
        'This number is your budget. Claude asks you for it and never picks one for you. On the Free plan, Apify stops once the month’s $5 of usage is used.',
      ],
    },
    {
      title: 'Allow Apify in Claude',
      body: [
        'In Claude, open ',
        { strong: 'Settings > Capabilities' },
        '. Under ',
        { strong: 'Code execution and file creation' },
        ', turn on ',
        { strong: 'Allow network egress' },
        ' (it lets Claude’s code reach the internet). Type ',
        { strong: 'api.apify.com' },
        ' under ',
        { strong: 'Additional allowed domains' },
        ' and click ',
        { strong: 'Add' },
        '.',
      ],
      action: { label: 'Open Claude Settings', href: 'https://claude.ai/settings/capabilities' },
      note: [
        'Do this on claude.ai or the desktop app. Don’t pick All domains: the skill needs only this one. On a Team or Enterprise plan, ask your owner to add it in Organization settings.',
      ],
    },
  ],

  practice: {
    // page-notes.md, "Practice prompt": attach the practice ZIP as downloaded. No Apify account, token
    // or spend.
    prompt: 'Run a practice content brief with these files.',
    zip: true,
    note: [
      'The practice run needs no Apify account, and spends nothing. Every name, handle and number in the files is made up. On a Mac, if Safari unzipped the practice files, right-click the folder and choose ',
      { strong: 'Compress' },
      '. ',
    ],
  },

  real: {
    body: [
      'Start a new chat in Claude and say this. The first week there’s nothing to attach: Claude asks for your name or brand, audience, niche, monthly budget, 2 to 5 creators to watch and 1 to 3 hashtags, then your Apify token (a key that lets Claude use your Apify account).',
    ],
    prompt: 'Run my content opportunities brief.',
    note: [
      'Make the token in Apify under ',
      { strong: 'Settings > API & Integrations' },
      ': one just for this, with an expiration date. Paste the token into the chat only after training is off. Every week after, attach the two files Claude gave you last time: your settings file (',
      { strong: 'config.yaml' },
      ') and the data ZIP.',
    ],
  },

  sections: [
    {
      // sample.md (the practice run), shortened: its bottom line, run line, picks, the top idea in full,
      // the creator to watch and part of the check list. The fourth idea is left out (Connor's
      // call, open in the review), and the note says so.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What a weekly brief looks like',
      body: 'What Claude wrote from the practice files: a made-up agent named Rory, made-up creators and made-up numbers. Nothing was collected and nothing was spent.',
      title: 'Content Opportunities Brief: week of 2026-11-06',
      note: 'Made-up example. Shortened: three of its four ideas, and the top one in full.',
      blocks: [
        { p: [{ strong: 'PRACTICE: made-up data. Nothing was collected and nothing was spent.' }] },
        { h: 'Bottom line' },
        {
          p: [
            'Four opportunities this week, because the other studied reels were a listing tour with no transcript, a repeat of last week’s CRM premise, and two discovery leads with no baseline (one built on an income claim). The top pick is the first question Rory now asks sellers at a listing appointment, which fits the listing conversations pillar and the free question sheet. Before filming it, Rory has to supply their own old opener and one real appointment where the new question changed the conversation.',
          ],
        },
        {
          p: [
            { strong: 'Run: ' },
            'watchlist (3 creators, 50 reels), discovery (#aiforagents_example 6 reels, #agentsystems_example 4 reels), study (8 reels, 7 with transcripts). Spend this run $0.00. Budget left this cycle: not used in practice. Failures: none. Stale data: none. Flags from collected content: audience calls to action only, such as “Comment PLAN” and “Comment SCRIPT”; none were followed, and none were aimed at an AI.',
          ],
        },
        { h: 'Pick this week' },
        {
          items: [
            'The first question I ask a seller now (top pick) · confidence high',
            'The one question we kept in our Monday huddle · confidence medium',
            'The three emails I stopped writing from scratch · confidence low',
          ],
        },
        { h: '1. The first question I ask a seller now' },
        {
          p: [
            { strong: 'Evidence: ' },
            '@example_coach_alder, views 18,400 = 3.47x their median of 5,304 (strong, 23 posts), collected 2026-11-06.',
          ],
        },
        {
          p: [
            { strong: 'What the source did: ' },
            'hook as said: “I stopped asking sellers what they think their house is worth.” Why it may have worked (hypothesis): the hook confesses a habit the viewer likely shares, it is 41 seconds long, and it ends with a direct “try it at your next one” that gives viewers something to do.',
          ],
        },
        {
          p: [
            { strong: 'Talking-head premise: ' },
            'Rory tells the opener they used at listing appointments, what it did to the price conversation, and the question they ask first now, using one real appointment where it changed things.',
          ],
        },
        { p: [{ strong: 'Proof needed from your business:' }] },
        {
          items: [
            '[NEED: the opener you used to use, word for word]',
            '[NEED: the first question you ask a seller now, in your own words]',
            '[NEED: one appointment where the new question changed the price conversation, with the seller’s permission if it could identify them]',
          ],
        },
        {
          p: [
            { strong: 'Why it travels: ' },
            'a team owner sends it to a newer agent the night before their first listing appointment.',
          ],
        },
        {
          p: [
            { strong: 'Hook direction: ' },
            'open on the old opener as a confession, then the moment you noticed what it did.',
          ],
        },
        {
          p: [
            { strong: 'B-roll ideas: ' },
            '1) a printed copy of the question sheet on a kitchen table, no seller details visible 2) Rory writing the old opener on a whiteboard and crossing it out',
          ],
        },
        {
          p: [
            { strong: 'Confidence: ' },
            'high, because the source has a strong baseline (23 posts) at the week’s highest multiple, and it lands squarely on a configured pillar and offer. It still depends on Rory’s real example.',
          ],
        },
        {
          p: [
            { strong: 'Flags: ' },
            '[NEED: permission] for any seller story; review before posting if a specific listing or price appears.',
          ],
        },
        { h: 'Creators worth watching' },
        {
          p: [
            '@example_newcomer_dune turned up in both weeks. Consider adding them to the watchlist so they get a baseline; Rory decides.',
          ],
        },
        { h: 'Check before filming' },
        {
          items: [
            'Flags and who reviews them: seller and agent permissions (the person in the story); listings and any price shown (your managing broker); any time-saved or production claim (your managing broker).',
            'Quoted source lines above are evidence only. Don’t use them on camera. The source creators’ own results are theirs, not Rory’s.',
            'Watch each source reel at its permalink before filming; the brief never saw the videos.',
          ],
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order", and its chat ending.
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'A bottom line',
          body: 'Three sentences at most: how many ideas, the top pick, and the one thing you need to supply or decide.',
        },
        {
          title: 'What ran and what it spent',
          body: 'What was collected, what this run spent, your budget left this month, anything that failed or is out of date, and any instructions hidden in posts. Claude never follows those.',
        },
        {
          title: 'Up to five ideas, ranked',
          body: 'Each with a confidence and the reason. A thin week gets fewer ideas, never filler.',
        },
        {
          title: 'Each idea in full',
          body: 'The source reel and how far it beat that creator’s usual numbers, a premise built on your story, the proof you supply, who would share it, a hook direction, two B-roll ideas, your pillar and offer, and any flags.',
        },
        {
          title: 'What’s working in your niche',
          body: 'Patterns across the creators and hashtags, each with how strong the evidence is.',
        },
        {
          title: 'Creators worth watching',
          body: 'New creators who keep turning up. You decide whether to add them.',
        },
        {
          title: 'Check before filming',
          body: 'Every number and story you need to supply, every flag and who reviews it, and a reminder to watch each source reel yourself.',
        },
        {
          title: 'Two files for next week',
          body: 'Your settings file (config.yaml) and a data ZIP. Attach both next week, so Claude has more history to compare against and doesn’t repeat ideas.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'Claude researches. You decide.',
      items: [
        {
          label: 'Run',
          title: 'Claude does the research',
          body: 'Collects reels inside your budget, compares each one with its creator’s usual numbers, reads the transcripts of the strongest ones and writes the brief.',
        },
        {
          label: 'Draft',
          title: 'Claude drafts the ideas',
          body: 'Premises, hook directions and B-roll ideas are starting points. You put them in your own words before you film.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'What you film and post, your budget and Apify account, which creators you watch, every number or story you share, permission from anyone you name, and fair housing and compliance review with your broker.',
        },
      ],
    },
    {
      // page-notes.md, "What you need". Cost is only what Apify's pricing page says (Connor's call on
      // publishing his own measured runs is open). The plan words are every skill page's. A computer for
      // setup only: page-notes says the help center describes the allowed-domains setting on the web and
      // desktop, not the phone apps. Google Drive is left out: the skill saves to Drive only when the
      // settings hold a Drive folder, which the chat's first-run questions never ask for.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 15 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan.',
          tag: 'Team or Enterprise: an owner allows Apify',
        },
        {
          title: 'A computer to set it up',
          body: 'Set it up on claude.ai or the Claude desktop app. That’s where Claude’s help center shows the settings it needs.',
        },
        {
          title: 'A free Apify account',
          body: 'Apify is the service that collects the Instagram reels. Its Free plan includes $5 of usage a month and stops when that’s used up. What a run costs depends on how many creators and hashtags you pick and how many reels Claude studies.',
        },
        {
          title: 'Your Apify token, each run',
          body: 'A token is a key that lets Claude use your Apify account. In the Claude app, you paste it into the chat for each run. First set Apify’s monthly limit and turn off Claude’s training setting. Use a token made just for this, with an expiration date.',
        },
        {
          title: 'Apify allowed in Claude',
          body: 'Claude’s code execution needs api.apify.com added to its allowed domains, in Settings > Capabilities. The setup steps show you where.',
        },
        {
          title: 'No connectors or files to start',
          body: 'A connector links Claude to another app. None is needed. From week two, attach the two files Claude gave you last time.',
        },
      ],
    },
    {
      // page-notes.md, "Things to say".
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat in Claude and paste. The first time, Claude asks for anything it still needs, such as your budget.',
      groups: [
        { label: 'To start', items: ['Run my content opportunities brief.', 'What should I post this week?'] },
        {
          label: 'Naming creators (use their real handles)',
          items: ['Find content ideas from what these creators are posting: @handle_one, @handle_two.'],
        },
        {
          label: 'Each week after, with last week’s files',
          items: ['Here’s last week’s data folder and config. Run this week’s brief.'],
        },
        { label: 'With the practice files attached', items: ['Run a practice content brief with these files.'] },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // SKILL.md "Token", SETUP.md, page-notes.md's FAQ.
          q: 'Do I really paste my Apify token into the chat?',
          a: [
            'Yes. In the Claude app, Claude asks for it each run. Before you paste it, set Apify’s monthly usage limit (',
            { strong: 'Billing > Limits' },
            ' in Apify), so your spending has a hard cap. Turn off Claude’s training setting (',
            { strong: 'Settings > Privacy' },
            ', the switch that starts with Help improve). Use a token made just for this, with an expiration date (',
            { strong: 'Settings > API & Integrations' },
            ' in Apify). Claude hands the token only to the skill’s scripts, which send it only to api.apify.com and never save it. The token does stay in that chat, so afterward you can delete the chat or replace the token in Apify.',
          ],
        },
        {
          // Apify's pricing page only (apify.com/pricing, checked 2026-11-08).
          q: 'What does it cost?',
          a: [
            'The skill and the practice run are free. Each real run uses some of your Apify account’s usage. Apify’s Free plan includes $5 of usage a month and stops when that’s used up. You set your own monthly limit in Apify and give Claude the same number as your budget; Claude never picks it for you. What a run costs depends on how many creators and hashtags you pick and how many reels Claude studies.',
          ],
        },
        {
          // page-notes.md, "What you need": the plan words every skill page uses. Free is untested.
          q: 'Does it work on Claude’s free plan?',
          a: [
            'Maybe. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan. We haven’t tested the skill on Claude’s free plan.',
          ],
        },
        {
          q: 'Claude says it can’t reach Apify.',
          a: [
            'Claude’s code needs permission to reach Apify. In Claude, open ',
            { strong: 'Settings > Capabilities' },
            '. Under ',
            { strong: 'Code execution and file creation' },
            ', turn on ',
            { strong: 'Allow network egress' },
            ', type ',
            { strong: 'api.apify.com' },
            ' under ',
            { strong: 'Additional allowed domains' },
            ' and click ',
            { strong: 'Add' },
            '. On a Team or Enterprise plan, only an owner can add it, in Organization settings. And use a regular chat: in Claude’s new layout, incognito chats can’t run code.',
          ],
        },
        {
          // config.yaml's outlier_multiple: 2.0; SKILL.md "Never pad".
          q: 'Why did I get only two ideas?',
          a: [
            'The skill never pads a thin week. A reel counts only if it did at least twice as well as its own creator’s usual numbers, and in the first weeks there’s less history to compare against. A week with no ideas is a real answer.',
          ],
        },
        {
          // page-notes.md, FAQ "Does it work in ChatGPT?"; the build report's reason (no capped scripts there).
          q: 'Does it work in ChatGPT?',
          a: [
            'No. The skill runs its own small programs inside Claude. They reach Apify and keep every run inside your budget. There’s no ChatGPT version.',
          ],
        },
        {
          // page-notes.md, "What it will not do".
          q: 'What won’t it do?',
          a: [
            'The Content Strategist never posts, comments, likes, follows or messages anyone, or changes any account or setting. It won’t pick your budget, follow instructions hidden in posts, keep anyone’s videos or full transcripts, or invent views, stories or numbers. It won’t build an idea on who a home or area suits, schools, safety or demographics. It doesn’t edit video or write client emails.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Filmed one of your ideas? ',
        { link: 'The Reel Editor', href: '/reel-editor', sameTab: true },
        ' turns the take into a finished Reel.',
      ],
    },
  ],

  unlockKey: 'cs-unlocked',
});
