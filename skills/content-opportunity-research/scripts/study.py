"""Pull transcripts for the strongest candidates so Claude can study them.

Outliers with strong baselines come first, then weak, then at most a couple of
unbaselined discovery leads. Full captions and transcripts go to the temp
folder only; the data repo gets metrics and whether a transcript existed.

Usage: python study.py --data-dir <data folder>
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (Apify, ApifyError, append_jsonl, budget_configured, budget_status, iso,  # noqa: E402
                    load_config, log_run, normalize_reel, now_utc, practice_mode, stage_cap, today,
                    transcript_text)


def select(candidates, study_cfg):
    limit = int(study_cfg.get("max_candidates", 8))
    max_leads = int(study_cfg.get("max_unbaselined", 2))
    rank = {"strong": 0, "weak": 1}
    outliers = sorted((c for c in candidates if c.get("is_outlier")),
                      key=lambda c: (rank.get(c.get("baseline_label"), 2), -(c.get("multiple") or 0)))
    leads = [c for c in candidates if c.get("baseline_label") == "none"][:max_leads]
    picked, seen = [], set()
    for c in outliers + leads:
        if c["post_id"] in seen or not c.get("url"):
            continue
        picked.append(c)
        seen.add(c["post_id"])
        if len(picked) >= limit:
            break
    return picked


def latest_candidates(data):
    files = sorted((data / "candidates").glob("*.json"))
    return json.loads(files[-1].read_text(encoding="utf-8")) if files else None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--config")
    parser.add_argument("--dry-run", action="store_true", help="show the picks without calling Apify")
    args = parser.parse_args()

    cfg = load_config(args.config)
    data = Path(args.data_dir)
    study_cfg = cfg.get("study") or {}
    tmp = Path((cfg.get("output") or {}).get("media_tmp_dir", "/tmp/content-research-media"))

    payload = latest_candidates(data)
    if not payload:
        print("No candidates file. Run outliers.py first.")
        return 1
    picks = select(payload.get("candidates", []), study_cfg)
    if not picks:
        print("No candidates to study this week.")
        return 0
    if args.dry_run:
        for c in picks:
            strength = f"{c['multiple']}x" if c.get("multiple") is not None else "no baseline"
            print(f"{strength} ({c['baseline_label']}) @{c['owner']} {c['url']}")
        print(f"Dry run: {len(picks)} picks, no Apify calls made.")
        return 0

    if practice_mode(cfg):
        print("PRACTICE_MODE: no transcripts pulled and nothing spent. The practice transcripts are in the data folder's transcripts/.")
        return 0
    if not budget_configured(cfg):
        log_run(data, {"stage": "study", "status": "SKIPPED", "reason": "BUDGET_NOT_SET"})
        print("BUDGET_NOT_SET: no transcripts pulled.")
        return 1
    token = os.environ.get((cfg.get("apify") or {}).get("token_env", "APIFY_TOKEN"))
    if not token:
        log_run(data, {"stage": "study", "status": "SKIPPED", "reason": "APIFY_TOKEN_MISSING"})
        print("APIFY_TOKEN_MISSING: no transcripts pulled.")
        return 1

    apify_cfg = cfg.get("apify") or {}
    apify = Apify(token, apify_cfg.get("base_url", "https://api.apify.com/v2"))
    actor = study_cfg.get("actor", "apify/instagram-reel-scraper")
    try:
        budget = budget_status(cfg, apify)
    except ApifyError as e:
        log_run(data, {"stage": "study", "status": "FAILED", "reason": f"BUDGET_CHECK_FAILED: {e}"})
        print(f"BUDGET_CHECK_FAILED: {e}")
        return 1
    if not budget["ok"]:
        log_run(data, {"stage": "study", "status": "SKIPPED", "reason": budget["reason"], "budget": budget})
        print(f"{budget['reason']}: ${budget['remaining_usd']} left; no transcripts pulled.")
        return 1
    cap = stage_cap(cfg, "study", budget)
    if cap <= 0:
        log_run(data, {"stage": "study", "status": "SKIPPED", "reason": "NO_HEADROOM", "budget": budget})
        print("NO_HEADROOM: no transcripts pulled.")
        return 1

    run_input = {"username": [c["url"] for c in picks], "includeTranscript": True, "skipPinnedPosts": False}
    try:
        run, items = apify.run_actor(actor, run_input, max_items=len(picks), max_charge_usd=cap,
                                     timeout_secs=int(apify_cfg.get("run_timeout_seconds", 900)),
                                     poll_seconds=int(apify_cfg.get("poll_seconds", 10)))
    except ApifyError as e:
        log_run(data, {"stage": "study", "actor": actor, "status": "FAILED", "reason": str(e), "cap_usd": cap})
        print(f"FAILED study run: {e}")
        return 1

    collected_at = iso(now_utc())
    by_id = {}
    for item in items:
        row = normalize_reel(item, source="study", actor=actor, run_id=run.get("id"), collected_at=collected_at)
        if row:
            by_id[row["post_id"]] = (row, item)

    tmp.mkdir(parents=True, exist_ok=True)
    snapshot_rows, study_rows = [], []
    for c in picks:
        row, item = by_id.get(c["post_id"], (None, None))
        text = transcript_text(item) if item else None
        record = {"post_id": c["post_id"], "url": c["url"], "owner": c["owner"],
                  "multiple": c.get("multiple"), "baseline_label": c.get("baseline_label"),
                  "collected_at": collected_at, "run_id": run.get("id"),
                  "returned_by_actor": item is not None,
                  "transcript_available": bool(text),
                  "transcript_words": len(text.split()) if text else 0,
                  "duration_sec": row.get("duration_sec") if row else None}
        study_rows.append(record)
        if row:
            snapshot_rows.append(row)
        # Full caption and transcript stay in the temp folder only.
        (tmp / f"{c['post_id']}.json").write_text(json.dumps({
            **record,
            "caption": (item or {}).get("caption"),
            "transcript": text,
            "transcript_note": None if text else ("not returned by the actor" if item else "post not returned"),
            "metrics": {k: (row or {}).get(k) for k in ("views", "likes", "comments", "shares")},
        }, ensure_ascii=False, indent=2), encoding="utf-8")

    run_date = today()
    if snapshot_rows:
        append_jsonl(data / "snapshots" / run_date / "study.jsonl", snapshot_rows)
    append_jsonl(data / "study" / f"{run_date}.jsonl", study_rows)
    log_run(data, {"stage": "study", "actor": actor, "run_id": run.get("id"), "status": run.get("status"),
                   "status_message": run.get("statusMessage"), "items": len(by_id),
                   "usage_usd": run.get("usageTotalUsd"), "cap_usd": cap, "budget": budget})

    print(f"study: {run.get('status')}, {len(by_id)} of {len(picks)} returned, "
          f"spent ${run.get('usageTotalUsd')} against a ${cap} cap. Files in {tmp}:")
    for r in study_rows:
        flag = f"{r['transcript_words']} words" if r["transcript_available"] else "NO TRANSCRIPT"
        strength = f"{r['multiple']}x" if r["multiple"] is not None else "no baseline"
        print(f"  {tmp / (r['post_id'] + '.json')}  @{r['owner']} {strength}  {flag}")
    return 0 if run.get("status") == "SUCCEEDED" else 1


if __name__ == "__main__":
    sys.exit(main())
