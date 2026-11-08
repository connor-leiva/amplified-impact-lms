# Brief template

Use this structure every week. Decisions come first so the creator can pick in under ten minutes.

```markdown
# Content Opportunities Brief: week of [YYYY-MM-DD]

[Practice mode only, as the first line: **PRACTICE: made-up data. Nothing was collected and nothing was spent.**]

**Bottom line:** [Three sentences at most: how many opportunities and why that many, the top pick, and the one thing the creator must supply or decide first. Name any failure or stale data here too.]

Run: [stages that ran, reels collected], spend this run $[x], budget left this cycle $[y] of $[z]. Failures: [list, or none]. Stale data: [list with dates, or none]. Flags from collected content: [list, or none].

## Pick this week
1. [Working title] (top pick) · confidence [high | medium | low]
2. [Working title] · confidence [ ]
(Five when the evidence supports five. If fewer: "Only [n] this week because [reason].")

## Opportunities

### 1. [Working title]
- **Evidence:** [creator] [permalink], [metric] [value] = [multiple]x their median ([baseline label], [n] posts), collected [date]. [Add more sources the same way.]
- **What the source did:** hook as said: "[first sentence only, from the transcript]" or "hook not captured". Argument: [claim, proof, turn]. Why it may have worked (hypothesis): [observable reason].
- **Talking-head premise:** [one or two sentences]. Passes the competitor test because [the creator's story, stance, or result].
- **Proof needed from your business:** [NEED: specific number, story, or example] (one per line)
- **Why it travels:** [who sends it to whom, and why]
- **Hook direction:** [direction, not final words]
- **B-roll ideas:** 1) [ ] 2) [ ]
- **Pillar and offer:** [ ] or "not set in config"
- **Confidence:** [high | medium | low], because [reason, including baseline strength]
- **Flags:** [permission | claim needs source | review before posting | fair housing | none]

## What's working in the niche
[Three to five pattern notes from discovery and the watchlist, each with its evidence strength.]

## Creators worth watching
[Discovered creators who keep turning up, with how often and where. Or "None this week."]

## Check before filming
- Every [NEED: ...] above, in one list, for the creator to fill from their own business.
- Every flag, with who reviews it (broker, compliance contact, lender, the person in the story).
- Every source line quoted above: evidence only, never words to reuse on camera.
- Watch each source reel at its permalink before filming; the brief never saw the video itself.
```

In practice mode, "budget left this cycle" reads "not used in practice" and spend this run is $0.00.

# Recommendations log

After the brief, write `recommendations/[YYYY-MM-DD].json` in the data folder. `outliers.py` reads `source_urls` to skip posts already used, and you read recent files to avoid repeating premises. Skip this file in practice mode.

```json
{
  "date": "YYYY-MM-DD",
  "opportunities": [
    {
      "rank": 1,
      "title": "Working title",
      "premise": "One-sentence talking-head premise",
      "source_urls": ["https://www.instagram.com/reel/..."],
      "confidence": "medium"
    }
  ]
}
```
