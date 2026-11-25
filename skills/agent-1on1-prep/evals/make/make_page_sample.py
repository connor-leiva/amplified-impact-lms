"""Writes evals/page/sample-page.json: the practice run as the page the skill hands back (skills/README.md, Page Kit).

python3 -I skills/agent-1on1-prep/evals/make/make_page_sample.py

What the model writes as page.json on a run, for the practice files and prompt: every figure and every line
of arithmetic copied from the run (evals/runs/case-1/files/one_on_one_data.json, the same run sample.md
was written from), and every sentence from sample.md, the graded output. Clock times are written in MT and
the build adds CT. The sections follow SKILL.md's "Output, In This Order", each in the kind it names; the
bottom line (headline and findings) is in sample-words.json. Then build and check it:

    python3 skills/_page-kit/tests/check_skill_page.py skills/agent-1on1-prep
    node skills/_page-kit/tests/shoot_page.cjs skills/agent-1on1-prep/evals/page/Agent-1on1-Prep-Sample.html
"""
import json
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
RUN = json.loads((SKILL / "evals" / "runs" / "case-1" / "files" / "one_on_one_data.json").read_text(encoding="utf-8"))
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
          "November", "December"]
COLS = [("appointments_set", "Set", "num"), ("appointments_met", "Met", "num"), ("signed", "Signed", "num"),
        ("under_contract", "Contract", "num"), ("closed_units", "Closed", "num"),
        ("closed_volume", "Volume", "usd"), ("gci", "GCI", "usd")]


def label(ym, short=False):
    y, m = ym.split("-")
    return "%s %s" % (MONTHS[int(m) - 1][:3] if short else MONTHS[int(m) - 1], y)


def after(text, sep=" = "):
    return text.rsplit(sep, 1)[1]


def pace(m):
    return m["pace_math"].split(" = ", 1)[1].replace(" of the prorated goal", "")


def where(m):
    """The run's own words for where a measure sits: at the prorated goal, or under it. Never a verdict."""
    return ("on", "At Goal") if m["pace"] >= 100 else ("hold", "Under Goal")


def key_numbers():
    out = []
    for key, name in (("closed_units", "closings"), ("signed", "signed agreements"), ("appointments_set", "appointments set"), ("gci", None)):
        m = RUN["ytd"][key]
        status, chip = where(m)
        ytd, goal = after(m["ytd_math"]), after(m["prorated_math"])
        means = ("**%s %s** through October. Her prorated goal by now: %s (%s)." % (ytd, name, goal, pace(m)) if name else
                 "**%s** of GCI through October. Her prorated goal by now: %s (%s)." % (ytd, goal, pace(m)))
        out.append({"label": m["label"], "value": ytd, "status": status, "chip": chip,
                    "bar": {"value": m["ytd"], "goal": m["prorated"]}, "means": means})
    return out


FLAGS = {
    "id": "flags", "kind": "callouts", "label": "Flags", "show": 3, "noun": "Flags",
    "finding": "What was read, the dates it runs on, and what was left out.",
    "items": [
        {"status": "hold", "chip": "Left Out", "title": "Personal And Pay Details",
         "text": "2 personal or pay details from her goals file. They don't appear anywhere below; **whether and how to raise them is yours**."},
        {"title": "Goals", "text": "Her seven 2026 annual production goals and two planned rates, each found word for word in her goals file. "
                                   "The file has no monthly goals, so each annual goal is prorated evenly by month (no seasonality). "
                                   "Sisu's own Personal Pacer may spread her goals differently; Sisu is the source of record for its pacer."},
        {"title": "Meeting", "text": "Thursday, November 12, 2026, 10:00 AM MT, 30 minutes, from your message."},
        {"title": "As Of 11/10/2026", "text": "You said the numbers were pulled November 10, 2026, and the file name carries 2026-11-10. "
                                              "The pace window is January through October 2026 (10 months, the last full month). "
                                              "November 2026 is a partial month: shown apart and left out of the pace math."},
        {"status": "on", "chip": "Nothing To Confirm", "title": "Columns", "text": "Every measure was read by its own column name."},
        {"title": "Files Read", "text": "PRACTICE Sisu Monthly Numbers Marigold Fizzwhistle 2026-11-10.csv (one row per month, January to "
                                        "November 2026), PRACTICE Marigold Fizzwhistle 2026 Goals.md, PRACTICE Last 1on1 Notes "
                                        "2026-10-08.txt, and your notes for this one-on-one from your message."}],
}


