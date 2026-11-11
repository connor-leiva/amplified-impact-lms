"""Writes the dates code into the skill's references/dates-code.md and the ChatGPT version's code file, from
evals/make/plan_dates.py, so the three can never drift apart.

Usage: python3 embed_code.py SKILL_DIR
"""
import os
import sys

SKILL_DIR = sys.argv[1]
code = open(os.path.join(SKILL_DIR, "evals", "make", "plan_dates.py"), encoding="utf-8").read().rstrip("\n")

WHAT = (
    "What it does: counts each step's Day from the start date (Day 1 is the start date); moves a step that lands on a "
    "day the team doesn't onboard, a closed day or a federal holiday (the day itself or the weekday it is observed) "
    "to the next open day, or a step due by a day back to the open day before it; keeps calls and voicemails off "
    "Sundays and holidays whatever the onboarding days; lists each weekly meeting on its dates and marks any that "
    "falls on a closed day; groups the steps into four weeks by date; and lists every move, the holidays and closed "
    "days in the window, and any problem (a start date that isn't an onboarding day, a step with no day). It never "
    "adds, drops or rewords a step."
)

USAGE = "    python3 plan_dates.py --plan plan.json --out OUTPUT_FOLDER"


def page(title, verified, run_line):
    return "\n".join([
        f"# {title}",
        "",
        verified,
        "",
        run_line,
        "",
        "Usage:",
        "",
        USAGE,
        "",
        "It prints the dated plan and writes plan_dates.md (the steps by week, every move and why, the holidays and "
        "closed days in the window, any problem) and plan_dates.json (the same, for drafting) to OUTPUT_FOLDER.",
        "",
        WHAT,
        "",
        "```python",
        code,
        "```",
        "",
    ])


skill = page(
    "Dates Code",
    "Last verified: 2026-11-11. The federal holiday rules this code follows (5 U.S.C. 6103, and OPM for the "
    "observed weekday) are in `compliance-defaults.md`, with their sources.",
    "Run this code with Python 3 on the plan's steps. It uses only Python's standard library. Write plan.json at "
    "/tmp/plan.json as the code's header shows. Do not paste the code into the conversation.",
)
chatgpt = page(
    "New Agent Onboarding Plan: Dates Code",
    "Last verified: 2026-11-11. The federal holiday rules this code follows (5 U.S.C. 6103, and OPM for the "
    "observed weekday) are in new-agent-onboarding-plan-guide.md, Part 4, with their sources.",
    "Run this code with Python (data analysis) on the plan's steps. It uses only Python's standard library. Save "
    "the Python block below as plan_dates.py, exactly as written, and write plan.json as the code's header shows. "
    "Do not paste the code into the chat.",
)

for rel, text in (("references/dates-code.md", skill), ("chatgpt/new-agent-onboarding-plan-code.md", chatgpt)):
    path = os.path.join(SKILL_DIR, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("wrote", rel)
