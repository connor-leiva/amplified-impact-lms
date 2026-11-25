#!/usr/bin/env python3
"""Self-test for the shared page kit. Run: python tests/run_tests.py  (all must pass)."""
import json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
BUILD = os.path.join(KIT, "scripts", "build_page.py")
SAMPLE = os.path.join(KIT, "sample")
results = []


def run(page, words=None, extra=(), out=True):
    tmp = tempfile.mkdtemp()
    pp = os.path.join(tmp, "page.json"); json.dump(page, open(pp, "w"))
    cmd = [sys.executable, BUILD, pp, "--facts", os.path.join(SAMPLE, "facts.json")]
    if words is not None:
        wp = os.path.join(tmp, "words.json"); json.dump(words, open(wp, "w")); cmd += ["--words", wp]
    o = os.path.join(tmp, "out.html")
    if out:
        cmd += ["--out", o]
    cmd += list(extra)
    p = subprocess.run(cmd, capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr, o


def case(name, ok, detail=""):
    results.append((name, ok)); print(("PASS " if ok else "FAIL ") + name + ("" if ok else "\n     " + detail[:400]))


base = json.load(open(os.path.join(SAMPLE, "page.json")))
words = json.load(open(os.path.join(SAMPLE, "words.json")))

code, log, out = run(base, words)
html = open(out).read() if code == 0 else ""
case("sample builds", code == 0, log)
case("one self-contained file: no external fetches", code == 0 and not re.search(r'(src|href)=["\']https?://', html) and "@import" not in html, log)
case("fonts embedded", "font/woff2;base64" in html)
case("em dash replaced with a note", "Dashes replaced" in log and "\u2014" not in html.split('id="page-data">')[1])

w = dict(words); w["findings"] = [{"status": "off", "text": "Closings are 14 short, worth $61,000 a year."}]
code, log, _ = run(base, w); case("stray number stops the build", code == 1 and "61000" in log, log)

w = dict(words); w["headline"] = ["Pace is below the industry standard."]
code, log, _ = run(base, w); case('"industry standard" stops the build', code == 1 and "industry standard" in log, log)

p = json.loads(json.dumps(base)); p["subtitle"] = "One-on-one Thursday at 10:00 AM"
code, log, _ = run(p, words); case("a time without MT stops the build", code == 1 and "needs \"MT\"" in log, log)

p = json.loads(json.dumps(base)); p["sections"][0]["label"] = "Numbers against goal"
code, log, _ = run(p, words); case("a heading not in Title Case stops the build", code == 1 and "Title Case" in log, log)

p = json.loads(json.dumps(base)); p["closing"] = "I sent the recap to Marigold."
code, log, _ = run(p, words); case("a claim that something was sent stops the build", code == 1 and "draft only" in log, log)

p = json.loads(json.dumps(base)); p["sections"] = [s for s in p["sections"] if s["kind"] != "checklist"]
code, log, _ = run(p, words); case("drafts without Check Before Sending stop the build", code == 1 and "checklist" in log, log)

p = json.loads(json.dumps(base)); p["sections"][0]["kind"] = "chart3d"
code, log, _ = run(p, words); case("unknown section kind stops the build", code == 1 and "kind" in log, log)

code, log, out = run(base, words, ["--fonts", "/nonexistent.css"])
case("lite build without fonts still works", code == 0 and "system fonts" in log and "base64" not in open(out).read(), log)

code, log, _ = run(base, words, ["--check-only"], out=False)
case("check-only writes nothing", code == 0 and "Nothing written" in log, log)

p = json.loads(json.dumps(base)); p["closing"] = "</script><script>alert(1)</script>"
code, log, out = run(p, words)
case("data cannot break out of the JSON block", code == 0 and "</script><script>alert" not in open(out).read(), log)

passed = sum(1 for _, ok in results if ok)
print("\n%d of %d passed" % (passed, len(results)))
sys.exit(0 if passed == len(results) else 1)
