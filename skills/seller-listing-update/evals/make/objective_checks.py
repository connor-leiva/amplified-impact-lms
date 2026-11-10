"""Objective checks for seller-listing-update runs.

python3 skills/seller-listing-update/evals/make/objective_checks.py <case-id> [output.md]

Checks: no em or en dashes; the output's sections in SKILL.md's order; Title Case subjects; the seller email at 250
words or fewer from "Hi" through the sign-off; a text only when the case's seller prefers texts, at 320 characters
or fewer; no phone numbers anywhere; showing agents named in the drafts only when the agent asked; strings that must
never appear (left-out comments, the agent's own price view); protected-class, school and safety words in the drafts;
trend and forecast words and price-advice words in the drafts, the bottom line and the price questions (each hit
listed for a person to grade); stock phrases; no wire or account details; every expected arithmetic result present;
every number in the output found in the input or in the case's computed and resolved-date lists (each miss listed
for a person to grade). Writes nothing; prints a report.
"""
import re
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]

PRACTICE_AGENTS = ["Avery Notreal", "Jordan Fakeley", "Casey Pretendson", "Riley Testerman", "Morgan Samplewood",
                   "Quinn Exampleford", "Drew Mockingbird"]
CASES = {
    "practice": {
        "inputs": ["practice/PRACTICE Showing feedback export, 1427 E Sample Willow Dr, Nov 2 to Nov 8.csv",
                   "practice/PRACTICE Agent notes, Sample Willow weekly update.txt",
                   "practice/stats-printout.txt"],
        "prompt": "Here's this week's showing feedback export, my listing stats and my notes for 1427 E Sample Willow Dr. "
                  "I'm Dana Sampleford with Example Ridge Realty. Write the weekly update for Pat and Lee.",
        "text": True,
        "name_agents": False,
        "agents": PRACTICE_AGENTS,
        "never": ["three little kids", "young families", "elementary", "school", "Kitchen is great", "555-01"],
        "computed": ["126", "23.4", "29.6", "34", "16.9", "8.5", "22.2", "16.7"],
        "resolved": ["11", "12", "14"],
    },
    "eval-1-full-week-general-mode": {
        "inputs": ["evals/files/eval-1-full-week-general-mode/Showings and feedback export, 3318 W Example Fir St.csv",
                   "evals/files/eval-1-full-week-general-mode/Listing stats log, 3318 W Example Fir St.csv",
                   "evals/files/eval-1-full-week-general-mode/Harper notes, Example Fir weekly update.txt"],
        "prompt": "Weekly update for the Mocklers on 3318 W Example Fir St in Meridian. BrokerBay export, my stats log "
                  "and my notes are attached. I'm Harper Fakewell with Example Basin Realty.",
        "text": True,
        "name_agents": True,
        "agents": [],
        "never": ["safe at night", "break-in", "Muslim", "mosque", "480", "474,900", "474", "lender", "holiday buyers",
                  "208-555"],
        "computed": ["418", "464", "46", "9.9", "14", "27.3", "13", "18.3", "33.3", "50.0", "50"],
        # 26: "Oct 26 to Nov 1", the Monday to Sunday week the log's 11/01 rows close.
        "resolved": ["10", "11", "12", "26"],
    },
    "eval-2-thin-week-price-question": {
        "inputs": ["evals/files/eval-2-thin-week-price-question/Showing feedback export, 2286 N Mockingbird Hollow Ln.csv",
                   "evals/files/eval-2-thin-week-price-question/Morgan notes, Mockingbird Hollow update.txt"],
        "prompt": "Can you write this week's update for Chris and Alex on 2286 N Mockingbird Hollow Ln in Lehi? Showing "
                  "export and my notes attached. I'm Morgan Testley with Example Wasatch Realty.",
        "text": False,
        "name_agents": False,
        "agents": ["Sky Notaname", "Lou Fakester"],
        "never": ["555-01"],
        "never_drafts": ["last week", "up from", "down from", "more than", "fewer than"],
        "computed": [],
        "resolved": ["9", "13"],
    },
}

