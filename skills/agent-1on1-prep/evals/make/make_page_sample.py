"""Writes evals/page/sample-page.json: the practice run as the page the skill hands back (skills/README.md, Page Kit).

python3 -I skills/agent-1on1-prep/evals/make/make_page_sample.py

What the model writes as page.json on a run, for the practice files and prompt: every figure and every line
of arithmetic copied from the run (evals/runs/case-1/files/one_on_one_data.json, the same run sample.md
was written from), and every sentence from sample.md, the graded output, with each clock time given MT.
The sections follow SKILL.md's "Output, In This Order"; the bottom line (headline and findings) is in
sample-words.json. Then build and check it:

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


def no_tail(math):
    return math.replace(" of the prorated goal", "")


def numbers():
    tiles, lines = [], []
    for key in RUN["numbers"]["measures"]:
        m = RUN["ytd"][key]
        ytd = m["ytd_math"].rsplit(" = ", 1)[1]
        prorated = m["prorated_math"].rsplit(" = ", 1)[1]
        pace = m["pace_math"].split(" = ", 1)[1].replace(" of the prorated goal", "")
        tiles.append({"label": m["label"], "value": ytd, "unit": "Prorated goal: %s" % prorated,
                      "note": "%s of the prorated goal" % pace})
        lines += ["%s: %s" % (m["label"], s) for s in (m["ytd_math"], m["prorated_math"], m["pace_math"], m["diff_math"],
                                                         m["to_go_math"])]
    return {
        "id": "numbers", "kind": "tiles", "label": "Numbers Against Goal",
        "finding": "January through October 2026 (10 months), against her 2026 goals prorated evenly: each annual goal x 10 / 12.",
        "note": "\"To reach the annual goal\" (in the arithmetic) is what her goal needs in November and December, not a forecast.",
        "tiles": tiles, "mathTitle": "Every sum, prorated goal, pace and difference, from the run", "math": lines,
    }


def months():
    rows = []
    for ym in RUN["months_in_file"]:
        partial = ym not in RUN["window"]
        row = {"month": label(ym, short=True) + (" (partial)" if partial else ""), "ym": ym}
        for key, _, _ in COLS:
            row[key] = RUN["cells"][ym][key][0]
        if partial:
            row["_status"] = "quiet"
        rows.append(row)
    return {
        "id": "months", "kind": "table", "label": "Month By Month",
        "finding": "Each year-to-date figure is the sum of its column, January through October 2026.",
        "note": "Appointments set and met, signed, under contract, closed units, closed volume and GCI, as exported. "
                "November 2026 is a partial month: shown apart and left out of the pace math.",
        "columns": [{"key": "month", "label": "Month", "type": "text", "sortKey": "ym"}]
                   + [{"key": k, "label": l, "type": t} for k, l, t in COLS],
        "rows": rows, "sort": {"key": "month", "dir": "asc"}, "search": False,
        "math": ["%s: %s" % (RUN["ytd"][k]["label"], RUN["ytd"][k]["ytd_math"]) for k, _, _ in COLS],
    }


def ratios():
    rows = []
    for r in RUN["rates"]:
        plan = "not stated"
        if r["goal"]:
            plan = "%s (\"%s\"): %s" % (r["goal"]["quote"].rsplit(": ", 1)[1], r["goal"]["quote"],
                                         r["against_goal"].split(" the plan's")[0] + " it")
        rows.append({"ratio": r["label"], "ytd": r["math"], "plan": plan})
    return {
        "id": "ratios", "kind": "table", "label": "Count Ratios",
        "finding": "Appointments met to signed is 33 / 72 = 45.8%, under her plan's 50%.",
        "note": "Each ratio divides one year-to-date count by another for the same months, so an agreement signed in "
                "March may come from a February appointment. They are a rough read for the conversation; Sisu's own "
                "conversion figures stay the source of record.",
        "columns": [{"key": "ratio", "label": "Ratio", "type": "text"}, {"key": "ytd", "label": "Year To Date", "type": "text"},
                    {"key": "plan", "label": "Her Plan", "type": "text"}],
        "rows": rows,
    }


def changed():
    s = RUN["since"]
    rows = [{"measure": r["label"], "then": r["ytd_then_text"], "oct": r["since_values"][0], "now": r["ytd_now_text"],
             "pace_then": no_tail(r["pace_then"]), "pace_now": no_tail(r["pace_now"])} for r in s["rows"]]
    return {
        "id": "changed", "kind": "table", "label": "What Changed Since the Last One-on-One",
        "finding": "Your last one-on-one was 10/08/2026; its numbers ran through September 2026. October 2026 is the month added since.",
        "note": "Both \"then\" and \"now\" come from this export. If an earlier month was changed in Sisu since 10/08/2026, "
                "the \"then\" column can differ from what you saw that day.",
        "columns": [{"key": "measure", "label": "Measure", "type": "text"},
                    {"key": "then", "label": "Through Sep 2026", "type": "text"},
                    {"key": "oct", "label": "Oct 2026", "type": "text"},
                    {"key": "now", "label": "Through Oct 2026", "type": "text"},
                    {"key": "pace_then", "label": "Pace Then", "type": "text"},
                    {"key": "pace_now", "label": "Pace Now", "type": "text"}],
        "rows": rows,
    }


def averages():
    rows = [{"measure": a["label"], "avg": a["avg_math"], "oct": a["since"][0].split(": ", 1)[1]} for a in RUN["since"]["averages"]]
    return {
        "id": "averages", "kind": "table", "label": "October Against Her Own Average",
        "finding": "October 2026 for each measure, beside her own monthly average for January to September 2026.",
        "columns": [{"key": "measure", "label": "Measure", "type": "text"},
                    {"key": "avg", "label": "Monthly Average, Jan To Sep", "type": "text"},
                    {"key": "oct", "label": "October 2026", "type": "text"}],
        "rows": rows,
    }


SECTIONS_AFTER = [
    {"id": "notes", "kind": "list", "label": "What Changed, From Your Notes",
     "finding": "What your notes and your message report, each with its source.",
     "items": [
         {"title": "The Q3 Buyer Calls", "text": "She texted you on 10/29 that she finished calling the Q3 buyers (commitment 1)."},
         {"title": "The 10/18 Open House", "text": "She says the 10/18 open house at 41 Snickerdoodle Ct brought in 3 buyer leads. "
                                                   "That's her report, from your notes; the export doesn't show leads."},
         {"title": "The Listing Presentation", "text": "You haven't seen the listing presentation draft yet (commitment 3)."}]},
    {"id": "commitments", "kind": "list", "label": "Last Time's Commitments",
     "finding": "Word for word from PRACTICE Last 1on1 Notes 2026-10-08.txt (Marigold's commitments).",
     "note": "Each status is exactly as given, with its source. Nothing is marked from the numbers or the dates.",
     "items": [
         {"title": "Commitment 1",
          "text": "\"Call or text the 14 buyers she met in Q3 who haven't signed, by October 31.\" Status, as given: \"she "
                  "texted me on 10/29 that she finished calling the Q3 buyers\" (your notes, in your message). From the "
                  "numbers: nothing in the export."},
         {"status": "quiet", "chip": "No Status Given", "title": "Commitment 2",
          "text": "\"Set at least 8 appointments in October.\" No status given. From the numbers: The export shows 5 "
                  "appointments set in October 2026."},
         {"title": "Commitment 3",
          "text": "\"Send Cosmo a draft of her updated listing presentation before our next one-on-one.\" Status, as given: "
                  "\"I haven't seen the listing presentation draft yet\" (your notes, in your message). From the numbers: "
                  "nothing in the export."}]},
    {"id": "questions", "kind": "list", "label": "Open Coaching Questions",
     "finding": "Eight open questions, in the order of the agenda, each tied to one number, commitment or note.",
     "items": [
         {"title": "October's Closings", "text": "October added 2 closings and 3 under contract. Which of those are you proudest of, and what made it work?"},
         {"title": "Commitment 1", "text": "You finished calling the 14 Q3 buyers who hadn't signed. What came out of those calls, and which of them are worth another conversation?"},
         {"title": "Commitment 2", "text": "Commitment 2 was at least 8 appointments set in October, and the export shows 5. How do you see October, and what did it tell you about where your appointments come from?"},
         {"title": "Commitment 3", "text": "Where are you with the listing presentation draft?"},
         {"title": "Met To Signed", "text": "Of 72 appointments met this year, 33 signed (33 / 72 = 45.8%), and your plan used 50%. What happens in the appointments that don't end in a signed agreement?"},
         {"title": "Where Appointments Come From", "text": "October had 5 appointments set, against your January to September average of 80 / 9 = 8.9 a month. Where did your appointments come from in the spring, and where are they coming from now?"},
         {"title": "The 10/18 Open House", "text": "The 10/18 open house at 41 Snickerdoodle Ct brought in 3 buyer leads, you said. What's the next step with each?"},
         {"title": "What She Wants Next", "text": "What do you want to focus on for November and December, and what do you need from me before our next one-on-one?"}]},
    {"id": "focus", "kind": "list", "label": "Possible Focus Areas (Your Call)",
     "finding": "Three options from the run's focus candidates, in its order.",
     "note": "These are options from the numbers, not a verdict; pick one, or none.",
     "items": [
         {"title": "Signed Agreements", "text": "33 / 40.0 = 82.5% of the prorated goal (48 x 10 / 12 = 40.0). Appointments met to signed is 33 / 72 = 45.8%, under her plan's 50%. October: 2, against her January to September average of 31 / 9 = 3.4 a month. To open it: \"Walk me through a recent appointment that didn't end in a signed agreement. What happened at the end?\""},
         {"title": "Appointments Set", "text": "85 / 100.0 = 85.0% of the prorated goal (120 x 10 / 12 = 100.0). October: 5, against 80 / 9 = 8.9 a month. To open it: \"Which sources gave you appointments in the spring, and which ones are you working now?\""},
         {"title": "Appointments Met", "text": "72 / 80.0 = 90.0% of the prorated goal (96 x 10 / 12 = 80.0). October: 5, against 67 / 9 = 7.4 a month. To open it: \"What happens between setting an appointment and meeting?\""}]},
    {"id": "agenda", "kind": "timeline", "label": "Agenda",
     "finding": "A suggested order; change it to yours.",
     "note": "30 minutes, from your message.",
     "items": [
         {"date": "10:00 AM MT", "title": "Her Wins And What's On Her Mind", "text": "To 10:05 AM MT, 5 minutes. She goes first."},
         {"date": "10:05 AM MT", "title": "Numbers Against Her Goal", "text": "To 10:10 AM MT, 5 minutes."},
         {"date": "10:10 AM MT", "title": "Last Time's Commitments", "text": "To 10:15 AM MT, 5 minutes."},
         {"date": "10:15 AM MT", "title": "The Focus You Pick", "text": "To 10:25 AM MT, 10 minutes."},
         {"date": "10:25 AM MT", "title": "New Commitments, What She Needs From You, And The Next One-On-One's Date",
          "text": "To 10:30 AM MT, 5 minutes."}]},
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

FLAGS = {
    "id": "flags", "kind": "list", "label": "Flags",
    "finding": "What was read, the dates it runs on, and what was left out.",
    "items": [
        {"title": "Files Read", "text": "PRACTICE Sisu Monthly Numbers Marigold Fizzwhistle 2026-11-10.csv (one row per month, "
                                        "January to November 2026), PRACTICE Marigold Fizzwhistle 2026 Goals.md, PRACTICE Last "
                                        "1on1 Notes 2026-10-08.txt, and your notes for this one-on-one from your message."},
        {"title": "As Of 11/10/2026", "text": "You said the numbers were pulled November 10, 2026, and the file name carries "
                                              "2026-11-10. The pace window is January through October 2026 (10 months, the last "
                                              "full month). November 2026 is a partial month: shown apart and left out of the pace math."},
        {"title": "Meeting", "text": "Thursday, November 12, 2026, 10:00 AM MT, 30 minutes, from your message."},
        {"title": "Goals", "text": "Her seven 2026 annual production goals and two planned rates, each found word for word in "
                                   "her goals file. The file has no monthly goals, so each annual goal is prorated evenly by "
                                   "month (no seasonality). Sisu's own Personal Pacer may spread her goals differently; Sisu is "
                                   "the source of record for its pacer."},
        {"title": "Columns", "text": "Every measure was read by its own column name; nothing to confirm."},
        {"status": "hold", "chip": "Left Out", "title": "Personal And Pay Details",
         "text": "2 personal or pay details from her goals file. They don't appear anywhere below; whether and how to raise them is yours."}],
}


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
        "sections": [FLAGS, numbers(), months(), ratios(), changed(), averages()] + SECTIONS_AFTER,
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
