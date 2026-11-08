---
name: repair-request-response
description: Drafts a listing agent's answer to a buyer's repair request or due diligence objection. Reads the buyer's objection or repair addendum against the inspection report, seller disclosure, contractor bids and REPC, then returns an item table (report page, category, disclosed or visible, reasonableness, and repair, credit, price cut or decline), a response for the seller's priority (net, certainty or timing) with costs from bids only, the deadline to resolve it in writing, a seller email, addendum terms and a disclosure note. Use it whenever a listing agent uploads or mentions a buyer's objection, repair request or addendum, or inspection response, including a credit or price cut asked for instead of repairs, or asks what the seller should fix, credit or push back on, even if they never say "repair request." Utah first; general mode elsewhere. Not for the buyer's side (due-diligence-review), a counter or addendum that isn't a buyer's repair request, including the seller's answer once it comes back (counter-explainer), or a low appraisal (low-appraisal-response).
compatibility: Works from uploaded PDFs or photos of the buyer's request, inspection report, bids, seller disclosure and purchase contract; no connector needed. Claude skills run with code execution on, which is on by default for individual plans. Gmail is optional, only to save the seller email as a draft when the agent asks.
metadata:
  author: Amplified Impact
  version: "1.0"
---

# Repair Request Response

When the buyer's objection lands, the listing agent has days, sometimes hours, to tell the seller what's fair, what it costs and what to send back. This skill reads the request against the inspection report, the disclosures and the bids, sorts every item, and drafts the seller's answer.

Why it matters: under both current Utah REPC forms there is no seven-day Response Period. A written resolution has to be signed by 5:00 PM Mountain Time on the Due Diligence Deadline, or the buyer must cancel or lose the condition. And once the seller has the report, the seller knows what's in it.

**Runs on its own:** reading every document, matching each request to the report, sorting, the bid math and the day count. **Drafts for the agent to review:** the response terms, the seller email, a note to the buyer's agent and the disclosure note. **Stays with the agent and the seller:** what the seller offers and every dollar amount, legal questions (broker or attorney), the official deadline calendar (transactions team) and any payment or banking details, which this skill never handles.

## 1. Gather the Documents

- **The buyer's request (required):** an addendum, the brokerage's resolution form, a letter or an email. If it's missing, ask for it and stop.
- **The inspection report, in full (strongly wanted).** If only excerpts or nothing came with the request, work from the request, label each finding "per the buyer's request; report not reviewed," and ask the buyer's agent for the full report. Never suggest declining the report so the seller won't "know."
- **When present:** contractor bids, the seller's property condition disclosure, the signed REPC and every addendum, specialty reports (radon, sewer scope), the MLS sheet, a seller net sheet from title.
- **From the agent's message:** the seller's priority (net, certainty or timing), any date they mention, market context such as a backup offer. Use it. Don't ask for it.

Never ask the agent to type what a document contains. If a deadline, bid or page is missing, use a placeholder such as [Due Diligence Deadline] or [needs bid], flag it at the top, and keep going.

Read in this order: the request; the report section behind each item; the report's summary; the rest of the report for findings the request leaves out; the disclosure in full; each bid in full.

If the property is outside Utah, run in general mode: take every deadline and term from the uploaded contract, skip the `utah-*` files, and say state rules weren't checked.

## 2. Set the Clock

Read `references/utah-repair-response.md` first. It tells you which REPC version you have and where its sections are. For the December 4, 2024 form, `references/utah-repc.md` explains the terms; for the November 1, 2026 form, `references/utah-repc-2026.md` does.

- Name the version from the contract's footer. Show today's date, the Due Diligence Deadline and the days left, the acceptance deadline written on the buyer's request, and the Settlement Deadline.
- Under either current Utah form, the buyer's cancellation window and the deadline for a signed written resolution are the same: 5:00 PM Mountain Time on the Due Diligence Deadline. Say so plainly, because many agents still expect seven days plus three. If the uploaded contract or an attached Lead-Based Paint Addendum has a Response Period, compute it from that language and say which objections it covers.
- If the Due Diligence Deadline is today, tomorrow or the day after (about 48 hours or less), put that first, in bold, with the time the buyer's request lapses. If it has passed, don't treat the request as timely: tell the agent to call their broker and transactions team before responding.
- Label the section: "For strategy; confirm dates with your transactions team."

## 3. Match Each Request to the Report

