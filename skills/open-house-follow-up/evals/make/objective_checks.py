"""Objective checks for open-house-follow-up runs.

python3 skills/open-house-follow-up/evals/make/objective_checks.py <case-id> [output.md]

Checks: no em or en dashes; Title Case subjects; every visitor email body under 120 words with the opt-out and
postal address footer; texts only for the case's TEXT OK visitors, each with a Consent line, the brokerage, "Reply
STOP to opt out." and 320 characters or fewer; no solicitation words in a represented visitor's draft; the seller
update under 200 words with no visitor names, emails or phone numbers and the sheet's counts; strings that must
never appear; protected-class words; stock phrases; no wire or account details; a Check Before Sending section;
every number in the output found in the input (each miss listed for a person to grade: resolved dates are allowed
when Check before sending marks them). Writes nothing; prints a report.
"""
import re
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]

CASES = {
    "practice": {
        "inputs": ["practice/PRACTICE Open House Sign-Ins, 2468 Sample Aspen Ln, 2026-11-08.csv",
                   "practice/PRACTICE Open house notes, Sample Aspen, Sun Nov 8.txt"],
        "prompt": "I'm Riley Sampleton with Example Peak Realty, the listing agent.",
        "brokerage": "Example Peak Realty",
        "text_ok": ["Morgan Exampleton", "Casey Mockwood", "Lee Samplesmith"],
        "represented": ["Quinn Placeholder", "Sage Sampleford"],
        "visitors": ["Morgan Exampleton", "Quinn Placeholder", "Sam Fictional", "Jordan Testwell", "Casey Mockwood",
                     "Sage Sampleford", "Jamie Pretendo", "Lee Samplesmith", "Blake Fakington", "Kendall Mockingham"],
        "update_must": ["10 visitors", "11 sign-ins", "2 said", "about 12 groups"],
        "never": ["young family", "perfect for", "elementary", "older couple", "a lot of families", "589", "drop to",
                  "sister"],
    },
    "eval-1-form-export-teammate-listing": {
        "inputs": ["evals/files/eval-1-form-export-teammate-listing/Open House Sign-In, 8135 E Placeholder Palm (Responses).csv",
                   "evals/files/eval-1-form-export-teammate-listing/Harper notes, Placeholder Palm twilight open house.txt"],
        "prompt": "Twilight open house tonight for Jesse Fakewood's listing (he's on my team). I'm Harper Mockley with Example Desert Realty.",
        "brokerage": "Example Desert Realty",
        "text_ok": ["Ellis Testington", "Reese Fictionalis"],
        "represented": ["Rowan Sampleberg", "Sydney Examplar"],
        "visitors": ["Ellis Testington", "Rowan Sampleberg", "Parker Fakeworth", "Sydney Examplar", "Charlie Mockford",
                     "Devon Placeholder-Smith", "Reese Fictionalis"],
        "update_must": ["8 sign-ins", "7 visitors", "2 said", "9 or 10 groups"],
        "never": ["spanish", "families moving in", "young couple", "baby", "perfect for", "elementary", "10k",
                  "drop it", "renting"],
    },
    "eval-2-typed-list-no-consent": {
        "inputs": ["evals/files/eval-2-typed-list-no-consent/Typed sign-in sheet and notes, 975 Example Orchard Ct.txt"],
        "prompt": "Saturday's open house at 975 Example Orchard Ct in Lehi. I'm Ari Exampleby with Example Canyon Realty. Lane and Jo.",
        "brokerage": "Example Canyon Realty",
        "text_ok": [],
        "represented": ["Sky Testerson"],
        "visitors": ["Pat Mockridge", "Sky Testerson", "Lou Samplewright", "Frankie Placeholder", "Dale Notaname"],
        "update_must": ["5 sign-ins", "5 visitors", "1 said", "all signed in"],
        "never": [],
    },
}

SOLICIT = ["help you", "glad to help", "happy to help", "work with you", "working with", "represent", "meet",
           "coffee", "call me", "give me a call", "consultation", "other homes", "listings", "your search",
           "set up a search", "schedule", "let's", "tour"]
STOCK = ["stunning", "dream home", "don't hesitate", "reach out", "touch base", "circle back", "perfect home"]
PROTECTED = (r"\b(families|family|kids|children|baby|pregnan\w*|couple|older|elderly|retire\w*|young|ethnic\w*|race|"
             r"racial|religio\w*|church|mosque|temple|synagogue|spanish|hispanic|latino|immigrant\w*|disab\w*|"
             r"wheelchair|demographic\w*)\b")
