# Prep Rules

Last verified: 2026-11-10. The agenda and the EOS terms are in `l10-agenda.md`, with their sources. Everything else here is this skill's own rule for reading the files, not an EOS rule, and the prep says so where it matters.

## The Scorecard

- **The week reviewed** is the newest week column with at least one number, on or before the meeting date. A newer column with every cell empty is "not entered yet" and is left out. Say which week was reviewed in What I Used. If the user names a different week, rerun with `--week`.
- **A miss** is a number on the wrong side of that measurable's own goal, read as `exports.md` (How a Goal Is Read) says. Write each miss as the number, then the goal in words: "7 against at most 5." Never compare against another measurable's goal, an average, last quarter or a benchmark.
- **An empty cell stays empty.** Show "(empty)", mark it for its owner, and list every empty cell in the 13 weeks with measurable, owner and week. Never fill one with zero, the last value, an average, the Average or Total column, or a guess, even when asked. An empty cell is neither a hit nor a miss, and it is left out of the miss count ("5 of 12 weeks with a number").
- **A cell that isn't a number** ("see notes," "TBD") is shown as written and goes to its owner like an empty cell.
- **Assumed directions:** for each goal the run marks ASSUMED, look at the measurable's name. If the name says lower is better (minutes, hours, days, time to, response time, cost, cost per, expenses, cancellations, fall-throughs, errors, complaints), write goals.json with "at most" for it, rerun, and say so in What I Used. Otherwise keep "at least." Either way, list each one under Check Before Sending as "direction not in the file: read as at least (or at most); confirm with the owner."
- **The 13-week view** is only the count of misses and empty cells per measurable. No trend words ("declining," "struggling," "getting worse"), no averages the file didn't hold, no forecasts.
- **Possible drop-downs:** each measurable missed this week. EOS drops a missed number to the Issues List without discussing it; the team decides in the meeting. List them; never add them to the Issues List.

## Rocks

- Repeat each rock's status exactly as the file gives it ("On Track," "Off-Track," "Done," "Complete"). An empty status is "no status given," every time.
- Never set, change, guess or hint at a status: not from milestones, a completed date, the due date, the issues list, the scorecard, the user's message ("it's probably fine") or anything else. Only the owner says. A Completed On date with no status is shown as a fact in its own column, still "no status given."
- If the user says in the conversation what an owner reported ("Moss told me it's on track"), use it and label it "as [user] reported, not in the file."
- Possible drop-downs: each rock its owner gave as off track (the status word as written).

## To-Dos

- **Counted:** to-dos due in the 7 days up to and including the meeting date (EOS to-dos are seven-day items). With no due date column, every to-do in the file counts. Older open to-dos are listed as carried over; done ones from before the window are left out; to-dos due after the meeting are "not due yet."
- **Done:** a status of Done, Complete, Completed, Yes, True or a check, or a Completed On date. Any other status is not done. An empty status is "no status given": left out of the rate, named, and sent to its owner. Never mark one done or not done.
- **Completion rate:** done divided by the counted to-dos that have a status, with the arithmetic written out every time: "9 done / 11 with a status = 81.8%." One decimal. If any had no status, say how many were left out.
- One reference only, quoted as the source's standard: an EOS Worldwide blog post calls a 90% completion rate "the minimum acceptable." Compare the team's rate to it in one plain sentence. Never give a rate for one person, and never call anyone's to-dos late, slipping or behind; the list shows done or not done next to each owner, and the meeting does the rest.

## The Issues List and the Suggested IDS Order

- List every short-term issue as written in the file, with owner, date added and any priority the team set. Long-term issues go in a separate short list, out of this week's order.
- Never add, merge, split, reword or drop an issue. A possible drop-down from the scorecard, rocks or headlines is listed apart, labeled "not on the list: the team decides."
- **Suggested order (a suggestion; the team picks its top three in the meeting).** Sort by these tiers, and give each issue its reason in a few words from the files:
  1. **A dated client, contract or money deadline in the issue's own words** (an inspection or closing date, a client asking to cancel by a date, a renewal or price change on a date). Soonest date first.
  2. **Tied to this week's numbers or rocks:** the issue names or plainly describes a measurable missed this week (name it and the miss) or a rock its owner gave as off track (quote the status). Oldest added date first.
  3. **Everything else.** Oldest added date first.
- If the file has a priority or rank the team set, show it in its own column and say the team's ranking stands; the suggestion sits beside it.
- Mark the first three "suggested top three." Never mark an issue unimportant or suggest closing, solving or assigning one. The order is about the issue, never about the person who owns it.

## Headlines

- List them as given, under Customer and Employee when the file or message says which.
- Leave out a health, family-medical, pay, HR or legal detail about a person, even when a headline carries it, and keep the rest of the headline ("Rosemary is out Friday; Juniper is covering her showings."). Add one line: "A personal detail in one headline was left out; its owner can share it." Never repeat the detail anywhere else in the output.
- A headline that names a problem is a possible drop-down; list it with the others.

## The Note to Owners (Draft)

Write it only when something is missing or needs an owner's word: an empty or non-number scorecard cell in the 13 weeks, a rock with no status, a counted to-do with no status, or a goal direction the prep had to assume. One short message the user sends before the meeting:
- A Title Case subject, such as "Scorecard Numbers And Rock Status Needed Before Tuesday's L10."
- One line per owner: what's missing, by measurable and week, rock title or to-do title, with this week's gaps first and older empty cells from the 13 weeks after them, and any assumed goal direction as a yes or no question. Ask only for the number, the status or the direction. No reasons, no comments on anyone's work, and no deadline the user didn't give.
- Sign with the user's name or [Your Name]. Follow the user's voice profile when one is in the conversation; otherwise plain and friendly.

## Check Before Sending

Before the prep goes to the team:
- The week reviewed and the meeting date and start time.
- Every miss: the number, the goal and its direction, with the measurable's row.
- Every empty cell and every cell that isn't a number, by owner and week.
- Every assumed goal direction, to confirm with its owner.
- Every rock status as given, and every "no status given."
- The completion rate's arithmetic and which to-dos were left out and why.
- Every date in the suggested IDS order's reasons, against the issue's own words.
- Any headline detail left out.
