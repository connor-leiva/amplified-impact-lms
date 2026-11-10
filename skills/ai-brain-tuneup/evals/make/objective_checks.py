"""Objective checks for ai-brain-tuneup runs.

python3 skills/ai-brain-tuneup/evals/make/objective_checks.py <case-id> [output.md]

Checks: no em or en dashes; the eight sections in SKILL.md's order, ending with Check Before Sending; a bottom line of
three sentences or fewer; every quote in the Findings and Clean Memory List tables found word for word in the inputs
(a bracketed "[... removed]" label stands for the removed value); the private values never appear anywhere; the
rewrite holds a fair housing, a texting consent and a drafts-only line; the voice QUICK CARD, when the input has one,
copied into the rewrite character for character; the diff matches the rewrite in both directions (unchanged and
added lines are the rewrite; unchanged and removed lines are the original); every placeholder the rewrite adds is in
Check Before Sending; the run-again line; and every number in the output found in the inputs, today's date or a line
or finding reference, each miss listed for a person to grade. Reads PDFs with pdftotext. Writes nothing; prints a
report.
"""
import re
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
SECTIONS = ["Flags", "Bottom Line", "Findings", "Ranked Fix List", "Rewritten Project Instructions",
            "Clean Memory List", "Before and After Diff", "Check Before Sending"]
TODAY = "2026-11-10 November 10, 2026"

P = "practice/"
E1 = "evals/files/eval-1-full-messy-workspace/"
E2 = "evals/files/eval-2-style-conflict/"
CASES = {
    "practice": {
        "inputs": [P + "PRACTICE Project instructions, My Real Estate Assistant.md",
                   P + "PRACTICE Knowledge file, 2025 Business Plan.md",
                   P + "PRACTICE Knowledge file, Listing Launch Checklist Oct 2026.md",
                   P + "PRACTICE Claude memory, written out Nov 9 2026.txt"],
        "original": P + "PRACTICE Project instructions, My Real Estate Assistant.md",
        "prompt": "Tune up my Claude project. Attached are my project instructions, my two knowledge files and my memory, written out by Claude.",
        "never": ["801-555-0147", "555-0147", "0147", "801 555", "(801)"],
        "quick_card": None,
    },
    "eval-1-full-messy-workspace": {
        "inputs": [E1 + "Project instructions, Mockingdale Team Ops.txt",
                   E1 + "Instructions for Claude, copied from Settings.txt",
                   E1 + "Knowledge, Mockingdale 2025 Goals and Team Plan.pdf",
                   E1 + "Knowledge, Lead Routing and Pond Rules Sep 2026.md",
                   E1 + "Memory topics, copied from Settings.txt"],
        "original": E1 + "Project instructions, Mockingdale Team Ops.txt",
        "prompt": "Here's everything from our team ops project, plus my account instructions from Settings. My drafts keep getting things wrong. Tune it up.",
        "never": ["480-555-0182", "555-0182", "0182", "drew.pretendson@example.com", "drew.pretendson",
                  "ops@mockingdalegroup.example", "Gilbert#Sunrise25", "Sunrise25", "000111222", "3344556677", "6677"],
        "quick_card": None,
    },
    "eval-2-style-conflict": {
        "inputs": [E2 + "Project instructions, Listing Writer.md",
                   E2 + "Custom style, Quinn Casual.txt",
                   E2 + "Knowledge, Seller Update Template 2026.md",
                   E2 + "Claude memory, written out.txt"],
        "original": E2 + "Project instructions, Listing Writer.md",
        "prompt": "Here's my Listing Writer project: the instructions, my custom style, the one knowledge file and my memory. It's mostly fine, I think. Tune it up.",
        "never": ["435-555-0193", "555-0193", "0193"],
        "quick_card": E2 + "Project instructions, Listing Writer.md",
    },
}


def read(path):
    if path.suffix.lower() == ".pdf":
        return subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True).stdout
    return path.read_text(encoding="utf-8")


def section(text, title):
    """The text under one "## " heading, up to the next one; "## " lines inside code fences don't count."""
    out, inside, fence = [], False, False
    for line in text.splitlines():
        if line.startswith("```"):
            fence = not fence
        if not fence and line.startswith("## "):
            if inside:
                break
            inside = line[3:].strip() == title
            continue
        if inside:
            out.append(line)
    return "\n".join(out) + "\n"


def body_lines(text):
    """Non-blank lines of a piece, with the copy's own header (the PRACTICE FILE line) skipped."""
    return [l.rstrip() for l in text.splitlines() if l.strip() and not l.startswith("PRACTICE FILE")]


def label_pattern(s):
    """A quote or diff line as a regex: each "[... removed]" label stands for the removed value."""
    out, pos = "", 0
    for m in re.finditer(r"\[[^\]]*removed\]", s):
        out += re.escape(s[pos:m.start()]) + r".+?"
        pos = m.end()
    return out + re.escape(s[pos:])


def squash(s):
    return re.sub(r"\s+", " ", s).strip()


