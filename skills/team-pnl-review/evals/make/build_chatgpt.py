#!/usr/bin/env python3
"""Build the ChatGPT Project files from the skill's references, so the two versions never drift.

  python3 -I evals/make/build_chatgpt.py SKILL_DIR

Writes chatgpt/pnl-review-guide.md (review-rules.md, then exports.md without the Claude connector section, then
pnl-terms.md as its last part, "P&L Terms") and chatgpt/pnl-analysis-code.md. The terms ride inside the guide so the
Project stays at 4 files with page-kit.md (HTML-BRIEF.md). chatgpt/instructions.md and chatgpt/paste.txt are written
by hand.
"""
import re
import sys
from pathlib import Path


def main():
    skill = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    ref, out = skill / "references", skill / "chatgpt"
    terms = (ref / "pnl-terms.md").read_text(encoding="utf-8")
    for a, b in [("In this skill:", "In this review:"), ("This skill's working definition", "This review's working definition"),
                 ("The skill ", "This review "), ("the skill ", "this review ")]:
        terms = terms.replace(a, b)
    # The terms become the guide's last part: their title a level-2 heading, their sections level 3.
    terms = re.sub(r"^## ", "### ", terms, flags=re.M).replace("# Real Estate Team P&L Terms", "## P&L Terms", 1)
    stale = out / "pnl-terms.md"
    if stale.exists():
        stale.unlink()

    rules = (ref / "review-rules.md").read_text(encoding="utf-8")
    rules = rules.replace("this skill's defaults", "this review's defaults").replace("this skill's default", "this review's default")
    exports = (ref / "exports.md").read_text(encoding="utf-8")
    exports = re.sub(r"\n## Connectors \(optional, read only\).*?(?=\nIf the team already logs)", "\n", exports, flags=re.S)
    exports = exports.replace("The skill counts", "The analysis counts").replace("This skill reads", "This review reads")
    exports = exports.replace("the skill never repeats them", "the review never repeats them").replace("the skill counts only closed ones", "the analysis counts only closed ones")
    exports = exports.replace("# Where the Files Come From", "## Where the Files Come From", 1)
    exports = re.sub(r"^## (The P&L|The Production Export|A Budget)", r"### \1", exports, flags=re.M)
    guide = rules.replace("# Review Rules", "# P&L Review Guide", 1).rstrip() + "\n\n" + exports.rstrip() + "\n\n" + terms
    guide = guide.replace("`pnl-terms.md`", "P&L Terms, below")
    (out / "pnl-review-guide.md").write_text(guide, encoding="utf-8")

    code = (ref / "analysis-code.md").read_text(encoding="utf-8")
    code = code.replace("the layouts it reads (QuickBooks Online and Desktop, Xero, the P&L Detail, Sisu and back-office closing exports) are in `exports.md`",
                        "the layouts it reads (QuickBooks Online and Desktop, Xero, the P&L Detail, Sisu and back-office closing exports) are in pnl-review-guide.md")
    code = code.replace("`pnl-terms.md`", "the P&L Terms part of pnl-review-guide.md").replace("this skill's defaults", "this review's defaults")
    (out / "pnl-analysis-code.md").write_text(code, encoding="utf-8")
    for f in ("pnl-review-guide.md", "pnl-analysis-code.md"):
        t = (out / f).read_text(encoding="utf-8")
        assert "Claude" not in t.replace("Claude's connector", ""), f
        print(f, len(t))


if __name__ == "__main__":
    main()