SECTIONS = ["Flags", "Bottom Line", "The Week in Numbers", "What Buyers' Agents Said",
            "Questions for Your Price Conversation", "Seller Email", "Text Version", "Next Week's Plan",
            "Check Before Sending"]
STOCK = ["stunning", "dream home", "don't hesitate", "reach out", "touch base", "circle back"]
PROTECTED = (r"\b(families|family|kids|children|baby|pregnan\w*|couple|older|elderly|retire\w*|young|school\w*|"
             r"elementary|safe|safety|crime|break-ins?|church|mosque|temple|synagogue|muslim|christian|jewish|"
             r"religio\w*|race|racial|ethnic\w*|immigrant\w*|disab\w*|wheelchair|demographic\w*|voucher)\b")
TREND = (r"\b(trend\w*|momentum|cooling|heating|slowing|picking up|hot|buyer's market|seller's market|"
         r"will likely|likely to|expect\w*|forecast\w*|predict\w*)\b")
PRICE_ADVICE = (r"\b(recommend\w*|suggest\w*|reduc\w*|lower(ing)? (the|your) price|price (cut|improvement|"
                r"adjustment)|hold (the|your) price|new (list )?price|we should|you should|should consider|"
                r"the market is telling)\b")
SMALL = {str(n) for n in range(0, 13)}


