# Seller Net Sheet: Estimate, Not a Closing Statement

Last verified: 2026-11-10. This file is a template and a set of rules. It holds no fee amounts or rates: every amount comes from the inputs, and nothing here is a typical figure.

## What It Is For

The seller wants to know what they might walk away with at each price. The net sheet answers that at the price scenarios the agent chose, with every line traced to where it came from, so the seller can see which numbers are firm, which are their own estimates and which are still open. The real numbers come later, on the closing statement from the title or escrow company.

## Rules

1. **Price scenarios come only from the agent.** One column per scenario, in the agent's order. No scenario from an online estimate, the seller's number, the assessor's value or a prior sale unless the agent asks for that exact number. With no scenarios, use [Price scenario 1] and [Price scenario 2] and stop at the line items.
2. **The listing brokerage fee** exactly as the agent states it (a percentage of the price, a flat fee, or a mix). Compute it at each price. Never fill in a rate the agent didn't give; with none, write [Your listing fee, as you state it] and leave the line out of the total.
3. **Compensation to a buyer's brokerage** only if the agent gave a figure to show. Its own line, labeled "Only if you choose to offer it (your decision)." Show the estimated net both without it and with it. Never present it as expected, usual or required.
4. **Title and escrow charges** only from the fee sheet, line by line, with the fee sheet's own names. Read a rate table at each price (the band the price falls in). A per-lien or per-document charge times the number of liens the seller described, with the arithmetic shown. No fee sheet: one placeholder line, [Title and escrow charges: from your title or escrow company's fee sheet], left out of the total.
5. **Payoffs as the seller stated them:** "about $318,000, as Dana said on the first call." Every loan and line of credit the seller mentioned gets its own line. Never a loan number or account number. A footnote says the real payoff comes from the lender's payoff statement, which the title company orders.
6. **Everything else is a labeled placeholder, left out of the total:** property tax proration, HOA dues and any HOA transfer or document fees not on the fee sheet, utilities, seller concessions or credits, repairs, staging, a home warranty, and any other cost the inputs don't give an amount for. A seller-stated amount (a credit they plan to offer) can be a line, labeled "as [name] said, your decision," shown like the buyer's brokerage line.
7. **No taxes on the sale.** Capital gains and any other tax question goes to a CPA. No tax line, no estimate.
8. **Do the math in code** (Python), to the cent, and show each computed line's arithmetic once (2.5% x $749,000 = $18,725.00). Recheck the totals after any change.
9. **The seller's net need,** when they named one, goes under the totals in plain numbers ("You mentioned needing around $300,000 for the next down payment. Before the open items, each estimate is above that."). Never use it to argue for a price.
10. **Voice:** the net sheet is client-facing. Short labels, no jargon, no em dashes.

## Template

**Seller Net Sheet: Estimate, Not a Closing Statement**
[Property address] | Prepared for [owner names] by [Agent Name], [Brokerage] | [Date]

| Line | [Scenario 1] | [Scenario 2] | Source |
|---|---|---|---|
| Sale price (your agent's scenario) | | | [Agent Name]'s scenarios, not a recommended price |
| Listing brokerage fee ([terms as stated]) | | | [Agent Name]'s terms, as stated |
| [Fee sheet line] | | | [Title company] fee sheet, [line name] |
| ... | | | |
| Mortgage payoff (estimate) | | | [Seller name]'s estimate, [where and when] |
| **Estimated net before the open items** | | | Arithmetic below |
| Compensation to a buyer's brokerage: only if you choose to offer it (your decision) | | | [Agent Name]'s example figure |
| **Estimated net if you offer it** | | | Arithmetic below |

**Open items, not in the totals:** each placeholder on its own line, such as [Property tax proration: the title company calculates it for the closing date].

**Arithmetic:** one line per computed amount.

Footer, always: "This is an estimate, not a closing statement. Your actual costs and proceeds come from the title or escrow company's closing statement. Payoffs come from your lender's payoff statement. Open items above are not included. Questions about taxes on the sale go to a CPA."
