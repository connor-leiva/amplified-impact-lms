"""Score creator-relative outliers from every snapshot collected so far.

Each creator's baseline is the median of their own mature posts on one metric
(views when most posts have them, otherwise likes plus comments). Baselines
are labeled strong, weak, or none. Posts younger than the minimum age are left
out, stale data is flagged, and posts already used in past recommendations are
dropped. Output: <data>/candidates/<date>.json

Usage: python outliers.py --data-dir <data folder>
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
from collections import defaultdict
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (iso, load_config, now_utc, parse_time, read_jsonl, shortcode_from_url,  # noqa: E402
                    today, write_json)


def metric_value(row, metric):
    if metric == "views":
        return row.get("views")
    likes, comments = row.get("likes"), row.get("comments")
    if likes is None or comments is None:
        return None
    return likes + comments


def choose_metric(posts, coverage):
    if not posts:
        return "views"
    with_views = sum(1 for p in posts if p.get("views") is not None)
    return "views" if with_views / len(posts) >= coverage else "engagement"


def latest_by_post(rows):
    best = {}
    for row in rows:
        key = row.get("post_id")
        if key and (key not in best or row.get("collected_at", "") > best[key].get("collected_at", "")):
            best[key] = row
    return best


def used_source_urls(data):
    urls = set()
    for path in sorted((data / "recommendations").glob("*.json")):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        for opp in payload.get("opportunities", []):
            for url in opp.get("source_urls") or []:
                urls.add(url)
                code = shortcode_from_url(url)
                if code:
                    urls.add(code)  # the same post can come back as /p/ or /reel/
    return urls


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--config")
    args = parser.parse_args()

    cfg = load_config(args.config)
    sc = cfg.get("scoring") or {}
    data = Path(args.data_dir)
    now = now_utc()
    run_date = today()
    out_path = data / "candidates" / f"{run_date}.json"

    rows = []
    for path in sorted((data / "snapshots").glob("*/*.jsonl")):
        rows.extend(read_jsonl(path))
    todays_runs = [r for r in read_jsonl(data / "runs.jsonl") if r.get("date") == run_date]
    failures = [f"{r.get('stage')} {r.get('query') or ''}".strip() + f": {r.get('status')} {r.get('reason') or ''}".rstrip()
                for r in todays_runs if r.get("status") != "SUCCEEDED"]

    if not rows:
        write_json(out_path, {"generated_at": iso(now), "creators": [], "candidates": [],
                              "failures": failures, "stale": [], "notes": ["No snapshots yet."]})
        print("No snapshots yet; wrote an empty candidates file.")
        return 0

    min_age = timedelta(hours=float(sc.get("min_post_age_hours", 72)))
    baseline_window = timedelta(days=float(sc.get("baseline_days", 90)))
    candidate_window = timedelta(days=float(sc.get("candidate_window_days", 21)))
    threshold = float(sc.get("outlier_multiple", 2.0))
    strong_n = int(sc.get("strong_baseline_posts", 12))
    weak_n = int(sc.get("weak_baseline_posts", 5))
    coverage = float(sc.get("views_coverage_for_views_metric", 0.6))
    stale_after = timedelta(days=float(sc.get("stale_after_days", 8)))
    watchlist = {str(a).lower().lstrip("@") for a in ((cfg.get("watchlist") or {}).get("accounts") or [])}
    used = used_source_urls(data)

    by_owner = defaultdict(list)
    skipped_undated = 0
    for row in latest_by_post(rows).values():
        published = parse_time(row.get("published_at"))
        if not published or not row.get("owner"):
            skipped_undated += 1
            continue
        row = dict(row, _age=now - published)
        by_owner[row["owner"]].append(row)

    creators, candidates, leads = {}, [], []
    for owner, posts in by_owner.items():
        mature = [p for p in posts if min_age <= p["_age"] <= baseline_window]
        metric = choose_metric(mature, coverage)
        values = [v for v in (metric_value(p, metric) for p in mature) if v is not None]
        n = len(values)
        label = "strong" if n >= strong_n else "weak" if n >= weak_n else "none"
        median = statistics.median(values) if n >= weak_n else None
        last_collected = max(p.get("collected_at", "") for p in posts)
        creators[owner] = {"owner": owner, "on_watchlist": owner in watchlist, "metric": metric,
                           "baseline_posts": n, "baseline_label": label, "median": median,
                           "last_collected_at": last_collected}

        for p in posts:
            if not (min_age <= p["_age"] <= candidate_window) or p.get("url") in used or p["post_id"] in used:
                continue
            value = metric_value(p, metric)
            if value is None:
                continue
            multiple = round(value / median, 2) if median else None
            entry = {
                "post_id": p["post_id"], "url": p.get("url"), "owner": owner,
                "on_watchlist": owner in watchlist, "source": p.get("source"), "query": p.get("query"),
                "published_at": p.get("published_at"), "collected_at": p.get("collected_at"),
                "metric": metric, "value": value, "multiple": multiple,
                "baseline_label": label, "baseline_posts": n,
                "is_outlier": bool(multiple is not None and multiple >= threshold),
                "views": p.get("views"), "likes": p.get("likes"), "comments": p.get("comments"),
                "shares": p.get("shares"), "missing": p.get("missing", []),
                "caption_excerpt": p.get("caption_excerpt", ""),
            }
            if entry["is_outlier"]:
                candidates.append(entry)
            elif label == "none":
                leads.append(entry)

    candidates.sort(key=lambda c: ({"strong": 0, "weak": 1}.get(c["baseline_label"], 2), -c["multiple"]))
    leads.sort(key=lambda c: -c["value"])
    leads = leads[: int(sc.get("max_unbaselined_leads", 10))]

    stale = []
    for account in sorted(watchlist):
        info = creators.get(account)
        if not info:
            stale.append({"owner": account, "issue": "no data collected yet"})
            continue
        last = parse_time(info["last_collected_at"])
        if last and now - last > stale_after:
            stale.append({"owner": account, "issue": f"last collected {info['last_collected_at'][:10]}"})

    notes = []
    if skipped_undated:
        notes.append(f"{skipped_undated} posts had no publish date or owner and were left out.")
    weak = [c["owner"] for c in creators.values() if c["on_watchlist"] and c["baseline_label"] != "strong"]
    if weak:
        notes.append("Watchlist creators without a strong baseline: " + ", ".join(sorted(weak)) + ".")

    write_json(out_path, {
        "generated_at": iso(now),
        "settings": {"outlier_multiple": threshold, "min_post_age_hours": min_age.total_seconds() / 3600,
                     "candidate_window_days": candidate_window.days},
        "failures": failures,
        "stale": stale,
        "notes": notes,
        "creators": sorted(creators.values(), key=lambda c: (not c["on_watchlist"], c["owner"])),
        "candidates": candidates + leads,
    })
    print(f"{len(candidates)} outliers and {len(leads)} unbaselined leads from {len(by_owner)} creators -> {out_path}")
    for c in candidates[:10]:
        print(f"  {c['multiple']}x {c['metric']} ({c['baseline_label']}, {c['baseline_posts']} posts) "
              f"@{c['owner']} {c['url']}")
    for item in stale:
        print(f"  STALE @{item['owner']}: {item['issue']}")
    for failure in failures:
        print(f"  FAILURE {failure}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
