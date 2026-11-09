"""Shared helpers for content-opportunity-research.

Standard library plus PyYAML. Every Apify call in this skill goes through
the Apify class below, so spending is checked and capped in one place.
"""
from __future__ import annotations

import json
import math
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent

# Share of one run's cap per stage when a stage has no explicit cap.
STAGE_SHARES = {"watchlist": 0.4, "discovery": 0.3, "study": 0.3}

# Apify actors name the same metric differently. The first field present wins,
# and the row records which field it came from.
VIEW_FIELDS = ("videoPlayCount", "playsCount", "videoViewCount", "viewsCount", "views", "playCount")
LIKE_FIELDS = ("likesCount", "likeCount", "likes")
COMMENT_FIELDS = ("commentsCount", "commentCount", "comments")
SHARE_FIELDS = ("sharesCount", "shareCount", "shares")
DURATION_FIELDS = ("videoDuration", "duration", "durationSec")

FINISHED = {"SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"}

# The only host the token is ever sent to, and the only actors this skill may start.
# Both read public Instagram data; neither can post, comment, like, follow, or message.
ALLOWED_HOST = "api.apify.com"
ALLOWED_ACTORS = {"apify/instagram-reel-scraper", "apify/instagram-hashtag-scraper"}


# ---------------------------------------------------------------- time

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def today() -> str:
    return now_utc().strftime("%Y-%m-%d")


def parse_time(value):
    """Parse ISO strings or epoch seconds into an aware UTC datetime, else None."""
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc)
    text = str(value).strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


# ---------------------------------------------------------------- files

