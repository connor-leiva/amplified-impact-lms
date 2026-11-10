"""Builds the ChatGPT Project files that come from the skill's references, so the two versions can't drift.

python3 skills/team-ai-brain/evals/make/build_chatgpt.py

Writes three files in chatgpt/:
- team-ai-brain-guide.md: brain-build-rules.md as Part 1 and brain-templates.md as Part 2, with every pointer
  between them rewritten and the Claude plan steps swapped for ChatGPT's.
- compliance-and-utah.md: compliance-lines.md as Part 1 and utah-team-brain-notes.md as Part 2.
- chatgpt-team-workspace.md: the ChatGPT section of claude-team-workspace.md, its ChatGPT rows of the plan table,
  its ChatGPT open questions and its ChatGPT sources.
chatgpt/instructions.md and chatgpt/paste.txt are written by hand.
"""
import re
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
REF = SKILL / "references"
OUT = SKILL / "chatgpt"
GUIDE = "team-ai-brain-guide.md"
COMPLY = "compliance-and-utah.md"
SPACE = "chatgpt-team-workspace.md"


def swap(text, pairs):
    for old, new in pairs:
        assert old in text, (old[:60],)
        text = text.replace(old, new)
    return text


def guide():
    rules = (REF / "brain-build-rules.md").read_text(encoding="utf-8")
    temps = (REF / "brain-templates.md").read_text(encoding="utf-8")
    rules = swap(rules, [
        ("# Build Rules: Reading and Sorting the Team's Documents",
         "# Team AI Brain Guide\n\nPart 1 is the build rules: reading and sorting the team's documents. Part 2 is the "
         "templates for the seven pieces of the output.\n\n# Part 1: Build Rules"),
        ("the legal facts are in `compliance-lines.md` and `utah-team-brain-notes.md`",
         f"the legal facts are in `{COMPLY}`"),
        ("An agent may paste one client's details into their own private chat for one draft, when their plan keeps that chat private (Claude Team or Enterprise chats in a project, or any agent's own project).",
         "An agent may paste one client's details into a chat in their own private project for one draft, never in a chat in the shared project."),
        ("give the plan table from `claude-team-workspace.md`, ask which plan the team uses, and write the rollout for Claude Team with one line for each other plan.",
         f"give the plan table from `{SPACE}`, ask which plan the team uses, and write the rollout for ChatGPT Business with one line for each other plan."),
        ("Read `utah-team-brain-notes.md`.", f"Read Part 2 of `{COMPLY}`."),
    ])
    temps = swap(temps, [
        ("# Templates: The Seven Pieces of a Team Brain", "# Part 2: Templates for the Seven Pieces of a Team Brain"),
        ("with the three reasons from `brain-build-rules.md` section 4", "with the three reasons from Part 1, section 4"),
        ("[fair housing line from compliance-lines.md]", f"[fair housing line from Part 1 of {COMPLY}]"),
        ("the plan's click path from `claude-team-workspace.md`.", f"the plan's steps from `{SPACE}`."),
        ("say where each agent puts it, for the team's plan (`claude-team-workspace.md`, the plan table).",
         f"say where each agent puts it, for the team's plan (`{SPACE}`, the plan table)."),
        ("cites the help center page and date from `claude-team-workspace.md`.", f"cites the help page and date from `{SPACE}`."),
        ("open each help center page in `claude-team-workspace.md`;", f"open each help page in `{SPACE}`;"),
        ("with agents on view or chat access and only the leader and ops on edit. On individual plans: send each agent the instructions, the knowledge files and the personal layer template, and the steps to make their own project.",
         "with agents on chat access and only the leader and ops on edit. Then send each agent the instructions, the knowledge files and the personal layer template, and the steps to make their own private project for client work."),
        ("on Team, Enterprise and Business plans, say chats aren't used for training by default.",
         "on Business, Enterprise and Edu, say OpenAI doesn't train on that data by default."),
        ("confirm agents are on view or chat access.", "confirm agents are on chat access."),
    ])
    return rules.rstrip() + "\n\n" + temps


