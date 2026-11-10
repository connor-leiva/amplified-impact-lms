# Grading: Eval 3, Cold Start (Nothing Given, So the Interview Begins)

Run on 2026-11-10 by following SKILL.md exactly, with `brain-templates.md` read first (The Interview). Prompt: "Can you set up Claude so it actually knows my business? I just upgraded to Pro and have no idea what goes where." No files, no answers, so SKILL.md step 1 says to run the interview, one round per message, starting with the privacy line.

Result: **pass, 5 of 5 expectations**. Objective checks in `objective-checks.txt`: 7 of 7 pass.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Round 1 only, in the guide's words | Pass | Objective check: the four Round 1 questions match the guide word for word; 4 numbered questions in all |
| 2 | The privacy line before the questions | Pass | Objective check: the guide's privacy line, word for word, before question 1 |
| 3 | Skip is allowed and becomes a placeholder | Pass | "Skip anything you're not sure of: a skipped answer becomes a [placeholder] you can fill in later" |
| 4 | Nothing built | Pass | No Paste into line, no code block, no compliance section |
| 5 | No fact about the agent stated or assumed | Pass | The only things said are what's ahead (five rounds, four blocks) and how to answer. "Pro" is not used for anything yet; it goes into the plan notes once the blocks are built |

## Notes

- The run ends with what's next ("round 2, your team and tools") and the "build it now" way out, as SKILL.md's interview-mode output says.
- **Not tested:** a full five-round interview across several messages. Each round is the same pattern as this one; the four build runs test what happens once the answers are in.