Read `references/response-guide.md`. For every requested item, find the finding it rests on and record the page, the inspector's words and the inspector's recommendation. Flag:
- a wrong page reference (give the right one)
- an ask that goes past the recommendation (replace when the inspector said repair or service, fix when the inspector said evaluate)
- no matching finding, or a system the inspector didn't test
- age only, with no defect reported
- a vague ask ("fix all electrical")
- terms in the request that aren't repairs (a new price, a moved deadline): list them separately and say they need their own review

Then list findings the buyer didn't request. They stay out of the response but go in the disclosure note.

## 4. Build the Item Table

For each item:
- **Category:** Safety, Major System, Maintenance or Cosmetic. Keep the inspector's own rating; if you place an item differently, say why.
- **Disclosed:** the disclosure page, the seller's words and the signed date, compared with the Offer Reference Date and Acceptance. Split partly disclosed items into the disclosed part and the new part.
- **Visible at showings:** only from the documents or the agent; otherwise "agent to confirm."
- **Read:** Reasonable, Negotiable or Push back, with a one-line reason.
- **Options with tradeoffs:** repair by a licensed contractor with paid invoices, credit, price reduction or decline; evaluate first for "further evaluation" items; a home warranty for age-only items.
- **Bid:** the amount and bidder, or "needs bid."

## 5. Price It From Bids Only

- Read each bid against its item: scope, amount, options, exclusions, license number shown, valid-until date, earliest start or lead time against the Settlement Deadline, permits.
- Net impact is the sum of bid amounts for the items the seller would fund, with the arithmetic shown. Items without a bid say "needs bid," stay out of the total, and are counted.
- Never estimate a cost, a range or a "typical" price, and never size an unbid item in words ("expensive," "far more," "a quick fix"); say it has no bid. No commission, title or proration math unless a net sheet is uploaded.
- If the contract already has a seller contribution, show what a new credit makes the total. The buyer's lender confirms the cap; don't state one.

## 6. Recommend a Response by the Seller's Priority

Build three packages: **Net**, **Certainty** and **Timing**. Each lists the items agreed to, the remedy, the bid total and the main risk. Lead with the seller's stated priority. If none was given, show all three briefly and add "Ask the seller which matters most."

The buyer may cancel for any reason by the Due Diligence Deadline, so a decline costs nothing in bids but carries risk. Never call a decline safe or a counter sure to be accepted. Use market context only if the agent mentioned it.

## 7. Write the Drafts

Read `references/response-writing.md` before drafting.
- **Response terms** for the agent to put on the approved addendum: standard terms only (repair, credit, price, decline, evaluation, a deadline extension). Anything else goes to the broker.
- **Seller email:** Title Case subject, under 300 words.
- **Note to the buyer's agent:** short and factual. Never include the seller's priorities, timing pressure, finances or bottom line.
- **Disclosure note:** what the seller now knows, and that the next buyer's disclosures must reflect it if this sale doesn't close.

## 8. Guardrails

- Every fact, number, date, page and name comes from the documents or the agent's message. If something is unclear or illegible, say so.
- No cost estimates without bids. Never suggest concealing anything, leaving a known defect off a disclosure, or delaying the report to avoid knowing.
- Stay in lane: not the inspector, a contractor, an attorney or the lender. Don't diagnose past the report. Health questions go to certified professionals, legal questions to the broker or a real estate attorney, loan questions to the lender.
- Fair housing: describe the property and the documents, never the buyers or anyone who might live there. Don't characterize the buyers as picky or unreasonable.
- Privacy: leave out loan and account numbers and personal financial details. Never repeat payment, bank, routing or wire details from a bid.
- Drafts only. If a Gmail connector is available and the agent asks, create a draft. Never send.
- The transactions team owns the official calendar. Not legal advice. No guarantee the buyer will accept.

## 9. Output, In This Order

1. **Flags**, only if any: placeholders used, and the 48-hour warning
2. **Bottom line for the agent** (three sentences max): what to agree to, what to push back on, the net impact from bids, and the deadline
3. **The clock**
4. **Item table**, then options and tradeoffs for each Negotiable or Push back item
5. **Questions for the buyer's agent**, from the report match
6. **Bids and net impact**
7. **Strategy by seller priority**
8. **Disclosure note**
9. **Response terms for the addendum**
10. **Seller email**
11. **Note to the buyer's agent**
12. **Check before sending:** every date, time, dollar amount, page reference, quoted finding and quoted disclosure in items 9 to 11, with its source, plus any open placeholder
