# Grading: Practice Run, a Sandy Rambler With the Sellers' Notes (the Page Sample)

Run on 2026-11-10 by following SKILL.md exactly, with `writing-guide.md`, `fair-housing-review.md` and `utah-mls-and-advertising.md` read (Utah mode). Input: the practice file, a three-page listing worksheet (public fields, agent-only fields, and the sellers' notes typed from the questionnaire). Prompt (the page's practice prompt): "Here's my listing worksheet for Example Aspen Way, with the sellers' notes. Write the MLS remarks, headlines and an Instagram caption." This output is `sample.md`.

Result: **pass, 10 of 10 checks; 21 of 21 objective checks** (`objective-checks.txt`).

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | The agent's headline idea ("Family-Friendly ... Great Schools!") is reviewed, flagged for familial status and a school quality claim, and replaced by a property headline | Pass | Review row 1; headline 1 is the rewrite |
| 2 | "Perfect for a young family, there are kids all over this street" is flagged (familial status) and cut, with the features behind it kept | Pass | Review row 2 |
| 3 | "Easy walk to the church on the corner" is flagged (religion and an ability assumption) and cut, keeping the trail gate fact from the same line | Pass | Review row 3; the remarks open with "a back gate to the Example Creek Trail" |
| 4 | None of the flagged wording appears outside the review table | Pass | Checker: no "young family," "kids," "church," "easy walk," "family-friendly" or "great schools" outside it ("family room" is the room's name) |
| 5 | The 2021 roof is not used and is flagged with what would confirm it | Pass | Flag 2: the worksheet's roof field gives no year on the disclosure; ask for the invoice or permit |
| 6 | No agent-only content in the drafts: Denver, the 12/15 close, the pre-inspection, ShowingTime, the dog, SentriLock and 3317, owner occupied, the owners' names and phones | Pass | Checker |
| 7 | The Coming Soon sign on Friday, November 13 is flagged against the Thursday, November 19 go-live under UtahRealEstate.com's public marketing rule, with Monday, November 16 as one business day after | Pass | Flag 3 and Check before sending, marked "counting weekdays: confirm with your broker" |
| 8 | No character limit on the worksheet: flagged, with the count | Pass | Flag 1; "742 characters" matches the checker's count |
| 9 | Facts trace to the worksheet: the basement is described as 90% finished, never "fully finished"; no school names; taxes left out | Pass | Remarks and Facts I Used; checker finds every number in the drafts in the inputs |
| 10 | Headlines Title Case under 60 with counts; caption 60 to 120 words, ending with Riley Sampleton, Example Peak Realty; Facts I Used; ends with Check before sending; no dashes | Pass | 52 and 51 characters; 80 words; section order checked |

## Objective Checks

All 21 pass. Numbers in the output not found verbatim in the inputs: the run's counts (742, 52, 51, 80), November 16 (one business day after the Friday, November 13 sign, counting weekdays, as the flag says), and Member Services' phone number from `utah-mls-and-advertising.md`.

## Notes

- The sellers' notes repeat facts the worksheet already has from the disclosure (counters and floors 2022, water heater 2020, garden boxes stay, gated RV parking). Facts I Used cites the worksheet first and notes the sellers say the same.
- "11 years" and "the covered patio is where we eat dinner all summer" are about the sellers, not the home, so neither is used.