def load_config(path=None) -> dict:
    try:
        import yaml
    except ImportError:
        sys.exit("PyYAML is missing. Run `pip install pyyaml` (in a scheduled routine, add it to the environment's setup script).")
    cfg_path = Path(path) if path else SKILL_DIR / "config.yaml"
    with open(cfg_path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def read_jsonl(path) -> list:
    path = Path(path)
    if not path.exists():
        return []
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def append_jsonl(path, rows) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def write_json(path, obj) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def log_run(data_dir, entry: dict) -> None:
    entry = {"date": today(), "logged_at": iso(now_utc()), **entry}
    append_jsonl(Path(data_dir) / "runs.jsonl", [entry])


# ---------------------------------------------------------------- Apify

class ApifyError(Exception):
    pass


class _ApifyOnlyRedirects(urllib.request.HTTPRedirectHandler):
    """Follow a redirect only if it stays on ALLOWED_HOST over https. urllib copies the
    Authorization header onto a redirected request, so a redirect anywhere else could carry the token."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parts = urllib.parse.urlsplit(newurl)
        if parts.scheme != "https" or parts.hostname != ALLOWED_HOST:
            raise ApifyError(f"REDIRECT_NOT_ALLOWED: api.apify.com redirected to {parts.hostname}; "
                             "the redirect was not followed and the token was not sent there")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_OPENER = urllib.request.build_opener(_ApifyOnlyRedirects)


class Apify:
    """Minimal Apify API client: account limits, run an actor, read its dataset."""

    def __init__(self, token: str, base_url: str = "https://api.apify.com/v2"):
        parts = urllib.parse.urlsplit(base_url)
        if parts.scheme != "https" or parts.hostname != ALLOWED_HOST:
            sys.exit(f"BASE_URL_NOT_ALLOWED: apify.base_url must be https://{ALLOWED_HOST}/v2. Nothing was sent.")
        self.token = token
        self.base = base_url.rstrip("/")

    def _request(self, method, path, params=None, body=None, timeout=90):
        url = self.base + path
        if params:
            clean = {k: v for k, v in params.items() if v is not None}
            if clean:
                url += "?" + urllib.parse.urlencode(clean)
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(url, data=data, method=method, headers={
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        })
        try:
            with _OPENER.open(req, timeout=timeout) as resp:
                raw = resp.read()
        except urllib.error.HTTPError as e:
            detail = e.read()[:300].decode("utf-8", "replace")
            raise ApifyError(f"{method} {path}: HTTP {e.code} {detail}") from None
        except urllib.error.URLError as e:
            raise ApifyError(f"{method} {path}: network error {e.reason}") from None
        return json.loads(raw) if raw else {}

    def limits(self) -> dict:
        return self._request("GET", "/users/me/limits")["data"]

    def run_actor(self, actor_id, run_input, *, max_items=None, max_charge_usd=None,
                  timeout_secs=900, poll_seconds=10):
        """Start a run with caps, wait for it to finish, return (run, items)."""
        if actor_id not in ALLOWED_ACTORS:
            raise ApifyError(f"ACTOR_NOT_ALLOWED: {actor_id} is not one of this skill's fixed actors; nothing was started")
        if not max_charge_usd or max_charge_usd <= 0:
            raise ApifyError("NO_CHARGE_CAP: refusing to start a run without a positive maxTotalChargeUsd")
        act = actor_id.replace("/", "~")
        run = self._request("POST", f"/acts/{act}/runs", params={
            "maxItems": max_items,
            "maxTotalChargeUsd": max_charge_usd,
            "timeout": timeout_secs,
        }, body=run_input)["data"]
        deadline = time.time() + timeout_secs + 180
        while run.get("status") not in FINISHED:
            if time.time() > deadline:
                raise ApifyError(f"run {run.get('id')} still {run.get('status')} after its timeout")
            time.sleep(poll_seconds)
            run = self._request("GET", f"/actor-runs/{run['id']}",
                                params={"waitForFinish": 60}, timeout=120)["data"]
        items = []
        if run.get("defaultDatasetId"):
            items = self._request("GET", f"/datasets/{run['defaultDatasetId']}/items",
                                  params={"clean": "true", "format": "json"}, timeout=180)
        return run, items if isinstance(items, list) else []


# ---------------------------------------------------------------- budget

def practice_mode(cfg) -> bool:
    """A practice config (practice: true) never reaches Apify."""
    return cfg.get("practice") is True


def budget_configured(cfg) -> bool:
    value = (cfg.get("budget") or {}).get("monthly_budget_usd")
    return isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0


def budget_status(cfg, apify: Apify) -> dict:
    """Compare this cycle's Apify usage with your approved monthly budget."""
    b = cfg.get("budget") or {}
    monthly = float(b["monthly_budget_usd"])
    reserve = float(b.get("reserve_usd", 1.0))
    lim = apify.limits()
    used = float(lim["current"]["monthlyUsageUsd"])
    account_cap = float(lim["limits"].get("maxMonthlyUsageUsd") or 0)
    cap = min(monthly, account_cap) if account_cap > 0 else monthly
    remaining = round(cap - used, 4)
    status = {
        "monthly_budget_usd": monthly,
        "account_cap_usd": account_cap,
        "used_this_cycle_usd": round(used, 4),
        "remaining_usd": remaining,
        "cycle_end": lim.get("monthlyUsageCycle", {}).get("endAt"),
        "ok": remaining > reserve,
        "reason": None if remaining > reserve else "BUDGET_EXHAUSTED",
        "warnings": [],
    }
    if account_cap == 0 or account_cap > monthly:
        status["warnings"].append(
            "Apify account hard cap is unset or above your monthly budget; set it on the Apify Limits page.")
    return status


def stage_cap(cfg, stage: str, budget: dict, runs_in_stage: int = 1) -> float:
    """Max charge for one actor run in a stage, never more than what's left above the reserve."""
    b = cfg.get("budget") or {}
    per_run = b.get("per_run_max_usd") or float(b["monthly_budget_usd"]) / 5
    explicit = (cfg.get(stage) or {}).get("max_charge_usd")
    stage_total = float(explicit) if explicit else float(per_run) * STAGE_SHARES[stage]
    per_actor_run = stage_total / max(runs_in_stage, 1)
    headroom = max(budget["remaining_usd"] - float(b.get("reserve_usd", 1.0)), 0)
    # Round down to the cent, so a cap never ends up above the stage share or the headroom.
    return math.floor(min(per_actor_run, headroom) * 100 + 1e-9) / 100


# ---------------------------------------------------------------- normalizing

def first_number(item: dict, fields):
    """First non-negative number among fields. Hidden counts often arrive as -1 or null."""
    for field in fields:
        value = item.get(field)
        if value is None or isinstance(value, bool):
            continue
        if isinstance(value, (int, float)) and value >= 0:
            return value, field
    return None, None


def shortcode_from_url(url):
    if not url:
        return None
    match = re.search(r"instagram\.com/(?:[^/]+/)?(?:reel|reels|p|tv)/([A-Za-z0-9_-]+)", url)
    return match.group(1) if match else None


def transcript_text(item: dict):
    """Transcript as plain text, or None. Never synthesized from the caption."""
    t = item.get("transcript", item.get("transcription"))
    if isinstance(t, str):
        return t.strip() or None
    if isinstance(t, list):
        parts = [seg.get("text", "") if isinstance(seg, dict) else str(seg) for seg in t]
        text = " ".join(p.strip() for p in parts if p and p.strip())
        return text or None
    if isinstance(t, dict):
        return (t.get("text") or "").strip() or None
    return None


def normalize_reel(item: dict, *, source, actor, run_id, collected_at, query=None):
    """One snapshot row: metrics plus provenance. Full captions are not stored here."""
    url = item.get("url") or item.get("inputUrl")
    code = item.get("shortCode") or item.get("shortcode") or shortcode_from_url(url)
    post_id = code or item.get("id")
    if not post_id:
        return None
    if not url and code:
        url = f"https://www.instagram.com/reel/{code}/"
    owner = item.get("ownerUsername")
    if not owner and isinstance(item.get("owner"), dict):
        owner = item["owner"].get("username")
    owner = (owner or item.get("username") or "").lower() or None

    views, views_f = first_number(item, VIEW_FIELDS)
    likes, likes_f = first_number(item, LIKE_FIELDS)
    comments, comments_f = first_number(item, COMMENT_FIELDS)
    shares, shares_f = first_number(item, SHARE_FIELDS)
    duration, _ = first_number(item, DURATION_FIELDS)
    published = parse_time(item.get("timestamp") or item.get("takenAt") or item.get("takenAtTimestamp"))
    caption = item.get("caption") or ""
    metrics = {"views": views, "likes": likes, "comments": comments, "shares": shares}
    fields = {"views": views_f, "likes": likes_f, "comments": comments_f, "shares": shares_f}
    return {
        "post_id": str(post_id),
        "url": url,
        "owner": owner,
        "platform": "instagram",
        "product_type": item.get("productType") or item.get("type"),
        "published_at": iso(published) if published else None,
        "collected_at": collected_at,
        "source": source,
        "query": query,
        "actor": actor,
        "run_id": run_id,
        **metrics,
        "duration_sec": duration,
        "metric_fields": {k: v for k, v in fields.items() if v},
        "missing": [k for k, v in metrics.items() if v is None],
        "caption_excerpt": caption[:100],  # enough to identify the post, not to reproduce it
        "hashtags": item.get("hashtags") if isinstance(item.get("hashtags"), list) else [],
    }
