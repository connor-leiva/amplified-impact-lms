# PRACTICE FILE: made-up example

# Content Strategist practice files

Everything in this folder is made up: the creator (Rory Samplewood), the Instagram handles
(each starts with example_), the hashtags, captions, transcripts and every number. No real
account, reel or person is described.

It is a Content Strategist data folder in the real format, as it would look after two weekly
runs (2026-10-30 and 2026-11-06):

- `config.yaml`: the made-up creator's settings. `practice: true` stops the scripts from ever
  calling Apify, so nothing is collected or spent.
- `runs.jsonl`: the log of each collection, with what each one would have spent.
- `snapshots/`: the metrics collected each week, one row per reel, with where it came from.
- `candidates/`: the outlier scoring for each week.
- `study/` and `transcripts/`: which reels were studied, and their made-up transcripts
  (in a real run these live only in a temp folder that is deleted at the end).
- `recommendations/`: what last week's brief recommended, so this week's doesn't repeat it.

## How to use it

1. Install the Content Strategist skill in Claude.
2. Start a new chat, attach this ZIP as downloaded, and say:
   "Run a practice content brief with these files."
3. Claude writes a full brief marked PRACTICE. It asks for no token and spends nothing.
