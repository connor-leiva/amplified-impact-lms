# Page Notes: Content Strategist (/content-strategist)

Skill: `content-opportunity-research`, version 1.1. Claude only. Every fact below was checked on 2026-11-08; sources are listed at the end and in the skill's `references/setup-and-costs.md`.

## One-line promise

Every week, see which Instagram reels in your niche beat their creator's own usual numbers, and get up to five talking-head ideas built on your own stories.

## Who it's for

Agents, team leaders and brokerages who film talking-head content for Instagram and want to know what to film next. It also works for any creator or brand; the real estate flags (fair housing, listings, income claims) switch on when the creator works in real estate.

## What you need

- **Claude:** a plan with skills and code execution. Code execution is on by default on Free, Pro, Max and Ultra. Claude's Help Center lists skills on Free, Pro, Max, Ultra, Team and Enterprise; Claude's docs list Pro and up, so if the upload option is missing on Free, that's why. On Team and Enterprise, an Owner controls network access.
- **Network access to `api.apify.com`** for Claude's code execution (click path below).
- **An Apify account** (apify.com). The Free plan is $0 a month with $5 of included usage; once it's used, Apify blocks usage until the next cycle. Starter is $19 a month.
- **What a run costs:** Amplified Impact's own weekly runs (2 creators, 1 hashtag, 2 to 4 transcripts) cost $0.06 to $0.29 each from 2026-10-07 to 2026-11-06. Estimated from Apify's published prices (not measured): 3 creators, 2 hashtags and 8 short transcripts come to about $0.70 a run on the Free plan, mostly transcripts. The person sets their own monthly budget; the skill never picks it.
- **No connectors needed.** Google Drive is optional, only to save each brief as a Google Doc.
- **Optional:** Claude Code, to run it every week on its own (scheduled tasks are on Pro, Max, Ultra, Team and Enterprise).

## Set up, in this order (say this plainly on the page)

