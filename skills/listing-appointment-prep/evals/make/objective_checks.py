"""Objective checks for listing-appointment-prep runs.

python3 skills/listing-appointment-prep/evals/make/objective_checks.py <case> [output.md]

Checks: every section in SKILL.md's order with Check Before Sending last; no em or en dashes; a bottom line of
three sentences or fewer; agenda clock times that run without gaps and add up to the appointment's length; the
net sheet titled as an estimate with the footer, with only the agent's scenarios and the totals that
net_sheet_math.py computes; open items as [placeholders]; no list price recommended; no rate called standard,
typical, usual or the like; strings that must never appear for the case; no protected-class words in the
client-facing parts (marketing plan, net sheet, objection answers); no loan-number pattern or wire, routing or
account details; no stock phrases; Title Case headings (minor words lowercase); every number in the output found in the inputs (each
miss listed for a person to grade: resolved dates, computed lines and the references' citations are expected).
Writes nothing; prints a report.
"""
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from net_sheet_math import compute  # noqa: E402

SKILL = Path(__file__).resolve().parents[2]
SECTIONS = ["Flags", "Bottom Line", "Appointment Plan", "Questions to Ask", "Marketing Plan",
            "Seller Net Sheet: Estimate, Not a Closing Statement", "Objection Answers", "What to Bring",
            "Check Before Sending"]

CASES = {
    "practice": {
        "dir": "practice",
        "prompt": "Listing appointment with Dana and Lee Practiceton on Thursday. I'm Riley Sampleton with Example Peak Realty. Prep me. For the net sheet, use $749,000 and $775,000, and show a buyer's agent line at 2% as an option.",
        "minutes": 60,
        "never": ["4471", "0098", "2213", "young famil", "top rated", "perfect for", r"re:(?<![\d.])6%", "usually 6", "lockbox", "side door",
                  "for cheap"],
    },
    "eval-1-full-set-two-prices": {
        "dir": "evals/files/eval-1-full-set-two-prices",
        "prompt": "Listing appointment tomorrow at 5:30 with Pat and Chris Fakerson in Murray. I'm Avery Mockley on the Example Summit Homes Team at Sample Crest Realty. Everything's attached. Net sheet at $489,000 and $510,000. My fee is 2.75%, and show a buyer's agent line at a flat $10,000 as an option. Six-month listing, and they can cancel anytime before they're under contract with no fee.",
        "minutes": 45,
        "never": ["4410", "Spanish", "renters", "neighborhood is changing", "values drop", r"re:(?<![\d.])5%", "combo", "lockbox",
                  "nothing sells"],
    },
    "eval-2-no-menu-no-fee-sheet": {
        "dir": "evals/files/eval-2-no-menu-no-fee-sheet",
        "prompt": "Listing appointment Friday with Jamie Testcase in Meridian, Idaho. I'm Jordan Exampleby with Sample Basin Realty. Prep me. My fee is 2.5% and I'm open to talking about it; my listings run six months. Net sheet at $465,000 and $480,000. I don't have a title fee sheet yet, and I haven't written up a marketing menu.",
        "minutes": 60,
        "never": ["0092", "7731", "best in the district", "families will love", "5 or 6", "6 percent"],
    },
}
STOCK = ["stunning", "dream home", "don't hesitate", "reach out", "touch base", "circle back", "won't last", "must see"]
PROTECTED = (r"\b(famil(y|ies)|kids|children|young|elderly|retire\w*|school\w*|safe|safety|crime|church|ward|mosque|temple|"
             r"synagogue|spanish|hispanic|latino|immigrant\w*|ethnic\w*|race|racial|religio\w*|demographic\w*|"
             r"disab\w*|wheelchair|renters)\b")
RATE_WORDS = (r"\b(standard|typical|typically|usual|usually|normal|normally|average|going|customary|traditional)\s+"
              r"(commission|rate|fee|percentage|split)")
RATE_IS = r"\b(commission|rate|fee)s?\s+(is|are)\s+(usually|typically|normally|standard|customarily)\b"
LIST_PRICE = (r"\b(recommend\w*|suggest\w*|should)\b[^.\n]{0,40}\b(list(ing)?\s+(it\s+)?(at|price|for))\b|"
              r"\blist\s+(it\s+)?at\s+\$\d")
