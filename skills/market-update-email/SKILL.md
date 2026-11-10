---
name: market-update-email
description: "Turns the MLS statistics an agent supplies (an MLS market report PDF, a stats CSV export, or numbers pasted in) into a monthly market update email for their database, a matching social post, and a Numbers I Used table with the source, period and arithmetic for every figure. Uses only supplied numbers: computes percent change, months of supply and list-to-sale ratio with the math shown, flags odd rows and missing metrics instead of filling them, and never predicts prices or rates or says it is a good time to buy or sell. Use it whenever an agent says write my market update, monthly newsletter, market stats email or post, or what the market did last month, or attaches a Local Market Update, RapidStats or InfoSparks report or an MLS stats CSV, even if they never say market update email. Not for weekly content research and ideas (content-opportunity-research), pricing one listing (pricing-conversation-prep), a listing's own description (listing-description-writer), or a sphere touch plan (sphere-touch-plan)."
compatibility: "Works from an uploaded report or export, or numbers pasted into the chat; no connector needed. Uses code execution (on by default) to read a CSV and run the arithmetic. Optional: the Gmail connector, only to save the email as a draft when asked."
metadata:
  author: Amplified Impact
  version: "1.0"
---

# Market Update Email

Turn the month's MLS statistics into the market update an agent sends their database: a short email, a matching social post, and a table that shows where every number came from. A market email is only worth sending if every figure is right and names its source and period, and it is the easiest place for an agent to slip into a forecast or a claim about schools that no MLS figure supports.

**Run:** reads the report, export or pasted numbers, checks every row for odd values and missing metrics, and does the arithmetic (percent change, months of supply, list-to-sale ratio) in code, showing each step. **Draft:** the email and the post, for the agent to read, edit and send from their own email tool and social accounts. **Own:** the agent decides what goes out and to whom, confirms any odd figure with the MLS, owns the source line their MLS requires, the brokerage name, the unsubscribe setup, any opinion about the market and any fair housing judgment. Pricing a client's home belongs to `pricing-conversation-prep`; rate questions go to a lender. Never ask for, repeat or handle wire instructions or account numbers.

## 1. Get the Numbers

- **Inputs, in order of preference:** the MLS's or association's monthly report (PDF), a stats export (CSV or XLSX), or numbers pasted into the chat. Read `references/market-math.md` (Where the Numbers Come From) for what to read in each.
- **Nothing supplied:** ask once for the report or export, in one line: "Upload your MLS's monthly market report or stats export for your area (UtahRealEstate.com members: RapidStats from the MLS Dashboard), or paste the numbers." Never fill in figures from memory, the web or a national source.
- Read every page and every row, including the footnotes: the area, the property type, the months compared, the as-of date and each metric's definition.
- Never ask the agent to type what a file already holds. A missing MLS name, area or period becomes a [placeholder], flagged at the top; keep going.
- **Location:** Utah mode when the area or the MLS is in Utah: read `references/utah-market-update-rules.md`. Otherwise general mode: skip it and say "State advertising rules and your MLS's own rules were not checked."

## 2. Check the Data Before Writing

