"""Writes chatgpt/new-agent-onboarding-plan-guide.md from the skill's four references, so the ChatGPT Project
and the Claude skill can't say two different things. Rewords what only makes sense in Claude.

Usage: python3 make_chatgpt_guide.py SKILL_DIR
"""
import os
import re
import sys

SKILL_DIR = sys.argv[1]
PARTS = [
    ("setup-mode.md", "Part 1"),
    ("plan-rules.md", "Part 2"),
    ("onboarding-topics.md", "Part 3"),
    ("compliance-defaults.md", "Part 4"),
]
NAMES = {
    "`setup-mode.md`": "Part 1 of this guide",
    "`plan-rules.md`": "Part 2 of this guide",
    "`onboarding-topics.md`": "Part 3 of this guide",
    "`compliance-defaults.md`": "Part 4 of this guide",
    "`dates-code.md`": "new-agent-onboarding-plan-code.md",
    "/tmp/plan.json": "plan.json",
}
SWAPS = [
    ("- A Team Playbook Builder playbook: each file in its `references/` folder counts as a team document, with its own source and date.",
     "- A Team Playbook Builder playbook: each of its topic files counts as a team document, with its own source and date."),
    ("so the skill can find what the team's documents leave open", "so the Project can find what the team's documents leave open"),
    ("The facts this skill does rely on", "The facts the Project does rely on"),
    ("Start a new chat with the skill on, attach the setup, give the details.",
     "Start a new chat in the Project, attach the setup (or keep it in the Project's Sources), and give the details."),
    ("Start a new chat with the skill on, attach the setup, and give the details.",
     "Start a new chat in the Project, attach the setup (or keep it in the Project's Sources), and give the details."),
    ("Run each in a new chat with the skill on", "Run each in a new chat in the Project"),
    ("- In Claude: save `onboarding-setup.md` and attach it with each new agent's details, or keep it in the files of a Claude Project you run this skill in.",
     "- In ChatGPT: add `onboarding-setup.md` to this Project's Sources tab, or attach it with each new agent's details."),
    ("If the skill adds something not in the setup", "If the Project adds something not in the setup"),
    ("every Amplified Impact skill that touches outreach follows", "every Amplified Impact tool that touches outreach follows"),
    ("shared by every Amplified Impact skill that drafts outreach", "shared by every Amplified Impact tool that drafts outreach"),
]

out = [
    "# New Agent Onboarding Plan: Guide",
    "",
    "Version 1.0, by Amplified Impact. The rules new-agent-onboarding-plan-instructions.md points to, in four parts: "
    "Part 1, Setup Mode (the team's onboarding setup, its three tests and its runbook); Part 2, Plan Mode (one new "
    "agent's plan); Part 3, Onboarding Topics (the gap check); Part 4, Compliance Defaults (with sources).",
    "",
]
for fname, label in PARTS:
    text = open(os.path.join(SKILL_DIR, "references", fname), encoding="utf-8").read()
    for a, b in SWAPS:
        text = text.replace(a, b)
    for a, b in NAMES.items():
        text = text.replace(a, b)
    lines = text.rstrip("\n").split("\n")
    title = re.sub(r"^# ", "", lines[0])
    body, fenced = [], False
    for ln in lines[1:]:
        if ln.startswith("```"):
            fenced = not fenced
        body.append(ln if fenced else re.sub(r"^(#+) ", lambda m: "#" + m.group(1) + " ", ln))
    out += [f"## {label}. {title}"] + body + [""]

text = "\n".join(out)
for bad in ("Claude", "SKILL.md", "references/"):
    if bad in text:
        raise SystemExit(f"the guide still says {bad!r}; reword it in this script")
path = os.path.join(SKILL_DIR, "chatgpt", "new-agent-onboarding-plan-guide.md")
with open(path, "w", encoding="utf-8") as f:
    f.write(text)
print("wrote", path)
