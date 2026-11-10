"""Objective checks for speed-to-lead-reply runs.

python3 skills/speed-to-lead-reply/evals/make/objective_checks.py <case-id> [output.md]

Checks: no em or en dashes; Title Case subjects; a Check Before Sending section; texts only when the case's lead is
TEXT OK, each with a Consent line quoting the record, the agent and brokerage, 320 characters or fewer (touches under
200) and ending "Reply STOP to opt out."; no call opener or voicemail when calls are closed; voicemails 50 words or
fewer, and none asking a NO TEXT lead to text back; the first email body 150 words or fewer and each touch email 80 or
fewer, every email with the opt-out and postal address footer; no sentence saying a home is available without
"confirm" or "check"; strings that must never appear; protected-class, neighborhood-opinion and website-activity words
in the drafts; stock phrases; no wire or account details; every number in the output found in the inputs (resolved
dates and citations listed for a person to grade). Writes nothing; prints a report.
"""
import re
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]

CASES = {
    "practice": {
        "inputs": ["practice/PRACTICE New lead 1, website registration, Avery Testington.txt",
                   "practice/PRACTICE Listing sheet, 4120 S Placeholder Pines Ln.pdf"],
        "prompt": "Here's a new lead that just came in from my website, and the listing sheet for the home they asked "
                  "about. I'm Riley Sampleton with Example Peak Realty. Write my first reply.",
        "agent": "Riley Sampleton", "brokerage": "Example Peak Realty",
        "text_ok": True, "calls": True,
        "consent_quote": "I agree to receive calls and text messages from Example Peak Realty and its agents",
        "never": ["brother", "dog", "575", "450,000", "motivated", "rent-back", "lockbox", "crated", "Sample Hollow",
                  "Example Ridge", "Placeholder Peak", "Example Canyon", "9900412"],
        "never_in_drafts": ["viewed", "saved search", "3 times"],
        "derived": ["11", "13", "14"],
    },
    "practice-lead-2-portal": {
        "inputs": ["practice/PRACTICE New lead 2, portal inquiry, Casey Mocksworth.txt"],
        "prompt": "New lead from Sample Home Finder. No listing sheet yet. I'm Riley Sampleton with Example Peak Realty.",
        "agent": "Riley Sampleton", "brokerage": "Example Peak Realty",
        "text_ok": False, "calls": True,
        "consent_quote": None,
        "never": ["motivated", "will take", "room to negotiate"],
        "never_in_drafts": ["flexible", "HOA fee is", "HOA fees are $"],
        "derived": ["11", "12", "13"],
    },
    "practice-lead-3-has-agent": {
        "inputs": ["practice/PRACTICE New lead 3, Facebook lead form, Jamie Fakerton.txt"],
        "prompt": "Facebook lead just came in. I'm Riley Sampleton with Example Peak Realty. What do I send?",
        "agent": "Riley Sampleton", "brokerage": "Example Peak Realty",
        "text_ok": False, "calls": False,
        "consent_quote": "may contact you about your home search",
        "never": [],
        "never_in_drafts": ["glad to help", "happy to help", "send you the list", "set up a search", "attached",
                            "schedule", "tour", "showing"],
        "derived": [],
    },
    "eval-1-website-lead-consent": {
        "inputs": ["evals/files/eval-1-website-lead-consent/Follow Up Boss profile, Rowan Testerly.txt",
                   "evals/files/eval-1-website-lead-consent/Listing sheet, 1536 W Example Meadow Dr.pdf"],
        "prompt": "New lead just came in on my website, it's 7:05 this morning. Listing sheet's attached. I'm Jesse "
                  "Sampleberg with Example Canyon Realty. Write my first reply.",
        "agent": "Jesse Sampleberg", "brokerage": "Example Canyon Realty",
        "text_ok": True, "calls": True,
        "consent_quote": "By checking this box, I agree to receive text messages from Example Canyon Realty at the number provided",
        "never": ["mom", "mother", "can't do stairs", "step-free", "no steps", "600,000", "675,000", "multiple offers",
                  "review all offers", "lockbox", "2 hour notice", "Sample Fields", "Placeholder Ridge", "Example Valley",
                  "9900731"],
        "never_in_drafts": ["viewed", "views", "2nd view", "stairs", "Lead Flow"],
        "derived": ["11", "12", "13"],
    },
    "eval-2-portal-no-consent-schools-safety": {
        "inputs": ["evals/files/eval-2-portal-no-consent-schools-safety/New lead email, Sample Realty Search, Taylor Fakesmith.txt"],
        "prompt": "Portal lead just came in. I don't have the listing sheet handy. I'm Parker Mockridge with Example "
                  "Treasure Valley Realty. What do I send?",
        "agent": "Parker Mockridge", "brokerage": "Example Treasure Valley Realty",
        "text_ok": False, "calls": True,
        "consent_quote": None,
        "never": ["great schools", "good schools", "family-friendly", "low crime"],
        "never_in_drafts": ["kids", "middle school", "children", "quiet"],
        "derived": ["11", "13"],
    },
    "eval-3-opted-out-returning-lead": {
        "inputs": ["evals/files/eval-3-opted-out-returning-lead/Follow Up Boss profile, Morgan Notreal.txt",
                   "evals/files/eval-3-opted-out-returning-lead/Listing pasted from MLS, 610 E Sample Bluff Rd.txt"],
        "prompt": "Old lead came back with a question. She signed up for texts on our site in March, so can you write a "
                  "text? I'm Quinn Fakeworth with Example Basin Realty. Listing pasted in the other file.",
        "agent": "Quinn Fakeworth", "brokerage": "Example Basin Realty",
        "text_ok": False, "calls": False,
        "consent_quote": "I agree to receive calls and texts from Example Basin Realty",
        "never": ["45-day", "best offer", "lockbox", "there is a gas line", "there's a gas line", "gas line is"],
        "never_in_drafts": ["vacant", "reply stop", "opted out"],
        "derived": ["11", "13"],
    },
}