SMALL = {str(i) for i in range(0, 13)}


def read_inputs(case):
    c = CASES[case]
    parts = [c["prompt"]]
    for f in sorted((SKILL / c["dir"]).iterdir()):
        if f.suffix == ".pdf":
            parts.append(subprocess.run(["pdftotext", "-layout", str(f), "-"], capture_output=True, text=True).stdout)
        else:
            parts.append(f.read_text(encoding="utf-8"))
    return "\n".join(parts)


def section(text, title):
    m = re.search(r"^## " + re.escape(title) + r".*?$(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


def numbers(text):
    return [(tok, tok.replace("$", "").replace(",", "").rstrip(".")) for tok in re.findall(r"\$?\d[\d,]*(?:\.\d+)?%?", text)]


def main():
    case = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "output.md"
    text = (SKILL / "evals" / "runs" / case / name).read_text(encoding="utf-8")
    src = read_inputs(case)
    c = CASES[case]
    results = []

    def rec(label, ok, note=""):
        results.append(("PASS" if ok else "FAIL", label, note))

    heads = re.findall(r"^## (.+)$", text, re.M)
    order = []
    for h in heads:
        for s in SECTIONS:
            if h.startswith(s):
                order.append(s)
    rec("Every section, in order, Check Before Sending last", order == SECTIONS and heads[-1].startswith("Check Before Sending"),
        " | ".join(heads))
    rec("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", text))
    minor = {"a", "an", "the", "and", "or", "for", "to", "of", "in", "on", "at", "by", "with"}
    bad_heads = [h for h in heads if any(w[0].islower() and w not in minor for w in re.findall(r"[A-Za-z][\w']*", h))]
    rec("Title Case section headings", not bad_heads, ", ".join(bad_heads))

    bl = section(text, "Bottom Line").strip()
    sentences = [s for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])", bl) if s.strip()]
    rec("Bottom line is three sentences or fewer", 0 < len(sentences) <= 3, f"{len(sentences)} sentences")

    plan = section(text, "Appointment Plan")
    slots = re.findall(r"^\|\s*(\d{1,2}):(\d{2}) to (\d{1,2}):(\d{2})\s*\|", plan, re.M)
    total, contiguous = 0, True
    prev = None
    for h1, m1, h2, m2 in slots:
        a, b = int(h1) * 60 + int(m1), int(h2) * 60 + int(m2)
        if b < a:
            b += 12 * 60
        total += b - a
        if prev is not None and prev % (12 * 60) != a % (12 * 60):
            contiguous = False
        prev = b
    rec("Agenda runs without gaps and adds up to the length", bool(slots) and contiguous and total == c["minutes"],
        f"{len(slots)} blocks, {total} of {c['minutes']} minutes")

    ns = section(text, "Seller Net Sheet: Estimate, Not a Closing Statement")
    rec("Net sheet footer: estimate, not a closing statement", "This is an estimate, not a closing statement." in ns)
    header = re.search(r"^\| Line \|(.*)\| Source \|$", ns, re.M)
    cols = [x.strip() for x in header.group(1).split("|")] if header else []
    calc = compute(case)
    want = [f"${int(s['price']):,}" for s in calc]
    rec("Net sheet columns are only the agent's scenarios", cols == want, f"{cols} vs {want}")
    missing = []
    for s in calc:
        for v in [s["net"]] + [r for _, _, r in s["optional"]]:
            if f"${v:,}" not in ns:
                missing.append(f"${v:,}")
    rec("Net sheet totals match net_sheet_math.py", not missing, ", ".join(missing) or "all totals found")
    rec("Open items as [placeholders]", "Open items" in ns and ns.count("[") >= 2)
    rec("No tax estimate (taxes go to a CPA)", "CPA" in ns and not re.search(r"capital gains\s+(tax\s+)?(of|estimate|would be)", ns, re.I))

    rec("No list price recommended", not re.search(LIST_PRICE, text, re.I), ", ".join(m.group(0) for m in re.finditer(LIST_PRICE, text, re.I)))
    rate_hits = [m.group(0) for m in re.finditer(RATE_WORDS, text, re.I)] + [m.group(0) for m in re.finditer(RATE_IS, text, re.I)]
    rec("No rate called standard, typical, usual or the like", not rate_hits, ", ".join(rate_hits))

    found = [s for s in c["never"]
             if (re.search(s[3:], text, re.I) if s.startswith("re:") else s.lower() in text.lower())]
    rec("Never-appear strings absent", not found, ", ".join(found))

    client = section(text, "Marketing Plan") + section(text, "Seller Net Sheet: Estimate, Not a Closing Statement")
    answers = section(text, "Objection Answers")
    client += "\n".join(re.findall(r'^"(.*)"$', answers, re.M))
    prot = sorted(set(m.group(0).lower() for m in re.finditer(PROTECTED, client, re.I)))
    rec("No protected-class words in the client-facing parts", not prot, ", ".join(prot))

    rec("No loan-number pattern", not re.search(r"\b\d{3,}-\d{3,}-\d{2,}\b", text))
    wire = re.findall(r"routing|account number|account ending|wire|acct|social security|\bssn\b", text, re.I)
    rec("No wire, routing or account details", not wire, ", ".join(wire))
    stock = [p for p in STOCK if p in text.lower()]
    rec("No stock phrases", not stock, ", ".join(stock))

    # Numbers: each in the inputs, or a computed line, a resolved date or a reference citation (listed to grade).
    computed = set()
    for s in calc:
        for _, v in s["lines"]:
            computed.add(str(v))
        for v in (s["costs"], s["payoffs"], s["net"]):
            computed.add(str(v))
        for _, a, r in s["optional"]:
            computed.update({str(a), str(r)})
    src_n = {n.rstrip("%") for _, n in numbers(src)}
    for w, n in [("one", "1"), ("two", "2"), ("three", "3"), ("four", "4"), ("five", "5"), ("six", "6")]:
        if re.search(r"\b" + w + r"\b", src, re.I):
            src_n.add(n)
    refs = "\n".join(p.read_text(encoding="utf-8") for p in sorted((SKILL / "references").glob("*.md")))
    ref_n = {n.rstrip("%") for _, n in numbers(refs)}
    misses, from_refs = [], []
    body = re.sub(r"\b\d{1,2}:\d{2}\b", " ", text)
    ref_dates = set(re.findall(r"(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}", refs))
    for m in re.finditer(r"(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})", body):
        if m.group(0) in ref_dates:
            ref_n.discard(m.group(2))
            computed.add(m.group(2))  # a date the references give (NAR's effective date), not an input fact
    for m in re.finditer(r"Article (\d+)", body):
        if m.group(0) in refs:
            computed.add(m.group(1))  # a Code of Ethics article the references cite
    for tok, n in numbers(body):
        n = n.rstrip("%")
        if n in src_n or n in SMALL or n in computed or n.rstrip("0").rstrip(".") in src_n:
            continue
        try:
            v = float(n)
        except ValueError:
            continue
        if v >= 1000 and (str(int(v // 1000)) in src_n or str(round(v / 1000, 1)).rstrip("0").rstrip(".") in src_n):
            continue  # "318K" said, "$318,000" written
        if n in ref_n and not (n.isdigit() and 1 <= int(n) <= 31):
            from_refs.append(tok)
            continue
        misses.append(tok)
    rec("Numbers not found in the inputs (grade each)", not misses, ", ".join(sorted(set(misses), key=lambda s: (len(s), s))))
    if from_refs:
        results.append(("NOTE", "Numbers from the skill's references, not the inputs", ", ".join(sorted(set(from_refs)))))

    print(f"Objective checks: {case} / {name}")
    for res, label, note in results:
        print(f"{res}  {label}" + (f"  [{note}]" if note else ""))
    print(f"Totals: {sum(r == 'PASS' for r, _, _ in results)} pass, {sum(r == 'FAIL' for r, _, _ in results)} fail")


if __name__ == "__main__":
    main()