def comply():
    lines = (REF / "compliance-lines.md").read_text(encoding="utf-8")
    utah = (REF / "utah-team-brain-notes.md").read_text(encoding="utf-8")
    lines = swap(lines, [
        ("# The House Lines: Compliance and Privacy Lines Agents Cannot Override",
         "# Compliance and Utah Notes\n\nPart 1 is the five house lines every team's instructions carry. Part 2 is the "
         "Utah notes, for Utah teams only.\n\n# Part 1: The House Lines Agents Cannot Override"),
        ("(see `utah-team-brain-notes.md`)", "(see Part 2)"),
        ("and in a shared ChatGPT project every member also sees every chat (`claude-team-workspace.md`).",
         f"and in a shared ChatGPT project every member also sees every chat (`{SPACE}`)."),
        ('On Claude Team and Enterprise, "Can view" keeps agents from editing the team project itself;',
         'On ChatGPT, "Can chat" access keeps agents from editing the shared project itself;'),
    ])
    utah = swap(utah, [
        ("# Utah Notes for a Team Brain", "# Part 2: Utah Notes for a Team Brain"),
        ("The drafts-only line in `compliance-lines.md`", "The drafts-only line in Part 1"),
        ("The texting consent line in `compliance-lines.md`", "The texting consent line in Part 1"),
        ("the fair housing line in `compliance-lines.md`", "the fair housing line in Part 1"),
    ])
    return lines.rstrip() + "\n\n" + utah


def space():
    text = (REF / "claude-team-workspace.md").read_text(encoding="utf-8")
    chat = re.search(r"^## ChatGPT\n(.*?)(?=^## What This Means)", text, re.M | re.S).group(1)
    table = re.search(r"^## What This Means for a Team Brain\n(.*?)(?=^## Not Confirmed)", text, re.M | re.S).group(1)
    rows = [r for r in table.splitlines() if r.startswith("|")]
    head, rule = rows[0], rows[1]
    chat_rows = [r for r in rows[2:] if r.startswith("| ChatGPT")]
    open_q = [l for l in re.search(r"^## Not Confirmed\n(.*?)(?=^## Sources)", text, re.M | re.S).group(1).splitlines()
              if "ChatGPT" in l]
    sources = [l for l in re.search(r"^## Sources\n(.*)", text, re.M | re.S).group(1).splitlines()
               if "openai" in l.lower()]
    out = (
        "# Team Workspaces in ChatGPT: What Each Plan Can Do\n\n"
        "Last verified: 2026-11-10. These facts come from search excerpts of OpenAI's help center on 2026-11-10, because "
        "help.openai.com blocks direct reads; where two versions of a page disagreed, both are given. Help pages change "
        "often: before a rollout, open the linked page and check the step. The plan table is this skill's own guidance "
        "built from these facts, not a vendor statement.\n\n"
        "## Projects and Sharing\n" + chat.split("### Projects and Sharing\n", 1)[1].rstrip() + "\n\n"
        "## What This Means for a Team Brain\n\n"
        "A shared project shows every member every chat and doesn't use members' custom instructions, so a team uses "
        "two kinds of project: the shared team project for team questions and drafts with no client details, and each "
        "agent's own project (a copy of the team instructions with their personal layer under it, plus the knowledge "
        "files) for client work.\n\n"
        + "\n".join([head, rule] + chat_rows) + "\n\n"
        "## Not Confirmed\n\n" + "\n".join(open_q + ["- The exact labels on ChatGPT's project sharing screens."]) + "\n\n"
        "## Sources\n\n" + "\n".join(sources) + "\n"
    )
    return out


def main():
    OUT.mkdir(exist_ok=True)
    for name, text in ((GUIDE, guide()), (COMPLY, comply()), (SPACE, space())):
        for bad in ("Claude", "SKILL.md", "references/", "brain-build-rules.md", "brain-templates.md",
                    "compliance-lines.md", "utah-team-brain-notes.md", "claude-team-workspace.md"):
            assert bad not in text, (name, bad)
        assert chr(0x2013) not in text and chr(0x2014) not in text, name
        (OUT / name).write_text(text, encoding="utf-8")
    print(f"wrote chatgpt/{GUIDE}, chatgpt/{COMPLY} and chatgpt/{SPACE}")


if __name__ == "__main__":
    main()
