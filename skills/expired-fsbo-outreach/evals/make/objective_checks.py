"""Objective checks for expired-fsbo-outreach runs.

python3 skills/expired-fsbo-outreach/evals/make/objective_checks.py <case-id> [output.md]

Checks: no em or en dashes; Title Case subjects; no phone number anywhere; an owner's email only on that owner's own
"to:" line; no text drafts; first touches for exactly the solicitable owners, in sort order; a call opener only for
CALL rows and a door-knock note only for KNOCK rows; every letter and email 150 words or fewer; every email with the
opt-out and postal address footer; no dollar amounts, buyer claims or listing office names in the drafts or plan;
strings that must never appear; stock phrases; no wire or account details; a Check Before Sending section; every
number in the output found in the input (each miss listed for a person to grade: worked-out price changes and day
counts are marked as such). Writes nothing; prints a report.
"""
import csv
import datetime as dt
import re
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]

CASES = {
    "practice": {
        "inputs": ["practice/PRACTICE MLS expired export, Salt Lake County, 2026-11-10.csv",
                   "practice/PRACTICE FSBO leads export, Salt Lake County, 2026-11-10.csv"],
        "prompt": "I'm Avery Testwood with Example Ridge Realty. Today is Tuesday, November 10, 2026.",
        "order": ["Jamie Placeholder", "Robin and Casey Samplestone", "Riley Notreal", "Taylor and Morgan Fakeworth",
                  "Example Holdings LLC", "Mockridge Family Trust", "Sam Testerly", "Alex Mockford", "Casey Fakington",
                  "Morgan Testley", "Jordan Exampleby", "Drew Samplewright", "Lou Placeholder"],
        "call": ["Robin and Casey Samplestone", "Mockridge Family Trust", "Alex Mockford", "Jordan Exampleby", "Drew Samplewright"],
        "no_knock": ["Example Holdings LLC"],
        "email": ["Morgan Testley", "Drew Samplewright", "Lou Placeholder"],
        "held": ["Pat Fictionale", "Jesse Notaname", "Kendall Testwright", "Shawn Exemplar", "Drew Fakerson", "Quinn Mockley", "Sage Fictionson"],
        "offices": ["Fictional Summit Homes", "Example Valley Brokers", "Sample Crest Realty", "Example Flat Fee Realty"],
        "never": ["relocat", "motivated", "lockbox", "4471", "tenant", "divorc", "quick sale", "dog", "family neighborhood",
                  "church", "elementary", "overpriced", "price reduc"],
        "never_in_drafts": ["buyer", "$"],
    },
    "eval-1-expired-export-scrubbed": {
        "inputs": ["evals/files/eval-1-expired-export-scrubbed/Expireds export 11-10-2026.csv"],
        "prompt": "I'm Quinn Fakeley with Example Canyon Realty. Today is Tuesday, November 10, 2026. two-week plan",
        "order": ["Parker Exampleman", "Casey Mockwell", "Dana Fictionberg", "Sydney and Lane Samplewood",
                  "Fakeworth Living Trust", "Frankie Samplesmith"],
        "call": ["Casey Mockwell", "Fakeworth Living Trust", "Frankie Samplesmith"],
        "no_knock": ["Fakeworth Living Trust"],
        "email": [],
        "held": ["Jordan Testerfield", "Rowan Fictionelli", "Blake Testington", "Reese Placeholden", "Ari Notarealname"],
        "offices": ["Fictional Peak Realty", "Sample Valley Homes", "Example Mountain Realty"],
        "never": ["priced too high", "your last agent", "your previous agent"],
        "never_in_drafts": ["buyer", "$", "price", "overpric"],
    },
    "eval-2-fsbo-list-no-dnc": {
        "inputs": ["evals/files/eval-2-fsbo-list-no-dnc/FSBO list - Sheet1.csv"],
        "prompt": "I'm Harper Testwell with Example Basin Realty. Today is Tuesday, November 10, 2026. next two weeks",
        "order": ["Pat Exemplary", "Kerry Sampleton", "Sky Mockingbird", "Lee Fakerton", "Rowan Placeholdt", "Jesse Testaroo"],
        "call": [],
        "no_knock": [],
        "email": [],
        "held": ["Morgan Notaperson"],
        "offices": [],
        "never": ["retiree", "young family", "motivated", "must sell fast", "divorc"],
        "never_in_drafts": ["buyer", "$"],
    },
}