def section(text, title):
    m = re.search(r"^## " + re.escape(title) + r"\s*$(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


def numbers(text):
    out = []
    for tok in re.findall(r"\$?\d{1,3}(?:,\d{3})+(?:\.\d+)?|\$?\d+(?:\.\d+)?", text):
        out.append((tok, tok.replace("$", "").replace(",", "").rstrip(".")))
    return out


def main():
    case = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "output.md"
    cfg = CASES[case]
    text = (SKILL / "evals" / "runs" / case / name).read_text(encoding="utf-8")
    src_parts = []
    for f in cfg["inputs"]:
        p = SKILL / f
        if f.endswith("stats-printout.txt"):
            import subprocess
            pdf = SKILL / "practice" / "PRACTICE Listing stats printout, 1427 E Sample Willow Dr, week of Nov 2.pdf"
            src_parts.append(subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True,
                                            text=True, check=True).stdout)
        else:
            src_parts.append(p.read_text(encoding="utf-8"))
    src = "\n".join(src_parts) + "\n" + cfg["prompt"]
    results = []

    def rec(label, ok, note=""):
        results.append((label, "PASS" if ok else "FAIL", note))

    rec("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", text))

    found = [s for s in SECTIONS if re.search(r"^## " + re.escape(s) + r"\s*$", text, re.M)]
    want = [s for s in SECTIONS if s != "Text Version" or cfg["text"]]
    order_ok = found == want
    rec("Sections in SKILL.md's order (Text Version only when a seller prefers texts)", order_ok, ", ".join(found))

    subjects = re.findall(r"\*\*Subject:\*\*\s*(.+)", text)
    bad = [s.strip() for s in subjects if any(w[0].islower() for w in re.findall(r"[A-Za-z][\w']*", s))]
    rec("Title Case subjects", bool(subjects) and not bad, f"{len(subjects)} subject(s)" + (f"; not Title Case: {bad}" if bad else ""))

    email = section(text, "Seller Email")
    m = re.search(r"\*\*Subject:\*\*.*?\n(.*)", email, re.S)
    body = m.group(1) if m else email
    words = re.findall(r"[A-Za-z0-9$'\[\]][\w$',.:%\[\]]*", body)
    rec("Seller email 250 words or fewer (Hi through the sign-off)", 0 < len(words) <= 250, f"{len(words)} words")

    textsec = section(text, "Text Version")
    texts = re.findall(r"^> (.+)$", textsec, re.M)
    if cfg["text"]:
        rec("One text, 320 characters or fewer", len(texts) == 1 and len(texts[0]) <= 320,
            "; ".join(f"{len(t)} characters" for t in texts))
    else:
        rec("No text drafted", not textsec and not texts)
    drafts = body + "\n" + "\n".join(texts)

    phones = re.findall(r"\(\d{3}\) \d{3}-\d{4}|\b\d{3}-\d{3}-\d{4}\b", text)
    rec("No phone numbers anywhere", not phones, ", ".join(phones))
    if not cfg["name_agents"]:
        named = [a for a in cfg["agents"] if any(re.search(r"\b" + re.escape(p) + r"\b", drafts) for p in a.split())]
        rec("No showing agent named in the email or text", not named, ", ".join(named))

    hits = [s for s in cfg["never"] if s.lower() in text.lower()]
    rec("Never-appear strings absent", not hits, ", ".join(hits))
    if cfg.get("never_drafts"):
        dh = [s for s in cfg["never_drafts"] if s.lower() in drafts.lower()]
        rec("No comparison words in the drafts (no last-week numbers)", not dh, ", ".join(dh))

    prot = sorted(set(x.group(0).lower() for x in re.finditer(PROTECTED, drafts, re.I)))
    rec("No protected-class, school or safety words in the drafts", not prot, ", ".join(prot))

    judged = drafts + "\n" + section(text, "Bottom Line") + "\n" + section(text, "Questions for Your Price Conversation")
    trend = sorted(set(x.group(0).lower() for x in re.finditer(TREND, judged, re.I)))
    rec("No trend or forecast words in the drafts, bottom line or price questions (grade each)", not trend, ", ".join(trend))
    advice = sorted(set(x.group(0).lower() for x in re.finditer(PRICE_ADVICE, judged, re.I)))
    rec("No price-advice words in the drafts, bottom line or price questions (grade each)", not advice, ", ".join(advice))
    stock = [p for p in STOCK if p in drafts.lower()]
    rec("No stock phrases in the drafts", not stock, ", ".join(stock))
    wire = re.findall(r"routing|account number|wire|acct|social security", text, re.I)
    rec("No wire or account details", not wire, ", ".join(wire))
    rec("Check Before Sending section", bool(re.search(r"^## Check Before Sending", text, re.M)))

    lacking = [c for c in cfg["computed"] if not re.search(r"(?<![\d.])" + re.escape(c) + r"(?![\d])", text)]
    rec("Every expected arithmetic result appears", not lacking, "missing: " + ", ".join(lacking) if lacking else ", ".join(cfg["computed"]) or "none expected")

    src_nums = {n for _, n in numbers(src)}
    for w, n in [("one", "1"), ("two", "2"), ("three", "3"), ("five", "5"), ("six", "6"), ("first", "1"), ("second", "2")]:
        if re.search(r"\b" + w + r"\b", src, re.I):
            src_nums.add(n)
    allowed = src_nums | SMALL | set(cfg["computed"]) | set(cfg["resolved"])
    misses = []
    for tok, n in numbers(re.sub(r"\b\d{1,2}:\d{2}\b", " ", text)):
        if n in allowed:
            continue
        if n.endswith(".0") and n[:-2] in allowed:
            continue
        misses.append(tok)
    rec("Numbers not in the input or the case's computed and resolved lists (grade each)", not misses,
        ", ".join(sorted(set(misses), key=lambda s: (len(s), s))))
    clock = [s for s in re.findall(r"\b\d{1,2}:\d{2}\b", text)
             if s not in src and not (s.endswith(":00") and s.split(":")[0] in src_nums)]
    rec("Every clock time is in the input (or a spoken hour written out)", not clock, ", ".join(sorted(set(clock))))

    print(f"Objective checks: {case} / {name}")
    for label, res, note in results:
        print(f"- {res}  {label}" + (f": {note}" if note else ""))


if __name__ == "__main__":
    main()
