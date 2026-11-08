# Content Opportunity Research

A Claude skill (the Content Strategist) that tells you what to post next, based on what's actually outperforming in your niche this week.

Every week it:

1. **Watches the creators you choose** and the hashtags your audience uses on Instagram.
2. **Finds real outliers.** A reel only counts if it beat *that creator's own* typical performance by 2x or more. A big account's average post doesn't fool it, and it tells you how solid each creator's baseline is.
3. **Studies the winners.** It pulls transcripts for the top reels and breaks down the hook, the argument, and why it may have worked, labeled as a hypothesis, never as fact.
4. **Hands you up to five talking-head ideas that are yours,** not copies: each one with a premise grounded in your own story, the proof you'd need to supply, a hook direction, B-roll ideas, and a confidence rating with the reason. For real estate creators it flags fair housing, listing and income-claim risks before you film.

It runs on a spending cap you set, keeps no competitor videos or full transcripts, never posts or messages anyone, and won't pad a thin week with weak ideas.

## What's in the folder

```
content-opportunity-research/
  SKILL.md                                  how Claude runs the research
  SETUP.md                                  15-minute setup guide
  config.yaml                               your niche, creators, hashtags and budget
  scripts/                                  collection, outlier scoring, transcripts, cleanup
  references/brief-template.md              the brief format
  references/setup-and-costs.md             where each setting lives, and what runs cost
  references/real-estate-content-flags.md   fair housing and advertising flags
  examples/sample-brief.md                  what a finished brief looks like
```

## What you need

- Claude (claude.ai or the desktop app to set it up; it then runs in chat on web, desktop or mobile) with code execution and network access to `api.apify.com` allowed, or Claude Code.
- An Apify account. The Free plan includes $5 of usage a month. Amplified Impact's own weekly runs (2 creators, 1 hashtag, 2 to 4 transcripts) cost $0.06 to $0.29 each; more creators, hashtags and transcripts cost more. See `references/setup-and-costs.md`.

## Try it first: practice mode

Download the practice files from the skill's page, attach the ZIP in a new chat, and say: **"Run a practice content brief with these files."** You get a full brief, marked PRACTICE, from made-up data. No Apify account, no token, no spend.

## Quick start: Claude app

1. Create an Apify account, set a monthly usage limit (Apify Console > Billing > Limits), and create an API token (Settings > API & Integrations), ideally one just for this with an expiration date.
2. In Claude: Settings > Capabilities > Code execution and file creation. Turn on Allow network egress, type `api.apify.com` under Additional allowed domains and click Add. On a Team or Enterprise plan, ask your Owner to add it.
3. Customize > Skills > + > Create skill > Upload a skill > choose this zip as downloaded (don't unzip it).
4. Before you paste your token into a chat, turn off Settings > Privacy > Help Improve our AI models (Free, Pro, Max and Ultra plans).
5. New chat: **"Run my content opportunities brief."** Claude asks for your niche, creators, hashtags, budget and token the first time.

## Quick start: Claude Code

1. Unzip and copy `content-opportunity-research/` into `~/.claude/skills/`.
2. `pip install pyyaml` and `export APIFY_TOKEN=...`
3. Fill in the FILL IN sections of `config.yaml`.
4. In Claude Code: **"Run my content opportunities brief."**

Full instructions, including running it automatically every week, are in `SETUP.md`.

---
Made by Amplified Impact · amplifiedimpact.io
