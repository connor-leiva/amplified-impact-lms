"""Objective checks for market-update-email runs.

python3 skills/market-update-email/evals/make/objective_checks.py <case-id> [output.md]

Checks: no em or en dashes; the output's sections in order; a Title Case subject; the email body 250 words or
fewer and the post 120 or fewer; the source line and the footer; no prediction or advice words and no fair housing
words in the drafts; every number in the drafts is in the Numbers I Used table; every arithmetic line in the table
is right (recomputed here); every number in the output is in the input or is a result shown in the table's
arithmetic (each miss listed for a person to grade); strings that must never appear for the case. Reads PDFs with
pdftotext. Writes nothing; prints a report.
"""
import re
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
CASES = {
    "practice": {
        "files": ["practice/PRACTICE Sampleton County Market Report October 2026.pdf",
                  "practice/PRACTICE Sampleton County Stats Export Oct 2025 to Oct 2026.csv"],
        "prompt": "Here's my MLS's October report for Sampleton County and the stats export. I'm Riley Sampleton with Example Peak Realty. Write my October market update email and a social post.",
        "never_in_drafts": ["13.3", "612,000", "Fakeburg"],
    },
    "eval-1-mls-report-pdf": {
        "files": ["evals/files/eval-1-mls-report-pdf/Example Desert MLS Monthly Indicators October 2026.pdf"],
        "prompt": "",
        "never_in_drafts": ["6.38", "1.4%", "38.0", "Example Butte", "5% in 2027", "Jordan Placeholder", "list-to-sale"],
        "never_anywhere": ["3.8 months", "3.80"],
    },
    "eval-2-csv-missing-metric-odd-row": {
        "files": ["evals/files/eval-2-csv-missing-metric-odd-row/fakeland-mls-stats-export-mockingbird-valley.csv"],
        "prompt": "I'm Riley Sampleton, Example Peak Realty.",
        "never_in_drafts": ["4,710,000", "1,262", "498,200", "507,100", "October 2025", "last October", "a year earlier"],
        "never_anywhere_re": [r"\d[\d.]*\s*months? of supply", r"\d[\d,]*\s+active listings", r"inventory (?:was|of) \d"],
    },
    "eval-3-pasted-numbers-prediction-ask": {
        "files": [],
        "prompt": "Quick one, no file. My board's numbers for Samplewood this month: median price 712k, last year 689k. 41 homes sold, 36 last year. Average days on market 29. I'm Kendall Example with Sample Summit Realty in Utah.",
        "never_in_drafts": ["school", "rates", "great time", "October"],
    },
}
SECTIONS = ["Bottom Line", "What I Used", "Numbers I Used", "Email Draft", "Social Post Draft", "Check Before Sending"]
PREDICT = r"\b(will|won't|going to|expect\w*|forecast\w*|predict\w*|project\w*|poised|on track|set to|likely|bound to|next year|by spring|ahead of the rush|before (?:prices|rates)|don't wait|act now|won't last|(?:good|great|right) time to|buyer's market|seller's market|hot market|cooling|crash\w*|bubble)\b"
FAIR = r"\b(schools?|safe|safety|crime|(?<!single-)famil\w*|kids|children|demographic\w*|up-and-coming|desirable|exclusive|quiet)\b"
STOCK = ["stunning", "dream home", "don't hesitate", "reach out", "touch base", "circle back"]
SMALL = {str(i) for i in range(0, 13)}
NUM = r"(?<![A-Za-z\d.])\$?\d[\d,]*(?:\.\d+)?"


def read_input(rel):
    path = SKILL / rel
    if path.suffix == ".pdf":
        return subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True, check=True).stdout
    text = path.read_text(encoding="utf-8")
    if path.suffix == ".csv":  # a CSV's values carry no thousands separators: split the fields apart
        text = text.replace(",", " ")
    return text


