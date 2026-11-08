# Setup and Costs

Last verified: 2026-11-08. Read this when the person asks how to set up, where to find something, or what a run costs. Give them the facts and let them choose; never pick a budget for them.

## Claude settings

- **Network access for code execution (Free, Pro, Max, Ultra):** the person can change this themselves, on claude.ai or the desktop app. Settings > Capabilities > Code execution and file creation (called Create and edit files in the updated layout). Turn on Allow network egress, leave Domain allowlist on Package managers only, type `api.apify.com` in Additional allowed domains and click Add. Anthropic also offers an All domains option and calls it the riskiest one, so add only `api.apify.com`. For the mobile apps the help center describes only the on and off switch, so set this on the web or desktop.
- **Team and Enterprise:** only an organization Owner can change network access, in Organization settings > Capabilities (the option that allows package managers plus specific domains). Members ask their Owner to add `api.apify.com`.
- **Training setting (Free, Pro, Max, Ultra):** Settings > Privacy > Help Improve our AI models. With it on, chats (including a pasted token) can be used for training. Team and Enterprise chats are not used for training by default.
- **Incognito chats** aren't used for training, but in the new Claude experience they can't run code, so this skill can't run in one.
- **Deleting a chat** removes it from history at once and from Anthropic's back-end storage within 30 days.

## Apify

- **Plans:** Free is $0 a month with $5 of included usage; Starter is $19 a month with $19 included. Unused usage doesn't roll over. The usage limit starts out equal to the included usage, so on the Free plan Apify blocks usage once the $5 is used, until the next cycle. Paid plans can run past the included amount up to a usage limit the person sets (at most $100 on Starter). Whether a Free account can set a limit below $5 isn't documented: confirm in the Limits tab.
- **Monthly usage limit (the hard cap):** Apify Console > Billing > Limits tab > Custom usage limit > Edit limit. Set it to the same number as `monthly_budget_usd`. The scripts read this limit before every actor run and warn when it is unset or above the budget.
- **API token:** Apify Console > Settings > API & Integrations. A token can be given an expiration date, and a token can be rotated if it was exposed. A dedicated token for this skill, with an expiration date, is the safest one to paste into a chat. Scoped (limited-permission) tokens exist, but this skill hasn't been tested with one: its budget check reads the account's usage limits.

## What the actors charge (pay per event, Free plan prices)

| Actor | Event | Free plan | Starter |
|---|---|---|---|
| `apify/instagram-reel-scraper` | Actor start | $0.001 per run | $0.001 |
| | Reel returned | $0.0026 | $0.0023 |
| | Transcript add-on | $0.048 per started minute per reel | $0.041 |
| | Shares count add-on (paid plans only) | not available | $0.006 per reel |
| `apify/instagram-hashtag-scraper` | Result returned | $0.0026 | $0.0023 |

Both actors are priced per event (the records list no separate platform usage charge, and Apify says most pay-per-event actors include it in the event price). Each run's charge cap holds: Apify says you are never charged above it. Reading a run's results afterward adds a small standard platform usage charge outside that cap, which Apify's monthly usage limit still covers. The hashtag scraper's free usage covers only the first page of results per hashtag.

## What a run costs

- **Measured:** Amplified Impact's own weekly runs (2 creators, 1 hashtag, 2 to 4 transcripts) cost between $0.06 and $0.29 each from 2026-10-07 to 2026-11-06, as logged in each run's brief. Those logs show $0 for discovery, so a run whose hashtag results are charged at the published price costs more than this range suggests.
- **Estimated from the prices above, not measured:** with 3 creators at 24 reels, 2 hashtags at 20 results and 8 transcripts of reels under a minute, a run comes to about $0.70 on the Free plan: about $0.19 watchlist, $0.10 discovery, $0.41 study. Transcripts are the biggest cost, and a reel over a minute is billed for two or three started minutes.
- **The caps hold either way:** each actor run carries a charge cap (by default 40% of one run's cap for the watchlist, 30% for discovery, 30% for study, where one run's cap is the monthly budget divided by 5), and nothing starts once the cycle's remaining budget is under `reserve_usd`.

## Sources (checked 2026-11-08)

- Claude network egress and allowed domains: https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude
- Skills upload path (Customize > Skills, +, Create skill, Upload a skill): https://support.claude.com/en/articles/12512180-use-skills-in-claude
- Training setting: https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings
- Team and Enterprise training default: https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- Incognito chats: https://support.claude.com/en/articles/12260368-using-incognito-chats
- Chat deletion: https://privacy.claude.com/en/articles/10023548-how-long-do-you-store-my-data
- Apify plans and the Free plan block: https://apify.com/pricing
- Usage limit steps: https://docs.apify.com/account/subscriptions.md and https://docs.apify.com/account/billing.md
- API token, expiration, rotation, scoped tokens: https://docs.apify.com/integrations/api.md
- Limits endpoint the scripts read: https://docs.apify.com/api/v2/users-me-limits-get.md
- Actor prices (public actor records): https://api.apify.com/v2/acts/apify~instagram-reel-scraper and https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper
- Actor inputs (shares count for paying users, transcript per minute, first page free): https://apify.com/apify/instagram-reel-scraper and https://apify.com/apify/instagram-hashtag-scraper
- Pay per event, platform usage and the charge cap: https://docs.apify.com/platform/actors/running/actors-in-store.md
