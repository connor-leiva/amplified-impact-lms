# Comp Method and Market Metrics

Last verified: 2026-11-08. Sources are listed at the end. These rules apply in every state; Utah-only notes live in `utah-pricing-context.md`.

How to pick, read and explain comps so the agent's number holds up with the seller and, later, with the buyer's appraiser. Use these facts to explain the numbers, never to replace them.

## Above Grade and Below Grade

- Fannie Mae requires appraisers to follow the ANSI Z765-2021 standard "when measuring, calculating and reporting the above- and below-grade square footage(s)."
- Fannie Mae "considers a level to be below-grade if any portion of it is below-grade, regardless of the quality of its finish or the window area of any room." A walk-out basement with finished rooms is not counted in above-grade square footage or the room count.
- Finished rooms below grade "may add substantially to the value of a property," and appraisers adjust for them on their own line, separate from above-grade living area.
- Units in condo or co-op buildings are measured by interior perimeter, so a condo's square footage isn't directly comparable with a house's.

How to use this:
- Compare price per above-grade square foot across comps, and treat basement size and finish as their own line.
- Never price the subject on total square footage when the comps' basements differ. A home with a big finished basement looks cheap per total square foot next to a home with none, and the buyer's appraiser won't read it that way.
- When the comp set has no sale with a basement like the subject's, say so plainly. Use the closest sales above and below (bracketing) and name the gap; don't invent a dollar value for the basement. Suggest widening the search (time or area) for sales with a similar basement, and label anything older or farther.
- If the CMA report and the MLS export show different square footage, beds or baths for the same home, flag it in Check before sending.

## Sales Concessions on Sold Comps

- Fannie Mae requires appraisers to adjust comparable sales that include sales or financing concessions "to reflect the impact, if any, on the sales price." The adjustment is negative and equals the part of the price the appraiser attributes to the concessions. It isn't automatically dollar for dollar, and "positive adjustments for sales or financing concessions are not acceptable."
- Examples Fannie Mae lists: rate buydowns, discount points, origination fees, closing costs customarily paid by the buyer, HOA fees or assessments paid for the buyer.

How to use this:
- When the CMA shows concessions on a sold, show the sale price, the concessions and the price after concessions side by side, and treat the after-concessions figure as the conservative read.
- Don't say the appraiser will subtract the full concession. Say the appraiser adjusts for it.
- If the export has no concessions column, list that in the data gaps.

## Time

- Fannie Mae requires appraisers to analyze whether market conditions changed between when each comp went under contract and the appraisal's effective date.

How to use this: give newer solds and pendings more weight than older solds. Describe a price trend only when this comp set shows it (see the market metrics section of this file), and never quote an outside trend.

## Sales to Leave Out or Label

- Leave out of the range, and say why: sales the MLS marks as bank-owned, short sale, auction or between related parties; as-is estate sales with condition far from the subject's; clear outliers on price per above-grade square foot; homes with far more land or outbuildings (a barn, a shop) or a different style.
- Label, and lower confidence: solds older than six months ("older"), sales outside the subject's subdivision or area ("farther").
- Pendings show where buyers are agreeing now, but their sale price isn't known until they close. Use their list price only as a ceiling signal.

## Bracketing

Name at least one sale the subject should sell above and one it shouldn't reach, and say why in one line each ("larger above-grade area and a third garage stall"). A recommendation sitting between two real sales is easier to defend than one built from an average.

A CMA tool's "average price" of the selected comps mixes sizes, basements and dates. Show it if the report shows it, but don't use it as the recommendation.

## Agent-Only Fields

Never put these in anything client-facing, even when the CSV or MLS sheet includes them: agent or private remarks, showing instructions, lockbox type, code or location, gate or alarm codes, owner or occupant names and phone numbers, showing agents' names and contact details, seller motivation notes, and any compensation field. Use them privately only to understand a comp ("seller relocating" can explain a quick sale).

## Pricing Honesty

- The NAR Code of Ethics (effective January 1, 2026), Standard of Practice 1-3: "REALTORS®, in attempting to secure a listing, shall not deliberately mislead the owner as to market value."
- Article 15: "REALTORS® shall not knowingly or recklessly make false or misleading statements about other real estate professionals, their businesses, or their business practices."

How to use this: the recommendation follows the comps, not the seller's number or the wish to win the listing. When the seller's number is above the supported range, say so in the bottom line with the sales that show it. Never comment on another agent's pricing; let the closed sales speak.

## Seller Concessions Instead of a Price Cut

- Loan programs cap what a seller may pay toward a buyer's costs. Fannie Mae's limits on financing concessions for a principal residence or second home: 3% when the LTV or CLTV is over 90%, 6% from 75.01% to 90%, 9% at 75% or less; 2% for an investment property.
- FHA, VA, USDA and other programs set their own limits. Confirm the number for any buyer with that buyer's lender before the agent suggests it.
- A concession on this sale becomes a concession on a future comp, and appraisers adjust for it (above).

