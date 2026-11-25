#!/usr/bin/env python3
"""
make_chatgpt_kit.py: packs the shared page kit into ONE markdown file for a ChatGPT Project.

A ChatGPT Project version holds 4 files (instructions, paste text, up to 3 more .md files) so it fits
ChatGPT Free's 5-file limit. The page kit has to ride in one of those .md files. This writes
page-kit.md: build_page.py and the LITE template (system fonts, no embedded Geist, so it stays small),
each in its own fenced block, with the two lines the model runs to unpack them.

Usage: python make_chatgpt_kit.py --out ../chatgpt-kit/page-kit.md
"""
import argparse, os
HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument("--out", default=os.path.join(HERE, "..", "chatgpt-kit", "page-kit.md"))
a = ap.parse_args()
build = open(os.path.join(HERE, "build_page.py"), encoding="utf-8").read()
tpl = open(os.path.join(HERE, "..", "assets", "base-template.html"), encoding="utf-8").read()
fence = "~~~~~~"
body = """# Page Kit (for building the report page)

Use this file only when the instructions say to build the page. In code (Python), save the first block
below as build_page.py and the second as base-template.html, in the same folder, exactly as written.
Do not change either file. Then run:

    python build_page.py page.json --words words.json --facts facts.json --template base-template.html --fonts none --out <File-Name>.html

and give the person the download link for the .html file right away. The link stops working when the
code session ends, so tell them to download it now. If the link fails, run the code again for a new link.

## build_page.py

%(f)spython
%(build)s
%(f)s

## base-template.html

%(f)shtml
%(tpl)s
%(f)s
""" % {"f": fence, "build": build.rstrip(), "tpl": tpl.rstrip()}
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
open(a.out, "w", encoding="utf-8").write(body)
print("WROTE %s (%d KB)" % (os.path.abspath(a.out), round(len(body.encode()) / 1024)))
