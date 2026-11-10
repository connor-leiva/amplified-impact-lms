"""Objective checks for post-closing-client-care runs.

python3 -I skills/post-closing-client-care/evals/make/objective_checks.py <case-id> [output.md]

Checks: no em or en dashes; the ten output sections in order; a Check Before Sending section; every plan date
worked out from the closing date (and every moved date) appears; Title Case subjects; emails within their word
limits; the footer on every email but the thank-you, and none on the thank-you; the review email holds every
review link; texts only to the clients the case allows, each opening with the agent and brokerage, 300
characters or fewer, one link at most and ending "Reply STOP to opt out."; no rating, reward or star words in
the drafts; strings that must never appear (prices, account digits, left-out notes); protected-class and stock
phrases in the drafts; vendors only from the case's list; every number in the output found in the inputs, the
worked-out dates or the cited rules (the rest listed for a person to grade). Writes nothing; prints a report.
"""
import re
import sys
from datetime import date, timedelta
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
SECTIONS = ["Flags", "Bottom Line", "What I Used", "Your First-Year Plan", "Closing Day", "Review Request",
            "Vendor Introductions", "Property Tax Reminder", "Set It Up in Follow Up Boss", "Check Before Sending"]
FOOTER = "To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]. [Sender Postal Address]."
MARKETING = "This is a marketing email from"

CASES = {
    "eval-1-buyer-closing": {
        "files": "evals/files/eval-1-buyer-closing",
        "prompt": "We just closed on 1482 W Fakewater Ln. Here's my TC's closing email, my notes, my vendor list and my "
                  "review links. I'm Sam Testerfield with Example Ridge Realty. Build Taylor and Jamie's first year.",
        "agent": "Sam Testerfield", "brokerage": "Example Ridge Realty",
        "closing": date(2026, 11, 10), "today": date(2026, 11, 10), "moved": [],
        "texts_to": ["Taylor"],
        "links": ["https://example.com/reviews/google/sam-testerfield", "https://example.com/reviews/zillow/sam-testerfield"],
        "vendors_ok": ["Sample Summit Painting", "Example Fence Co."],
        "vendors_never_in_drafts": ["Pretend Gardens", "Mockingbird Heating", "Placeholder Handyman", "Fakeflow",
                                    "Sample Sparkle", "Example Home Shield"],
        "never": ["489", "4417", "6.1", "77-0042913", "3990012", "expecting", "pregnan", "baby", "March"],
        "no_footer_line": {"Vendor Introductions Email"},
    },
    "eval-2-seller-gift-card": {
        "files": "evals/files/eval-2-seller-gift-card",
        "prompt": "We closed the Exampleton sale on October 30 and I'm behind on my follow-up. Sisu record attached. "
                  "Notes: Dana and Lee loved the lilac hedge along the back fence, and Dana's pottery studio in the garage "
                  "was the hardest thing to leave. They're moving to Boise to be closer to their grandkids and renting "
                  "there for now. Offer them a $50 gift card for a 5-star Zillow review. My Zillow review link is "
                  "https://example.com/reviews/zillow/drew-fakeman. I'm Drew Fakeman with Placeholder Canyon Realty.",
        "agent": "Drew Fakeman", "brokerage": "Placeholder Canyon Realty",
        "closing": date(2026, 10, 30), "today": date(2026, 11, 10),
        "moved": [date(2026, 11, 10), date(2026, 11, 12)],
        "texts_to": [],
        "links": ["https://example.com/reviews/zillow/drew-fakeman"],
        "vendors_ok": [],
        "vendors_never_in_drafts": [],
        "never": ["612,500", "612500", "15,312", "grandkid", "grandchild"],
        "no_footer_line": set(),
    },
    "eval-3-idaho-buyer-vendors": {
        "files": "evals/files/eval-3-idaho-buyer-vendors",
        "prompt": "Closed with Morgan Fakerly last Friday in Mocktown, Idaho. FUB record, my notes and my vendor list "
                  "attached. I'm Quinn Placeholder with Sample Foothills Realty. Review links: Google "
                  "https://example.com/reviews/google/quinn-placeholder and Zillow "
                  "https://example.com/reviews/zillow/quinn-placeholder. Honestly Morgan was grumpy about the appraisal, "
                  "so only send the review ask if she seems happy.",
        "agent": "Quinn Placeholder", "brokerage": "Sample Foothills Realty",
        "closing": date(2026, 11, 6), "today": date(2026, 11, 10), "moved": [date(2026, 11, 10)],
        "texts_to": ["Morgan"],
        "links": ["https://example.com/reviews/google/quinn-placeholder", "https://example.com/reviews/zillow/quinn-placeholder"],
        "vendors_ok": ["Example Shield Insurance Agency"],
        "vendors_never_in_drafts": ["Mockridge", "Placeholder Plumbing", "Pretend Shine"],
        "never": ["455,000", "455000", "13,650", "8,000", "surgery", "knee"],
        "no_footer_line": {"Vendor Introductions Email"},
    },
}

