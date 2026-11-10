"""What references/touch-plan-guide.md says a run should find, worked out in code, for grading.

python3 -I evals/make/expected_picks.py <file.csv> [--today 2026-11-10] [--text-ok "Hank Brindlecomb"]

Prints the column map, the tiers, who is out of the plan, the first-year clients, this week's picks with
the rule that made each one due and its channel, the share math, anniversaries by month, and the
notes a draft must leave out. It follows the guide's rules for the two planted files only (a Follow Up
Boss export and a Google Sheets list); it is a grading aid, not part of the skill. Writes nothing.
"""
import argparse
import csv
import math
import re
from datetime import date, datetime

SENSITIVE = re.compile(r"surgery|refinanc|divorce|twins|kindergarten|layoff|medicare|retired|health|engaged|daughter|mom ", re.I)
ACTIVE = {"appointment set", "met with customer", "showing homes", "listing agreement", "active listing",
          "submitting offers", "under contract"}
LEADS = {"lead", "nurture", "attempted contact", "spoke with customer"}
JUNK = {"trash", "rejected"}
PLAN = {  # plan month -> touch kind per tier (the guide's default cadence)
    1: ("Personal check-in", "Personal check-in", "Personal check-in"),
    2: ("Handwritten note", "-", "-"), 3: ("Call", "Call", "-"),
    4: ("Home value review offer", "-", "Home value review offer"), 5: ("Personal check-in", "Handwritten note", "-"),
    6: ("Call", "-", "-"), 7: ("Handwritten note", "Personal check-in", "Personal check-in"),
    8: ("Personal check-in", "-", "-"), 9: ("Call", "Call", "-"), 10: ("Home value review offer", "-", "Handwritten note"),
    11: ("Personal check-in", "Personal check-in", "-"), 12: ("Call", "-", "-"),
}
TIERS = ("Past Clients", "Close Sphere", "Wider Sphere")


def parse_date(s):
    s = (s or "").strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def read(path):
    lines = open(path, encoding="utf-8").read().splitlines()
    if lines and lines[0].startswith("PRACTICE FILE"):
        lines = lines[1:]
    return list(csv.DictReader(lines))


def tags_of(r):
    return [t.strip().lower() for t in (r.get("Tags") or "").split(",") if t.strip()]


def tier_of(r):
    stage = (r.get("Stage") or r.get("Relationship") or "").strip().lower()
    tags = tags_of(r)
    if stage in LEADS or stage in ACTIVE or stage in JUNK or (r.get("Deal Stage") or "").lower() == "under contract":
        return None, "out: " + stage
    if stage in ("past client", "closed") or "past client" in tags:
        return "Past Clients", "stage or tag"
    if "sphere a" in tags or stage == "close friend":
        return "Close Sphere", "tag Sphere A" if "sphere a" in tags else "Relationship: Close friend (default)"
    if "sphere b" in tags:
        return "Wider Sphere", "tag Sphere B"
    if stage in ("sphere", "friend", "neighbor", "coworker"):
        return "Wider Sphere", "no tier marker (default)" if stage == "sphere" else f"Relationship: {stage} (default)"
    return None, "unknown"


def close_date(r):
    return parse_date(r.get("Home Anniversary")) or parse_date(r.get("Deal Close Date")) or parse_date(r.get("Closed"))


def anniversary_in(cd, start, end):
    for y in (start.year, end.year):
        try:
            d = cd.replace(year=y)
        except ValueError:
            d = date(y, 3, 1)
        if start <= d <= end:
            return d
    return None


def channels(r, text_ok):
    tags = tags_of(r)
    name = r.get("Name", "")
    consent = (r.get("Text Consent") or "").strip()
    phone = bool((r.get("Phone 1") or r.get("Phone") or "").strip())
    email = bool((r.get("Email 1") or r.get("Email") or "").strip())
    dnc = "do not call" in tags or "dnc" in tags
    out = {}
    if not phone:
        out["text"] = (False, "no phone")
    elif dnc:
        out["text"] = (False, "Do Not Call")
    elif "do not text" in tags:
        out["text"] = (False, "Do Not Text")
    elif name in text_ok:
        out["text"] = (True, "the agent said so in chat")
    elif "Text Consent" not in r:
        out["text"] = (False, "no consent column")
    elif not consent or consent.lower().startswith(("no", "revoked")):
        out["text"] = (False, f"Text Consent: {consent or 'blank'}")
    elif "verbal" in consent.lower():
        out["text"] = (False, f"Text Consent: {consent} (verbal only)")
    else:
        out["text"] = (True, f"Text Consent: {consent}")
    out["email"] = (email and "unsubscribed" not in tags, "no email" if not email else ("Unsubscribed" if "unsubscribed" in tags else "email on file"))
    out["call"] = (phone and not dnc, "no phone" if not phone else ("Do Not Call" if dnc else "phone on file"))
    return out