def section(text, title):
    m = re.search(r"^## " + re.escape(title) + r"[^\n]*\n(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


def norm(tok):
    return tok.replace("$", "").replace(",", "").rstrip(".")


def nums(text):
    return [(t, norm(t)) for t in re.findall(NUM, text)]


def f(s):
    return float(s.replace(",", ""))


def check_arithmetic(cells):
    """Recompute every arithmetic line the table shows. Returns (checked, failures)."""
    checked, bad = 0, []
    for cell in cells:
        for m in re.finditer(r"\(([\d,.]+) minus ([\d,.]+)\) ÷ ([\d,.]+) × 100 = (minus )?([\d.]+)%", cell):
            a, b, c, neg, r = f(m.group(1)), f(m.group(2)), f(m.group(3)), m.group(4), float(m.group(5))
            want = (a - b) / c * 100
            checked += 1
            if abs(want - (-r if neg else r)) > 0.006:
                bad.append(f"{m.group(0)} (is {want:.2f})")
            shown = re.search(re.escape(m.group(0)) + r", shown as ([\d.]+)%", cell)
            if shown:
                checked += 1
                if abs(round(abs(want), 1) - float(shown.group(1))) > 1e-9:
                    bad.append(f"shown as {shown.group(1)}% (rounds to {round(abs(want), 1)})")
        for m in re.finditer(r"(?<![(\d,.])([\d,.]+)(?: [a-z ]+?)? ÷ ([\d,.]+)(?: [a-z ]+?)?( × 100)? = ([\d.]+)%?", cell):
            a, b, pct, r = f(m.group(1)), f(m.group(2)), m.group(3), float(m.group(4))
            want = a / b * (100 if pct else 1)
            checked += 1
            if abs(want - r) > 0.006:
                bad.append(f"{m.group(0)} (is {want:.2f})")
            shown = re.search(re.escape(m.group(0)) + r", shown as ([\d.]+)", cell)
            if shown:
                checked += 1
                if abs(round(want, 1) - float(shown.group(1))) > 1e-9:
                    bad.append(f"shown as {shown.group(1)} (rounds to {round(want, 1)})")
        for m in re.finditer(r"(?<![(\d,.])([\d,.]+) minus ([\d,.]+) = (minus )?([\d.]+)", cell):
            a, b, neg, r = f(m.group(1)), f(m.group(2)), m.group(3), float(m.group(4))
            checked += 1
            if abs((a - b) - (-r if neg else r)) > 0.006:
                bad.append(f"{m.group(0)} (is {a - b:.2f})")
    return checked, bad


def main():
    case = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "output.md"
    cfg = CASES[case]
    text = (SKILL / "evals" / "runs" / case / name).read_text(encoding="utf-8")
    src = "\n".join(read_input(r) for r in cfg["files"]) + "\n" + cfg["prompt"]
    results = []

    def rec(label, ok, note=""):
        results.append((label, "PASS" if ok else "FAIL", note))

    rec("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", text))

    pos = [text.find("## " + s) for s in SECTIONS]
    rec("Sections present, in order", all(p >= 0 for p in pos) and pos == sorted(pos),
        ", ".join(s for s, p in zip(SECTIONS, pos) if p < 0))

    email = section(text, "Email Draft")
    post = section(text, "Social Post Draft")
    subj = re.search(r"\*\*Subject:\*\*\s*(.+)", email)
    if subj:
        words = re.findall(r"[A-Za-z][\w']*", re.sub(r"\[[^\]]*\]", "", subj.group(1)))
        low = [w for w in words if w[0].islower()]
        rec("Title Case subject", not low, subj.group(1).strip() + (f" (lowercase: {low})" if low else ""))
    else:
        rec("Title Case subject", False, "no subject line")

    body = re.split(r"\*\*Subject:\*\*.*\n", email, maxsplit=1)[-1]
    body = body.split("Based on information from")[0]
    body_words = re.findall(r"[A-Za-z0-9$\[][\w$',.%\]]*", body)
    rec("Email body 250 words or fewer (sign-off included)", 0 < len(body_words) <= 250, f"{len(body_words)} words")
    post_words = re.findall(r"[A-Za-z0-9$\[][\w$',.%\]:]*", post)
    rec("Post 120 words or fewer", 0 < len(post_words) <= 120, f"{len(post_words)} words")

    rec("Email source line", "Based on information from" in email)
    rec("Post source line", "Source:" in post)
    rec("Email footer: opt-out and postal address", "UNSUBSCRIBE" in email and "[Sender Postal Address]" in email)

    drafts = email + "\n" + post
    pred = sorted(set(m.group(0).lower() for m in re.finditer(PREDICT, drafts, re.I)))
    rec("No prediction or advice words in the drafts", not pred, ", ".join(pred))
    fair = sorted(set(m.group(0).lower() for m in re.finditer(FAIR, drafts, re.I)))
    rec("No fair housing words in the drafts", not fair, ", ".join(fair))
    stock = [s for s in STOCK if s in drafts.lower()]
    rec("No stock phrases in the drafts", not stock, ", ".join(stock))
    rec("No exclamation points in the drafts", "!" not in drafts)

    table = section(text, "Numbers I Used")
    rows = [r for r in table.splitlines() if re.match(r"\|\s*N\d+\s*\|", r)]
    values = " ".join(r.split("|")[3] for r in rows)
    arith = [r.split("|")[6] for r in rows if len(r.split("|")) > 6]
    value_nums = {n for _, n in nums(values)}
    src_nums = {n for _, n in nums(src)}
    for k in re.findall(r"\b(\d+)k\b", src):
        src_nums.add(str(int(k) * 1000))
    computed = {n for _, n in nums(" ".join(arith))}

    # Every number in the drafts is a value in the table (dates and the source line's days excepted).
    draft_plain = re.sub(r"(?:Based on information from|Source:)[^\n]*", " ", drafts)
    draft_plain = re.sub(r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)(?: \d{1,2},)? \d{4}\b", " ", draft_plain)
    missing = sorted({t for t, n in nums(draft_plain) if n not in value_nums and n not in SMALL}, key=lambda s: (len(s), s))
    rec("Every number in the drafts is in the Numbers I Used table", not missing, ", ".join(missing))

    checked, bad = check_arithmetic(arith)
    rec("Every arithmetic line in the table is right", checked > 0 and not bad, f"{checked} checked" + ("; " + "; ".join(bad) if bad else ""))

    refs = "\n".join(p.read_text(encoding="utf-8") for p in sorted((SKILL / "references").glob("*.md")))
    ref_nums = {n for _, n in nums(refs)}
    misses, from_refs = [], []
    for t, n in nums(text):
        if n in src_nums or n in computed or n in SMALL:
            continue
        (from_refs if n in ref_nums else misses).append(t)
    rec("Numbers not found in the input or the table's arithmetic (grade each)", not misses,
        ", ".join(sorted(set(misses), key=lambda s: (len(s), s))))
    if from_refs:
        results.append(("Numbers from the skill's references, not the input", "NOTE", ", ".join(sorted(set(from_refs)))))

    found = [s for s in cfg.get("never_in_drafts", []) if s.lower() in drafts.lower()]
    rec("Never-in-drafts strings absent", not found, ", ".join(found))
    anywhere = [s for s in cfg.get("never_anywhere", []) if s.lower() in text.lower()]
    anywhere += [p for p in cfg.get("never_anywhere_re", []) if re.search(p, text, re.I)]
    if cfg.get("never_anywhere") or cfg.get("never_anywhere_re"):
        rec("Never-anywhere strings absent", not anywhere, ", ".join(anywhere))

    rec("Check Before Sending names N numbers", bool(re.search(r"\bN\d+\b", section(text, "Check Before Sending"))))
    wire = re.findall(r"routing|account number|wire|acct", text, re.I)
    rec("No wire or account details", not wire, ", ".join(wire))

    print(f"Objective checks: {case} / {name}")
    for label, res, note in results:
        print(f"- {res}  {label}" + (f": {note}" if note else ""))


if __name__ == "__main__":
    main()
