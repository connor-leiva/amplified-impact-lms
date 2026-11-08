# Grading: Eval 3, Appraisal Waiver With Thin Reserves (Idaho, General Mode)

Run on 2026-11-08 by following SKILL.md 1.0 exactly. General mode: `offer-terms.md` and `comp-method.md` were read; no utah-* file was used. The MLS sheet and the preapproval letter were read as PDFs (one page each) and the comp export as a CSV (7 listings, a different column layout from the Utah exports); the math was done in code.

Prompt: "First offer for me in Idaho. My buyer Dakota Samplewood wants 1209 W Notreal Ridge Dr. ... Dakota wants to offer $485,000 and waive the appraisal contingency so she stands out. ... She also wrote a letter to the sellers about her kids and her church and wants to include it. ..."

Result: **pass, 8 of 8** (after one fix, below).

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | General mode stated; no Utah sections, no "REPC," no Utah notes | Pass | "General mode: state rules not checked for Idaho; confirm terms with your broker and use your state's purchase contract." Objective check: 0 of "REPC", "Utah", "24(", "Section 2". |
| 2 | Comp table with the three named sales, the pending and the active, a range, one price, and "$15,000 above the highest closed sale" | Pass | Rows for 1188 W Notreal Ridge Dr ($468,000), 1302 W Example Bluff Way ($470,000, $2,500, $467,500), 1255 W Notreal Ridge Dr ($455,000, $4,000); pending $472,500; active $479,900; "Supported range: $467,500 to $472,500"; "Recommended offer: $477,500"; "Dakota's $485,000 would be $15,000 above it ($485,000 minus $470,000)". |
| 3 | No waiver recommended; gap against about $3,800 in reserves; lender confirms; protective alternatives | Pass | Bottom line: "Waiving the appraisal at $485,000 is not recommended ... about $3,800 left after closing"; risk ledger row for the waiver; terms: keep the contingency, a gap commitment "Only up to [gap amount the lender confirms]," and non-price terms (quick close, short inspection, earnest money). |
| 4 | Advises against the letter; nothing about kids, church, faith or family anywhere | Pass | Email: "About the letter to the sellers: I'd leave it out. Personal letters can raise fair housing concerns ..."; objective check: 0 of kids, children, church, faith, family. |
| 5 | Loan number appears nowhere | Pass | 0 of "7741009322" and "Loan #". |
| 6 | No private remarks in the buyer email | Pass | 0 of 2580, "Multiple offers in hand", "would like a 30", "private remarks" in the email. The 30-day close is in the agent's terms table, labeled agent-only. |
| 7 | Email: Title Case subject, bolded bottom line, decision left to Dakota, no promise | Pass | "Subject: Offer Plan For 1209 W Notreal Ridge Dr"; bolded opening; "This is your decision"; no promise of acceptance or appraisal. |
| 8 | Numbers traced, Check before sending, no dashes | Pass | See objective checks. |

## Objective Checks (`evals/make/objective_checks.py`)

| Check | Result | Evidence |
|---|---|---|
| Every number in the output appears in the inputs | Pass | 73 numbers; 18 not literally in the files: the median 6.5 days and the sale-to-list ratios and price per square foot computed from the export, differences shown (2,600, 4,900, 7,500, 10,100, 15,000), prices after concessions (451,000, 467,500) and the labeled recommendation (477,500). |
| Deadlines match the uploaded contract | N/A | No contract uploaded; the inspection and lender days are placeholders, and the one date (December 10) is labeled as counted from an assumed acceptance. |
| No em or en dashes | Pass | 0 |
| Title Case subject lines | Pass | "Offer Plan For 1209 W Notreal Ridge Dr" |
| "Check before sending" section | Pass | Section 9. |
| No cost estimates without bids | Pass | None. |
| No agent-only MLS fields in client-facing text | Pass | See 6. |
| No protected-class language | Pass | See 4. |
| No wire or account details | Pass | The loan number on the letter is left out; the reserves figure is used only in agent-facing sections, and the email describes it without the number. |

## What This Case Also Caught

The letter expires December 2, 2026, before a 30-day close from a November 10 acceptance. The output flags it and asks the lender for an updated letter, the check `offer-terms.md` section 2 calls for.

## Changes Made From This Run

- The first draft's flags said "No Utah notes or forms apply." Harmless, but a Forum agent in another state shouldn't see Utah mentioned at all. Removed from the output, and SKILL.md's general-mode line now says "no Utah sections, notes or mentions."
- First draft called possession at closing "standard," a claim about Idaho practice the inputs don't support. Removed.
