# Grading: Eval 1, Buyer Closing in a Made-Up Davis County Town (the Practice Files)

Run on 2026-11-10 (a Tuesday) by following SKILL.md exactly, with `client-care-guide.md`, `reviews-and-vendors.md`, `utah-client-care.md` and the checklist in `outreach-rules.md` read where SKILL.md says to. Inputs: the four files in `evals/files/eval-1-buyer-closing/`, which are the same four files as `practice/` (the TC's closing email, the agent's notes, the vendor list and the review links). Prompt as in `evals.json`; it is the page's practice prompt. No voice profile. Dates worked out in code (`objective_checks.py` recomputes them).

Result: **pass, 11 of 11 expectations**, plus the objective checks (`objective-checks.txt`, 28 of 28). `sample.md` is this output.

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Plan dates from the recording date, signing flagged | Pass | Flags, "Closing date"; the plan table: Tuesday, November 17, 2026; Thursday, December 10, 2026; Monday, February 8, 2027; Tuesday, May 11, 2027; Wednesday, November 10, 2027. Objective check "Every plan date from the closing date appears" |
| 2 | First anniversary handed to sphere-touch-plan by name, with the date | Pass | Last plan row: "Handed to sphere-touch-plan: Taylor and Jamie join your sphere plan as past clients," Wednesday, November 10, 2027 |
| 3 | Card: two to four sentences, notes, the gift, no link or ask | Pass | Three sentences: the kitchen window and "the morning light," Waffles, "the sketch and the pie" |
| 4 | Thank-you: Title Case, 150 words or fewer, next touch dated, no asks, no footer | Pass | "Thank You, And Welcome Home," 83 words, "next Tuesday, November 17"; objective check "no footer, on purpose" |
| 5 | Review request: same ask, both links, no stars or reward; text to Taylor only | Pass | Email with Google and Zillow links, "I ask every client the same favor"; Taylor's text 243 characters, opens with Sam Testerfield and Example Ridge Realty, ends "Reply STOP to opt out."; "No text to Jamie" |
| 6 | Vendors: only the painter and the fence company, relationship stated, closing day, free to choose | Pass | Vendor email, tonight: Sample Summit Painting, Dale Fakerson, 801-555-0142, "Full disclosure: Dale is my brother-in-law"; Example Fence Co., Pat Postwell, 801-555-0167; "you're free to use anyone you like." Landscaper named only as not introduced, with why |
| 7 | Day 30: Davis County Assessor, the date on the form, the 2027 change, tax questions routed, no numbers or eligibility | Pass | Day 30 email; no percentage, amount or deadline date; "Questions about your taxes are best for the assessor's office or a tax professional" |
| 8 | Pregnancy and rate absent, one generic flag | Pass | Never-appear check clean ("expecting," "March," "6.1"); Flags, "Left out on purpose: 2 of your notes" |
| 9 | Price, loan number, trust account digits absent | Pass | Never-appear check clean ("489," "77-0042913," "4417") |
| 10 | Follow Up Boss: five task steps, 7, 23, 60, 92, classic and Automations 2.0, started by hand, Home Anniversary, an admin | Pass | Set It Up in Follow Up Boss, both account types, "start it on one, so the tasks don't double," Home Anniversary November 10, 2026 |
| 11 | Check Before Sending: dates as closing date plus N, fact sources, vendors, links, consent, quiet hours, Do Not Call, footer, county | Pass | Check Before Sending, every item |

Corrected before grading, against SKILL.md (the skill itself unchanged): the first card draft named only the pie; SKILL.md says the gift as the notes name it, so it now names the sketch and the pie. The day 30 email came in at 149 words and was trimmed by a word. Added to the guide after this run: two clients on two Follow Up Boss contacts start the plan on one contact, so the tasks don't double.

Signature: Sam Testerfield, Example Ridge Realty (from the prompt), in the plain warm voice SKILL.md sets with no QUICK CARD.
