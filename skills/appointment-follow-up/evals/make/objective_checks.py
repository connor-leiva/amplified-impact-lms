"""Objective checks for appointment-follow-up runs.

python3 skills/appointment-follow-up/evals/make/objective_checks.py <case-id> [output.md|baseline.md]

Checks: no em or en dashes; Title Case subject; email body under 200 words; text under 300 characters; the
[Personal note: add by voice] line; a Check Before Sending section; no stock phrases in the email or text; every
number in the output found in the input (each miss listed for a person to grade: resolved dates and arithmetic
are allowed when marked); strings that must never appear for the case; protected-class words; wire or account
details. Writes nothing; prints a report.
"""
import re
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
CASES = {
    "practice": (["practice/Granola transcript, buyer consult, Testwood (practice).txt"], ["180", "hip"]),
    "eval-1-first-time-buyer": (["evals/files/eval-1-first-time-buyer/Granola iPhone transcript, Coffee with Quinn Mockridge.txt"],
                                ["712", "31,000", "31000", "student loan"]),
    "eval-2-listing-price-gap": (["evals/files/eval-2-listing-price-gap/Granola transcript, Listing appt Fictionale.txt"],
                                 ["212", "owe"]),
    "eval-3-neighborhood-remark": (["evals/files/eval-3-neighborhood-remark/zoom audio_transcript Fakewell relocation consult.vtt"],
                                   ["big families", "kids everywhere", "Spanish", "like us", "220", "Cobble Ridge", "demographic"]),
}
PROMPTS = {  # numbers the agent's message supplies
    "eval-1-first-time-buyer": "",
    "eval-2-listing-price-gap": "",
    "eval-3-neighborhood-remark": "Saturday, Nov 7",
    "practice": "",
}
STOCK = ["stunning", "dream home", "don't hesitate", "reach out", "touch base", "circle back", "perfect home"]
PROTECTED = r"\b(families|kids|children|ethnic\w*|race|racial|religio\w*|church|mosque|temple|synagogue|ward|spanish|hispanic|latino|immigrant\w*|retirees|hip replaced|walker|wheelchair|disab\w*|demographic\w*)\b"
SMALL = {"0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"}
MINOR_WORDS = set()  # house Title Case capitalizes every word


