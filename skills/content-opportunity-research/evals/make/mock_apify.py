"""A stand-in for api.apify.com, so the skill's real scripts can run with no network,
no token and no spend. Used by build_data.py (to make the practice and eval data in the
exact format the scripts write) and by check_scripts.py (the safety checks).

It replaces common.Apify._request, so nothing ever leaves this machine. Prices are
Apify's published Free-plan event prices for the two actors, read from the public
actor records on 2026-11-08:
  apify/instagram-reel-scraper:   $0.001 actor start, $0.0026 per reel, $0.048 per started
                                  minute of transcript
  apify/instagram-hashtag-scraper: $0.0026 per result
"""
from __future__ import annotations

import contextlib
import io
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(SKILL / "scripts"))

import collect  # noqa: E402
import common  # noqa: E402
import outliers  # noqa: E402
import study  # noqa: E402

PRICES = {
    "apify~instagram-reel-scraper": {"start": 0.001, "item": 0.0026, "transcript_minute": 0.048},
    "apify~instagram-hashtag-scraper": {"start": 0.0, "item": 0.0026, "transcript_minute": 0.0},
}


class MockApify:
    """Serves limits, actor runs and dataset items from fixtures, and records every call."""

    def __init__(self, fixtures, *, monthly_cap=10.0, used=0.0, cycle_end="2026-11-30T23:59:59.999Z"):
        self.fixtures = fixtures  # callable(actor, run_input) -> list of raw actor items
        self.cap = monthly_cap
        self.used = used
        self.cycle_end = cycle_end
        self.calls = []
        self.datasets = {}
        self.n = 0

    def request(self, client, method, path, params=None, body=None, timeout=90):
        self.calls.append({"method": method, "path": path, "params": dict(params or {}), "body": body,
                           "auth": (client.token is not None), "base": client.base})
        if method == "GET" and path == "/users/me/limits":
            return {"data": {"monthlyUsageCycle": {"startAt": "2026-11-01T00:00:00.000Z", "endAt": self.cycle_end},
                             "limits": {"maxMonthlyUsageUsd": self.cap},
                             "current": {"monthlyUsageUsd": round(self.used, 4)}}}
        if method == "POST" and path.startswith("/acts/") and path.endswith("/runs"):
            act = path.split("/")[2]
            items = self.fixtures(act, body)
            max_items = (params or {}).get("maxItems")
            if max_items is not None:
                items = items[: int(max_items)]
            price = PRICES[act]
            usage = price["start"] + price["item"] * len(items)
            if body.get("includeTranscript"):
                usage += sum(price["transcript_minute"] * math.ceil((i.get("videoDuration") or 0) / 60)
                             for i in items if i.get("transcript"))
            cap = (params or {}).get("maxTotalChargeUsd")
            if cap is not None and usage > cap:
                usage = cap  # the actor stops charging at the cap
            usage = round(usage, 4)
            self.used += usage
            self.n += 1
            run_id = f"madeUpRun{self.n:03d}"
            ds = f"madeUpDataset{self.n:03d}"
            if not body.get("includeTranscript"):
                items = [{k: v for k, v in i.items() if k != "transcript"} for i in items]
            self.datasets[ds] = items
            return {"data": {"id": run_id, "status": "SUCCEEDED", "statusMessage": None,
                             "defaultDatasetId": ds, "usageTotalUsd": usage}}
        if method == "GET" and path.startswith("/datasets/"):
            return self.datasets[path.split("/")[2]]
        raise AssertionError(f"unexpected call {method} {path}")


@contextlib.contextmanager
def patched(mock: MockApify, when: datetime):
    """Route every Apify call to the mock and freeze the scripts' clock at `when`."""
    saved = {}

    def fake_request(self, method, path, params=None, body=None, timeout=90):
        return mock.request(self, method, path, params, body, timeout)

    def fake_now():
        return when

    def fake_today():
        return when.strftime("%Y-%m-%d")

    targets = [(common.Apify, "_request", fake_request)]
    for mod in (common, collect, outliers, study):
        if hasattr(mod, "now_utc"):
            targets.append((mod, "now_utc", fake_now))
        if hasattr(mod, "today"):
            targets.append((mod, "today", fake_today))
    for obj, name, value in targets:
        saved[(obj, name)] = getattr(obj, name)
        setattr(obj, name, value)
    try:
        yield
    finally:
        for (obj, name), value in saved.items():
            setattr(obj, name, value)


def run_script(module, argv, env=None):
    """Run one script's main() with argv and env, returning (exit code, printed output)."""
    import os
    old_argv, old_env = sys.argv, dict(os.environ)
    sys.argv = [module.__name__ + ".py", *argv]
    if env is not None:
        for key in ("APIFY_TOKEN",):
            os.environ.pop(key, None)
        os.environ.update(env)
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            try:
                code = module.main()
            except SystemExit as e:
                code = e.code if isinstance(e.code, int) else 1
                if e.code and not isinstance(e.code, int):
                    print(e.code)
    finally:
        sys.argv = old_argv
        os.environ.clear()
        os.environ.update(old_env)
    return code, out.getvalue()


def at(text: str) -> datetime:
    return datetime.fromisoformat(text.replace("Z", "+00:00")).astimezone(timezone.utc)