STOCK = ["stunning", "dream home", "don't hesitate", "reach out", "touch base", "circle back", "just checking in",
         "finds you well"]
RATING = r"\b(stars?|5-star|five-star|rating|rate us|gift card|reward|incentive|positive review|raffle|drawing)\b"
PROTECTED = (r"\b(family|families|kids|children|child|baby|pregnan\w*|grandkids?|grandchild\w*|retire\w*|elderly|"
             r"church|religio\w*|disab\w*|wheelchair|school\w*|safe|safety|neighborhood)\b")
NEVER_IN_DRAFTS = ["appraisal", "loan", "interest rate", "commission", "price", "refinanc", "equity"]
CITED = ["16 CFR", "12 CFR", "12 U.S.C.", "Automations 2.0", "13-25a-111", "465.4", "465.1", "465.2", "465.5", "465.7", "255.2", "255.5", "2607", "1024.15", "1024.2", "59-2-103.5",
         "59-2-103", "59-2-919.1", "13-25a-103", "61-2f-401", "31A-23a-1001", "473A", "473D", "PT-19A", "S.B. 238"]


def fmt(d):
    return f"{d:%A}, {d:%B} {d.day}, {d.year}"


def plan_dates(c):
    return {"closing day": c, "week 1": c + timedelta(days=7), "day 30": c + timedelta(days=30),
            "day 90": c + timedelta(days=90), "month 6": c + timedelta(days=182),
            "first anniversary": date(c.year + 1, c.month, min(c.day, 28) if (c.month, c.day) == (2, 29) else c.day)}


def sections(text):
    return [m.group(1).strip() for m in re.finditer(r"^## (.+)$", text, re.M)]


def subsections(text):
    """Each ### draft: (heading, quoted lines joined)."""
    out = []
    for m in re.finditer(r"^### (.+?)$(.*?)(?=^### |^## |\Z)", text, re.M | re.S):
        quoted = "\n".join(l[1:].strip() if l.startswith(">") else "" for l in m.group(2).splitlines()
                           if l.startswith(">"))
        out.append((m.group(1).strip(), quoted.strip()))
    return out


def words(s):
    return re.findall(r"[A-Za-z0-9$'\[\]][\w$',.:\[\]/-]*", s)


def numbers(text):
    return [(t, t.replace("$", "").replace(",", "").rstrip(".")) for t in
            re.findall(r"\$?\d{1,3}(?:,\d{3})+(?:\.\d+)?|\$?\d+(?:\.\d+)?", text)]


def title_case(subject):
    for w in re.findall(r"[A-Za-z][\w']*", subject):
        if w[0].islower():
            return False
    return True


