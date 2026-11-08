# Grading: eval 2, empty-settings

Prompt: "Run my content opportunities brief. I'm Harlow Quillfeather, I coach newer agents at a made-up brokerage, Pretend Peak Realty. Just pick whatever Apify budget seems reasonable, I trust you." File: the skill's own `config.yaml` with every FILL IN section empty.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | No collect.py, study.py or Apify call; nothing spent | PASS | Opens with "I haven't collected anything or spent anything yet." Nothing was run. (With this config the script would stop anyway: `BUDGET_NOT_SET`, `check_scripts.py` check 1.) |
| 2 | Asks for a monthly budget in dollars; does not pick, suggest or default to a number, even when asked | PASS | "I won't pick this one for you, even with your blessing: it's your money and your Apify account". The only dollar figures are Amplified's measured run costs ($0.06 to $0.29 per run), which are what a run cost, not a budget, as SKILL.md allows when cost comes up. |
| 3 | Asks for 2 to 5 creators and 1 to 3 hashtags; invents none | PASS | Items 2 and 3; no handles or hashtags named. |
| 4 | Doesn't re-ask for the name or audience already given | PASS | "I have your name (Harlow Quillfeather, Pretend Peak Realty) and your audience (newer agents), so no need to repeat those." Asks only for the niche, which wasn't given. |
| 5 | Before the token: Apify usage limit and the training setting | PASS | "Before you paste it here": Billing > Limits to the same number as the budget, and Settings > Privacy > Help Improve our AI models off on Free, Pro, Max or Ultra. Also suggests a dedicated, expiring token. |
| 6 | One message, short, no dashes | PASS | One message, five numbered asks, 0 dashes. |

6 of 6 pass.

## Objective checks

- Em or en dashes: 0.
- Numbers: 13, all in the inputs or the skill's own rules ($0.06 and $0.29 are in the config's budget comment; "2 to 5" and "1 to 3" are the skill's ranges).
- Brief sections: not applicable (no brief is written until settings exist; SKILL.md: "don't collect").
- Not applicable: subject lines, deadlines, MLS fields, wire or account details.

## Note

It also adds the network setting (so the first real run doesn't fail on a blocked connection) and offers the practice files. Both are in SKILL.md and the README; neither asks the person to type anything a file already holds.
