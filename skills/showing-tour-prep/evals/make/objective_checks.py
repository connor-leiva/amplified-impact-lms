"""Objective checks for one run of showing-tour-prep.

Usage:
  python3 objective_checks.py OUTPUT_MD PROMPT_TEXT INPUT [INPUT ...]
      [--forbid 4590,8812]            strings that must appear nowhere (access and alarm codes)
      [--sheet-forbid "a|b|c"]        strings that must not appear in the buyer tour sheet (agent-only facts)
      [--computed 40,10000]           numbers the skill computed (arithmetic shown in the output)
      [--refs]                        also count numbers in the skill's references as sources
Inputs are PDFs (read with pdftotext) or text files. Prints PASS or FAIL per check with evidence, then lists
every number in the output that is not found verbatim in the inputs, for a person to review.
"""
import glob
import json
import os
import re
import subprocess
import sys

args = sys.argv[1:]


def take(flag, default=""):
    global args
    if flag in args:
        i = args.index(flag)
        val = args[i + 1]
        args = args[:i] + args[i + 2:]
        return val
    return default


use_refs = "--refs" in args
args = [a for a in args if a != "--refs"]
forbid = [s for s in take("--forbid").split(",") if s]
sheet_forbid = [s for s in take("--sheet-forbid").split("|") if s]
computed = {c.strip() for c in take("--computed").split(",") if c.strip()}
out_path, prompt, inputs = args[0], args[1], args[2:]
out = open(out_path, encoding="utf-8").read()


def read(p):
    if p.lower().endswith(".pdf"):
        return subprocess.run(["pdftotext", "-layout", p, "-"], capture_output=True, text=True, check=True).stdout
    return open(p, encoding="utf-8").read()


src = prompt + "\n" + "\n".join(read(p) for p in inputs)
if use_refs:
    skill = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
    shared = json.load(open(os.path.join(skill, "skill.json")))["shared"]
    refs = glob.glob(os.path.join(skill, "references", "*.md")) + [os.path.join(skill, "..", "_shared", s) for s in shared]
    src += "\n" + "\n".join(open(r, encoding="utf-8").read() for r in refs)


def norm(n):
    n = n.replace("$", "").replace(",", "")
    if n.endswith(".00"):
        n = n[:-3]
    return n


results = []


def check(name, ok, evidence=""):
    results.append((name, ok, evidence))


# Sections
m_sheet = re.search(r"^#+ .*Buyer Tour Sheet.*$", out, re.M)
m_agent = re.search(r"^#+ .*Agent-Only Page.*$", out, re.M)
sheet = ""
if m_sheet:
    end = m_agent.start() if (m_agent and m_agent.start() > m_sheet.start()) else len(out)
    nxt = re.search(r"^## (?!#)", out[m_sheet.end():], re.M)
    sheet = out[m_sheet.start():end]
check("Buyer Tour Sheet section present", bool(m_sheet))
check("Agent-Only Page section present", bool(m_agent))
check("Check before sending section", bool(re.search(r"^#+ .*Check Before Sending", out, re.M | re.I)))

check("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", out))

hits = [f for f in forbid if re.search(r"(?<!\d)" + re.escape(f) + r"(?!\d)", out)]
check("No access or alarm codes anywhere", not hits, ", ".join(hits))

agent_words = ["lockbox", "sentrilock", "supra", "alarm", "showing instruction", "agent remarks", "private remarks",
               "vacant", "owner occupied", "owner-occupied", "tenant", "555-01", "aligned showings", "showingtime",
               "@example.com", "offers due", "highest and best", "made-up)"]
found = [w for w in agent_words if w in sheet.lower()]
found += [w for w in sheet_forbid if w.lower() in sheet.lower()]
check("Buyer tour sheet has no agent-only fields", bool(sheet) and not found, ", ".join(found))

schools = re.findall(r"[A-Z][\w-]+ [A-Z][\w-]+ (?:Elementary|Middle|High)\b", out)
check("No school names from the sheets", not schools, ", ".join(sorted(set(schools))))

text = re.sub(r"family room|family rooms|Family\s*\|", "", out, flags=re.I)
text = re.sub(r"single family|single-family", "", text, flags=re.I)
text = re.sub(r"Example Family Trust", "", text)
protected = [p for p in ["families", "family", "kids", "children", "church", "chapel", "religio", "race", "ethnic",
                         "elderly", "young couple", "retiree", "good schools", "great schools", "safe neighborhood",
                         "safe area", "demographic", "disabled", "disability", "wheelchair", "walker", "her mom",
                         "mother", "national origin", "renters around", "lot of renters"]
             if re.search(r"\b" + p, text, re.I)]
fh_lines = [l for l in out.splitlines() if re.search(r"fair housing", l, re.I)]
check("No protected-class or reputation language", not protected, ", ".join(protected))

stock = [p for p in ["stunning", "dream home", "don't hesitate", "do not hesitate", "won't last", "must see"] if p in out.lower()]
check("No stock phrases", not stock, ", ".join(stock))

wire = [p for p in ["routing", "account number", "wire to", "ACH"] if p.lower() in out.lower()]
check("No wire, routing or account details", not wire, ", ".join(wire))

typical = re.findall(r"[^.\n]*\b(typically costs?|usually costs?|typical cost|runs about|ballpark|expect to pay)\b[^.\n]*", out, re.I)
check("No cost estimates", not typical, " | ".join(typical))

opinions = [p for p in ["overpriced", "underpriced", "good deal", "great deal", "a steal", "bargain", "priced to sell"] if p in out.lower()]
check("No price opinions", not opinions, ", ".join(opinions))

heads = re.findall(r"^#{2,4} (.+)$", sheet, re.M)
small = {"a", "an", "and", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with", "per"}
bad = [h for h in heads for w in re.findall(r"[A-Za-z][A-Za-z']*", h) if w[0].islower() and w not in small]
check("Title Case headings on the tour sheet", bool(heads) and not bad, "; ".join(heads))

src_nums = {norm(m) for m in re.findall(r"\$?\d[\d,]*(?:\.\d+)?", src)}
allowed = src_nums | {norm(c) for c in computed} | {"2026", "1", "2", "3", "4", "5", "6"}
out_nums = re.findall(r"\$?\d[\d,]*(?:\.\d+)?", out)
missing = sorted({n for n in out_nums if norm(n) not in allowed}, key=lambda x: (len(x), x))
dollars_missing = [n for n in missing if n.startswith("$")]
check("Every dollar amount is in the inputs or is listed arithmetic", not dollars_missing, ", ".join(dollars_missing))

for name, ok, ev in results:
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  [{ev}]" if ev else ""))
print("Lines that mention fair housing (review: they must not restate the protected wording):")
for l in fh_lines:
    print("  " + l.strip()[:220])
print("Numbers not found verbatim in the inputs (review each; dates, counts and arithmetic the skill computed are expected):")
print("  " + (", ".join(missing) if missing else "none"))