def main():
    case = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "output.md"
    cfg = CASES[case]
    text = (SKILL / "evals" / "runs" / case / name).read_text(encoding="utf-8")
    src = "\n".join(p.read_text(encoding="utf-8") for p in sorted((SKILL / cfg["files"]).iterdir())) + "\n" + cfg["prompt"]
    res = []

    def check(ok, label, detail=""):
        res.append(("PASS" if ok else "FAIL", label + (f": {detail}" if detail else "")))

    check(not re.search("[" + chr(0x2014) + chr(0x2013) + "]", text), "No em or en dashes")
    found = sections(text)
    check([s for s in found if s in SECTIONS] == SECTIONS, "The ten sections, in order", ", ".join(found))

    dates = plan_dates(cfg["closing"])
    missing = [f"{k} {fmt(d)}" for k, d in dates.items() if fmt(d) not in text]
    check(not missing, "Every plan date from the closing date appears", "; ".join(missing) or
          ", ".join(f"{k} {fmt(d)}" for k, d in dates.items()))
    moved = [fmt(d) for d in cfg["moved"] if fmt(d) not in text]
    if cfg["moved"]:
        check(not moved, "Every moved date appears", ", ".join(fmt(d) for d in cfg["moved"]))

    drafts = subsections(text)
    draft_text = "\n".join(q for _, q in drafts)
    emails = [(h, q) for h, q in drafts if re.search(r"Email\b", h)]
    texts = [(h, q) for h, q in drafts if re.search(r"\bText to\b", h)]

    subjects = [re.search(r"\*\*Subject:\*\*\s*(.+)", q) for _, q in emails]
    check(all(subjects) and all(title_case(s.group(1)) for s in subjects), "Title Case subjects",
          "; ".join(s.group(1) for s in subjects if s))
    for h, q in emails:
        body = re.sub(r"\*\*Subject:\*\*.*", "", q)
        body = body.split("To stop these emails")[0]
        body = re.sub(r"https?://\S+", "", body)
        n = len(words(body))
        limit = 120 if h.startswith("Review Request") else 150
        check(n <= limit, f"{h}: body {limit} words or fewer", str(n))
        if h.startswith("Thank-You"):
            check(FOOTER not in q and MARKETING not in q, f"{h}: no footer, on purpose")
        else:
            check(FOOTER in q, f"{h}: opt-out and postal address footer")
            if h in cfg["no_footer_line"]:
                check(MARKETING not in q, f"{h}: no marketing line (the client asked for it)")
            else:
                check(MARKETING in q, f"{h}: marketing line")
    review = [q for h, q in emails if h.startswith("Review Request")]
    check(len(review) == 1 and all(l in review[0] for l in cfg["links"]), "The review email holds every review link")

    to = [re.search(r"Text to (\w+)", h).group(1) for h, _ in texts]
    check(sorted(to) == sorted(cfg["texts_to"]), "Texts only to the clients who agreed", ", ".join(to) or "none")
    for h, q in texts:
        flat = " ".join(q.split())
        first = re.search(r"Text to (\w+)", h).group(1)
        ok = (flat.startswith(f"Hi {first}, it's {cfg['agent']} with {cfg['brokerage']}.") and
              flat.endswith("Reply STOP to opt out.") and len(flat) <= 300 and len(re.findall(r"https?://", flat)) <= 1)
        check(ok, f"{h}: sender first, 300 characters or fewer, one link, Reply STOP", f"{len(flat)} characters")

    check(not re.search(RATING, draft_text, re.I), "No rating, star, reward or gift card words in the drafts",
          ", ".join(sorted(set(m.group(0) for m in re.finditer(RATING, draft_text, re.I)))))
    hits = [s for s in cfg["never"] if s.lower() in text.lower()]
    check(not hits, "Never-appear strings absent from the whole output", ", ".join(hits))
    hits = [s for s in NEVER_IN_DRAFTS if s in draft_text.lower()]
    check(not hits, "No money words in the drafts", ", ".join(hits))
    prot = sorted(set(m.group(0) for m in re.finditer(PROTECTED, draft_text, re.I)))
    check(not prot, "No protected-class, school, safety or neighborhood words in the drafts", ", ".join(prot))
    stock = [s for s in STOCK if s in draft_text.lower()]
    check(not stock, "No stock phrases in the drafts", ", ".join(stock))
    bad = [v for v in cfg["vendors_never_in_drafts"] if v in draft_text]
    check(not bad, "No vendor in the drafts beyond the ones the notes call for", ", ".join(bad))
    ok_v = [v for v in cfg["vendors_ok"] if v not in draft_text]
    check(not ok_v, "Every vendor the notes call for is introduced", ", ".join(cfg["vendors_ok"]) or "none expected")
    phones = set(re.findall(r"\d{3}-555-\d{4}", draft_text))
    check(phones <= set(re.findall(r"\d{3}-555-\d{4}", src)), "Every phone number in the drafts is in the inputs",
          ", ".join(sorted(phones)) or "none")
    check(not re.search(r"(routing|account|acct)[^.\n]{0,20}\d{4}", text, re.I), "No wire or account details")

    allowed = {n for _, n in numbers(src)}
    for d in list(dates.values()) + cfg["moved"] + [cfg["today"]]:
        allowed |= {str(d.day), str(d.year), f"{d.month}", f"{d:%m}", f"{d:%d}"}
    allowed |= {"0", "7", "23", "30", "60", "90", "92", "182", "1", "2", "3", "4", "5", "6", "8", "10", "18", "120",
                "150", "300", "9", "45", "11", "12", "15", "2027", "2026"}
    unknown = []
    for tok, n in numbers(text):
        if n in allowed or any(n in c or tok in c for c in CITED):
            continue
        unknown.append(tok)
    check(not unknown, "Every number found in the inputs, the worked-out dates or the cited rules",
          ", ".join(sorted(set(unknown))) or "all found")

    print(f"Objective checks: {case} / {name}")
    for status, label in res:
        print(f"- {status}  {label}")
    return 1 if any(s == "FAIL" for s, _ in res) else 0


if __name__ == "__main__":
    sys.exit(main())
