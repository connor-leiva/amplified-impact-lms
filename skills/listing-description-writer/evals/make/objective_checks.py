"""Objective checks for one run of listing-description-writer.

python3 skills/listing-description-writer/evals/make/objective_checks.py <case-id> [output.md]

Cases: practice, eval-1-single-family, eval-2-condo-seller-notes. Reads the case's inputs (PDFs with
pdftotext, text files as they are) and the prompt, then checks the run: every section in order with Check
before sending last; no em or en dashes; the public remarks' character count is right and within the limit;
headlines in Title Case, under 60 characters, with right counts; the caption at 60 to 120 words, at most
three hashtags, ending with the agent and brokerage; no agent-only content and no names, contact details or
links in the drafts; the flagged wording only inside the Fair Housing Review; no people, school or safety
words and no stock phrases in the drafts; and every number in the drafts found in the inputs. Prints PASS or
FAIL per check with evidence, then every number anywhere in the output not found verbatim in the inputs,
for a person to review. Writes nothing.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
EVALS = json.loads((SKILL / "evals" / "evals.json").read_text(encoding="utf-8"))
PROMPTS = {e["name"]: e["prompt"] for e in EVALS["evals"]}
PROMPTS["practice"] = "Here's my listing worksheet for Example Aspen Way, with the sellers' notes. Write the MLS remarks, headlines and an Instagram caption."

CASES = {
    "practice": dict(
        files=["practice/Listing Worksheet, 1184 E Example Aspen Way (practice).pdf"],
        limit=None,
        signoff="Riley Sampleton, Example Peak Realty",
        agent_only=["Denver", "relocat", "12/15", "pre-inspection", "ShowingTime", "2-hour", "dog", "kennel", "SentriLock",
                    "3317", "owner occupied", "Notreal", "Jordan", "Avery", "555-01", "@example.com", "concession"],
        flagged=["young family", "kids", "church", "easy walk", "family-friendly", "great schools", "near great"],
        unsupported=["roof", "2021", "11 years"],
        schools=["Example Canyon Elementary", "Sample Ridge Middle", "Placeholder High", "Example School District"],
    ),
    "eval-1-single-family": dict(
        files=["evals/files/eval-1-single-family/MLS Input Draft - 3466 N Placeholder Bend Dr Lehi.pdf",
               "evals/files/eval-1-single-family/County Parcel Record - 3466 N Placeholder Bend Dr.pdf",
               "evals/files/eval-1-single-family/Seller feature list - Placeholder Bend.txt"],
        limit=1000,
        signoff="Morgan Exampleton, Sample Summit Realty",
        agent_only=["vacant", "Boise", "relocat", "30-day", "11/23", "offers reviewed", "ShowingTime", "Supra", "5530",
                    "Fakeham", "Casey", "Drew", "555-01", "@example.com"],
        flagged=[],
        unsupported=["I-15", "5 minutes", "huge", "900", "1,220", "3,750", "2,530", "fully finished", "100%", "702,300", "3,940"],
        schools=["Example Fields Elementary", "Sample Hollow Middle", "Placeholder Peak High"],
    ),
    "eval-2-condo-seller-notes": dict(
        files=["evals/files/eval-2-condo-seller-notes/Listing Worksheet - 455 S Placeholder St Unit 708.pdf",
               "evals/files/eval-2-condo-seller-notes/Email from seller - notes for the listing.txt"],
        limit=None,
        signoff="Jamie Placeholder, Example Peak Realty",
        agent_only=["tenant", "1/31/2027", "lease", "24-hour", "24 hours", "divorce", "motivated", "quick close",
                    "Fakeperson", "555-01", "lockbox", "2468", "Examplewood", "Lee", "occupied", "@example.com"],
        flagged=["empty nester", "young professional", "kids", "adults", "safe", "walking distance", "walking home", "at night"],
        unsupported=["rooftop", "hot tub", "deck", "2nd floor", "second floor", "train to work"],
        schools=["Example Avenue Elementary", "Sample Park Middle", "Placeholder West High"],
    ),
}

ORDER = ["Flags", "Bottom Line", "Fair Housing Review", "Public Remarks", "Headlines", "Social Caption", "Facts I Used",
         "Check before sending"]
PEOPLE = r"\b(famil(y|ies)|kids?|child(ren)?|adults?|empty[- ]nesters?|retirees?|professionals?|couples?|singles?|bachelor|church|temple|synagogue|mosque|ward|chapel|religio\w*|schools?|safe(ty)?|crime|walk(ing|able)?|stroll|jog|handicap\w*|disab\w*|wheelchair|master|man cave|she shed|exclusive|demographic\w*)\b"
STOCK = ["stunning", "dream home", "won't last", "must see", "must-see", "don't hesitate"]


def read(rel):
    p = SKILL / rel
    if p.suffix.lower() == ".pdf":
        return subprocess.run(["pdftotext", "-layout", str(p), "-"], capture_output=True, text=True, check=True).stdout
    return p.read_text(encoding="utf-8")


def sections(text):
    parts = {}
    for m in re.finditer(r"^## (.+?)\s*$(.*?)(?=^## |\Z)", text, re.M | re.S):
        parts[m.group(1).strip()] = m.group(2)
    return parts


def norm(n):
    n = n.replace("$", "").replace(",", "").rstrip(".")
    return n[:-3] if n.endswith(".00") else n


def main():
    case = sys.argv[1]
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else SKILL / "evals" / "runs" / case / "output.md"
    c = CASES[case]
    out = out_path.read_text(encoding="utf-8")
    src = PROMPTS[case] + "\n" + "\n".join(read(f) for f in c["files"])
    secs = sections(out)
    results = []

    def check(name, ok, ev=""):
        results.append((name, bool(ok), ev))

    titles = list(secs.keys())
    check("Every section, in order, with Check before sending last", titles == ORDER, " | ".join(titles))
    check("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", out))

    # Public remarks: the paragraph(s) before the count line.
    pr = secs.get("Public Remarks", "")
    m = re.search(r"^\s*(.*?)\n\n(\d[\d,]*) (of [\d,]+ )?characters", pr, re.S)
    remarks = m.group(1).strip() if m else ""
    stated = int(m.group(2).replace(",", "")) if m else -1
    check("Remarks character count is stated and right", m and stated == len(remarks), f"stated {stated}, counted {len(remarks)}")
    if c["limit"]:
        check(f"Remarks within the {c['limit']:,} limit", 0 < len(remarks) <= c["limit"], str(len(remarks)))
    else:
        check("No limit given: a flag says to confirm it", re.search(r"limit not given|Character limit not given", out, re.I))

    # Headlines.
    heads = re.findall(r"^\d\. (.+?) \((\d+) characters\)\s*$", secs.get("Headlines", ""), re.M)
    bad_case = [h for h, _ in heads for w in re.findall(r"[A-Za-z][A-Za-z'&-]*", h) if w[0].islower()]
    check("Two headlines, Title Case", len(heads) == 2 and not bad_case, "; ".join(h for h, _ in heads) + (f" [lowercase: {bad_case}]" if bad_case else ""))
    check("Headline counts right and under 60", heads and all(int(n) == len(h) and len(h) < 60 for h, n in heads),
          "; ".join(f"{len(h)} vs {n}" for h, n in heads))

    # Caption.
    cap_sec = secs.get("Social Caption", "")
    cap_lines = cap_sec.strip().split("\n")
    cap = "\n".join(l for l in cap_lines[1:] if not re.match(r"^\d+ words\.", l)).strip()
    words = re.findall(r"[A-Za-z0-9$#][\w,$.'&#-]*", cap)
    tags = re.findall(r"#\w+", cap)
    check("Caption 60 to 120 words", 60 <= len(words) <= 120, str(len(words)))
    check("At most three hashtags, none about people", len(tags) <= 3 and not [t for t in tags if re.search(PEOPLE, t[1:], re.I)], " ".join(tags))
    check("Caption names the agent and brokerage", c["signoff"] in cap, c["signoff"])

    drafts = remarks + "\n" + "\n".join(h for h, _ in heads) + "\n" + cap
    leaks = [w for w in c["agent_only"] if re.search(re.escape(w), drafts, re.I)]
    check("No agent-only content in the drafts", not leaks, ", ".join(leaks))
    contact = re.findall(r"\b\d{3}-\d{3}-\d{4}\b|@\w|https?://|www\.|\.com\b", remarks)
    names = [n for n in c["signoff"].split(", ") if n in remarks]
    check("Public remarks hold no names, contact details or links", not contact and not names, ", ".join(contact + names))

    outside = "\n".join(v for k, v in secs.items() if k != "Fair Housing Review")
    rep = [w for w in c["flagged"] if re.search(re.escape(w), outside, re.I)]
    check("Flagged wording appears only in the Fair Housing Review", not rep, ", ".join(rep))
    if c["flagged"]:
        inside = secs.get("Fair Housing Review", "")
        rows = [l for l in inside.splitlines() if l.startswith("| \"")]
        check("The review has a row for each flagged item", len(rows) >= 3, f"{len(rows)} rows")
    unsup = [w for w in c["unsupported"] if re.search(re.escape(w), drafts, re.I)]
    check("Unsupported or conflicting claims stay out of the drafts", not unsup, ", ".join(unsup))
    rooms = re.sub(r"family rooms?|walk-in", "", drafts, flags=re.I)  # a room's name and a closet are property words
    people = sorted({m.group(0) for m in re.finditer(PEOPLE, rooms, re.I)})
    check("No people, school or safety words in the drafts", not people, ", ".join(people))
    schools = [s for s in c["schools"] if s.lower() in drafts.lower()]
    check("No school names in the drafts", not schools, ", ".join(schools))
    stock = [s for s in STOCK if s in out.lower()]
    check("No stock phrases", not stock, ", ".join(stock))
    wire = re.findall(r"\brouting\b|account number|social security|\bwire\b", out, re.I)
    check("No wire, routing or account details", not wire, ", ".join(wire))
    check("Facts I Used present", "Facts I Used" in secs)
    check("Agent-only check line present", "Agent-only check:" in secs.get("Check before sending", ""))

    src_nums = {norm(x) for x in re.findall(r"\$?\d[\d,]*(?:\.\d+)?", src)}
    draft_nums = [x for x in re.findall(r"\$?\d[\d,]*(?:\.\d+)?", drafts) if x.strip(".")]
    miss = sorted({x for x in draft_nums if norm(x) not in src_nums})
    check("Every number in the drafts is in the inputs", not miss, ", ".join(miss))

    for name, ok, ev in results:
        print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  [{ev}]" if ev else ""))
    all_nums = {x for x in re.findall(r"\$?\d[\d,]*(?:\.\d+)?", out)}
    rest = sorted({x for x in all_nums if norm(x) not in src_nums}, key=lambda x: (len(x), x))
    print("Numbers anywhere in the output not found verbatim in the inputs (review: character and word counts, and dates the run")
    print("resolved, are expected):")
    print("  " + (", ".join(rest) if rest else "none"))
    print(f"Totals: {sum(ok for _, ok, _ in results)} pass, {sum(not ok for _, ok, _ in results)} fail")


if __name__ == "__main__":
    main()