SMALL = {str(n) for n in range(0, 13)}
# Legal citations the references give; their numbers are not facts about the open house.
CITATIONS = ["Utah Admin. Code R162-2f-401b(1)(k)", "Utah Code 13-25a-103", "R162-2f-401b(1)(k)", "13-25a-103"]


def section(text, title):
    m = re.search(r"^## " + re.escape(title) + r".*?$(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


def visitor_blocks(drafts):
    """Each '### n. Name: STATUS' block of Visitor Drafts, as (heading, body)."""
    parts = re.split(r"^### ", drafts, flags=re.M)[1:]
    return [(p.split("\n", 1)[0], p.split("\n", 1)[1] if "\n" in p else "") for p in parts]


def emails(block):
    """Each email in a block: (subject, body without the footer)."""
    out = []
    for m in re.finditer(r"\*\*Subject:\*\*\s*(.+?)\n(.*?)(?=\n\*\*Text\*\*|\n### |\Z)", block, re.S):
        out.append((m.group(1).strip(), m.group(2)))
    return out


def numbers(text):
    out = []
    for tok in re.findall(r"\$?\d{1,3}(?:,\d{3})+(?:\.\d+)?|\$?\d+(?:\.\d+)?", text):
        n = tok.replace("$", "").replace(",", "").rstrip(".")
        out.append((tok, n))
    return out


def main():
    case = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "output.md"
    cfg = CASES[case]
    text = (SKILL / "evals" / "runs" / case / name).read_text(encoding="utf-8")
    src = "\n".join((SKILL / f).read_text(encoding="utf-8") for f in cfg["inputs"]) + "\n" + cfg["prompt"]
    results = []

    def rec(label, ok, note=""):
        results.append((label, "PASS" if ok else "FAIL", note))

    rec("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", text))

    subjects = re.findall(r"\*\*Subject:\*\*\s*(.+)", text)
    bad_subj = []
    for s in subjects:
        words = re.findall(r"[A-Za-z][\w']*", s)
        if any(w[0].islower() for w in words):
            bad_subj.append(s.strip())
    rec("Title Case subjects", subjects and not bad_subj, f"{len(subjects)} subjects" + (f"; not Title Case: {bad_subj}" if bad_subj else ""))

    drafts = section(text, "Visitor Drafts")
    blocks = visitor_blocks(drafts)
    long_bodies, no_footer, texted, bad_texts, solicit = [], [], [], [], []
    for heading, body in blocks:
        who = heading.split(":", 1)[0].split(". ", 1)[-1].strip()
        for subj, eb in emails(body):
            footer_at = min([i for i in (eb.find("This is a marketing email"), eb.find("To stop these emails")) if i >= 0] or [len(eb)])
            words = re.findall(r"[A-Za-z0-9$'\[\]][\w$',.:\[\]]*", eb[:footer_at])
            if len(words) >= 120:
                long_bodies.append(f"{who} ({len(words)})")
            if "To stop these emails, reply UNSUBSCRIBE." not in eb or "[Sender Postal Address]" not in eb:
                no_footer.append(who)
        for t in re.findall(r"^> (.+)$", body, re.M):
            texted.append(who)
            problems = []
            if len(t) > 320:
                problems.append(f"{len(t)} chars")
            if not t.rstrip().endswith("Reply STOP to opt out."):
                problems.append("no STOP line at the end")
            if cfg["brokerage"] not in t:
                problems.append("no brokerage")
            if "Consent:" not in body:
                problems.append("no Consent line")
            if problems:
                bad_texts.append(f"{who}: {', '.join(problems)}")
        if who in cfg["represented"]:
            low = body.lower()
            hits = [w for w in SOLICIT if w in low]
            if hits:
                solicit.append(f"{who}: {hits}")
    rec("Every visitor email body under 120 words", not long_bodies, ", ".join(long_bodies))
    rec("Every visitor email has the opt-out and postal address footer", not no_footer, ", ".join(no_footer))
    extra = sorted(set(texted) - set(cfg["text_ok"]))
    missing = sorted(set(cfg["text_ok"]) - set(texted))
    rec("Texts only for TEXT OK visitors", not extra, f"texted: {sorted(set(texted))}" + (f"; not TEXT OK: {extra}" if extra else ""))
    rec("Every TEXT OK visitor has a text", not missing, ", ".join(missing))
    rec("Each text: Consent line, brokerage, ends with Reply STOP, 320 characters or fewer", not bad_texts, "; ".join(bad_texts))
    for t in re.findall(r"^> (.+)$", drafts, re.M):
        results.append(("Text length", "NOTE", f"{len(t)} characters: {t[:40]}..."))
    rec("No solicitation words in a represented visitor's draft", not solicit, "; ".join(solicit))

    upd = section(text, "Seller Update") or section(text, "Listing Agent Update")
    m = re.search(r"\*\*Subject:\*\*.*?\n(.*)", upd, re.S)
    upd_body = m.group(1) if m else upd
    upd_words = len(re.findall(r"[A-Za-z0-9$'][\w$',.:]*", upd_body))
    rec("Update under 200 words", 0 < upd_words < 200, f"{upd_words} words")
    names_in = []
    for v in cfg["visitors"]:
        for part in v.replace("-", " ").split():
            if re.search(r"\b" + re.escape(part) + r"\b", upd_body):
                names_in.append(part)
    contact = re.findall(r"@|\d{3}[) .-]+\d{3}-\d{4}", upd_body)
    rec("No visitor names or contact details in the update", not names_in and not contact, ", ".join(names_in + contact))
    lacking = [s for s in cfg["update_must"] if s.lower() not in upd_body.lower()]
    rec("Update carries the sheet's counts", not lacking, "missing: " + ", ".join(lacking) if lacking else ", ".join(cfg["update_must"]))

    found = [s for s in cfg["never"] if s.lower() in text.lower()]
    rec("Never-appear strings absent", not found, ", ".join(found))

    client = drafts + upd_body
    prot = sorted(set(m.group(0).lower() for m in re.finditer(PROTECTED, client, re.I)))
    rec("Protected-class words in drafts and update (review each)", not prot, ", ".join(prot))
    stock = [p for p in STOCK if p in client.lower()]
    rec("No stock phrases in drafts or update", not stock, ", ".join(stock))
    wire = re.findall(r"routing|account number|wire|acct|social security", text, re.I)
    rec("No wire or account details", not wire, ", ".join(wire))
    rec("Check Before Sending section", bool(re.search(r"^## Check Before Sending", text, re.M)))

    src_nums = {n for _, n in numbers(src)}
    for w, n in [("one", "1"), ("two", "2"), ("three", "3"), ("five", "5"), ("first", "1"), ("second", "2")]:
        if re.search(r"\b" + w + r"\b", src, re.I):
            src_nums.add(n)
    refs = "\n".join(p.read_text(encoding="utf-8") for p in sorted((SKILL / "references").glob("*.md")))
    refs += (SKILL.parent / "_shared" / "outreach-rules.md").read_text(encoding="utf-8")
    ref_nums = {n for _, n in numbers(refs)}
    misses, from_refs = [], []
    cited = [c for c in CITATIONS if c in text]
    if cited:
        results.append(("Citations", "NOTE", "From the skill's references: " + ", ".join(cited)))
    plain = text
    for c in CITATIONS:
        plain = plain.replace(c, " ")
    for tok, n in numbers(re.sub(r"\b\d{1,2}:\d{2}\b", " ", plain)):
        if n in src_nums or n in SMALL:
            continue
        try:
            v = float(n)
        except ValueError:
            continue
        if v >= 1000 and v % 1000 == 0 and str(int(v // 1000)) in src_nums:
            continue
        if n in ref_nums and not (n.isdigit() and 1 <= int(n) <= 31):
            from_refs.append(tok)
            continue
        misses.append(tok)
    rec("Numbers not found in the input (grade each)", not misses, ", ".join(sorted(set(misses), key=lambda s: (len(s), s))))
    if from_refs:
        results.append(("Reference numbers", "NOTE", "From the skill's references, not the input: " + ", ".join(sorted(set(from_refs)))))
    clock = [s for s in re.findall(r"\b\d{1,2}:\d{2}\b", text) if s not in src and not (s.endswith(":00") and s.split(":")[0] in src_nums)]
    rec("Every clock time is in the input (or a spoken hour written out)", not clock, ", ".join(sorted(set(clock))))

    print(f"Objective checks: {case} / {name}")
    for label, res, note in results:
        print(f"- {res}  {label}" + (f": {note}" if note else ""))


if __name__ == "__main__":
    main()