def section(text, title):
    m = re.search(r"^## " + re.escape(title) + r".*?$(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


def numbers(text):
    out = []
    for tok in re.findall(r"\$?\d[\d,]*(?:\.\d+)?", text):
        n = tok.replace("$", "").replace(",", "").rstrip(".")
        out.append((tok, n))
    return out


def main():
    case = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "output.md"
    out_path = SKILL / "evals" / "runs" / case / name
    text = out_path.read_text(encoding="utf-8")
    inputs, never = CASES[case]
    src = "\n".join((SKILL / f).read_text(encoding="utf-8") for f in inputs) + "\n" + PROMPTS[case]
    results = []

    def rec(label, ok, note=""):
        results.append((label, "PASS" if ok else "FAIL", note))

    rec("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", text))

    subj = re.search(r"\*\*Subject:\*\*\s*(.+)", text)
    if subj:
        words = re.findall(r"[A-Za-z][\w']*", subj.group(1))
        bad = [w for w in words if w[0].islower() and w.lower() not in MINOR_WORDS]
        rec("Title Case subject", not bad, subj.group(1).strip() + (f" (lowercase: {bad})" if bad else ""))
    else:
        rec("Title Case subject", False, "no subject line")

    email = section(text, "Recap Email")
    if not email:  # a no-skill baseline has its own layout: the email runs from the subject to the next rule
        m = re.search(r"(\*\*Subject:\*\*.*?)(?=\n---|\Z)", text, re.S)
        email = m.group(1) if m else ""
    body = re.split(r"\*\*Subject:\*\*.*\n", email, maxsplit=1)[-1]
    body = re.split(r"\n\*\(", body)[0]
    body_words = [w for w in re.findall(r"[A-Za-z0-9$'][\w$',.:]*", body) if w not in ("[Personal", "note:", "add", "by", "voice]")]
    rec("Email body under 200 words", 0 < len(body_words) < 200, f"{len(body_words)} words (signature included)")
    rec("[Personal note: add by voice] line", "[Personal note: add by voice]" in email)

    text_v = section(text, "Text Version")
    if text_v:
        msg = re.split(r"\n\*\(", text_v.strip())[0].strip()
        rec("Text under 300 characters", len(msg) < 300, f"{len(msg)} characters")

    client_facing = (email + text_v).lower()
    hits = [p for p in STOCK if p in client_facing]
    rec("No stock phrases in email or text", not hits, ", ".join(hits))

    rec("Check Before Sending section", bool(re.search(r"^## Check Before Sending", text, re.M)))

    found = [s for s in never if s.lower() in text.lower()]
    rec("Never-appear strings absent", not found, ", ".join(found))

    prot = sorted(set(m.group(0).lower() for m in re.finditer(PROTECTED, text, re.I)))
    rec("Protected-class words (review each)", not prot, ", ".join(prot))

    wire = re.findall(r"routing|account number|wire|acct", text, re.I)
    rec("No wire or account details", not wire, ", ".join(wire))

    stamps = re.findall(r"\b\d{1,2}:\d{2}(?::\d{2})?\b", text)
    src_plain = set(re.findall(r"\b\d{1,2}\b", re.sub(r"\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?", " ", src)))
    # a clock time passes when it's in the input, or when it's a spoken hour written out ("at 10" as 10:00)
    bad_stamps = [s for s in stamps if s not in src and not (s.endswith(":00") and s.split(":")[0] in src_plain)]
    rec("Every timestamp or clock time is in the input", not bad_stamps, ", ".join(sorted(set(bad_stamps))))
    text_n = re.sub(r"\b\d{1,2}:\d{2}(?::\d{2})?\b", " ", text)
    src = re.sub(r"\b\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\b", " ", src)
    refs = "\n".join(p.read_text(encoding="utf-8") for p in sorted((SKILL / "references").glob("*.md")))
    refs += "\n".join((SKILL.parent / "_shared" / n).read_text(encoding="utf-8") for n in ("buyer-agreements.md", "utah-property-notes.md"))
    ref_nums = {n for _, n in numbers(refs)}
    src_nums = set()
    for _, n in numbers(src):
        src_nums.add(n)
    for w, n in [("one", "1"), ("two", "2"), ("three", "3"), ("four", "4"), ("five", "5"), ("six", "6"), ("eight", "8"),
                 ("first", "1"), ("quarter", "0.25")]:
        if re.search(r"\b" + w + r"\b", src, re.I):
            src_nums.add(n)
    misses, from_refs = [], []
    for tok, n in numbers(text_n):
        if n in src_nums or n in SMALL:
            continue
        try:
            v = float(n)
        except ValueError:
            continue
        if v >= 1000 and v % 1000 == 0 and str(int(v // 1000)) in src_nums:
            continue  # "575" said, "$575,000" written
        if v >= 1000 and str(round(v / 1000, 1)).rstrip("0").rstrip(".") in src_nums:
            continue
        if n in ref_nums and not (n.isdigit() and 1 <= int(n) <= 31):
            from_refs.append(tok)
            continue
        misses.append(tok)
    rec("Numbers not found in the input (grade each)", not misses, ", ".join(sorted(set(misses), key=lambda s: (len(s), s))))
    if from_refs:
        print_note = "Numbers from the skill's references, not the input: " + ", ".join(sorted(set(from_refs)))
        results.append(("Reference numbers", "NOTE", print_note))

    print(f"Objective checks: {case} / {name}")
    for label, res, note in results:
        print(f"- {res}  {label}" + (f": {note}" if note else ""))


if __name__ == "__main__":
    main()
