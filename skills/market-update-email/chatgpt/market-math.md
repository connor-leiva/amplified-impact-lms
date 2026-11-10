# Market Math: Reading the Inputs and Showing the Arithmetic

Last verified: 2026-11-10. Sources are at the end. The formulas are plain arithmetic on the agent's own numbers; the notes on how MLS reports define their metrics come from the reports named in the sources.

Every figure in the drafts is either stated in the input or computed from it here, and every computed figure shows its arithmetic in the Numbers I Used table. With code execution on, do each calculation in Python and copy the printed arithmetic. Without it, work each one by hand, then check it a second way (multiply back). Never compute a figure that needs a number the input doesn't have.

## Where the Numbers Come From

| Input | What to read | What to watch for |
|---|---|---|
| A monthly report PDF (Local Market Update, Monthly Indicators, a RapidStats or RPR printout, an MLS or association report) | Every page: the tables, the area and property type each table covers, the months compared, the as-of date, the definitions and footnotes | Commentary and national paragraphs are not area data. Footnotes say how a metric is defined (median or average, original or final list price, how months of supply is figured) |
| A stats CSV export (InfoSparks, RapidStats or the MLS's own) | Every row and column, in code: the months, the area, the property type, the metric names | A missing metric, an odd row, a duplicate month, months out of order, two areas or property types mixed in one column |
| Numbers pasted in the chat | Each figure exactly as written, and what it's called ("average" or "median") | No source, area or period named: use a [placeholder] for each and flag it. "712k" is read as $712,000 and listed as read |
| An export of individual sales (one row per home) | Count, median and average sale price, median days on market, and sale-to-list from the rows, in code | Label every figure "computed from your export of N sales," name the filters it shows, and say it can differ from the MLS's published statistics. Never name an address or a listing |

Keep each metric's name as the input writes it. "Percent of Original List Price Received" is not the list-to-sale ratio (one uses the original list price, the other the final one); a median is never written as an average; "Days on Market Until Sale" stays that. Never write "home values" or "what homes are worth" for a median sale price: it describes the homes that sold in the period, not every home.

## Formulas

Round percent changes to one decimal. Show the inputs, the operation and the result, then the figure as written in the draft.

**Percent change** = (this period minus the comparison period) ÷ the comparison period × 100.
Example: (505,000 minus 489,000) ÷ 489,000 × 100 = 3.27%, written as 3.3%.

**When the report states its own change:** use the report's figure, and check it with the formula. Reports often compute from rounded figures, so a gap of 0.2 points or less is rounding: note "matches the report." A bigger gap goes in the flags with both numbers, and the draft uses the change only after the agent confirms which is right.

**Change in a count or days:** give the difference too when it reads better ("7 days longer," "17 fewer sales"): 38 minus 31 = 7.

**Ratios and percentages** (list-to-sale, percent of list price received): give the change in percentage points, never as a percent change. 97.6% minus 98.4% = minus 0.8 points. A report that prints a change in a percentage as "- 1.1%" leaves it unclear whether that is points or a relative change: work out the points yourself (95.1 minus 96.2 = minus 1.1) and write "1.1 points lower."

**Months of supply:**
- When the report gives Months Supply (or Months of Inventory), use its figure and its definition, and don't recompute it. Many reports divide inventory by the average monthly pending sales of the last 12 months, which differs from a one-month figure.
- When it doesn't, and the input has both active listings at month end and closed sales for the same month, area and property type: months of supply = active listings ÷ that month's closed sales, to one decimal. Example: 1,198 ÷ 301 = 3.98, written as 4.0. Label it "computed from this month's closed sales."
- When either number is missing, there is no months of supply. Say so in the flags; never estimate it.

**List-to-sale ratio:**
- When the report gives it, use its figure and its name.
- When the input gives a sale price and a list price for the same sold homes, of the same kind (average with average, median with median): ratio = sale price ÷ list price × 100, to one decimal. Example: 487,900 ÷ 496,300 × 100 = 98.31%, written as 98.3%. Label it "computed from the average sale price and the average list price of homes that sold"; it can differ a little from the MLS's own ratio, which averages each sale's ratio.
- Never compute it from an asking price of active listings, or mix a median with an average.

**Year to date:** use the report's year-to-date figures as stated. Sum monthly counts only when every month of the year is in the input, and show the sum. Never add or average monthly medians, averages or ratios to get a yearly one.

## Odd Rows and Odd Figures

Check every row before writing a sentence. A figure is odd when:
- It is more than three times, or less than a third of, the middle value of the other months for that metric (an extra or missing digit usually looks like this).
- It is impossible: a negative count or days, a median sale price above twice the average of the same row, a list-to-sale ratio above 120% or below 70%, closed sales with no price, a month that appears twice or out of order.
- It disagrees with the input itself: a stated change that doesn't match its two figures by more than 0.2 points, a year-to-date count lower than one month's count, or two files that give the same metric different values.

When a figure is odd:
1. Flag it at the top: the row (month, area, property type), the figure, and what it was compared with ("1,262 closed sales against 96 to 141 in the other 12 months").
2. Don't use any figure from that row in the drafts until the agent confirms the row with the MLS. Never fix it, average around it, replace it with a neighboring month or a guess, or quietly drop it.
3. If a sentence needs the row (a year-over-year comparison, say), drop the sentence, compare with another clean period the input has and say which, or put a [placeholder] in the draft and flag it.

## Small Samples

When a period has fewer than 10 closed sales for the area or segment (a small city, a price band), a percent change in its price or count swings with one or two homes. Leave its percent changes out of the drafts. If the agent wants it in, give the counts only ("4 homes sold, against 2 a year earlier") and say in the flags why the price change was left out. The report's own small-sample footnote, when there is one, is the source to quote.

## Which Figures Go in the Drafts

- **The area and property type the agent asked for.** If the agent named none and the report has several, lead with the property type with the most closed sales, add at most one sentence on the next, and say which you chose in the flags.
- **Three to five figures in the email, two or three in the post,** each with its period and its comparison period. A good set: median sale price, closed sales, days on market, and inventory or months of supply. The list-to-sale ratio when it moved.
- **Same period, same comparison:** October against October is the usual comparison for a monthly email, because seasons move every metric. Month over month is fine when the year comparison is missing or odd; say "compared with September 2026."
- **Not in the drafts:** commentary, quotes and forecasts in the report, national figures and mortgage rates (they aren't about the area named; use one only when the agent asks, with its source and date exactly as the input states, and never what it will do), and any figure for a single listing or address.

## The Numbers I Used Table

One row for every figure in the email or the post, numbered N1, N2 and so on, in the order they appear:

| # | Figure in the drafts | Value | Where it's from | Period and area | Arithmetic |
|---|---|---|---|---|---|
| N1 | Median sale price, single-family | $505,000 | Report p. 1, Single-Family Homes, "Median Sale Price" | October 2026, Sampleton County | As stated |
| N2 | Change in median sale price | up 3.3% | Computed; report says + 3.3% | October 2026 against October 2025 | (505,000 minus 489,000) ÷ 489,000 × 100 = 3.27%, shown as 3.3%; matches the report |

Under the table, list **Figures in the input I did not use, and why**: odd rows, small samples, metrics left out for length, commentary and forecasts, national figures.

## Sources

Checked 2026-11-10.
- Utah Association of REALTORS, "Monthly Indicators, September 2026" (prepared with ShowingTime Plus), for how a monthly report lays out current month, prior year, year to date and percent change, defines Months Supply of Inventory and Percent of Original List Price Received, and notes "Percent changes are calculated using rounded figures": https://uar.stats.showingtime.com/docs/mmi/x/MarketActivityfortheUtahAssociationofREALTORS
- Utah Association of REALTORS, "Local Market Updates by County, March 2024," for the small-sample footnote ("Some figures are for one month worth of activity and can look extreme due to small sample size") and "Does not account for seller concessions": https://utahrealtors.com/wp-content/uploads/2024/04/All-Counties_2024-03.pdf
- UtahRealEstate.com Rules and Regulations Reference Guide, revised February 11, 2026, page 9 (Rule 13.1): statistics must be presented in aggregate, never about a specific listing without the listing broker's permission: https://help.utahrealestate.com/wp-content/uploads/2026/02/URE-Rules-and-Regulations-Reference-Guide-Effective-02-11-26.pdf
