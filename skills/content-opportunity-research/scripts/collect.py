"""Collect watchlist and niche-discovery reels through fixed Apify actors.

Watchlist monitoring and niche discovery run as separate collections with
separate caps. Every row keeps its source URL, publication date, collection
time, actor run, and discovery query. The budget is re-checked before every
actor run, and nothing runs while the approved budget is unset.

Usage: python collect.py --data-dir <data folder> [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (Apify, ApifyError, append_jsonl, budget_configured, budget_status,  # noqa: E402
                    iso, load_config, log_run, normalize_reel, now_utc, practice_mode, stage_cap, today)


def plan_runs(cfg) -> list:
    plans = []
    wl = cfg.get("watchlist") or {}
    accounts = [str(a).strip().lstrip("@") for a in (wl.get("accounts") or []) if a and str(a).strip()]
    if accounts:
        per = int(wl.get("reels_per_account", 24))
        run_input = {
            "username": accounts,
            "resultsLimit": per,
            "skipPinnedPosts": bool(wl.get("skip_pinned", True)),
            "includeSharesCount": bool(wl.get("include_shares_count", False)),
            "includeTranscript": False,
        }
        if wl.get("lookback"):
            run_input["onlyPostsNewerThan"] = wl["lookback"]
        plans.append({"stage": "watchlist", "actor": wl.get("actor", "apify/instagram-reel-scraper"),
                      "input": run_input, "max_items": len(accounts) * per, "query": None})

    disc = cfg.get("discovery") or {}
    if disc.get("enabled", True):
        queries = [(str(h).strip().lstrip("#"), False) for h in (disc.get("hashtags") or []) if h and str(h).strip()]
        queries += [(str(k).strip(), True) for k in (disc.get("keywords") or []) if k and str(k).strip()]
        queries = queries[: int(disc.get("max_queries", 6))]
        per = int(disc.get("results_per_query", 20))
        for text, is_keyword in queries:
            plans.append({
                "stage": "discovery",
                "actor": disc.get("actor", "apify/instagram-hashtag-scraper"),
                "input": {"hashtags": [text], "resultsType": disc.get("results_type", "reels"),
                          "resultsLimit": per, "keywordSearch": is_keyword},
                "max_items": per,
                "query": ("keyword:" if is_keyword else "#") + text,
            })
    return plans


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--config")
    parser.add_argument("--dry-run", action="store_true", help="print planned runs without calling Apify")
    args = parser.parse_args()

    cfg = load_config(args.config)
    data = Path(args.data_dir)
    plans = plan_runs(cfg)
    if not plans:
        print("Nothing to collect: the watchlist and discovery queries are both empty.")
        return 0

    if args.dry_run:
        for plan in plans:
            print(json.dumps(plan, indent=2))
        print(f"Dry run: {len(plans)} planned actor runs, no Apify calls made.")
        return 0

    if practice_mode(cfg):
        print("PRACTICE_MODE: this is a practice config, so nothing was collected and nothing was spent.")
        return 0

    if not budget_configured(cfg):
        log_run(data, {"stage": "collect", "status": "SKIPPED", "reason": "BUDGET_NOT_SET"})
        print("BUDGET_NOT_SET: budget.monthly_budget_usd is empty in config.yaml, so nothing was collected.")
        return 1

    token = os.environ.get((cfg.get("apify") or {}).get("token_env", "APIFY_TOKEN"))
    if not token:
        log_run(data, {"stage": "collect", "status": "SKIPPED", "reason": "APIFY_TOKEN_MISSING"})
        print("APIFY_TOKEN_MISSING: APIFY_TOKEN is not set, so nothing was collected.")
        return 1

    apify_cfg = cfg.get("apify") or {}
    apify = Apify(token, apify_cfg.get("base_url", "https://api.apify.com/v2"))
    collected_at = iso(now_utc())
    run_date = today()
    stage_counts = {}
    for plan in plans:
        stage_counts[plan["stage"]] = stage_counts.get(plan["stage"], 0) + 1

    failures = 0
    for plan in plans:
        label = plan["query"] or "watchlist"
        try:
            budget = budget_status(cfg, apify)
        except ApifyError as e:
            log_run(data, {"stage": plan["stage"], "query": plan["query"], "status": "FAILED",
                           "reason": f"BUDGET_CHECK_FAILED: {e}"})
            print(f"BUDGET_CHECK_FAILED before {label}: {e}. Stopping collection.")
            return 1
        for warning in budget["warnings"]:
            print(f"WARNING: {warning}")
        if not budget["ok"]:
            log_run(data, {"stage": plan["stage"], "query": plan["query"], "status": "SKIPPED",
                           "reason": budget["reason"], "budget": budget})
            print(f"{budget['reason']}: ${budget['remaining_usd']} left this cycle. Skipping {label} and the rest.")
            break

        cap = stage_cap(cfg, plan["stage"], budget, stage_counts[plan["stage"]])
        if cap <= 0:
            log_run(data, {"stage": plan["stage"], "query": plan["query"], "status": "SKIPPED",
                           "reason": "NO_HEADROOM", "budget": budget})
            print(f"NO_HEADROOM: skipping {label}.")
            continue

        try:
            run, items = apify.run_actor(plan["actor"], plan["input"], max_items=plan["max_items"],
                                         max_charge_usd=cap,
                                         timeout_secs=int(apify_cfg.get("run_timeout_seconds", 900)),
                                         poll_seconds=int(apify_cfg.get("poll_seconds", 10)))
        except ApifyError as e:
            failures += 1
            log_run(data, {"stage": plan["stage"], "query": plan["query"], "actor": plan["actor"],
                           "status": "FAILED", "reason": str(e), "cap_usd": cap})
            print(f"FAILED {label}: {e}")
            continue

        rows = [r for r in (normalize_reel(i, source=plan["stage"], actor=plan["actor"], run_id=run.get("id"),
                                           collected_at=collected_at, query=plan["query"]) for i in items) if r]
        if rows:
            append_jsonl(data / "snapshots" / run_date / f"{plan['stage']}.jsonl", rows)
        status = run.get("status")
        if status != "SUCCEEDED":
            failures += 1
        log_run(data, {"stage": plan["stage"], "query": plan["query"], "actor": plan["actor"],
                       "run_id": run.get("id"), "status": status, "status_message": run.get("statusMessage"),
                       "items": len(rows), "usage_usd": run.get("usageTotalUsd"), "cap_usd": cap,
                       "budget": budget})
        print(f"{plan['stage']} {label}: {status}, {len(rows)} reels, "
              f"spent ${run.get('usageTotalUsd')} against a ${cap} cap")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
