"""Objective checks for ai-brain-setup runs.

python3 skills/ai-brain-setup/evals/make/objective_checks.py <case-id> [output.md]

Build runs (practice, eval-1, eval-2): no em or en dashes; the output's sections in SKILL.md's order; a Paste into
line above every block; the seven house compliance lines word for word; the Utah Lines word for word in Utah mode
or "State rules were not checked." in general mode; How I Like to Work under 1,500 characters before MY VOICE;
the QUICK CARD word for word when one was given; Project Instructions under about 4,000 characters; no placeholder
in Facts to Remember; every placeholder in the blocks listed in Still To Fill In; strings that must never appear
for the case; no email address or phone number anywhere; Title Case section headings; a Check Before Pasting
section (this skill's Check before sending); every number in the output found in the inputs or the references
(each miss listed for a person to grade). There are no email subject lines in this skill's output.

The interview run (eval-3): round 1 only, in the guide's words, after the privacy line, with nothing built.
Writes nothing; prints a report.
"""
import re
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
RUN_DATE = "2026-11-10 November 10, 2026 Tuesday"
CASES = {
    "practice": {
        "inputs": ["practice/PRACTICE Interview answers, Juniper Mockwell.md",
                   "practice/PRACTICE Voice profile QUICK CARD, Juniper Mockwell.md"],
        "prompt": "Here are my interview answers and my voice QUICK CARD. Set up my AI brain.",
        "card": "practice/PRACTICE Voice profile QUICK CARD, Juniper Mockwell.md",
        "utah": True, "crm": "Follow Up Boss",
        "never": ["young families"],
    },
    "eval-1-team-leader-full": {
        "inputs": ["evals/files/eval-1-team-leader-full/Interview answers, Sloane Testerfield.md",
                   "evals/files/eval-1-team-leader-full/Voice profile QUICK CARD, Sloane Testerfield.md"],
        "prompt": "Here are my answers to your AI brain questions and my voice QUICK CARD. Set up my AI brain.",
        "card": "evals/files/eval-1-team-leader-full/Voice profile QUICK CARD, Sloane Testerfield.md",
        "utah": True, "crm": "Follow Up Boss",
        "never": ["maternity", "Kenzie", "Theo", "February", "Brightwater", "Example Summit"],
    },
    "eval-2-sparse-login-clients": {
        "inputs": ["evals/files/eval-2-sparse-login-clients/Pasted chat message, Casey.txt"],
        "prompt": "",
        "card": None,
        "utah": False, "crm": "Follow Up Boss",
        "never": ["casey.notreal", "example.test", "Bl0ckbuster", "Blockbuster", "Fake-77", "Hunter",
                  "Dana", "Notreal", "Pat Sampleton", "Sampleton", "Lee Mockberry", "Mockberry",
                  "555-01", "0143", "0178", "0119"],
    },
}
SECTIONS = ["Flags", "Bottom Line", "Where Everything Goes", "Block 1: How I Like to Work",
            "Block 2: Project Instructions", "Block 3: About My Business", "Block 4: Facts to Remember",
            "Your Voice", "Still To Fill In", "Check Before Pasting"]
LITERAL = {"[placeholder]", "[VERIFY: what's needed]"}
SMALL = {str(n) for n in range(0, 13)}
MINOR = {"a", "an", "and", "the", "to", "of", "in", "on", "for", "or", "at", "by"}