STOCK = ["stunning", "dream home", "don't hesitate", "reach out", "touch base", "circle back", "perfect home"]
PROTECTED = (r"\b(families|family|kids|children|baby|couple|older|elderly|retire\w*|young|ethnic\w*|race|religio\w*|"
             r"church|mosque|temple|synagogue|school\w*|safe|safety|crime|immigrant\w*|disab\w*|demographic\w*)\b")
PHONE = re.compile(r"\(?\b\d{3}\)?[\s.-]?\d{3}-\d{4}\b")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December"
CITATIONS = ["13-25a-103", "13-25a-111", "13-25a-107.2", "13-25a-108", "63G-1-301", "R162-2f-401h", "16-4", "16-2", "57-21-5",
             "3604", "1725", "64.1200"]


def section(text, title):
    m = re.search(r"^## " + re.escape(title) + r".*?$(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


def blocks(drafts):
    parts = re.split(r"^### ", drafts, flags=re.M)[1:]
    return [(p.split("\n", 1)[0], p.split("\n", 1)[1] if "\n" in p else "") for p in parts]


def piece(body, label):
    m = re.search(r"^\*\*" + label + r"\*\*.*?$(.*?)(?=^\*\*(?:Letter|Email|Call Opener|Door-Knock Note)\*\*|\Z)", body, re.M | re.S)
    return m.group(1) if m else None


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
    raw = "\n".join((SKILL / f).read_text(encoding="utf-8") for f in cfg["inputs"])
    fields = [cell for f in cfg["inputs"] for row in csv.reader((SKILL / f).read_text(encoding="utf-8").splitlines()) for cell in row]
    src = raw + "\n" + cfg["prompt"]
    src_fields = " | ".join(fields) + " | " + cfg["prompt"]
    results = []

    def rec(label, ok, note=""):
        results.append((label, "PASS" if ok else "FAIL", note))

    rec("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", text))
    subjects = re.findall(r"\*\*Subject:\*\*\s*(.+)", text)
    bad = [s for s in subjects if any(w[0].islower() for w in re.findall(r"[A-Za-z][\w']*", s))]
    rec("Title Case subjects", not bad, f"{len(subjects)} subjects" + (f"; not Title Case: {bad}" if bad else ""))
    rec("No phone number anywhere", not PHONE.search(text), ", ".join(PHONE.findall(text)))
    stray = [e for e in EMAIL.findall(text)
             if not any(e in line and line.startswith("**Email** (to:") for line in text.splitlines())]
    rec("Owner emails only on their own email's to: line", not stray, ", ".join(stray))
    rec("No text drafts", not re.search(r"^\*\*Text", text, re.M) and "Reply STOP" not in section(text, "First Touches"))

    drafts = section(text, "First Touches")
    bl = blocks(drafts)
    who = [h.split(":", 1)[0].split(". ", 1)[-1].strip() for h, _ in bl]
    rec("First touches for exactly the solicitable owners, in sort order", who == cfg["order"],
        "" if who == cfg["order"] else f"got {who}")
    held_in = [h for h in cfg["held"] if h in drafts]
    rec("No draft for a held-out or skipped owner", not held_in, ", ".join(held_in))
    wrong_call, wrong_knock, wrong_email, long_ones, no_footer = [], [], [], [], []
    for (h, body), w in zip(bl, who):
        has_call = piece(body, "Call Opener") is not None
        if has_call != (w in cfg["call"]):
            wrong_call.append(w)
        has_knock = piece(body, "Door-Knock Note") is not None
        if has_knock == (w in cfg["no_knock"]):
            wrong_knock.append(w)
        em = piece(body, "Email")
        if (em is not None) != (w in cfg["email"]):
            wrong_email.append(w)
        for label in ("Letter", "Email"):
            p = piece(body, label)
            if p is None:
                continue
            cut = min([i for i in (p.find("This is a marketing email"), p.find("No door-knock")) if i >= 0] or [len(p)])
            body_text = re.sub(r"^\*\*Subject:\*\*.*$", "", p[:cut], flags=re.M)
            words = re.findall(r"[A-Za-z0-9$'\[\]][\w$',.:\[\]-]*", body_text)
            if len(words) > 150:
                long_ones.append(f"{w} {label} ({len(words)})")
            if label == "Email" and ("To stop these emails, reply UNSUBSCRIBE." not in p or "[Sender Postal Address]" not in p):
                no_footer.append(w)
        if piece(body, "Letter") is None and em is None:
            long_ones.append(f"{w}: no letter or email")
    rec("Call opener only for CALL rows", not wrong_call, ", ".join(wrong_call))
    rec("Door-knock note only for KNOCK rows", not wrong_knock, ", ".join(wrong_knock))
    rec("Email only where the list has an email", not wrong_email, ", ".join(wrong_email))
    rec("Every first touch has a letter or email of 150 words or fewer", not long_ones, ", ".join(long_ones))
    rec("Every email has the opt-out and postal address footer", not no_footer, ", ".join(no_footer))

    plan = section(text, "Touch Plan")
    dp = (drafts + plan).lower()
    found = [s for s in cfg["never_in_drafts"] if s.lower() in dp]
    rec("No dollar amounts, buyer claims or banned words in drafts and plan", not found, ", ".join(found))
    offices = [o for o in cfg["offices"] if o.lower() in dp]
    rec("No listing office named in drafts or plan", not offices, ", ".join(offices))
    never = [s for s in cfg["never"] if s.lower() in text.lower()]
    rec("Never-appear strings absent from the whole output", not never, ", ".join(never))
    unnamed = drafts
    for o in cfg["order"]:
        unnamed = unnamed.replace(o, " ")
    prot = sorted(set(m.group(0).lower() for m in re.finditer(PROTECTED, unnamed, re.I)))
    rec("Protected-class and area words in drafts (review each)", not prot, ", ".join(prot))
    stock = [p for p in STOCK if p in dp]
    rec("No stock phrases", not stock, ", ".join(stock))
    wire = re.findall(r"routing|account number|wire|acct|social security", text, re.I)
    rec("No wire or account details", not wire, ", ".join(wire))
    rec("Check Before Sending section", bool(re.search(r"^## Check Before Sending", text, re.M)))

    for line in (drafts + plan).splitlines():
        low = line.lower()
        if "call" in low and re.search(r"sunday|november 11\b|wednesday|november 26|thursday, november 26", low) and not re.search(r"no calls|not call|no call", low):
            results.append(("Call day to grade", "NOTE", line.strip()[:140]))

    src_nums = {n for _, n in numbers(src_fields)}
    today = dt.date(2026, 11, 10)
    day_counts = {str((today - dt.date.fromisoformat(d)).days) for d in re.findall(r"\b\d{4}-\d{2}-\d{2}\b", raw)}
    for d in re.findall(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b", raw):
        day_counts.add(str((today - dt.date(int(d[2]), int(d[0]), int(d[1]))).days))
    refs = "\n".join(p.read_text(encoding="utf-8") for p in sorted((SKILL / "references").glob("*.md")))
    refs += (SKILL.parent / "_shared" / "outreach-rules.md").read_text(encoding="utf-8")
    ref_nums = {n for _, n in numbers(refs)}
    prices = sorted({int(n) for n in src_nums if n.isdigit() and int(n) >= 100000})
    diffs = {str(a - b) for a in prices for b in prices if a > b}
    plain = text
    for c in CITATIONS:
        plain = plain.replace(c, " ")
    plain = re.sub(r"\b\d{1,2}:\d{2}\b", " ", plain)
    plain = re.sub(r"\b(?:" + MONTHS + r") \d{1,2}(?:,? and \d{1,2})?\b", " ", plain)
    plain = re.sub(r"\b(?:Article|Articles|Standard of Practice|SOP) \d+(?:-\d+)?(?: and \d+)?", " ", plain)
    plain = re.sub(r"\b\d{4}-\d{2}-\d{2}\b", lambda m: m.group(0) if m.group(0) in src else " DATE? ", plain)
    misses, worked, from_refs = [], [], []
    for tok, n in numbers(plain):
        if n in src_nums or (n.isdigit() and int(n) <= 12) or n in ("2026", "2027"):
            continue
        if n in diffs or n in day_counts:
            worked.append(tok)
            continue
        if n in ref_nums and (n in ("30", "31") or not (n.isdigit() and int(n) <= 31)):
            from_refs.append(tok)
            continue
        misses.append(tok)
    if from_refs:
        results.append(("Numbers from the skill's references", "NOTE", ", ".join(sorted(set(from_refs)))))
    if worked:
        results.append(("Worked-out price changes and day counts", "NOTE", ", ".join(sorted(set(worked)))))
    rec("Numbers not found in the input (grade each)", not misses, ", ".join(sorted(set(misses), key=lambda s: (len(s), s))))
    if "DATE?" in plain:
        results.append(("ISO dates not in the input", "NOTE", "grade each"))

    print(f"Objective checks: {case} / {name}")
    for label, res, note in results:
        print(f"- {res}  {label}" + (f": {note}" if note else ""))


if __name__ == "__main__":
    main()