def main():
    case = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "output.md"
    cfg = CASES[case]
    text = (SKILL / "evals" / "runs" / case / name).read_text(encoding="utf-8")
    raw = {f: read(SKILL / f) for f in cfg["inputs"]}
    src = squash("\n".join(raw.values()))
    out = []

    def rec(label, ok, note=""):
        out.append(("PASS" if ok else "FAIL", label, note))

    rec("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", text))

    heads = re.findall(r"^## (.+?)\s*$", text, re.M)
    order = [h for h in heads if h in SECTIONS]
    rec("Sections in SKILL.md's order", order == SECTIONS, "" if order == SECTIONS else f"found: {order}")
    rec("Check Before Sending is the last section", bool(heads) and heads[-1] == "Check Before Sending")

    bl = section(text, "Bottom Line").strip()
    sentences = [s for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])", bl) if s.strip()]
    rec("Bottom line is three sentences or fewer", 0 < len(sentences) <= 3, f"{len(sentences)} sentences")

    # Quotes: every "..." in the Findings and Clean Memory List tables, in the inputs word for word.
    rows = []
    for title, cols in (("Findings", (3, 5)), ("Clean Memory List", (2,))):
        for l in section(text, title).splitlines():
            if l.startswith("|") and not re.match(r"^\|[\s|:-]+\|$", l):
                cells = l.split("|")
                rows += [cells[c] for c in cols if c < len(cells)]
    quotes, missing = [], []
    for row in rows:
        for q in re.findall(r'"([^"]{6,}?)"(?=[\s,.;:)|]|$)', row):
            if q.startswith("[") and q.endswith("]"):
                continue
            quotes.append(q)
            if not re.search(label_pattern(squash(q)), src):
                missing.append(q)
    rec("Every table quote is word for word in the inputs", bool(quotes) and not missing,
        f"{len(quotes)} quotes" + (f"; not found: {missing}" if missing else ""))

    hits = [s for s in cfg["never"] if s.lower() in text.lower()]
    rec("Private values never appear", not hits, ", ".join(hits))

    rw_block = re.search(r"```(?:text)?\n(.*?)```", section(text, "Rewritten Project Instructions"), re.S)
    rewrite = rw_block.group(1) if rw_block else ""
    low = rewrite.lower()
    rec("Rewrite has a fair housing line", "fair housing" in low)
    rec("Rewrite has a texting consent line", bool(re.search(r"text[^\n]*(agreed|told me texting|texting box)", low)))
    rec("Rewrite has a drafts-only line", "drafts only" in low)

    if cfg["quick_card"]:
        orig = raw[cfg["quick_card"]]
        m = re.search(r"QUICK CARD\n(.*?)\n\n", orig, re.S)
        card = "QUICK CARD\n" + m.group(1)
        rec("QUICK CARD copied character for character", card in rewrite, f"{len(card)} characters")

    diff_block = re.search(r"```diff\n(.*?)```", section(text, "Before and After Diff"), re.S)
    dlines = [l for l in (diff_block.group(1) if diff_block else "").splitlines() if l.strip()]
    bad_marks = [l for l in dlines if l[:2] not in ("  ", "- ", "+ ")]
    after = [l[2:] for l in dlines if l[:2] in ("  ", "+ ")]
    before = [l[2:] for l in dlines if l[:2] in ("  ", "- ")]
    rw = [l.rstrip() for l in rewrite.splitlines() if l.strip()]
    rec("Diff: unchanged and added lines are the rewrite", bool(dlines) and not bad_marks and after == rw,
        "" if after == rw else f"first difference at line {next((i for i, (a, b) in enumerate(zip(after, rw)) if a != b), min(len(after), len(rw))) + 1}")
    orig_lines = body_lines(raw[cfg["original"]])
    ok_before = len(before) == len(orig_lines) and all(re.fullmatch(label_pattern(b), o) for b, o in zip(before, orig_lines))
    rec("Diff: unchanged and removed lines are the original", ok_before,
        "" if ok_before else f"{len(before)} diff lines, {len(orig_lines)} original lines")

    orig_text = raw[cfg["original"]]
    added = [p for p in re.findall(r"\[[^\]]+\]", rewrite) if p not in orig_text]
    cbs = section(text, "Check Before Sending")
    unlisted = [p for p in added if p not in cbs]
    rec("Every added placeholder is in Check Before Sending", not unlisted, f"{len(added)} placeholders" + (f"; missing: {unlisted}" if unlisted else ""))

    rec("Run-again line in the fix list", "run the tune-up again next month" in section(text, "Ranked Fix List"))

    # Numbers.
    body = re.sub(r"^\| *[A-Z]?\d+ *\|", "|", text, flags=re.M)
    body = re.sub(r"^\s*\d+\. ", "", body, flags=re.M)
    body = re.sub(r"\b(?:lines?|L|M|F|p|page|pages|findings?|fix(?:es)?|item|items|Missing|row|rows)\s?\d+(?:\s*(?:,|to|and|-)\s*(?:L|M|F)?\d+)*", " ", body)
    body = re.sub(r"\b[MLF]\d+\b", " ", body)
    have = {n.replace(",", "") for n in re.findall(r"\d[\d,]*(?:\.\d+)?", src + " " + cfg["prompt"] + " " + TODAY)}
    found = {n.replace(",", "").rstrip(".") for n in re.findall(r"\d[\d,]*(?:\.\d+)?", body)}
    small = {str(i) for i in range(0, 13)}
    unknown = sorted((found - have - small), key=lambda s: float(s) if s.replace(".", "").isdigit() else 0)
    rec("Numbers not found in the inputs (grade each)", not unknown, ", ".join(unknown))

    print(f"Objective checks: {case} / {name}")
    for status, label, note in out:
        print(f"- {status:5} {label}" + (f": {note}" if note else ""))


if __name__ == "__main__":
    main()
