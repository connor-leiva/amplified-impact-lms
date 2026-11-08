---
name: low-appraisal-response
description: "Reviews an appraisal that came in under the contract price, for the buyer's or listing agent. Reads the appraisal report, the contract and addenda, and an optional MLS CMA export, then returns the gap, factual errors (above-grade versus basement area, finish, bed and bath counts, lot, upgrades), a comp and adjustment review, better closed sales dated by the effective date, whether a reconsideration of value has real grounds, a draft request for the lender in the loan program's format, options for each side, the appraisal deadline and client drafts. Use it whenever an agent says an appraisal came in low or short, mentions an appraisal gap, a Notice of Appraised Value, a VA Notice of Value or a Tidewater call, or wants to challenge or rebut an appraisal, even if they never say 'reconsideration of value.' Utah first; general mode elsewhere. Not for a list price (pricing-conversation-prep), pricing an offer (offer-strategy), a repair request (repair-request-response) or a counteroffer (counter-explainer)."
metadata:
  author: Amplified Impact
  version: "1.0"
compatibility: "Works from uploaded files; no connector needed. Uses code execution (on by default) to read CSV comp exports and do the gap and date math. Gmail is optional, only to save a draft when asked."
---

# Low Appraisal Response

When an appraisal comes in under the contract price, the agent has days to answer three questions: is the report wrong, what can each side do, and by when. This skill reads the whole report against the contract, the MLS data and the CMA, says whether a reconsideration of value has real grounds, and drafts the request and the client emails. It's built for both sides of the same deal.

Why it matters: in Utah the buyer's right to cancel over a low appraisal ends at 5:00 PM Mountain Time on a contract deadline, and the lender's review doesn't stop that clock. Basements are common, and an above-grade versus basement mix-up can move a value by tens of thousands. And when a report is well supported, the most useful thing an agent can hear is "don't spend the days fighting it."

**Runs on its own:** reading every page, checking the subject's facts against the sources, reviewing the comparables, filtering the CMA, the gap math and the day count. **Drafts for the agent to review:** the reconsideration request (or, listing side, the data package for the buyer's lender), the client email and a note to the other agent. **Stays with the agent and the client:** whether to request a reconsideration (the buyer, as borrower, sends it), every price and money decision (reduce, split, cover the gap, cancel), the official deadline calendar (transactions team), anything about the appraiser beyond facts (broker and lender), and any banking details, which this skill never handles.

## 1. Gather the Documents

- **The appraisal report, every page (required for the review).** If only a Notice of Appraised Value or a lender's email came, do the gap, the clock and the options, say the review needs the full report, and tell the agent how to get it: the lender must give the buyer a copy; the listing agent asks the buyer's agent.
- **The signed contract and every addendum:** price, the appraisal condition box, the deadline, loan type, seller credits, an FHA/VA Loan Addendum.
- **When present:** a CMA or MLS export (CSV or PDF), the subject's MLS sheet, a county record, permits or receipts for updates.
- **From the agent's message:** which side they're on, the lender, what the client wants. Use it; don't ask for it. If the side isn't clear from the message, write both sides' options and flag it.

Never ask the agent to type what a document contains. Missing a deadline or a name? Use a placeholder such as [Appraisal Deadline] or [Buyer Names], flag it at the top, and keep going.

**Pick the state** from the property address. In Utah, read `references/utah-appraisal.md`, then `references/utah-repc.md` (footer December 4, 2024) or `references/utah-repc-2026.md` (footer November 1, 2026). Anywhere else, run general mode: skip every `utah-*` file, take the condition and deadline only from the uploaded contract, and say "State rules not checked for [state]."

**Pick the loan program** from the documents (an FHA case number, a VA Notice of Value, the contract's loan boxes). Read `references/rov-programs.md` for that program. If it's unclear, say so and use the conventional format.

## 2. Set the Clock

- Name the contract version (in Utah, from the footer) and quote the appraisal terms: is the condition on, what triggers it, the deadline and the section, what notice and copy a cancellation needs.
- Show today's date, the deadline at 5:00 PM Mountain Time (or the contract's own time), and the calendar days left. Under the November 1, 2026 REPC the Appraisal Deadline doesn't move for a weekend.
- If the deadline is today, tomorrow or the day after, put that first, in bold. If it has passed, don't treat a cancellation as timely: send the agent to the broker and the transactions team now.
- FHA or VA: say what the FHA amendatory clause, the VA escape clause or Utah's FHA/VA Loan Addendum adds to the deadline.
- A reconsideration runs on the lender's clock. If it can't finish before the deadline, say the buyer must cancel, let the condition lapse, or get an extension signed before the deadline.
- Label it: "For strategy; confirm dates with your transactions team."

## 3. Do the Gap Math

