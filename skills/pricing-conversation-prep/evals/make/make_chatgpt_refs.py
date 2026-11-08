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
with open(os.path.join(out, "utah-pricing-context.md"), "w", encoding="utf-8") as f:
    f.write(utah)
print("wrote chatgpt references")
