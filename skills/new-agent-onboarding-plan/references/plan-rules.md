# Plan Mode: One New Agent's Plan

Last verified: 2026-11-11. This file is how the plan is built, not a statement of law; the compliance rules it points to are in `compliance-defaults.md`, with their sources.

A plan is the team's setup applied to one person: their role, their start date, their experience, their license status and the people who own their checkpoints. Every step, standard, day and owner in it traces to the setup (or the team's documents) or to the leader's message. The plan's job is to make the first 30 days runnable by someone other than the leader, and to make every open question visible before Day 1.

## The Details

| Detail | Required | Missing |
|---|---|---|
| Name (or initials) | Yes | [New Agent] |
| Role | Yes | [Role]. Use only the steps marked All, and list the role-specific steps as "if [role]" |
| Start date | Yes | Day numbers only, no dates, no code run |
| Experience (new licensee, experienced, role change) | Yes | Treat as a new licensee for the steps (nothing skipped), and ask |
| License status (active and affiliated, pending, transferring) | Yes | Hold every licensed step |
| Mentor and checkpoint people | Helpful | The setup's role, as [Name, role] |
| Anything the leader adds | Helpful | Nothing |

- Take the details from the message and the documents (a roster, an offer summary). Never ask for what a file holds.
- When the message and a document disagree on a detail, quote both in Needs your answer. For the license, hold (`compliance-defaults.md`). For a start date, give Day numbers only until the leader picks one.
- A start date that isn't an onboarding day (a weekend, a closed day, a holiday) is flagged by the code. Say so first; don't move Day 1.

## Picking the Steps

1. Every step the setup marks for All or for this role. Nothing from another role's rows, and nothing from outside the setup.
2. Experience and role changes: change only what the setup's part 5 says, and quote it. If it says nothing, every step applies.
3. Status of each step:
   - **Ready:** nothing blocks it.
   - **Held: license not confirmed:** marked "Needs active license," or plainly client-facing, while the license isn't confirmed.
   - **Held: conflict:** the setup's Open Items (or two documents) disagree about it. The step shows "Conflict: see Needs your answer."
   - **Held: broker review:** in the setup's Held for the Broker.
   - **Placeholder:** its owner, day or detail is missing.
4. License confirmed in the message, with no document saying otherwise: the steps are Ready, and Check before sending quotes the message. The setup's own step to confirm the license stays in the plan, for the broker's record.
5. A step the leader asks to add that isn't in the setup: add it only as the leader worded it, marked "Added by you, not in your setup," and suggest adding it to the setup. A request that conflicts with the setup (leads before the setup's lead rule) is not added: quote both in Needs your answer.

## Checkpoints

- Each checkpoint: its date (from the code), its owner (the person the leader or a roles document names, else [Name, role]), the standards it checks (by number, from the setup), the evidence, and a line "Result: recorded by [owner] at the checkpoint."
- Never fill in a result, a rating or a pass. Never add what a checkpoint checks beyond the written standards.
- With no checkpoints in the setup: the house default, labeled (`setup-mode.md`).

## Dating the Plan

Write `/tmp/plan.json` as `dates-code.md` shows, with every selected step (its id, the setup's day, on or by, kind, what, owner, status and source), the setup's onboarding days and closed days, and the start date. Run the code. Then:
- Use the code's dates and weeks exactly. Never count days by hand.
- Every moved step: its Day, the date it moved from and why, in the week table and in Check before sending.
- A recurring meeting on a closed day: "Confirm with [owner] whether it meets."
- Steps past Day 30 (moved there, or set there by the setup) are listed with their Day.
- No start date: skip the code; give each week as "Week 1 (Days 1 to 7)" and each step as "Day n."

## The Plan's Parts

- **Bottom line:** three sentences: who, role, start and Day 30 dates (or "undated"); how many steps are ready and held, and the checkpoint dates; the first thing to decide.
- **Needs your answer:** first. Each item says what it is (missing, conflict, misleading, held for the broker, left out), what it blocks, and who decides. Quote both sides of every conflict with sources. One line for anything personal left out.
- **Plan at a glance:** a short table: start date, Day 30 date, role, experience, license status (and where it came from), mentor, each checkpoint's date and owner.
- **Standards by Day 30:** the setup's standards for this role, with this agent's variant (an experienced agent's one shadow), each with its source.
- **Who does what:** each role, the person, what they own for this agent, how to reach them by team channel.
- **Checkpoints:** as above.
- **The first 30 days:** one table per week from the code: date, Day, step, owner, status, source, note.
- **After Day 30:** the setup's part 6 as headings, with owners. No detail until the Day 30 review is done.
- **Drafts** (below), then **Check before sending.**

## The Drafts

**A welcome note to the new agent.** Title Case subject. Under 250 words. Their start date, and a time or place only if the documents give one; what Day 1 holds; who's who by role, with team channels; their checkpoint dates; anything to bring only if the documents say. Nothing held is promised (say what unblocks it: "once Hollis confirms your license"). No pay terms, no personal details, no results talk. Signed by the leader's name or [Team Leader Name]. Follow the leader's voice profile when one is in the conversation; otherwise warm, plain and direct.

**A note to the checkpoint owners.** Title Case subject. For each owner: their checkpoints with dates, the standards each checks and the evidence; the held steps that wait on them; and a request to confirm the dates. Internal: role names and team channels only.

Both are drafts. Never send them, invite anyone, or create calendar events or tasks. With Gmail connected and the leader's ask, save them as Gmail drafts.

## Check Before Sending

- Every date, from the code, with each move and why, and the holidays and closed days in the window. "Federal holidays only; state holidays were not checked."
- The start date and where it came from; the license status and where it came from.
- Every owner and person named, and where each name came from.
- Every standard, quoted, with its source and that document's date; any stale document.
- Every held step and what unblocks it; every placeholder; every conflict still open.
- Anything left out for privacy (as a count, never the detail), and any conservative default applied.

## Files

Save the plan as `onboarding-plan-[first name]-[start date, or undated].md`, with `plan_dates.md` beside it, for the leader to download. Say both are for the leader and the checkpoint owners, not for the agent's file.