Contract price minus appraised value, and the gap as a share of the price, with the arithmetic shown. Check the price the report lists against the contract. Note existing seller credits: lenders base the loan, and the room for seller credits, on the lower of price and appraised value, so the lender confirms what still fits.

## 4. Review the Report

Read `references/appraisal-review-guide.md`. Then:
- **Fact check the subject:** above-grade area, basement area and finish, bedrooms and baths above and below grade, lot, garage, year built, updates, contract data. For each difference: the report page, what it says, what the source says, the source. Check the report against itself: the sketch and photo labels often contradict the grid.
- **Show the effect with the report's own rates** when it states them, as labeled arithmetic, never a value opinion.
- **Review the comparables:** distance, sale date against the effective date, measurement consistency (a comp's grid area that equals its MLS above-grade plus basement total), consistent rates, the report's search comment. Describe; don't judge.
- **Pick better sales from the CMA:** closed on or before the effective date, arm's length, similar, not already used, up to five. List later sales, distressed sales, pendings and actives separately, with the reason each is out.
- **Fair housing check:** if the report comments on people or protected characteristics, quote it with the page for the lender and the broker.

## 5. Call the Grounds

Strong, Some or Weak, using the guide's rubric, with the two or three facts that decide it. When the report is well supported, say so plainly and say a reconsideration is unlikely to change the value. Never promise an outcome.

## 6. Lay Out the Options

**Buyer's side:** request a reconsideration (when there are grounds); renegotiate (price to value, meet in the middle, a seller credit, subject to the lender); cover the gap (the cash rises by at least the gap; VA buyers pay any amount over reasonable value from their own cash); cancel under the appraisal condition by the deadline with the required notice and copy. **Seller's side:** support a reconsideration with a data package for the buyer's lender; reduce to value; meet in the middle; hold the price (the buyer may cancel and get the earnest money back if the condition or an FHA/VA clause applies). Each option gets its tradeoff and its deadline. Price changes go on an approved addendum, and the lender gets a copy.

## 7. Write the Drafts

Read `references/writing-the-drafts.md`.
- **Buyer's side, Strong or Some grounds:** the reconsideration request from the buyer to the lender, in the program's format.
- **Listing side, Strong or Some grounds:** the data package for the buyer's agent to pass to the buyer and lender.
- **Weak grounds:** don't pad a request to satisfy an ask. Say what a request would need (a fact the report got wrong, or a closer or more similar sale that closed by the effective date) and that the files have none, then give the program's process and fields with [placeholders] in case the agent finds one.
- **The client email** and **a note to the other agent.**

## 8. Guardrails

- **Appraiser independence.** Facts and comparables go to the lender through its reconsideration process. Never draft anything to the appraiser, suggest calling them, or name a value they should reach. A VA Tidewater call is answered to the lender with sales data only.
- **No promises, no blame.** No promise the value will change, no criticism of the appraiser, no "bad comps." When the report is well supported, say so.
- Every fact, number, date and name comes from the documents or the agent's message. No outside sales, no invented adjustments or rates. Unclear or illegible: say so.
- Stay in lane: not the appraiser, lender, attorney or broker. Loan amounts, credits and cash to close go to the lender; contract questions to the broker.
- Fair housing: describe the property and the sales, never the people. No comments on who lives nearby, schools or safety.
- Privacy: no loan, account or Social Security numbers, no income or assets. Agent-only MLS fields (private remarks, showing instructions, lockbox or access codes, seller motivation) never appear in drafts.
- Client writing: Title Case subjects, short paragraphs, no em dashes, none of "stunning," "dream home" or "don't hesitate to reach out." Follow the user's voice profile when one is in the conversation (a Project's instructions such as the "My Voice" project from amplifiedimpact.io/voice-profile, their preferences, or a voice skill); otherwise warm, plain and direct.
- Drafts only. With Gmail connected and the agent's ask, save a draft. Never send.

## 9. Output, In This Order

1. **Flags**, only if any: deadline warning, placeholders, general mode, missing report pages, side unclear
2. **Bottom line for the agent** (three sentences max): the gap, its likely cause, whether a reconsideration has real grounds, and the deadline
3. **The clock**
4. **The gap**
5. **Fact check**, with the report's-own-rates arithmetic when it applies
6. **Comparable review**
7. **Better sales from the CMA**, then the sales left out and why
8. **Grounds:** Strong, Some or Weak, and why
9. **Options** for the agent's side (both sides when unclear)
10. **Reconsideration request** (buyer's side) or **data package** (listing side), or, with weak grounds, what a request would need
11. **Client email**
12. **Note to the other agent**
13. **Check before sending:** every date, time, dollar amount, square footage, page reference, MLS number and quoted phrase in items 10 to 12, each with its source, plus any open placeholder