def numbers():
    items, lines = [], []
    for key in RUN["numbers"]["measures"]:
        m = RUN["ytd"][key]
        status, chip = where(m)
        ytd, goal = after(m["ytd_math"]), after(m["prorated_math"])
        gap = "**At the prorated goal.**" if m["diff_math"] == "at the prorated goal" else \
            "**%s** the prorated goal." % after(m["diff_math"]).replace(" the prorated goal", "")
        need_amount, annual = m["to_go_math"].split(" = ", 1)[1].split(" a month to reach the annual goal of ")
        items.append({"label": m["label"], "value": m["ytd"], "goal": m["prorated"], "valueText": ytd,
                      "goalText": "of a prorated %s" % goal, "pctText": pace(m), "status": status, "chip": chip,
                      "text": "%s Reaching %s by December needs %s a month." % (gap, annual, need_amount)})
        lines += ["%s: %s" % (m["label"], s) for s in (m["ytd_math"], m["prorated_math"], m["pace_math"], m["diff_math"], m["to_go_math"])]
    return {
        "id": "numbers", "kind": "progress", "label": "Numbers Against Goal",
        "finding": "January through October 2026 (10 months), against her 2026 goals prorated evenly: each annual goal x 10 / 12.",
        "note": "\"Reaching\" is what her goal needs in November and December, not a forecast.",
        "goalLegend": "The line marks her prorated goal to date. Green: at it. Amber: under it.",
        "items": items, "mathTitle": "Every sum, prorated goal, pace and difference, from the run", "math": lines,
    }


def months():
    rows = []
    for ym in RUN["months_in_file"]:
        partial = ym not in RUN["window"]
        row = {"month": label(ym, short=True) + (" (partial)" if partial else ""), "ym": ym}
        for key, _, _ in COLS:
            row[key] = RUN["cells"][ym][key][0]
        if partial:
            row["_partial"] = True
        rows.append(row)
    return {
        "id": "months", "kind": "table", "label": "Month By Month",
        "finding": "Each measure by month, January to November 2026.",
        "note": "Each year-to-date figure is the sum of its column, January through October 2026.",
        "columns": [{"key": "month", "label": "Month", "type": "text", "sortKey": "ym"}]
                   + [{"key": k, "label": l, "type": t} for k, l, t in COLS],
        "rows": rows, "sort": {"key": "month", "dir": "asc"}, "search": False,
        "chart": {"type": "multiples", "x": "month",
                  "series": [{"key": k, "label": RUN["ytd"][k]["label"]} for k, _, _ in COLS],
                  "legend": [{"label": "November 2026, partial: left out of the pace math"}]},
        "math": ["%s: %s" % (RUN["ytd"][k]["label"], RUN["ytd"][k]["ytd_math"]) for k, _, _ in COLS],
    }


def ratios():
    plain = {"set_to_met": "%s of %s appointments set were met", "met_to_signed": "%s of %s appointments met ended in a signed agreement",
             "signed_to_under_contract": "%s of %s signed agreements went under contract", "under_contract_to_closed": "%s of %s under contract closed"}
    titles = {"set_to_met": "Set To Met", "met_to_signed": "Met To Signed", "signed_to_under_contract": "Signed To Under Contract",
              "under_contract_to_closed": "Under Contract To Closed"}
    items = []
    for r in RUN["rates"]:
        num, den = r["math"].split(" = ")[0].split(" / ")
        it = {"label": titles[r["key"]], "value": r["pct"], "valueText": "%s%%" % r["pct"],
              "text": (plain[r["key"]] % (num, den)) + " (%s)." % r["math"]}
        if r["goal"]:
            it["target"] = r["goal"]["value"]
            it["targetText"] = "Her plan: %s (\"%s\")" % (r["goal"]["quote"].rsplit(": ", 1)[1], r["goal"]["quote"])
            it["status"], it["chip"] = ("hold", "Under Her Plan") if r["against_goal"].startswith("under") else ("on", "At Her Plan")
        else:
            it["targetText"] = "Her plan doesn't state this rate."
        items.append(it)
    return {
        "id": "ratios", "kind": "meters", "label": "Count Ratios",
        "finding": "Appointments met to signed is 33 / 72 = 45.8%, under her plan's 50%.",
        "note": "Each ratio divides one year-to-date count by another for the same months, so an agreement signed in "
                "March may come from a February appointment. They are a rough read for the conversation; Sisu's own "
                "conversion figures stay the source of record.",
        "items": items,
    }


