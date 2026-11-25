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

# The section kinds that draw pictures and real-world objects, and the rules that came with them.
visuals = json.load(open(os.path.join(SAMPLE, "page-visuals.json")))
code, log, out = run(visuals, words)
built = open(out).read() if code == 0 else ""
case("every section kind builds: progress, meters, bars, deltas, callouts, notes, commitments, questions, choices, agenda, charts",
     code == 0 and all('"kind": "%s"' % k in built for k in ("progress", "meters", "bars", "deltas", "callouts", "notes", "commitments",
                                                              "questions", "choices", "agenda")) and '"multiples"' in built, log)
case("an MT time gets its CT time beside it", code == 0 and "10:00 AM MT / 11:00 AM CT" in built, log)

p = json.loads(json.dumps(base)); p["subtitle"] = "One-on-one Thursday at 10:00 AM MT / 12:00 PM CT"
code, log, _ = run(p, words); case("a CT time that is not an hour after the MT time stops the build", code == 1 and "not 1 hour" in log, log)

v = json.loads(json.dumps(visuals)); v["sections"][4]["items"][0]["value"] = 0.724
v["sections"][4]["items"][0]["target"] = 140
code, log, _ = run(v, words); case("a meter past 100 stops the build", code == 1 and "percent from 0 to 100" in log, log)

v = json.loads(json.dumps(visuals)); del v["sections"][1]["items"][0]["value"]
code, log, _ = run(v, words); case("a progress bar without its number stops the build", code == 1 and "progress needs" in log, log)

v = json.loads(json.dumps(visuals)); del v["sections"][11]["items"][1]["minutes"]
code, log, _ = run(v, words); case("an agenda block without its minutes stops the build", code == 1 and "minutes" in log, log)

v = json.loads(json.dumps(visuals)); v["sections"][3]["chart"]["series"][0]["key"] = "closings"
code, log, _ = run(v, words); case("a chart naming a column the table does not have stops the build", code == 1 and "columns of the table" in log, log)

v = json.loads(json.dumps(visuals)); v["keyNumbers"] = v["keyNumbers"] * 2
code, log, _ = run(v, words); case("more than five key numbers stop the build", code == 1 and "five key numbers" in log, log)

cents = os.path.join(tempfile.mkdtemp(), "cents.json"); json.dump({"change": 6610.89}, open(cents, "w"))
w = dict(words); w["findings"] = [{"status": "off", "text": "Company dollar rose $6,611 in September."}]
code, log, _ = run(base, w, ["--facts", cents]); case("a whole-dollar figure rounded from the facts ($6,610.89 to $6,611) passes", code == 0, log)
w = dict(words); w["findings"] = [{"status": "off", "text": "Company dollar rose $6,612 in September."}]
code, log, _ = run(base, w, ["--facts", cents]); case("a whole-dollar figure the facts do not round to still stops the build", code == 1 and "6612" in log, log)

p = json.loads(json.dumps(base)); p["closing"] = "Her split costs $1,550.00 a month."
code, log, out = run(p, words, ["--allow-number", "1550"])
case('a dollar amount ending in ".00" loses it, with a note', code == 0 and "Dropped .00" in log and "$1,550 a month" in open(out).read(), log)

v = json.loads(json.dumps(visuals)); v["sections"][1]["items"][0]["math"] = "11 / 18 = 0.611"
code, log, out = run(v, words)
case("arithmetic written as one string still draws, as a one-line list", code == 0 and '"math": ["11 / 18 = 0.611"]' in open(out).read(), log)

sheet = os.path.join(tempfile.mkdtemp(), "tracker.xlsx"); open(sheet, "wb").write(b"PK\x03\x04 99999 binary")
code, log, _ = run(base, words, ["--inputs", sheet]); case("a spreadsheet passed as an input is not read as text", code == 0 and "Not read as text" in log, log)

passed = sum(1 for _, ok in results if ok)
print("\n%d of %d passed" % (passed, len(results)))
sys.exit(0 if passed == len(results) else 1)
