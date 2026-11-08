"""Objective checks for one run of low-appraisal-response.

Usage: python3 objective_checks.py OUTPUT_MD PROMPT_TEXT INPUT [INPUT ...] [--computed 37000,6.4] [--refs]
INPUT may be a PDF (read with pdftotext) or a CSV (read as text).
Prints each check with PASS or FAIL and the evidence. Numbers in the output that appear in no input (and
aren't listed as computed arithmetic) are listed for a person to review. --refs also counts numbers in the
skill's own reference files (section numbers, verified rules), since those are cited facts, not deal facts.
"""
import glob
import json
import os
import re
import subprocess
import sys

args = sys.argv[1:]
use_refs = "--refs" in args
args = [a for a in args if a != "--refs"]
computed = set()
if "--computed" in args:
    i = args.index("--computed")
    computed = {c.strip() for c in args[i + 1].split(",") if c.strip()}
    args = args[:i] + args[i + 2:]
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


src_nums = {norm(m) for m in re.findall(r"\$?\d[\d,]*(?:\.\d+)?", src)}
allowed = src_nums | {norm(c) for c in computed} | {"2026", "8", "11"}
results = []


def check(name, ok, evidence=""):
    results.append((name, ok, evidence))


check("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", out))
check("Check before sending section", bool(re.search(r"^#+ .*Check Before Sending", out, re.M | re.I)))

subjects = re.findall(r"\*\*Subject: (.+?)\*\*", out)
small_ok = {"St", "Ln", "Dr", "Ct", "N", "E", "S", "W", "No."}
bad_subj = [s for s in subjects for w in re.findall(r"[A-Za-z][A-Za-z'.]*", s) if w[0].islower()]
check("Title Case subject lines", bool(subjects) and not bad_subj, "; ".join(subjects))

stock = [p for p in ["stunning", "dream home", "don't hesitate", "do not hesitate"] if p in out.lower()]
check("No stock phrases", not stock, ", ".join(stock))

wire = [p for p in ["routing number", "account number", "wire to", "ACH to", "SSN", "social security"] if p.lower() in out.lower()]
check("No wire, routing or account details", not wire, ", ".join(wire))

agent_only = [p for p in ["lockbox code", "code 4417", "code 2468", "code 1357", "agent remarks", "private remarks",
                          "showing instructions", "555-0142", "sellers relocating", "motivated", "bottom line discussed",
                          "$675,000"] if p.lower() in out.lower()]
check("No agent-only MLS fields or seller bottom line in the output", not agent_only, ", ".join(agent_only))

text_wo_rooms = re.sub(r"family room", "", out, flags=re.I)
protected = [p for p in ["families", "family", "kids", "children", "church", "religio", "race", "ethnic", "elderly",
                         "young couple", "retiree", "school", "safe neighborhood", "demographic", "disabled", "wheelchair",
                         "national origin"]
             if re.search(r"\b" + p, text_wo_rooms, re.I)]
check("No protected-class language", not protected, ", ".join(protected))

typical = re.findall(r"[^.\n]*\b(typically costs?|usually costs?|typical cost|runs about|ballpark)\b[^.\n]*", out, re.I)
check("No cost estimates without bids (phrasing)", not typical, " | ".join(typical))

blame = re.findall(r"[^.\n]*\b(bad comps?|careless|sloppy|incompetent|lazy|biased appraiser|wrong appraiser)\b[^.\n]*", out, re.I)
check("No criticism of the appraiser", not blame, " | ".join(blame))

promise = re.findall(r"[^.\n]*\b(will (?:raise|increase|change) the value|guarantee[sd]?|value will come in)\b[^.\n]*", out, re.I)
promise = [p for p in promise if not re.search(r"\b(no|not|never|can't|cannot|won't)\b", p, re.I)]
check("No promise of a value change", not promise, " | ".join(promise))

out_nums = re.findall(r"\$?\d[\d,]*(?:\.\d+)?", out)
missing = sorted({n for n in out_nums if norm(n) not in allowed}, key=lambda x: (len(x), x))
dollars_missing = [n for n in missing if n.startswith("$")]
check("Every dollar amount appears in the inputs or is listed arithmetic", not dollars_missing, ", ".join(dollars_missing))

for name, ok, ev in results:
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  [{ev}]" if ev else ""))
print("Numbers not found verbatim in the inputs (review each; dates, counts and arithmetic the skill computed are expected):")
print("  " + (", ".join(missing) if missing else "none"))