## Sources

All checked 2026-11-08.
- Fannie Mae Selling Guide B4-1.3-05, Improvements Section of the Appraisal Report (06/04/2025): https://selling-guide.fanniemae.com/sel/b4-1.3-05/improvements-section-appraisal-report
- Fannie Mae Selling Guide B4-1.3-09, Adjustments to Comparable Sales (06/04/2025), sections on sales or financing concessions and market conditions: https://selling-guide.fanniemae.com/sel/b4-1.3-09/adjustments-comparable-sales
- Fannie Mae Selling Guide B3-4.1-02, Interested Party Contributions (05/07/2025), Maximum Financing Concessions table: https://selling-guide.fanniemae.com/sel/b3-4.1-02/interested-party-contributions-ipcs
- NAR 2026 Code of Ethics and Standards of Practice (effective January 1, 2026), Standard of Practice 1-3 and Article 15: https://www.nar.realtor/about-nar/governing-documents/code-of-ethics/2026-code-of-ethics-standards-of-practice
- Not verified here: FHA, VA and USDA concession limits. Confirm with the buyer's lender.

---

# Part 2: Market Metrics From a CMA

Last verified: 2026-11-08. Sources are listed at the end.

Compute these from the comp set only, show the arithmetic, and label every result "this comp set." A CMA is a filtered slice of the market, not the whole market, so these numbers describe the home's competitive set. With a CSV export, do the math in code and check the counts against the file.

## Months of Supply

Months of supply = active listings ÷ (closed sales in the period ÷ months in the period)

Example: 12 actives, and 18 closed sales over the past 6 months. The pace is 18 ÷ 6 = 3 sales a month, so 12 ÷ 3 = 4.0 months of supply.

- Count the subject as one of the actives in Price Reduction mode, and say so.
- The National Association of Home Builders writes that "housing economists typically advise that a balanced market is a five- to six-months' supply." Present it as a rule of thumb: lower leans toward sellers, higher toward buyers. Some analysts put the line lower, so never treat it as a law.
- Only compute this when the CMA or the agent states the period the solds cover. If neither does, skip the metric and say why.
- With fewer than five solds, say the pace rests on very few sales.

## Sale-to-List Ratio

Sale-to-list = sale price ÷ final list price, for each sold, then the median (and the range).

If original list prices are shown, also compute sale price ÷ original list price. The gap between the two ratios shows how much sellers gave up after listing, which is often the most persuasive number in a reduction conversation.

## Concessions

If the export shows seller concessions, count how many solds had them and show each amount next to its sale price. Concessions on several solds tell the seller that buyers in this set have been asking for help with costs, and they lower what those sales really say about price.

## Days on Market

- Use cumulative days on market (CDOM) when the export has it; a relisted home can show low days on market after a long first listing. Say which one you used.
- The median days on market for the solds tells you how long homes that priced right took to go under contract.
- Compare the subject's days on market (in reduction mode) and the actives' days on market against it.
- Actives sitting well past the solds' median are usually priced above what buyers have been paying. Say "usually"; it's a pattern, not a rule.

## Price Cuts Among Actives

If the CMA shows original and current list prices, count how many actives have cut their price and by how much. An export with only the original and current price doesn't say when a cut happened or how many there were: never guess the timing. Several cuts in the competitive set are a strong, neutral signal ("2 of the 3 homes you're competing with have already reduced").

## Expired and Withdrawn Listings

Expired and withdrawn listings mark where buyers said no. Note what they were asking against the solds. Present them as evidence, never as criticism of those sellers or their agents.

## Price Trend Inside the Comp Set

Only when there are at least three solds in each half of the period: compare the median price per above-grade square foot of the older half with the newer half, and describe the direction in words ("the newer sales sit a little lower"). With fewer, skip it and say why. Never cite an outside trend.

## Thin or Messy Data

- Fewer than three relevant solds: say so in the bottom line, widen the time window or the area carefully, label the older or farther comps, and lower your confidence.
- Missing fields (no close dates, no above-grade split, no original prices, no concessions): skip any metric that depends on them and list the gap in "Check before sending."
- Outliers (a distressed sale, a sale between relatives, a major outlier on price per square foot or land): flag them and leave them out of the range, explaining why.
- Never fill a gap with outside statistics or memory.

## Sources

Checked 2026-11-08.
- National Association of Home Builders, Eye on Housing, "Considering Housing Inventory: Why Both New and Existing Supply Matters" (June 2024), for the five-to-six-month rule of thumb: https://eyeonhousing.org/2024/06/considering-housing-inventory-why-both-new-and-existing-supply-matters/
- The formulas above are standard arithmetic on the CMA's own rows; they need no outside source.