def changed():
    items, rows = [], []
    for r in RUN["since"]["rows"]:
        then, now = r["pace_then"].split(" = ")[1].replace(" of the prorated goal", ""), r["pace_now"].split(" = ")[1].replace(" of the prorated goal", "")
        items.append({"label": r["label"], "from": r["ytd_then_text"], "fromLabel": "Through Sep", "to": r["ytd_now_text"], "toLabel": "Through Oct",
                      "change": "October added %s" % r["since_values"][0],
                      "text": "Share of her prorated goal: %s then, %s now." % (then, now)})
        rows.append({"measure": r["label"], "then": r["ytd_then_text"], "oct": r["since_values"][0], "now": r["ytd_now_text"],
                     "pace_then": r["pace_then"].replace(" of the prorated goal", ""), "pace_now": r["pace_now"].replace(" of the prorated goal", "")})
    return {
        "id": "changed", "kind": "deltas", "label": "What Changed Since the Last One-on-One",
        "finding": "Your last one-on-one was 10/08/2026; its numbers ran through September 2026. October 2026 is the month added since.",
        "note": "Both \"then\" and \"now\" come from this export. If an earlier month was changed in Sisu since 10/08/2026, "
                "the \"then\" figures can differ from what you saw that day.",
        "items": items,
        "detail": {"label": "Show The Table", "columns": [
            {"key": "measure", "label": "Measure", "type": "text"}, {"key": "then", "label": "Through Sep 2026", "type": "text"},
            {"key": "oct", "label": "Oct 2026", "type": "text"}, {"key": "now", "label": "Through Oct 2026", "type": "text"},
            {"key": "pace_then", "label": "Pace Then", "type": "text"}, {"key": "pace_now", "label": "Pace Now", "type": "text"}], "rows": rows},
    }


def averages():
    items = []
    for a in RUN["since"]["averages"]:
        items.append({"label": a["label"], "text": a["avg_math"],
                      "bars": [{"label": "Jan to Sep average", "value": a["avg"], "text": after(a["avg_math"])},
                               {"label": "October 2026", "value": RUN["cells"]["2026-10"][a["measure"]][0], "text": a["since"][0].split(": ", 1)[1]}]})
    return {
        "id": "averages", "kind": "bars", "label": "October Against Her Own Average", "scale": "item",
        "finding": "October 2026 for each measure, beside her own monthly average for January to September 2026.",
        "note": "Her own months only: no other agent and no typical number.",
        "items": items,
    }


