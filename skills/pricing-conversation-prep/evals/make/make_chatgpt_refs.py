"""Builds the three reference files of the ChatGPT Project version from the skill's own references, so
the two versions say the same thing. Rerun after editing any reference.

Usage: python3 -I make_chatgpt_refs.py SKILL_DIR
  chatgpt/comp-method-and-metrics.md  = references/comp-method.md + references/market-metrics.md
  chatgpt/seller-objections.md        = references/objections.md
  chatgpt/utah-pricing-context.md     = skills/_shared/utah-pricing-context.md
File names are rewritten to the project's names, and nothing points to a folder.
"""
import os
import sys

skill = sys.argv[1]
ref = os.path.join(skill, "references")
shared = os.path.join(skill, "..", "_shared")
out = os.path.join(skill, "chatgpt")

def read(p):
    return open(p, encoding="utf-8").read()


def fix(text, pairs):
    for a, b in pairs:
        text = text.replace(a, b)
    return text


comp = read(os.path.join(ref, "comp-method.md"))
metrics = read(os.path.join(ref, "market-metrics.md"))
comp = fix(comp.replace("# Comp Method", "# Comp Method and Market Metrics", 1), [
    ("`market-metrics.md`", "the market metrics section of this file"),
])
merged = comp.rstrip() + "\n\n---\n\n" + metrics.replace("# Market Metrics From a CMA", "# Part 2: Market Metrics From a CMA", 1)
with open(os.path.join(out, "comp-method-and-metrics.md"), "w", encoding="utf-8") as f:
    f.write(merged)

obj = fix(read(os.path.join(ref, "objections.md")), [
    ("`comp-method.md`", "`comp-method-and-metrics.md`"),
])
with open(os.path.join(out, "seller-objections.md"), "w", encoding="utf-8") as f:
    f.write(obj)

utah = read(os.path.join(shared, "utah-pricing-context.md"))
utah = utah.replace(" Read them from the signed contract. See `utah-repc.md`.", " Read them from the signed contract.")
# The shared file predates the revised REPC; the Claude skill ships utah-repc.md and utah-repc-2026.md for
# this, but the ChatGPT project has room for one Utah file, so the two-version facts go here (checked 2026-11-08).
STALE = "- A revised REPC is pending, with mandatory use set for January 1, 2027. Section numbers may change. Read them from the signed contract."
REVISED = ("- A revised REPC is out. Its footer reads \"EFFECTIVE NOVEMBER 1, 2026. AS OF JANUARY 1, 2027, IT WILL REPLACE AND SUPERSEDE "
           "THE PREVIOUSLY APPROVED VERSION OF THIS FORM.\" The Utah Association of REALTORS says it is available for use from "
           "November 1, 2026 and the old version may no longer be used starting January 1, 2027, so either version can show up "
           "until then. In the revised form the appraisal condition is Section 12.2, it runs to a separate Appraisal Deadline "
           "(Section 4(c)), and a buyer who cancels sends \"a complete copy of the appraisal.\" The right to cancel, not to a lower "
           "price, is the same in both.\n"
           "- Before a home is under contract, explain the appraisal condition without section numbers or deadline names, since "
           "the buyer's offer may come on either form. Once there is a signed contract, read them from it.")
assert STALE in utah, "shared utah-pricing-context.md changed: update make_chatgpt_refs.py"
utah = utah.replace(STALE, REVISED)
utah = utah.rstrip() + ("\n- Real Estate Purchase Contract, effective November 1, 2026, Utah Association of REALTORS \"Final Clean Copy\" "
                        "dated October 14, 2026 (checked 2026-11-08): "
                        "https://utrealtors.wpenginepowered.com/wp-content/uploads/2026/10/REPC-Final-Clean-Copy-10.14.2026-with-Watermark.pdf\n"
                        "- Utah Association of REALTORS, \"Review of REPC Updates and Changes to Related Forms\" (checked 2026-11-08): "
                        "https://utahrealtors.com/realtor/review-of-repc-updates-and-changes-to-related-forms/\n")
with open(os.path.join(out, "utah-pricing-context.md"), "w", encoding="utf-8") as f:
    f.write(utah)
print("wrote chatgpt references")
