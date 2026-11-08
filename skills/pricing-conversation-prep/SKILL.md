---
name: pricing-conversation-prep
description: "Turns a listing-side CMA (an MLS comp export or CMA report, PDF or CSV) into prep for a pricing conversation with a seller: a supported range and recommended list price built only from the comps, the market read from that comp set, a talk track, likely objections with answers, and a one-page seller pricing summary. Handles new listings and price reductions on active listings, with a showing feedback report when uploaded. Works in Utah and, in general mode, any other state. Use this whenever a listing agent uploads a CMA, comps or an MLS export, or mentions a listing appointment, what to list at, pricing a home, a price drop or price reduction, days on market, an overpriced listing, a Zillow number, or a seller who wants a higher price, even if they never say 'pricing conversation.' Not for pricing a buyer's offer (use offer-strategy), a low appraisal (use low-appraisal-response), several offers on a listing (use offer-comparison), or the follow-up after the appointment (use appointment-follow-up)."
metadata:
  author: Amplified Impact
  version: "1.1"
compatibility: "Works from uploaded files; no connector needed. Uses code execution (on by default) to do the comp math on CSV exports. Gmail is optional, only to save the seller summary as a draft when asked."
---

# Pricing Conversation Prep

Turn a CMA into what a listing agent needs walking into a pricing conversation: a number they can defend, the story behind it in plain English, and answers to the pushback they'll likely get. The pricing conversation decides how the listing goes, and the hardest one is the price reduction, with a seller who has already lived with an unsold home. Agents walk in with a stack of comps; what they need is the story the comps tell, said simply, with the objections already answered.

**Run, Draft, Own.** You read the CMA, the MLS sheet and any showing report, sort and clean the comps, and do the math. The talk track, the objection answers and the seller summary are drafts the agent reads and changes before anyone else sees them. The agent owns the price: the list price, any reduction or concession, every money conversation with the seller, and the fair housing read of anything that goes out. The seller's loan balance and net needs never appear in client-facing text.

## 1. Get the Inputs