AFTER = [
    {"id": "notes", "kind": "notes", "label": "What Changed, From Your Notes",
     "finding": "What your notes and your message report, each with its source.",
     "items": [
         {"title": "The Q3 Buyer Calls", "text": "She texted you on 10/29 that she finished calling the Q3 buyers (commitment 1).",
          "source": "Your notes, in your message"},
         {"title": "The 10/18 Open House", "text": "She says the 10/18 open house at 41 Snickerdoodle Ct brought in 3 buyer leads. "
                                                   "That's her report; the export doesn't show leads.",
          "source": "She says, in your notes"},
         {"title": "The Listing Presentation", "text": "You haven't seen the listing presentation draft yet (commitment 3).",
          "source": "Your notes, in your message"}]},
    {"id": "commitments", "kind": "commitments", "label": "Last Time's Commitments",
     "finding": "Word for word from PRACTICE Last 1on1 Notes 2026-10-08.txt (Marigold's commitments).",
     "note": "Each status is exactly as given, with its source. Nothing is marked from the numbers or the dates.",
     "items": [
         {"title": "Commitment 1", "words": "Call or text the 14 buyers she met in Q3 who haven't signed, by October 31.",
          "owner": "Marigold", "due": "October 31",
          "statusText": "Status, as given: \"she texted me on 10/29 that she finished calling the Q3 buyers\" (your notes, in your message).",
          "fact": "From the numbers: nothing in the export."},
         {"title": "Commitment 2", "words": "Set at least 8 appointments in October.", "owner": "Marigold", "due": "October",
          "status": "quiet", "chip": "No Status Given", "statusText": "No status given.",
          "fact": "From the numbers: The export shows 5 appointments set in October 2026."},
         {"title": "Commitment 3", "words": "Send Cosmo a draft of her updated listing presentation before our next one-on-one.",
          "owner": "Marigold", "due": "Before this one-on-one",
          "statusText": "Status, as given: \"I haven't seen the listing presentation draft yet\" (your notes, in your message).",
          "fact": "From the numbers: nothing in the export."}]},
    {"id": "questions", "kind": "questions", "label": "Open Coaching Questions", "show": 4, "noun": "Questions",
     "finding": "Eight open questions in the order of the agenda, each tied to one number, commitment or note.",
     "note": "Ask for her view: what, how, which. Never a question about health, family, pay or another agent.",
     "items": [
         {"tag": "Her Wins", "ask": "October added 2 closings and 3 under contract. Which of those are you proudest of, and what made it work?",
          "why": "The agenda starts with her wins. October 2026 in the export: 2 closings, 3 under contract."},
         {"tag": "Commitment 1", "ask": "You finished calling the 14 Q3 buyers who hadn't signed. What came out of those calls, and which of them are worth another conversation?",
          "why": "Your notes say she finished the Q3 buyer calls."},
         {"tag": "Commitment 2", "ask": "Commitment 2 was at least 8 appointments set in October, and the export shows 5. How do you see October, and what did it tell you about where your appointments come from?",
          "why": "Commitment 2 has no status given, so this asks for her update instead of marking it."},
         {"tag": "Commitment 3", "ask": "Where are you with the listing presentation draft?",
          "why": "Your notes say you haven't seen the draft yet."},
         {"tag": "Met To Signed", "ask": "Of 72 appointments met this year, 33 signed (33 / 72 = 45.8%), and your plan used 50%. What happens in the appointments that don't end in a signed agreement?",
          "why": "Met to signed is the one ratio under her plan's own rate."},
         {"tag": "Where Appointments Come From", "ask": "October had 5 appointments set, against your January to September average of 80 / 9 = 8.9 a month. Where did your appointments come from in the spring, and where are they coming from now?",
          "why": "October against her own monthly average, from the run."},
         {"tag": "The 10/18 Open House", "ask": "The 10/18 open house at 41 Snickerdoodle Ct brought in 3 buyer leads, you said. What's the next step with each?",
          "why": "Her report, from your notes. The export doesn't show leads."},
         {"tag": "What She Wants Next", "ask": "What do you want to focus on for November and December, and what do you need from me before our next one-on-one?",
          "why": "The prep always ends with what she wants to focus on and what she needs from you."}]},
    {"id": "focus", "kind": "choices", "label": "Possible Focus Areas (Your Call)", "pickLabel": "Focus picked",
     "finding": "Three options from the run's focus candidates, in its order.",
     "callout": {"text": "These are options from the numbers, not a verdict; **pick one, or none**."},
     "items": [
         {"title": "Signed Agreements", "big": "82.5%", "bigLabel": "of her prorated goal: 33 of 40.0", "bar": {"value": 33, "goal": 40.0}, "status": "hold",
          "facts": ["Met to signed: 33 / 72 = 45.8%, under her plan's 50%.", "October: 2, against her January to September average of 31 / 9 = 3.4 a month."],
          "open": "Walk me through a recent appointment that didn't end in a signed agreement. What happened at the end?"},
         {"title": "Appointments Set", "big": "85.0%", "bigLabel": "of her prorated goal: 85 of 100.0", "bar": {"value": 85, "goal": 100.0}, "status": "hold",
          "facts": ["October: 5, against 80 / 9 = 8.9 a month."],
          "open": "Which sources gave you appointments in the spring, and which ones are you working now?"},
         {"title": "Appointments Met", "big": "90.0%", "bigLabel": "of her prorated goal: 72 of 80.0", "bar": {"value": 72, "goal": 80.0}, "status": "hold",
          "facts": ["October: 5, against 67 / 9 = 7.4 a month."],
          "open": "What happens between setting an appointment and meeting?"}]},
    {"id": "agenda", "kind": "agenda", "label": "Agenda", "agendaTitle": "Run Of Show",
     "finding": "A suggested order; change it to yours.",
     "when": "Thursday, November 12, 2026, 30 minutes",
     "items": [
         {"time": "10:00 AM MT", "minutes": 5, "title": "Her Wins And What's On Her Mind", "text": "She goes first."},
         {"time": "10:05 AM MT", "minutes": 5, "title": "Numbers Against Her Goal"},
         {"time": "10:10 AM MT", "minutes": 5, "title": "Last Time's Commitments"},
         {"time": "10:15 AM MT", "minutes": 10, "title": "The Focus You Pick"},
         {"time": "10:25 AM MT", "minutes": 5, "title": "New Commitments And Next Steps",
          "text": "Her new commitments, what she needs from you, and the next one-on-one's date."}]},
    {"id": "recap", "kind": "drafts", "label": "Recap Template (Fill In After)",
     "finding": "Finish it after the meeting. Every blank is a [placeholder]; nothing about what was said is pre-written.",
     "drafts": [{
         "label": "Recap Email", "to": "Marigold Fizzwhistle", "channel": "Email draft, after the meeting",
         "subject": "Our One-On-One Recap And Next Steps",
         "body": "Hi Marigold,\n\nThanks for our time on Thursday, November 12. Here's what we agreed.\n\n"
                 "What we looked at: [Numbers We Looked At]\n\n"
                 "Last time's commitments:\n"
                 "1. Call or text the 14 buyers she met in Q3 who haven't signed, by October 31: [Update From Today]\n"
                 "2. Set at least 8 appointments in October: [Update From Today]\n"
                 "3. Send Cosmo a draft of her updated listing presentation before our next one-on-one: [Update From Today]\n\n"
                 "The focus we picked: [Focus]\n\n"
                 "Your commitments:\n1. [Commitment] by [Date]\n2. [Commitment] by [Date]\n\n"
                 "What I'll do: [Your Commitment]\n\n"
                 "Next one-on-one: [Date and Time]\n\nCosmo",
         "flag": "A coaching recap, not a performance review or a write-up. Keep personal matters and pay out of it."}]},
    {"id": "check", "kind": "checklist", "label": "Check Before Sending",
     "finding": "Every date, number, quote and placeholder in the prep and the recap, with where to check it.",
     "items": [
         {"text": "As of 11/10/2026. Pace window: January through October 2026. November 2026 (2 set, 1 met, 1 signed, 0 under "
                  "contract, 1 closing, $445,000, $11,125, as exported) is partial and left out.",
          "source": "your message (\"pulled November 10, 2026\") and the file name"},
         {"text": "Goals, each quoted: \"Appointments set: 120\", \"Appointments met: 96\", \"Signed (buyer and listing "
                  "agreements): 48\", \"Under contract: 30\", \"Closed units: 24\", \"Closed volume: $10,800,000\", \"GCI: "
                  "$270,000\", \"Appointment met to signed: 50%\", \"Under contract to closed: 80%\". Prorated evenly by "
                  "month: the file gives no monthly goals.",
          "source": "PRACTICE Marigold Fizzwhistle 2026 Goals.md"},
         {"text": "Year-to-date figures: each is the sum of January through October 2026 in the CSV; every pace and difference "
                  "above is the run's.",
          "source": "one_on_one_data.md"},
         {"text": "Commitments word for word. Statuses for 1 and 3 are quoted from your message; 2 has no status given. The 5 "
                  "appointments set beside commitment 2 is the CSV's October 2026 row.",
          "source": "PRACTICE Last 1on1 Notes 2026-10-08.txt, your message and the CSV"},
         {"text": "The 10/18 open house at 41 Snickerdoodle Ct and its 3 buyer leads are her report, from your message, not "
                  "the export.",
          "source": "your message"},
         {"text": "Meeting: Thursday, November 12, 2026, 10:00 AM MT to 10:30 AM MT.", "source": "your message"},
         {"text": "Placeholders in the recap: [Numbers We Looked At], [Update From Today] (three), [Focus], [Commitment] and "
                  "[Date] (two each), [Your Commitment], [Date and Time].",
          "source": "the recap draft"},
         {"text": "Left out: the 2 personal or pay details in her goals file appear nowhere in this prep or the recap. "
                  "one_on_one_data.md is for you, not her file.",
          "source": "PRACTICE Marigold Fizzwhistle 2026 Goals.md"}]},
]


