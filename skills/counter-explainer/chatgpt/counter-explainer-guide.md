# Counter Explainer Guide

Two parts: Reading the Chain (how to read a contract and its counters and addenda as one deal) and Drafting Guide (how to write the client message, the requested changes and the Check before sending list).

## Reading the Chain

How to read a purchase contract and its counters and addenda as one deal, and how to catch what a quick read misses. This file is about reading documents, not state law. For Utah form rules, see `utah-counters-and-new-repc.md` (first part), `utah-repc.md` and `utah-counters-and-new-repc.md` (second part). Outside Utah, every rule comes from the uploaded documents.

### 1. List the Documents in Order

One line per document, oldest first:

| # | Document | Box checked | From | Signed (date, time) | Acceptance deadline written in it | Status |
|---|---|---|---|---|---|---|
| 1 | REPC, Offer Reference Date [date] | Offer | Buyer | [date, time] | [time, date] (Section 25 or 30) | Countered by Addendum No. 1 |
| 2 | Addendum No. 1 | COUNTEROFFER | Seller | ... | ... | Accepted [date, time] |

**Reading status from the boxes:**
- The response block at the end of the REPC or an addendum has three boxes. ACCEPTANCE with a signature, date and time: accepted. COUNTEROFFER with a signature: replaced by the addendum it names. REJECTION with a signature: rejected, and nothing after it revives it.
- Nothing checked or signed: pending. Compare its acceptance deadline with today. Past the deadline: it lapsed by its own terms, unless a later signed document says otherwise (flag that for the broker).
- A signature shows a document was signed, not that it was delivered. Most forms make acceptance depend on delivery too (for Utah's two REPC versions, see the Acceptance sections of `utah-repc.md` and `utah-counters-and-new-repc.md` (second part)). When status depends on delivery, write "signed [date, time]; confirm it was delivered."
- Many addendum forms have a box for ADDENDUM or COUNTEROFFER at the top, which tells you whether it was a counter (before a contract exists) or a change to an accepted contract. If neither is checked, flag it.

**Dates that don't fit the form.** A document signed before the effective date in its own footer, or an addendum dated before the contract it changes, goes on the flag list for the broker.

**Before or after acceptance.** Note whether a contract already exists. Before acceptance, every document is part of a negotiation, and if the last one lapses there is no contract. After acceptance, a new addendum proposes a change to a binding contract; if it lapses, the contract stands as it was and its deadlines keep running.

### 2. Carry Terms Forward Correctly

- Start from the REPC. Apply each accepted document in order, or, for a pending counter, apply the chain that the pending counter builds on.
- Read the counter form's own control language to see what it builds on. Utah's addendum form builds on the REPC and every prior addendum and counteroffer (quoted in `utah-counters-and-new-repc.md` (first part), Counteroffer Mechanics). Under that language, when a buyer counters a seller's Addendum No. 1 with Addendum No. 2, the deal on the table is the REPC plus Addendum No. 1, as changed by Addendum No. 2. Name every term that carries forward from an earlier counter, because clients often assume only the newest page counts.
- A document that was rejected, or that lapsed with nothing built on it, adds nothing.
- Outside Utah, the documents' own control language decides what builds on what. If there isn't any, flag that the order of control is unclear.

### 3. Compare Every Term

Check each of these against every document, not only the ones the new document names:

- **Price and how it's paid:** Purchase Price; earnest money and how and when it's delivered; any additional earnest money; loan amount and loan type; seller financing; other sources; cash at Settlement. Do the lines still add up to the price?
- **Seller money:** contribution to closing costs, prepaid items or a rate buydown; repair credits; home warranty and its cap; any payment to the buyer's brokerage. Fixed amount, percentage, or "up to"?
- **Conditions:** due diligence, appraisal, financing, sale of the buyer's property, any other condition. Which boxes are checked? How much earnest money goes to the seller if the buyer cancels under financing?
- **Deadlines:** seller disclosures, due diligence, appraisal, financing (one combined deadline or two separate ones, depending on the form), Settlement or closing, possession, the acceptance deadline.
- **Property:** included and excluded items, personal property by bill of sale, water rights or shares.
- **Costs set by checkbox:** special assessments, HOA change of ownership or transfer fees, escrow fees, title insurance.
- **Everything else:** repairs, walk-through terms, rent-back or holdover terms, other addenda referred to.

### 4. Where Hidden Changes Hide

A change is "not stated up front" when the document's title, first line, opening summary or the other agent's cover note leaves it out. Look for:
- **Section numbers alone.** "The date in Section 24(d) is changed to..." Look up what that section holds in the uploaded form itself. Utah's two REPC versions number their deadlines differently (see the section maps in `utah-repc.md` and `utah-counters-and-new-repc.md` (second part)), so never carry one form's numbering onto another.
- **Other words for the same deadline.** "Closing" or "closing date" for Settlement; "inspection period," "objection deadline" or "contingency period" for due diligence; "loan approval" or "loan commitment" for financing; "move-in" or "keys" for possession.
- **Relative dates.** "Within 5 days of the inspection," "3 days after Acceptance." Convert to a calendar date only when the trigger date is in the documents, and show the count. If the trigger is unknown, say the date can't be fixed yet.
- **A change next to a routine line,** such as "All other terms remain the same" right after an item that changes something.
- **Late pages and margins:** the last item, a second page, handwritten or initialed additions, a strike-through. A strike or write-in on the contract itself goes to the broker (for Utah's rule, see `utah-counters-and-new-repc.md` (first part)).
- **"Remains" or "unchanged" statements** that contradict an earlier accepted change. That is a conflict, not a confirmation.
- **Checkbox flips:** IS to IS NOT, WILL to WILL NOT, Seller to Buyer.
- **Money that shifts shape:** a percentage that becomes a dollar amount, "up to," "as allowed by lender," or a credit described as "in lieu of" versus "in addition to."

### 5. Date Checks

- Count days and read the time of day the way the uploaded form says (for Utah's REPC, see Timing Rules in `utah-repc.md` and Section 25 in `utah-counters-and-new-repc.md` (second part)). Other contracts set their own rule: read it, and don't assume Utah's 5:00 PM.
- Check each weekday a document states against the calendar. A wrong weekday makes the date ambiguous: flag it.
- Check the order: seller disclosures, then due diligence, then appraisal and financing, then Settlement. Flag any deadline that now falls before or on the same day as one that should come first, such as Settlement on the financing deadline.
- Weekends and holidays: use the uploaded form's rule. Utah's two REPC versions differ (see `utah-repc.md` and `utah-counters-and-new-repc.md` (second part)). If the contract has no rule, say so, and say title and the lender may not work that day.
- Flag deadlines already past, and any within 48 hours of now. Put those first.
- Show how a moved deadline changes risk: when due diligence ends, the buyer's main cancellation right ends with it; after the financing or appraisal deadline, more of the earnest money is at risk. Use the uploaded form's rules.

### 6. Math Checks

Show the arithmetic so the agent can check it.
- Price after seller contributions = Purchase Price minus seller money toward the buyer's costs and credits. If an amount is "up to," say the result is the lowest the price could net to that seller.
- Contribution as a share of price = contribution divided by Purchase Price, to two decimals.
- Change from the last version, and from the original offer. Comparing the newest net figure to the buyer's first offer often tells the client more than comparing list prices.
- Earnest money at risk, by condition, using the form's own release rules and amounts.
- Never estimate closing costs, title fees, commissions, payoffs, taxes or a monthly payment. Those need a net sheet or a lender's estimate.

### 7. Conflicts and Ambiguity

Write each one like this:

> **Conflict: [term].** Addendum No. 2 (page 1, item 2) says "[quote]." Addendum No. 3 (page 1, item 1) says "[quote]." If No. 2's reading holds: [result]. If No. 3's reading holds: [result]. Who settles it: your broker; tell title and the lender once it's settled. The usual fix is a new addendum, signed by both sides, that states the term once.

- Don't pick a winner, even when the forms' "later terms control" language seems to answer it. You may say what that language says and that the broker decides how it applies.
- Common conflicts: two accepted addenda setting one deadline differently; a credit "in addition to" one amount and a later cap that includes it; a document that says a term "remains" after an earlier one changed it; two documents with the same number; a counter that builds on a document that was rejected.

### 8. Questions for the Other Agent

One line each, factual, no blame. Examples:
- "Item 4 of Addendum No. 2 changes the date in Section 24(d). Can you confirm that's meant to move Settlement from December 11 to December 4?"
- "Page 2 of Addendum No. 1 wasn't in what I received. Can you resend it?"
- "Addendum No. 3 says Settlement 'remains' December 18, but Addendum No. 2 moved it to December 22. Which date did your seller intend?"

## Drafting Guide

How to write the client message, the requested changes and the Check before sending list. Everything here is a draft the agent reads and edits first.

### The Client Message

Write as the agent, in first person, to the agent's own client. Follow the agent's voice profile when one is in the conversation (a Project's instructions, saved preferences, or a voice skill). Without one: warm, plain and direct.

**Shape:**
- **Subject:** Title Case, naming the document and the property. Examples: "Counteroffer No. 2 On 2207 Example Drive: What Changed," "Addendum No. 2 On 1428 Sample Lane: One Date Moves."
- **Bottom line, bolded, first:** the decision the client needs to make and the exact deadline. "**The buyer countered at $620,000 with $9,000 toward their closing costs, and moved closing to January 8. We need your answer by 8:00 PM Monday, November 9.**"
- **What Changed:** each change in one or two sentences, before and after. A change that wasn't stated up front goes first, said plainly: "One item isn't in the summary we were sent: it moves the inspection deadline from November 20 to November 13."
- **What It Means For You:** money, time and risk, from this client's side, using only numbers from the documents.
- **Your Options:** accept, counter (name the terms), or let it lapse, each with what happens next.
- **[Your recommendation]:** leave this line for the agent, or leave it out.
- **Next Step:** what the client does and by when.
- Under 300 words. Short paragraphs. Sign with the agent's name or [Agent Name].

**Don't:**
- Don't tell the client which option to choose. That's the agent's call to add.
- Don't guess why the other side asked for something, or comment on the other party's finances, plans or personal life.
- Don't include wire instructions, account numbers, loan numbers or other personal financial details.
- Don't promise the other side will accept, the appraisal will come in, or the loan will close on time.
- No em dashes. Never "stunning," "dream home," "don't hesitate to reach out," "rest assured" or "exciting news."

If the agent asks for a text instead, write two or three short sentences with the decision, the one change that matters most and the deadline, and say the full summary is in their email.

### Requested Changes for the Form

This is a list the agent works from when filling out the state-approved addendum or the brokerage's approved form (for Utah's forms, see `utah-counters-and-new-repc.md` (first part)). It is not contract language.

**Format:** one line per change: the term, its section in the uploaded form, the current value, and the requested value.

> 1. Purchase Price (Section 2.1): from $620,000 to [amount the sellers choose].
> 2. Seller contribution toward Buyer's closing costs (Addendum No. 2, item 3): from up to $9,000 to [amount].
> 3. Settlement Deadline (Section 24(d)): keep January 8, 2027, or change to [date].
> 4. Acceptance deadline for this counter: [time] Mountain Time on [date].
> 5. Terms from Addendum No. 1 that stay as they are: Due Diligence Deadline November 20, 2026; possession 24 hours after Recording.

Rules:
- Use [amount], [date] or [time] wherever the client hasn't decided. Never fill in a number for the client.
- Name terms that stay the same when a client might assume they changed.
- Only standard terms belong here: a price, an amount, a date, a checkbox, an included or excluded item, who pays a fee the form already lists, a seller contribution amount, the acceptance deadline.
- Remind the agent: changes go on an approved addendum form, never by striking or writing on the contract itself.

### Take to Your Broker

List anything that needs new wording rather than a new value, in one plain sentence each, with no clause text. Examples of what goes here:
- A rent-back, or the seller or buyer occupying the home outside the possession options the form already offers.
- An escalation, appraisal gap, or "buyer will cover the difference" term.
- A new condition, or a change to how a condition works (sale of the buyer's home, a contingency tied to another sale).
- Changes to who keeps earnest money, default remedies, or any "if this, then that" wording.
- Seller financing, an assumption, a lease option, an assignment.
- Two documents that conflict, an unsigned or misnumbered document, or a question about whether something is binding.
- Counters to more than one buyer at a time, or withdrawing a counter before its deadline.

Write it like: "The sellers would like to stay in the home for [number] days after closing. Ask your broker which agreement or form covers that."

### Check Before Sending

The last section of every output. List every date, time, dollar amount, percentage, section number and quoted term that appears in the client message and the requested changes, each with where to check it:

> - $620,000, Purchase Price: Addendum No. 2, page 1, item 1
> - January 8, 2027, Settlement Deadline: Addendum No. 2, page 1, item 2
> - 8:00 PM Mountain Time, November 9, 2026, response deadline: Addendum No. 2, page 1, acceptance line
> - $611,000, price after the $9,000 contribution: computed ($620,000 minus $9,000)

Add one line for anything you couldn't check (a missing page, an illegible number) and the placeholders the agent must fill.