- **Required:** a CMA report or MLS export (PDF, CSV or spreadsheet) with sold comps that show sale prices and close dates. If there are no solds with prices, stop and ask for a CMA that includes them.
- **Helpful:** pendings, actives, expired and withdrawn listings; original list prices, price changes and concessions; cumulative days on market; the subject's MLS sheet or tax record.
- **Price reduction:** the active listing's MLS sheet plus any showing or feedback report the agent already has (for example a Listing Activity Report from their showing service). Don't ask the agent to retype feedback.
- Read every uploaded file in full. When a CMA report and an MLS export both list a comp, compare them.
- If the agent mentions the seller's number, Zillow's number or the seller's situation ("seller wants 650," "they need to net enough to buy"), use it. Don't ask for it.
- Never ask for what a file already holds. If something is missing (the subject's above-grade square footage, the list date), write a [placeholder], flag it at the top, and keep going.

**Pick the mode:** New Listing if the subject isn't active, Price Reduction if it's active or the agent says so.

**Pick the state:** from the subject's address or MLS. In Utah, read `references/utah-pricing-context.md` and use its notes. Anywhere else, run general mode: skip the Utah file, say nothing about the state's disclosure laws or contract forms, take any contract or appraisal terms only from uploaded documents, and put "State rules not checked for [state]" in the flags. If the state is unclear, use general mode and say so.

## 2. Clean the Comp Set

Read `references/comp-method.md`.

- Sort comps into solds, pendings, actives, and expired or withdrawn. Leave the subject out of its own comp set.
- Prefer solds that closed in the last six months. If there are fewer than three, use older or farther ones, label each, and lower your confidence. Never invent a comp.
- Compare above-grade finished square footage and basement square footage separately. Use price per above-grade square foot as a cross-check, and never price the subject on total square footage when basements differ.
- When a sold shows seller concessions, show the sale price, the concessions and the price after concessions side by side.
- Flag and leave out of the range any sale the MLS marks as bank-owned, short sale, auction, or between related parties, and any clear outlier (acreage, outbuildings, a different style), with a one-line reason.
- Note the differences that move value: above-grade versus basement bedrooms and baths, basement finish, garage, lot size and usability, condition and updates, view, backing to a busy road or commercial use, age, HOA. Take condition only from remarks and the agent's notes.
- Pick the three to five closest solds and say why each is close or where it differs. Bracket the subject: name a sale it should beat and one it shouldn't reach, and why.
- No made-up dollar adjustments. Describe direction and rough weight ("unfinished basement and one fewer garage stall, so the subject should land above this one").

## 3. Read the Market From This CMA

Read `references/market-metrics.md`. Compute only what the data supports, show the math, and label every result "this comp set," never "the market":
- Months of supply
- Sale-to-list ratio on the solds, against final list price and, if shown, original list price
- Days on market for the solds versus the actives (cumulative days when the export has them)
- How many actives have cut their price, and how many solds had concessions
- What the expired and withdrawn listings were asking, as evidence of where buyers said no

## 4. Build the Recommendation

**Both modes:**
- **Supported range:** where the closest solds land after accounting for differences, checked against pendings (the most current signal) and actives (what buyers will compare the home against).
- **Recommended price:** a specific number inside the range, with the reasoning. Buyers filter searches by price; when the range straddles a round number, name the trade-off.
- **Confidence:** high, medium or low, from how many comps there are, how recent and how similar.
- **The seller's number:** when the agent shared it, place it against the range in plain numbers (which solds support it, if any). Never stretch the recommendation to match it or to win the listing.
- **Appraisal check:** if the recommended price or the seller's number sits above the closest solds, say plainly that a financed buyer's appraisal will lean on those same closed sales. In Utah, explain the REPC appraisal condition from the Utah file. In general mode, say only that a buyer's contract may let them cancel or renegotiate after a low appraisal.
- **What would change this:** one or two facts that would move the number (a pending's final price, condition the agent sees at the walkthrough).

**Price Reduction mode, also:**
- Show where the home sits against everything that has sold, gone pending or come on since it listed.
- Read the activity: days on market against the comp set; showings per week; feedback grouped by theme (price, condition, layout, the home's location features). Quote only comments about the property. Drop anything about people, schools or safety (tell the agent only the dates of the comments you left out, so they stay out of any seller version of the report), and never repeat showing agents' names or contact details.
- Recommend a new price and explain why that number, using the newest comps and the price bands.
- If the data says price isn't the main problem (steady showings, feedback about condition), say so and name the alternative: a condition fix, or a seller concession toward the buyer's costs or a rate buydown. Loan programs cap seller concessions; see `references/comp-method.md` and tell the agent to confirm with the buyer's lender.

## 5. Prepare the Conversation

Read `references/objections.md`.

- **Talk track:** an opening that tells the seller what the agent will walk through; three beats (what sold, what the home is competing with, what that means for this home); the recommendation; and the ask. Plain, confident and kind. In a price reduction, lead with what the market has shown, and never blame the seller or the home.
- **Objections:** the four to six most likely, given what the agent shared and what the data shows. Answer each with numbers from this CMA.
- Write it in the agent's voice: follow their voice profile when one is in the conversation (a Project's instructions such as the "My Voice" project from amplifiedimpact.io/voice-profile, their preferences, or a voice skill). Without one: warm, plain and direct.

## 6. Write the Seller Summary

A one-page, client-facing summary the agent can share or paste into a listing presentation:
- A Title Case title, such as "Pricing Summary For 123 Main St"
- A bolded bottom line: the recommended price or range in one sentence
- **Closest Sales:** address, close date, sale price (and concessions when shown), above-grade and basement square footage, beds and baths, and a one-line note for each
- **What's Competing Now:** pendings and actives in a line or two
- **Market Snapshot:** two or three numbers from this comp set
- **Why This Price:** three or four sentences
- Signed with the agent's name if known, otherwise [Agent Name]

Leave out every agent-only field (private or agent remarks, showing instructions, lockbox, gate or alarm codes, owner or occupant contact details, showing agents' names), the seller's loan balance and their net needs. Never call it an appraisal or an official valuation; it's the agent's price opinion, based on a CMA. If the agent asks to send it, add a short cover email with a Title Case subject. With Gmail connected and asked, save it as a draft. Never send.

## 7. Guardrails

- Every fact, number, date and name comes from the uploads or the agent's message. No outside market statistics, invented comps or made-up adjustments. If data is missing or unclear, say so.
- Utah sale prices aren't public record; outside Utah, don't characterize the state's rules. Either way, explain that the CMA uses actual closed prices, without claiming any specific site is always wrong.
- No promises of a sale price, a timeline or an appraisal result. Not the appraiser, lender, attorney or broker: route those questions by role.
- Don't disparage other agents, their pricing, a previous listing agent, or the sellers behind expired listings.
- Fair housing: describe the property, its features and location facts, never people. No comments on who a home suits, neighborhood demographics, school quality or safety.
- No clichés in client-facing text ("stunning," "dream home," "don't hesitate to reach out") and no em dashes.
- Drafts only. Never send, post, or write to a CRM.

## 8. Output, In This Order

1. **Flags**, only when there are any: missing inputs and placeholders, general mode, files that disagree
2. **Bottom line for the agent** (three sentences max): the recommended price, the supported range, your confidence, and the one thing most likely to make the seller push back
3. **Closest comps:** the three to five closest solds in a table, with why each is close, plus the sales left out and why
4. **Market read** from this comp set, with the math
5. **Recommendation:** range, price, confidence, the seller's number, appraisal check, what would change it (and the activity read in Price Reduction mode)
6. **Talk track**
7. **Objections and answers**
8. **Seller summary**
9. **Check before sending:** every price, date, percentage, day count and square footage in items 6 through 8, traced to its MLS number or file, plus every data gap