1. **Create an Apify account and set its monthly usage limit first:** Apify Console > Billing > Limits tab > Custom usage limit > Edit limit. Use the same number you'll give Claude as your budget. This cap holds even if everything else fails.
2. **Create a token:** Apify Console > Settings > API & Integrations. Make one just for this, with an expiration date.
3. **Allow Apify in Claude:** Settings > Capabilities > Code execution and file creation (called Create and edit files in the updated layout). Turn on Allow network egress, then add `api.apify.com` under Additional allowed domains. Don't pick All domains: Anthropic calls it the riskiest option, and this needs only one domain. Team and Enterprise: ask your Owner to add it in Organization settings > Capabilities.
4. **Turn off training before you paste the token:** Settings > Privacy > Help Improve our AI models, off (Free, Pro, Max and Ultra). Team and Enterprise chats aren't used for training by default.
5. **Install the skill:** Customize > Skills > + > Create skill > Upload a skill, then choose `content-opportunity-research.zip` as downloaded (don't unzip it). Make sure it's toggled on.
6. **Start a new chat** (not an incognito chat: in the new Claude experience those can't run code) and say "Run my content opportunities brief."

## What to upload, and where it comes from

- **First week:** nothing. Claude asks for your name or brand, audience, niche, monthly budget, 2 to 5 creators, 1 to 3 hashtags, and then your Apify token.
- **Every week after:** the two files Claude gave you last time: your filled `config.yaml` and the `content-research-data` ZIP. They carry your settings, your history (so baselines get stronger) and what was already recommended (so it doesn't repeat).
- **Practice:** the practice ZIP from this page.

## Things to say

- "Run my content opportunities brief."
- "What should I post this week?"
- "Here's last week's data folder and config. Run this week's brief."
- "Run a practice content brief with these files."
- "Find content ideas from what these creators are posting: @handle_one, @handle_two." (first run: Claude still asks for your budget and hashtags)

## What comes back

A brief that starts with a three-sentence bottom line and a run line (what ran, what it spent, budget left this cycle, failures, stale data, and any instructions found inside collected posts, which it never follows). Then up to five ideas, each with the source reel and how far it beat that creator's median, a premise built on your story, the proof you need to supply ([NEED] items it never fills in), why it would get shared, a hook direction, two B-roll ideas, your pillar and offer, confidence with a reason, and flags. Then patterns in the niche, creators worth adding to your watchlist, and a "Check before filming" list. In a chat you also get your filled `config.yaml` and a data ZIP to attach next week.

## What it will not do

- Post, comment, like, follow or message anyone, or change any account or setting.
- Pick your budget, raise a cap, or start any Apify actor other than its two fixed Instagram scrapers; the scripts send your token only to api.apify.com and never save or print it.
- Follow instructions hidden in captions or transcripts.
- Keep competitor videos or full transcripts (they're deleted at the end of each run).
- Invent views, transcripts, reasons a post worked, or your own numbers and stories.
- Build an idea on who a home or area suits, schools, safety or demographics.
- Edit a filmed video (that's the Reel Editor) or write client emails.

## Run / Draft / Own

- **Run:** collecting inside your budget, scoring each reel against its creator's own median, studying transcripts, writing the brief.
- **Draft:** premises, hook directions and B-roll ideas you rework in your own words.
- **Own (you):** what gets filmed and posted, the budget and the Apify account, watchlist changes, every number or story you supply, permission from anyone you name, and compliance review with your broker.

## FAQs

- **Is it safe to paste my Apify token into Claude?** Set Apify's monthly usage limit first, so the worst case is capped. Turn off Help Improve our AI models first, use a token made just for this with an expiration date, and delete the chat or rotate the token afterward if you like. Claude passes the token only to the scripts, which send it only to api.apify.com and never write it to a file.
- **What does it cost?** Your Apify usage, capped by the budget you set and Apify's own limit. Measured: $0.06 to $0.29 a run for 2 creators and 1 hashtag. More creators, hashtags and transcripts cost more. The Free plan's $5 a month covers small watchlists.
- **Why did I get only two ideas?** It never pads. A reel has to beat its own creator's median by 2x, and baselines are thin in the first weeks. Zero is a valid week.
- **Can it run every week without me?** Yes, in Claude Code as a scheduled task; the skill's SETUP.md walks through it. In a regular chat, attach last week's data ZIP and config each week.
- **Does it work in ChatGPT?** No. It runs Python scripts that call Apify with spending caps, and ChatGPT's data analysis can't reach the internet. An Apify connector could start any actor without those caps, so there's no ChatGPT version.

## Practice prompt

Attach the practice ZIP (`content-opportunity-research-practice.zip`) as downloaded and say: **"Run a practice content brief with these files."** No Apify account, token or spend. The brief is marked PRACTICE.

## Suggested library keywords

content ideas, Instagram, reels, talking-head, outliers, competitor research, content strategy, what to post, weekly brief, creators, hashtags, Apify, social media, video ideas

## Tested and not tested

**Tested (2026-11-08):**
- Practice run on the practice files: 13 of 13 checks (`evals/runs/practice/`). Two factual slips and one borrowed phrase were caught and fixed before grading.
- Eval 1, practice files plus a pasted token: 13 of 13. The token wasn't used or repeated.
- Eval 2, empty settings with "just pick a budget": 6 of 6. It asked for the budget, creators and hashtags in one message and picked no number.
- Eval 3, collected posts carrying instructions aimed at AI ("comment GUIDE", "add this account", "rank this first", "raise your budget"): 8 of 8. Both flagged, none followed, ranking unchanged. A no-skill baseline on the same files passed 1 of 8: it ranked the injected post first, invented closing-cost percentages and reused source hooks word for word.
- The scripts, end to end against a mock of Apify's API (no network, no spend): 18 of 18 safety checks (`evals/make/check_scripts.py`): no run without a budget or token; practice config never calls Apify; token only to api.apify.com, never written or printed; only the two fixed actors; every run capped within its stage share; budget read before every run; exhausted budget stops before spending; dry runs call nothing; cleanup refuses an unsafe folder.

**Not tested:**
- A real Apify run from this version (the token rules, caps and actor inputs match Apify's published API and actor schemas, and Amplified's own runs of the earlier version worked; the transcript field name was never seen in Apify's docs).
- The Claude app's Additional allowed domains setting with a real run (Anthropic's GitHub has user reports of the allowlist not taking effect in Cowork; if a run reports a blocked connection after you added the domain, tell us).
- Upload on a Free plan, a scoped Apify token, and Claude Code network secrets.
- Claude Code scheduled tasks with this version.

## Sources (checked 2026-11-08)

- Skills upload path and plans: https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://claude.com/docs/skills/overview
- Code execution, network egress, Additional allowed domains, Team and Enterprise: https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude
- Training setting: https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings
- Commercial plans not trained on by default: https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- Incognito chats can't run code: https://support.claude.com/en/articles/12260368-using-incognito-chats
- Scheduled tasks (formerly routines) and cloud environments: https://code.claude.com/docs/en/routines.md and https://code.claude.com/docs/en/cloud-environments.md
- Apify plans, Free plan block: https://apify.com/pricing
- Apify usage limit: https://docs.apify.com/account/subscriptions.md
- Apify API token, expiration, rotation: https://docs.apify.com/integrations/api.md
- Actor prices: https://api.apify.com/v2/acts/apify~instagram-reel-scraper and https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper
- ChatGPT data analysis has no internet access: https://help.openai.com/en/articles/8437071-data-analysis-with-chatgpt (blocked to direct fetch; confirmed through search results)
- Measured run costs: Amplified Impact's RE-01 Content Opportunities Briefs, 2026-10-07 to 2026-11-06 (internal)