Follow `references/market-math.md`, in code when code execution is on:
1. List what the input has: area, property types, periods, metrics, as-of date. When two files cover the same figures, compare them and flag any that disagree.
2. Check every row for odd figures (a value three times or a third of the other months, impossible values, a stated change that doesn't match its figures, a duplicate month). Flag each with its row and what it was compared with. Don't use any figure from an odd row until the agent confirms it; never fix, average around or replace it.
3. Note each metric the drafts would need that the input doesn't have (inventory, a prior-year figure, a list price). No months of supply without inventory and closed sales for the same month; no list-to-sale ratio without sale and list figures for the same sold homes.
4. Mark small samples: fewer than 10 closed sales for an area or segment in a period.

## 3. Work Out the Figures

- Use stated figures as stated, under the input's own metric names (a median stays a median; "Percent of Original List Price Received" is not the list-to-sale ratio).
- Compute only what the formulas in `references/market-math.md` allow: percent change (checked against the report's own when it gives one), change in days or counts, change in a ratio in percentage points, months of supply (the report's figure when it has one), list-to-sale ratio.
- Choose three to five figures for the email and two or three for the post: the area and property type the agent asked for, this period against the same period last year when it's clean. If the agent named no property type and the report has several, lead with the one with the most closed sales and say so in the flags.
- Build the Numbers I Used table as the reference shows: every figure in either draft, numbered, with its value, where it's from, its period and area, and its arithmetic.

## 4. Draft the Email and the Post

Read `references/writing-guide.md` and follow it exactly, and the email rules in `references/outreach-rules.md`.
- **Email:** a Title Case subject naming the area and month; a body of 250 words or fewer; every figure with its period and comparison; a one-line summary in the past tense; one invitation to reply; sign-off with the agent's name and brokerage name (or [Agent Name], [Brokerage Name]); the source line; the footer with the opt-out line, [Sender Postal Address] and, unless the agent says these contacts asked for it, the marketing email line.
- **Post:** 120 words or fewer, the same figures, the brokerage name and the short source line.
- **The source line:** "Based on information from [MLS name] for the period [first date] through [last date]." In Utah mode with UtahRealEstate.com data, its required wording.
- Follow the user's voice profile when one is in the conversation (amplifiedimpact.io/voice-profile); without one, warm, plain and direct. The voice never overrides the guardrails.
- If a sentence needs a number the input doesn't have, drop the sentence, or keep it with a [placeholder] and flag it.

## 5. Guardrails

- **Only supplied numbers.** Every figure in the drafts is in the input or computed from it, with the arithmetic in the table. No outside statistics, national averages, rates or benchmarks from memory. Unclear or illegible: say so.
- **Describe, never predict.** No forecasts of prices, rates, sales or inventory; never say it is a good time to buy, sell, list or wait; no market labels (buyer's or seller's market, hot, cooling). Past tense, named period. A forecast or quote in the report stays out of the drafts and is flagged, even when the agent asks to include it; say why in one line and offer a sentence the numbers support.
- **Name the source and period of every number** (MLS, area, dates) as the input states them.
- **Fair housing:** no schools, safety, crime, demographics, "family-friendly" or who is moving in, even when the report or the agent's message says it. Point anyone who asks to official sources. Flag what was left out without repeating it.
- **Aggregate only:** no addresses, listings or individual sales in the drafts.
- **Stay in lane:** no advice on any one home's price (`pricing-conversation-prep`), no rate talk (the lender), no legal reading of MLS rules (the broker).
- **Drafts only:** never send, schedule, post or write to a CRM or email tool. With a Gmail connector and the agent's ask, a Gmail draft to the agent's own address.

## 6. Output, In This Order

1. **Flags**, only when they apply: odd rows and figures, missing metrics, files that disagree, small samples, placeholders, the property type chosen, general mode, and "Left out on purpose" (forecasts, quotes, fair housing lines, national figures and rates), each without repeating the left-out words.
2. **Bottom line for the agent** (three sentences max): the area and period, the two or three figures that matter most, and the one thing to check before sending.
3. **What I used:** the files or message, the MLS, area, property types, periods and as-of date.
4. **Numbers I Used:** the table, then "Figures in the input I did not use, and why."
5. **Email draft:** subject, body, sign-off, source line, footer.
6. **Social post draft.**
7. **Check before sending:** every date, dollar amount and percentage in the drafts with its N number and page or row; each placeholder; the source line's wording against the MLS's rule; the brokerage name as on the Division's records (Utah) or the broker's rule; the unsubscribe link and postal address (delete them if the email tool adds its own); and that the list goes only to contacts the agent may email.

If the agent asks for one piece ("just the post"), give it with the flags, the Numbers I Used rows it uses, and Check before sending.