def note_due(r, start, end):
    notes = r.get("Notes") or ""
    if re.search(r"until Nov 9", notes):
        return "follow-up after Nov 9 (passed), no touch since the note"
    if re.search(r"Follow up in November", notes):
        return "asked follow-up this month (November)"
    if re.search(r"week of Nov 9", notes):
        return "asked follow-up the week of Nov 9 (overlaps the window)"
    return None


def note_later(r):
    if "after Thanksgiving" in (r.get("Notes") or ""):
        return date(2026, 11, 26)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--today", default="2026-11-10")
    ap.add_argument("--text-ok", action="append", default=[])
    a = ap.parse_args()
    today = date.fromisoformat(a.today)
    end = date.fromordinal(today.toordinal() + 6)
    month_end = date(today.year + (today.month == 12), (today.month % 12) + 1, 1)
    days_left = (month_end - today).days
    weeks_left = math.ceil(days_left / 7)
    rows = read(a.file)
    has_last = "Last Communication" in rows[0]
    print(f"Today {today:%A, %B %d, %Y}; window to {end:%A, %B %d}; days left in month {days_left}; weeks left {weeks_left}")
    print(f"{len(rows)} contacts; last-touch column: {has_last}; consent column: {'Text Consent' in rows[0]}")

    tiers = {t: [] for t in TIERS}
    out_counts = {}
    first_year = []
    for i, r in enumerate(rows):
        r["_row"] = i + 1
        t, why = tier_of(r)
        if t is None:
            out_counts[why] = out_counts.get(why, 0) + 1
            continue
        cd = close_date(r)
        if t == "Past Clients" and cd and (today - cd).days < 365 and not anniversary_in(cd, today, end):
            first_year.append((r["Name"], cd))
            continue
        r["_tier_why"] = why
        tiers[t].append(r)
    print("Out of plan:", out_counts)
    print("First-year (post-closing-client-care):", first_year)
    for t in TIERS:
        print(f"{t}: {len(tiers[t])}: " + ", ".join(f"{r['Name']} [{r['_tier_why']}]" for r in tiers[t]))

    picks, later, closed = [], [], []
    for ti, t in enumerate(TIERS):
        kind = PLAN[1][ti]
        pool = []
        for r in tiers[t]:
            ch = channels(r, a.text_ok)
            if not any(v[0] for v in ch.values()):
                closed.append((r["Name"], ch))
                continue
            lc = parse_date(r.get("Last Communication"))
            if lc and lc.year == today.year and lc.month == today.month and lc < today:
                continue
            cd = close_date(r)
            ann = anniversary_in(cd, today, end) if cd and t == "Past Clients" else None
            due = note_due(r, today, end)
            if ann:
                picks.append((t, r, f"anniversary {ann:%a %b %d}, {ann.year - cd.year} yrs (from {cd})", ch, ann))
                continue
            if due:
                picks.append((t, r, due, ch, today))
                continue
            last_day = date.fromordinal(month_end.toordinal() - 1)
            later_ann = anniversary_in(cd, today, last_day) if cd and t == "Past Clients" else None
            nl = note_later(r)
            if later_ann or nl:
                later.append((r["Name"], later_ann or nl))
                continue
            pool.append(r)
        if kind == "-":
            continue
        share = math.ceil(len(pool) / weeks_left) if pool else 0
        if has_last:
            pool.sort(key=lambda r: (parse_date(r.get("Last Communication")) or date.min, r["_row"]))
        print(f"{t}: rotation pool {len(pool)} ({', '.join(r['Name'] for r in pool)}), share ceil({len(pool)}/{weeks_left}) = {share}")
        for r in pool[:share]:
            picks.append((t, r, f"rotation (last touch {r.get('Last Communication') or 'none on record'})", channels(r, a.text_ok), today))

    print("\nThis week's picks:")
    for t, r, why, ch, day in sorted(picks, key=lambda p: (p[4], TIERS.index(p[0]))):
        text, email, call = ch["text"], ch["email"], ch["call"]
        draft = "TEXT" if text[0] else ("EMAIL" if email[0] else ("CALL NOTE" if call[0] else "none"))
        print(f"- {r['Name']} | {t} | {why} | {draft} | text: {text[1]}; email: {email[1]}; call: {call[1]} | send {day:%a %b %d}")
    print("\nLater this month:", later)
    print("Every channel closed:", [(n, {k: v[1] for k, v in c.items()}) for n, c in closed])

    months = {}
    for r in tiers["Past Clients"]:
        cd = close_date(r)
        if cd and not any(n == r["Name"] for n, _ in closed):
            months[cd.month] = months.get(cd.month, 0) + 1
    for n, cd in first_year:
        months[cd.month] = months.get(cd.month, 0) + 1
    print("\nAnniversaries by month (past clients in the plan with an open channel, plus first-year):",
          {date(2000, m, 1).strftime('%b'): c for m, c in sorted(months.items())})
    print("\nNotes a draft must leave out:")
    for r in rows:
        if SENSITIVE.search(r.get("Notes") or ""):
            print(f"- {r['Name']}: {r['Notes']}")


if __name__ == "__main__":
    main()