def section(text, title):
    m = re.search(r"^## " + re.escape(title) + r"\s*$(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


def code(sec):
    m = re.search(r"```\n(.*?)```", sec, re.S)
    return m.group(1) if m else ""


def numbers(text):
    return [t.replace(",", "").rstrip(".") for t in re.findall(r"\d[\d,]*(?:\.\d+)?", text)]


def build_checks(case, text, rec):
    cfg = CASES[case]
    src = "\n".join((SKILL / f).read_text(encoding="utf-8") for f in cfg["inputs"]) + "\n" + cfg["prompt"] + "\n" + RUN_DATE
    templates = (SKILL / "references" / "brain-templates.md").read_text(encoding="utf-8")
    utah = (SKILL / "references" / "utah-brain-notes.md").read_text(encoding="utf-8")
    refs = "\n".join(p.read_text(encoding="utf-8") for p in sorted((SKILL / "references").glob("*.md")))

    heads = re.findall(r"^## (.+?)\s*$", text, re.M)
    want = [s for s in SECTIONS if s in heads]
    order_ok = [h for h in heads if h in SECTIONS] == want and all(s in heads for s in SECTIONS if s != "Flags")
    rec("Sections in SKILL.md's order", order_ok, " / ".join(heads))

    blocks = {}
    for title in SECTIONS[3:7]:
        sec = section(text, title)
        blocks[title] = code(sec)
        m = re.search(r"\*\*Paste into:\*\*(.+?)\n\n```", sec, re.S)
        rec(f"Paste into line above {title}", bool(m), (m.group(1).strip()[:90] + "...") if m else "missing")

    b1, b2, b3, b4 = (blocks[t] for t in SECTIONS[3:7])
    comp = re.search(r"COMPLIANCE \(follow every line, every time\)\n(.*?)\n\n", templates, re.S).group(1)
    comp = comp.replace("[CRM]", cfg["crm"])
    lines = comp.splitlines()
    missing = [l[:40] for l in lines if l not in b2]
    rec("Seven house compliance lines, word for word", len(lines) == 7 and not missing, ", ".join(missing))

    if cfg["utah"]:
        ut = re.search(r"```\n(UTAH .*?)```", utah, re.S).group(1).strip()
        rec("Utah Lines, word for word, under STATE RULES", ut in b2)
        rec("13-25a-111 cited with 13-25a-103; Sunday and holiday care marked house practice",
            "13-25a-111" in b2 and "13-25a-103" in b2 and "house practice" in b2)
    else:
        rec("General mode: State rules were not checked", "State rules were not checked." in b2 and "not checked" in section(text, "Flags"))

    before_voice = b1.split("MY VOICE (QUICK CARD)")[0].rstrip()
    rec("How I Like to Work under 1,500 characters before MY VOICE", len(before_voice) < 1500, f"{len(before_voice)} characters")
    if cfg["card"]:
        card = (SKILL / cfg["card"]).read_text(encoding="utf-8")
        card = card[card.index("Write as me."):].strip()
        rec("QUICK CARD word for word under MY VOICE", card in b1.split("MY VOICE (QUICK CARD)")[-1])
    else:
        rec("No QUICK CARD: points to amplifiedimpact.io/voice-profile", "amplifiedimpact.io/voice-profile" in section(text, "Your Voice"))
    rec("Project Instructions under about 4,000 characters", len(b2) <= 4000, f"{len(b2)} characters")
    rec("No placeholder in Facts to Remember", "[" not in b4)

    found = set(re.findall(r"\[[^\[\]\n]*(?:\[[^\[\]\n]*\][^\[\]\n]*)?\]", b1 + b2 + b3 + b4)) - LITERAL
    todo = section(text, "Still To Fill In")
    unlisted = sorted(p for p in found if p not in todo)
    rec("Every placeholder in the blocks is in Still To Fill In", not unlisted, ", ".join(unlisted) or f"{len(found)} distinct")

    hits = [s for s in cfg["never"] if s.lower() in text.lower()]
    rec("Never-appear strings absent", not hits, ", ".join(hits))
    contact = re.findall(r"[\w.+-]+@[\w-]+\.[\w.]+|\b\d{3}[-. )]+\d{3}[-. ]\d{4}\b", text)
    rec("No email address or phone number anywhere", not contact, ", ".join(contact))

    bad_heads = []
    for h in heads:
        words = re.findall(r"[A-Za-z][\w']*", h.split(":")[-1])
        bad_heads += [w for i, w in enumerate(words) if w[0].islower() and (i == 0 or w not in MINOR)]
    rec("Title Case section headings", not bad_heads, ", ".join(bad_heads))
    rec("Check Before Pasting section (this skill's Check before sending)", bool(section(text, "Check Before Pasting").strip()))
    rec("Title Case subject lines", True, "N/A: this skill writes no email subject lines")

    src_nums = set(numbers(src))
    ref_nums = set(numbers(refs))
    misses, from_refs = [], []
    for n in numbers(text):
        if n in src_nums or n in SMALL:
            continue
        if n in ref_nums:
            from_refs.append(n)
            continue
        misses.append(n)
    rec("Numbers not found in the inputs or references (grade each)", not misses, ", ".join(sorted(set(misses), key=lambda s: (len(s), s))))
    if from_refs:
        rec("Numbers from the skill's references (statutes, dates, limits)", True, ", ".join(sorted(set(from_refs), key=lambda s: (len(s), s))))


def interview_checks(text, rec):
    templates = (SKILL / "references" / "brain-templates.md").read_text(encoding="utf-8")
    privacy = re.search(r"\*\*Privacy line \(say it once, before round 1\):\*\* \"(.+?)\"", templates).group(1)
    round1 = re.search(r"\*\*Round 1: You\*\*\n(.*?)\n\n", templates, re.S).group(1).splitlines()
    rec("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", text))
    rec("Privacy line word for word", privacy in text)
    rec("Privacy line before the questions", privacy in text and text.index(privacy) < text.index(round1[0]))
    rec("Round 1's four questions, word for word", all(q in text for q in round1))
    asked = re.findall(r"^\d+\. ", text, re.M)
    rec("No questions from later rounds", len(asked) == 4, f"{len(asked)} numbered questions")
    rec("Skip is allowed and becomes a placeholder", "skip" in text.lower() and "[placeholder]" in text)
    rec("Nothing built", "Paste into" not in text and "```" not in text and "COMPLIANCE" not in text)


def main():
    case = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "output.md"
    text = (SKILL / "evals" / "runs" / case / name).read_text(encoding="utf-8")
    results = []

    def rec(label, ok, note=""):
        results.append((label, "PASS" if ok else "FAIL", note))

    if case == "eval-3-cold-start-interview":
        interview_checks(text, rec)
    else:
        rec("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", text))
        build_checks(case, text, rec)
    print(f"Objective checks: {case} / {name}")
    for label, res, note in results:
        print(f"- {res}  {label}" + (f": {note}" if note else ""))


if __name__ == "__main__":
    main()