STOCK = ["stunning", "dream home", "don't hesitate", "reach out", "touch base", "circle back", "won't last",
         "perfect home"]
PROTECTED = (r"\b(families|family|kids|children|child|baby|pregnan\w*|couple|older|elderly|retire\w*|young|ethnic\w*|"
             r"race|racial|religio\w*|church|mosque|temple|synagogue|spanish|hispanic|latino|immigrant\w*|disab\w*|"
             r"wheelchair|demographic\w*|mom|mother|brother|sister|roommate)\b")
OPINION = r"\b(safe|safety|quiet|family-friendly|kid-friendly|great schools|good schools|good area|desirable|exclusive|perfect for|ideal for|up-and-coming)\b"
ACTIVITY = r"\b(viewed|views|saved search|favorit\w+|you were looking at)\b"
SMALL = {str(n) for n in range(0, 13)}
CITATIONS = ["13-25a-103(3)", "13-25a-103", "63G-1-301", "R162-2f-401b(1)(k)", "R162-2f-401a(2)", "57-21-5"]


def read_input(rel):
    path = SKILL / rel
    if path.suffix == ".pdf":
        return subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True).stdout
    return path.read_text(encoding="utf-8")


def section(text, title):
    m = re.search(r"^## " + re.escape(title) + r".*?$(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


def drafts_part(text):
    """Everything from the first text to just before Check Before Sending: the drafts."""
    start = re.search(r"^## First Text", text, re.M)
    end = re.search(r"^## Check Before Sending", text, re.M)
    return text[start.start() if start else 0:end.start() if end else len(text)]


def emails(part):
    """Each email: (subject, body up to and including its footer)."""
    out = []
    for m in re.finditer(r"\*\*Subject:\*\*\s*(.+?)\n(.*?)(?=\n\*\*Subject:\*\*|\n#{2,3} |\n\*\*(?:Text|Call|Voicemail|Call opener)\b|\Z)", part, re.S):
        out.append((m.group(1).strip(), m.group(2)))
    return out


def words(s):
    return re.findall(r"[A-Za-z0-9$'\[\]][\w$',.:\[\]/-]*", s)


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
    src = "\n".join(read_input(f) for f in cfg["inputs"]) + "\n" + cfg["prompt"]
    results = []

    def rec(label, ok, note=""):
        results.append((label, "PASS" if ok else "FAIL", note))

    rec("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", text))
    subjects = re.findall(r"\*\*Subject:\*\*\s*(.+)", text)
    bad = [s.strip() for s in subjects if any(w[0].islower() for w in re.findall(r"[A-Za-z][\w']*", s))]
    rec("Title Case subjects", bool(subjects) and not bad, f"{len(subjects)} subjects" + (f"; not Title Case: {bad}" if bad else ""))
    rec("Check Before Sending section", bool(re.search(r"^## Check Before Sending", text, re.M)))

    part = drafts_part(text)
    texts = re.findall(r"^> (.+)$", part, re.M)
    if cfg["text_ok"]:
        probs = []
        for i, t in enumerate(texts):
            limit = 320 if i == 0 else 200
            if len(t) > limit:
                probs.append(f"text {i + 1}: {len(t)} chars (limit {limit})")
            if not t.rstrip().endswith("Reply STOP to opt out."):
                probs.append(f"text {i + 1}: no STOP line at the end")
            if cfg["brokerage"] not in t or cfg["agent"].split()[0] not in t:
                probs.append(f"text {i + 1}: no agent or brokerage")
            if not t.startswith("Hi "):
                probs.append(f"text {i + 1}: doesn't open with Hi and the name")
        rec("Texts drafted (TEXT OK)", len(texts) >= 1, f"{len(texts)} texts")
        rec("Each text: sender, STOP line, length", not probs, "; ".join(probs))
        first = section(text, "First Text")
        rec("Consent line above the first text quotes the record",
            "Consent:" in first and cfg["consent_quote"] in first)
        for t in texts:
            results.append(("Text length", "NOTE", f"{len(t)} characters: {t[:50]}..."))
    else:
        rec("No text drafted anywhere (NO TEXT)", not texts, f"{len(texts)} texts found")
    if cfg["consent_quote"]:
        rec("Consent read quotes the record", cfg["consent_quote"] in section(text, "Consent Read"))

    calls = re.findall(r"\*\*(Call opener|Call|Voicemail):\*\*\s*(.+)", part)
    if not cfg["calls"]:
        rec("No call opener, call or voicemail (calls closed)", not calls, f"{len(calls)} found")
    else:
        vms = [c[1] for c in calls if c[0] == "Voicemail"]
        long_vm = [f"{len(words(v))} words" for v in vms if len(words(v)) > 50]
        rec("Call opener and voicemail present", any(c[0] == "Call opener" for c in calls) and bool(vms))
        rec("Every voicemail 50 words or fewer", not long_vm, ", ".join(f"{len(words(v))}" for v in vms))
        opener = next((c[1] for c in calls if c[0] == "Call opener"), "")
        first_sentence = re.split(r"(?<=[.?!])\s", opener, maxsplit=1)[0] if opener else ""
        rec("Call opener's first sentence names the agent and brokerage",
            cfg["agent"] in first_sentence and cfg["brokerage"] in first_sentence, first_sentence[:90])
        if not cfg["text_ok"]:
            txt_back = [v for v in vms if re.search(r"\btext\b", v, re.I)]
            rec("No voicemail asks a NO TEXT lead to text back", not txt_back, "; ".join(t[:60] for t in txt_back))

    em = emails(part)
    long_em, no_footer = [], []
    for i, (subj, body) in enumerate(em):
        cut = body.find("To stop these emails")
        main_body = body[:cut if cut >= 0 else len(body)]
        sig = re.search(r"\n\n" + re.escape(cfg["agent"].split()[0]) + r"[^\n]*\n", main_body)
        main_body = main_body[:sig.start()] if sig else main_body
        n = len(words(main_body))
        limit = 150 if i == 0 else 80
        if n > limit:
            long_em.append(f"{subj} ({n} > {limit})")
        if "To stop these emails, reply UNSUBSCRIBE." not in body or "[Sender Postal Address]" not in body:
            no_footer.append(subj)
        results.append(("Email length", "NOTE", f"{n} words: {subj}"))
    rec("Emails found", bool(em), f"{len(em)} emails")
    rec("First email 150 words or fewer, touch emails 80 or fewer", not long_em, "; ".join(long_em))
    rec("Every email has the opt-out and postal address footer", not no_footer, ", ".join(no_footer))

    avail = [s.strip() for s in re.split(r"(?<=[.?!])\s", part)
             if re.search(r"\bavailable\b", s, re.I) and not re.search(r"confirm|check|find out", s, re.I)]
    rec("No sentence says the home is available without confirm or check", not avail, " | ".join(a[:80] for a in avail))

    low = text.lower()
    found = [s for s in cfg["never"] if s.lower() in low]
    rec("Never-appear strings absent from the whole output", not found, ", ".join(found))
    in_drafts = [s for s in cfg.get("never_in_drafts", []) if s.lower() in part.lower()]
    rec("Agent-only strings absent from the drafts", not in_drafts, ", ".join(in_drafts))
    prot = sorted(set(m.group(0).lower() for m in re.finditer(PROTECTED, part, re.I)))
    rec("Protected-class and household words in the drafts (review each)", not prot, ", ".join(prot))
    opin = sorted(set(m.group(0).lower() for m in re.finditer(OPINION, part, re.I)))
    rec("Neighborhood-opinion words in the drafts", not opin, ", ".join(opin))
    act = sorted(set(m.group(0).lower() for m in re.finditer(ACTIVITY, part, re.I)))
    rec("Website activity in the drafts", not act, ", ".join(act))
    stock = [p for p in STOCK if p in part.lower()]
    rec("No stock phrases in the drafts", not stock, ", ".join(stock))
    wire = re.findall(r"routing|account number|wire|acct|social security", text, re.I)
    rec("No wire or account details", not wire, ", ".join(wire))

    src_nums = {n for _, n in numbers(src)}
    for w, n in [("one", "1"), ("two", "2"), ("three", "3"), ("first", "1"), ("second", "2")]:
        if re.search(r"\b" + w + r"\b", src, re.I):
            src_nums.add(n)
    plain = text
    cited = [c for c in CITATIONS if c in text]
    for c in CITATIONS:
        plain = plain.replace(c, " ")
    if cited:
        results.append(("Citations", "NOTE", "From the skill's references: " + ", ".join(cited)))
    misses, derived = [], []
    for tok, n in numbers(re.sub(r"\b\d{1,2}:\d{2}\b", " ", plain)):
        if n in src_nums or n in SMALL:
            continue
        if n in cfg["derived"]:
            derived.append(tok)
            continue
        try:
            v = float(n)
        except ValueError:
            continue
        if v >= 1000 and v % 1000 == 0 and str(int(v // 1000)) in src_nums:
            continue
        misses.append(tok)
    rec("Numbers not found in the input (grade each)", not misses, ", ".join(sorted(set(misses), key=lambda s: (len(s), s))))
    if derived:
        results.append(("Resolved dates", "NOTE", "Day numbers worked out from today's date: " + ", ".join(sorted(set(derived)))))
    clock = [s for s in re.findall(r"\b\d{1,2}:\d{2}\b", text) if s not in src and s not in ("8:00", "8:00")]
    rec("Every clock time is in the input (8:00 is the send window)", not clock, ", ".join(sorted(set(clock))))

    print(f"Objective checks: {case} / {name}")
    for label, res, note in results:
        print(f"- {res}  {label}" + (f": {note}" if note else ""))


if __name__ == "__main__":
    main()
