---
name: pricing-conversation-prep
description: Turns an MLS CMA export into prep for a pricing conversation with a Utah seller, including a price range grounded only in the comps, the market read behind it, a talk track, likely seller objections with answers, and a seller-facing pricing summary. Handles both new listings and price reductions on active listings. Use this whenever an agent uploads a CMA, comps, or an MLS export, or mentions a listing appointment, pricing a home, what to list at, a price drop or price reduction, an overpriced listing, or a seller who wants a higher number, even if they never say “pricing conversation.”
metadata:
  author: Amplified Impact
  version: "1.0"
---

# Pricing Conversation Prep

Turn a CMA into what the agent needs walking into a pricing conversation: a number they can defend, the story behind it in plain English, and answers to the pushback they'll likely get. The agent sets the price. This skill does the math and the drafting, and every number traces back to the CMA.

Why it matters: the pricing conversation decides how the listing goes, and the hardest one is the price reduction, when a seller has already lived with an unsold home. Agents walk in with a stack of comps. What they need is the story the comps tell, said simply, with the seller's objections already answered.

## 1. Get the Inputs

- **Required:** a CMA export from the MLS or a CMA tool (PDF, CSV, or spreadsheet) with sold comps that show sale prices and close dates. If there are no solds with prices, stop and ask for a CMA that includes them.
- **Helpful when present:** pending and active listings, expired and withdrawn listings, original list prices and price-change history, and the subject property's MLS sheet or tax record.
- **For a price reduction:** the active listing's MLS sheet (current price, original price, days on market), plus any showing count or feedback export the agent already has. Don't ask the agent to retype feedback.
- If the agent mentions the seller's number or situation ("seller wants 650," "they need to net enough to buy their next home"), use it. Don't ask for it.

Pick the mode: **New Listing** if the subject isn't active, **Price Reduction** if it's active or the agent says so.

## 2. Clean the Comp Set

Read `references/utah-pricing-context.md`.

- Sort comps into solds, pendings, actives, and expired or withdrawn.
- Prefer solds that closed in the last six months. If there are fewer than three, use older ones, label them, and lower your confidence.
- Compare above-grade finished square footage and basement square footage separately whenever the CMA provides them. Appraisers count only above-grade finished area as gross living area, and basements are common in Utah, so total-square-foot comparisons can mislead.
- Note the differences that move value: above-grade versus basement bedrooms and baths, garage, lot size and usability, condition and updates, view, backing to a busy road or commercial use, age, HOA. Take condition from the MLS remarks and the agent's notes. Don't guess at it.
- Pick the three to five closest solds and say why each is close or where it differs.
- Don't invent dollar adjustments. Describe the direction and rough weight instead ("smaller lot and unfinished basement, so the subject should land above this one"), and use the solds' price per above-grade square foot as a cross-check.

## 3. Read the Market From This CMA

Read `references/market-metrics.md` for the formulas. Compute only what the data supports:
- Months of supply in this comp set
- Sale-to-list ratio on the solds, against final list price and, if shown, original list price
- Days on market for the solds versus the current actives
- How many actives have cut their price, if original prices are shown
- What the expired and withdrawn listings were asking, as evidence of where buyers said no

Always label these "this comp set," never "the market."

## 4. Build the Recommendation

**Both modes:**
- **Supported range:** where the closest solds land after accounting for differences, checked against pendings (the most current signal) and actives (what buyers will compare the home against)
- **Recommended price:** a specific number inside the range, with the reasoning. Buyers filter portal searches by price band, so a price just under a round number can put the home in front of more searches. Name that trade-off when it applies.
- **Confidence:** high, medium, or low, based on how many comps there are, how recent they are, and how similar
- **Appraisal check:** if the recommended price sits above the closest solds, say plainly that a financed buyer's appraisal will lean on those same closed sales. When the REPC's appraisal condition applies, a buyer whose appraisal comes in under the price can cancel or renegotiate.

**Price Reduction mode, also:**
- Show where the home sits against everything that has sold, gone pending, or come on since it listed.
- Read the activity: days on market against the comp set, plus showings and feedback themes if the agent provided them.
- Recommend a new price and explain why that number, using the newest comps and search bands.
- If the data says price isn't the main problem (plenty of showings, feedback focused on condition), say so and name the alternative: a condition fix, or a seller concession toward the buyer's closing costs or a rate buydown. Note that lenders cap seller concessions.

## 5. Prepare the Conversation

Read `references/objections.md`.

- **Talk track:** an opening that tells the seller what the agent will walk through; three beats (what sold, what the home is competing with, what that means for this home); the recommendation; and the ask. Keep it plain, confident, and kind. In a price reduction, lead with what the market has shown, and never blame the seller or the home.
- **Objections:** choose the four to six most likely, given what the agent shared and what the data shows. Answer each with numbers from this CMA.

## 6. Write the Seller Summary

A one-page, client-facing summary the agent can share or paste into a listing presentation:
- A Title Case title, such as "Pricing Summary For 123 Main St"
- A bolded bottom line: the recommended price or range in one sentence
- **Closest Sales:** address, close date, sale price, above-grade and basement square footage, beds and baths, and a one-line note for each
- **What's Competing Now:** pendings and actives in a line or two
- **Market Snapshot:** two or three numbers from this comp set
- **Why This Price:** three or four sentences

Leave out anything the MLS marks agent-only or confidential: private remarks, showing instructions, lockbox and access details. Never call it an appraisal or an official valuation. It's the agent's price opinion, based on a CMA.

## 7. Guardrails

- Every number comes from the uploaded CMA or the agent's message. No outside market statistics, invented comps, or made-up adjustments. If data is missing, say so.
- Utah sale prices aren't public record. Explain that online estimates work without the closed-sale data the MLS has, but don't claim any specific site is always wrong.
- Don't promise a sale price, a timeline, or an appraisal result.
- Don't disparage other agents, their pricing, or a previous listing agent.
- Fair housing: describe property features and location facts, never the people who live in an area, school quality, or neighborhood safety.
- Keep the seller's loan balance and other personal financial details out of anything client-facing.

## 8. Output, In This Order

1. **Bottom line for the agent:** the recommended price, the supported range, your confidence, and the one thing most likely to make the seller push back
2. **Closest comps:** the three to five closest solds, with why each is close
3. **Market read** from this comp set
4. **Talk track**
5. **Objections and answers**
6. **Seller summary**
7. **Check before using:** every price, date, and square footage in items 1 through 6, traced to its CMA row, plus any data gaps
