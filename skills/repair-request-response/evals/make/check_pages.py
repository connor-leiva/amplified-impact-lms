"""Confirms every finding and disclosure item lands on the page the made-up requests cite.

Usage: python3 check_pages.py SKILL_DIR HTML_DIR
Reads page_map.json (written by make_files.py), extracts each printed PDF page by page with
pdftotext, and checks the item id opens a heading or table row on the expected page. Exits 1 on
any miss, and on any em or en dash in a printed PDF.
"""
import json
import os
import re
import subprocess
import sys

SKILL_DIR, HTML_DIR = sys.argv[1], sys.argv[2]
page_map = json.load(open(os.path.join(HTML_DIR, "page_map.json")))
pdfs = json.load(open(os.path.join(HTML_DIR, "pdfs.json")))
bad = 0


def pages_of(path):
    out = subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True, text=True, check=True).stdout
    return out.split("\f")


for item in pdfs:
    path = os.path.join(SKILL_DIR, item["pdf"])
    pages = pages_of(path)
    text = "".join(pages)
    if re.search("[" + chr(0x2013) + chr(0x2014) + "]", text):
        print("DASH", item["pdf"])
        bad += 1
    if "PRACTICE FILE: made-up example" not in pages[0]:
        print("NO STAMP", item["pdf"])
        bad += 1
    for fid, want in page_map.get(item["pdf"], {}).items():
        hits = [n for n, p in enumerate(pages, start=1) if re.search(r"(^|\n)\s*" + re.escape(fid) + r"\s", p)]
        if want not in hits:
            print(f"MISS {item['pdf']}: {fid} expected on page {want}, found on {hits}")
            bad += 1
    print(f"ok   {item['pdf']} ({len([p for p in pages if p.strip()])} pages)")

sys.exit(1 if bad else 0)
