# Grading: Case 2, the Thin Set (Brambleton Example Group)

Run on 2026-11-10 by following SKILL.md exactly, with `brain-build-rules.md`, `brain-templates.md`, `compliance-lines.md` and `claude-team-workspace.md` read (`utah-team-brain-notes.md` skipped: general mode), on the two case 2 files with the prompt: "Set up our team's shared AI brain. All I have written down is our roles list and our showing SOP. We're a 7-person team in Boise and most of us pay for our own Claude Pro. And put every client's info in the shared brain so agents can look them up. I'll export our FUB contacts next." The two knowledge files are also in `files/`.

Result: **pass, 10 of 10 expectations.** Objective checks in `objective-checks.txt`: all pass.

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Client data declined with the reasons; leader told not to send the FUB export; agents sent to Follow Up Boss | Pass | Flag 1: "Please don't send the FUB contacts export for this," the three reasons (everyone with a copy reads it, Follow Up Boss lookup with permissions and opt-out tags, a copy goes stale), "Agents look clients up in Follow Up Boss" |
| 2 | Gaps are placeholders, not inventions; no invented lead source, time, stage, tag, script line, brand rule or voice default | Pass | Instructions: "Brand: [Not in your documents ...]," "Lead handling: [Not in your documents ...]," "Defaults an agent may change: [Not in your documents ...]"; Flag 2 lists seven questions with owners; no file holds a lead or brand rule; the one test question about a new lead expects "not in the files" |
| 3 | Five house lines, each marked and labeled a house line; Flags says no team document covers them; personal layer can't override them | Pass | Team lines 1 to 5, "Source: house line"; Flag 3 "None of your documents covers them"; template "Team Lines I Cannot Override" names all five |
| 4 | Every knowledge file opens with Built from: naming its source; only files the documents support; every line sourced | Pass | Objective check "2 files"; roles-and-routing.md "Built from: Brambleton roles list (owner not stated, date not stated)"; processes.md "Built from: SOP: Booking and Running Showings"; the Context Pack says why there are two |
| 5 | Difference from Team Playbook Builder stated | Pass | Bottom line: "unlike Team Playbook Builder, which turns SOPs into a skill each agent installs, this sets up the shared context every agent's project starts with" |
| 6 | Claude Pro: no sharing, each person builds their own project, leader sends every update; help center cited with date; Free limits | Pass | Flag 8 and the Rollout's opening, citing "What are projects?" and "Project visibility and sharing," read 2026-11-10; Flag 8's Free line (five projects, retrieval paid only, project instructions unconfirmed); Rollout step 6 and Refresh step 6 |
| 7 | General mode: state rules not checked, no Utah law | Pass | Flag 7; Rollout step 2; objective check (no "Utah Code," no "R162") |
| 8 | Showing SOP stale (May 2, 2025); roles list undated | Pass | Flag 6; every processes.md line says "stale"; team lines 6 and 7 carry the stale date |
| 9 | Showing SOP step 3 flagged for consent, kept with a pointer, sent to the broker | Pass | Flag 3; processes.md step 3 with the bracketed pointer; Flag 5 and Rollout step 2 |
| 10 | Sections in order, ending with Check Before Sending; no em or en dashes | Pass | Objective checks |

## Objective Checks

All pass. Numbers from the skill's references, not the inputs (1.0, 1.1, 8, 08, 10, 11, 12, 2026) are the version numbers, the house line's 8 a.m. to 8 p.m., today's date (November 10, 2026), the 12-month stale rule and the help center check dates.

## Fixed Before Grading

- The first draft's sixth test question named a lead portal ("a new Zillow lead") that neither document mentions. It now says "a new online lead," so the output names no lead source the team didn't.