def main():
    page = {
        "id": "agent-1on1-prep:marigold-fizzwhistle:2026-11-12",
        "report": "Agent 1:1 Prep",
        "subtitle": "Marigold Fizzwhistle, one-on-one on Thursday, November 12, 2026 at 10:00 AM MT. For the leader, not the agent's file.",
        "sample": "Practice File: Made-Up Example",
        "meta": [{"label": "Agent", "value": "Marigold Fizzwhistle"},
                 {"label": "Numbers As Of", "value": "Nov 10, 2026 (Sisu)"},
                 {"label": "Pace Window", "value": "Jan to Oct 2026"},
                 {"label": "Meeting", "value": "Thu, Nov 12, 10:00 AM MT, 30 minutes"},
                 {"label": "For", "value": "The leader, not her file"}],
        "dataCheck": [],
        "headline": [],
        "keyNumbers": key_numbers(),
        "sections": [FLAGS, numbers(), months(), ratios(), changed(), averages()] + AFTER,
        "stamp": "Agent 1:1 Prep",
        "closing": "Built from her numbers, her goals and last time's notes, with every sum done in code. She is compared "
                   "only with her own goal and her own months.",
    }
    out = SKILL / "evals" / "page" / "sample-page.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(page, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("wrote", out.relative_to(SKILL), len(page["sections"]), "sections")


if __name__ == "__main__":
    main()
