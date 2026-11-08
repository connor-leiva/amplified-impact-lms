"""Objective checks on one run's output, for grading.md.

- no em or en dashes
- every number in the output appears in the input files (small counts of 10 or fewer,
  numbers the skill's own instructions use, and $0.00 in practice mode are listed separately)
- the sections the brief needs, the bottom line's sentence count, and token leaks

Usage: python evals/make/objective_checks.py <output.md> <input file or folder> [...] [--token TOKEN]
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

SKILL_NUMBERS = {"2", "3", "5", "8", "12", "72", "90", "1", "4", "0.00", "2.0"}


def numbers(text):
    out = []
    for m in re.finditer(r"(?<![\w.])\$?\d[\d,]*(?:\.\d+)?", text):
        raw = m.group(0).lstrip("$").rstrip(".,")
        out.append(raw.replace(",", ""))
    return out


def main(argv):
    token = None
    if "--token" in argv:
        i = argv.index("--token")
        token = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
    out_path, inputs = Path(argv[0]), [Path(a) for a in argv[1:]]
    text = out_path.read_text(encoding="utf-8")
    corpus = []
    for p in inputs:
        files = [p] if p.is_file() else [f for f in p.rglob("*") if f.is_file()]
        for f in files:
            corpus.append(f.read_text(encoding="utf-8", errors="replace"))
    blob = "\n".join(corpus)
    blob_nums = set(numbers(blob)) | set(re.findall(r"\d+(?:\.\d+)?", blob.replace(",", "")))
    blob_nums |= {n[:-2] for n in blob_nums if n.endswith(".0")}  # 2163.0 in JSON is 2163 in prose
    # Dates like 2026-11-06 count as three numbers; accept their parts when the whole date is in the inputs.
    dates = set(re.findall(r"\d{4}-\d{2}-\d{2}", blob))
    date_parts = {part.lstrip("0") or "0" for d in dates for part in d.split("-")} | {part for d in dates for part in d.split("-")}

    print(f"Output: {out_path}")
    dashes = [c for c in text if c in (chr(0x2013), chr(0x2014))]
    print(f"- em or en dashes: {len(dashes)}")

    found_dates = re.findall(r"\d{4}-\d{2}-\d{2}", text)
    missing_dates = sorted({d for d in found_dates if d not in dates})
    print(f"- dates in output: {len(set(found_dates))}, not in inputs: {missing_dates or 'none'}")

    text_wo_dates = re.sub(r"\d{4}-\d{2}-\d{2}", " ", text)
    text_wo_codes = re.sub(r"[A-Z]+_[A-Z0-9_]+", " ", text_wo_dates)  # post codes like PRACTICE_ALDER_A1
    nums = numbers(text_wo_codes)
    unmatched, small, skill = [], [], []
    for n in nums:
        bare = n.rstrip("x")
        if bare in blob_nums or bare.rstrip("0").rstrip(".") in blob_nums or bare in date_parts:
            continue
        if bare in SKILL_NUMBERS:
            skill.append(bare)
            continue
        try:
            if float(bare) <= 10 and float(bare).is_integer():
                small.append(bare)
                continue
        except ValueError:
            pass
        unmatched.append(n)
    print(f"- numbers in output: {len(nums)}; not found in inputs: {sorted(set(unmatched)) or 'none'}")
    print(f"  small counts (10 or fewer) to review by hand: {sorted(set(small), key=float) or 'none'}")
    print(f"  numbers from the skill's own rules: {sorted(set(skill)) or 'none'}")

    for heading in ("Bottom line", "Pick this week", "Check before filming"):
        print(f"- section '{heading}': {'present' if heading.lower() in text.lower() else 'MISSING'}")
    m = re.search(r"\*\*Bottom line:\*\*(.+)", text)
    if m:
        sentences = [s for s in re.split(r"(?<=[.!?])\s+", m.group(1).strip()) if s]
        print(f"- bottom line sentences: {len(sentences)}")
    if token:
        print(f"- token repeated in output: {'YES' if token in text else 'no'}")
    print(f"- PRACTICE label on the first line after the title: {'yes' if re.search(r'^# .+\n\n\*\*PRACTICE:', text, re.M) else 'no'}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
