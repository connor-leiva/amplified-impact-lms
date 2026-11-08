"""Safety checks for the skill's scripts, run against mock_apify.py (no network, no spend).

Checks: nothing runs without a budget or a token; a practice config never calls Apify;
the token goes only to https://api.apify.com and is never written or printed; only the two
fixed read-only actors can start; every run carries a positive charge cap and an item cap
that fit the stage's share; the budget is checked before every run and an exhausted budget
stops collection before any spend; dry runs call nothing; cleanup refuses an unsafe folder;
a redirect off api.apify.com is refused; caps round down.

Usage: python evals/make/check_scripts.py   (prints PASS or FAIL per check, exits 1 on any FAIL)
"""
from __future__ import annotations

import re
import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mock_apify import SKILL, MockApify, at, collect, patched, run_script, study  # noqa: E402

import cleanup  # noqa: E402

TOKEN = "apify_api_CHECKTOKEN_never_write_me_1234567890"
WHEN = at("2026-11-08T14:00:00Z")
RESULTS = []


def check(name, ok, detail=""):
    RESULTS.append(ok)
    print(("PASS " if ok else "FAIL ") + name + (f"  ({detail})" if detail else ""))


def item(code, owner, published, views=1000):
    return {"shortCode": code, "url": f"https://www.instagram.com/reel/{code}/", "ownerUsername": owner,
            "timestamp": published, "videoPlayCount": views, "likesCount": 50, "commentsCount": 5,
            "videoDuration": 45, "caption": "made-up", "transcript": "made-up words"}


def fixtures(act, body):
    if act == "apify~instagram-hashtag-scraper":
        return [item(f"CHK_TAG_{i}", f"example_tag_{i}", "2026-11-01T10:00:00Z") for i in range(20)]
    names = body.get("username") or []
    if names and str(names[0]).startswith("http"):
        return [item(u.rstrip("/").split("/")[-1], "example_x", "2026-11-01T10:00:00Z") for u in names]
    return [item(f"CHK_{n}_{i}", n, "2026-10-%02dT10:00:00Z" % (1 + i)) for n in names for i in range(24)]


def write_config(folder: Path, *, budget="20", practice=False, base="https://api.apify.com/v2",
                 actor="apify/instagram-reel-scraper", tmp=None):
    text = (SKILL / "config.yaml").read_text(encoding="utf-8")
    text = text.replace("monthly_budget_usd: null", f"monthly_budget_usd: {budget}")
    text = text.replace("  accounts: []", '  accounts: ["example_one", "example_two", "example_three"]')
    text = text.replace("  hashtags: []", '  hashtags: ["exampletagone", "exampletagtwo"]')
    text = text.replace("base_url: https://api.apify.com/v2", f"base_url: {base}")
    text = re.sub(r"  actor: apify/instagram-reel-scraper[^\n]*\n  reels_per_account", f"  actor: {actor}\n  reels_per_account", text)
    if tmp:
        text = text.replace("media_tmp_dir: /tmp/content-research-media", f"media_tmp_dir: {tmp}")
    if practice:
        text = "practice: true\n" + text
    path = folder / "config.yaml"
    path.write_text(text, encoding="utf-8")
    return path


def posts(mock):
    return [c for c in mock.calls if c["method"] == "POST"]


def all_text(folder: Path):
    return "\n".join(p.read_text(encoding="utf-8", errors="replace") for p in folder.rglob("*") if p.is_file())


def main() -> int:
    root = Path(tempfile.mkdtemp(prefix="cor-check-"))
    try:
        # 1. No budget: nothing is called.
        d = root / "nobudget"; d.mkdir()
        cfg = write_config(d, budget="null")
        mock = MockApify(fixtures)
        with patched(mock, WHEN):
            code, out = run_script(collect, ["--data-dir", str(d / "data"), "--config", str(cfg)], {"APIFY_TOKEN": TOKEN})
        check("empty budget: BUDGET_NOT_SET and zero Apify calls", "BUDGET_NOT_SET" in out and not mock.calls, out.strip())

        # 2. No token: nothing is called.
        d = root / "notoken"; d.mkdir()
        cfg = write_config(d)
        mock = MockApify(fixtures)
        with patched(mock, WHEN):
            code, out = run_script(collect, ["--data-dir", str(d / "data"), "--config", str(cfg)], {})
        check("missing token: APIFY_TOKEN_MISSING and zero Apify calls", "APIFY_TOKEN_MISSING" in out and not mock.calls, out.strip())

        # 3. Practice config: nothing is called, even with a token and a budget.
        d = root / "practice"; d.mkdir()
        cfg = write_config(d, practice=True)
        mock = MockApify(fixtures)
        with patched(mock, WHEN):
            c1, out1 = run_script(collect, ["--data-dir", str(d / "data"), "--config", str(cfg)], {"APIFY_TOKEN": TOKEN})
            c2, out2 = run_script(study, ["--data-dir", str(SKILL / "practice"), "--config", str(cfg)], {"APIFY_TOKEN": TOKEN})
        check("practice config: collect and study make zero Apify calls",
              "PRACTICE_MODE" in out1 and "PRACTICE_MODE" in out2 and not mock.calls)

        # 4. A base_url other than api.apify.com is refused before anything is sent.
        d = root / "host"; d.mkdir()
        cfg = write_config(d, base="https://evil.example.com/v2")
        mock = MockApify(fixtures)
        with patched(mock, WHEN):
            code, out = run_script(collect, ["--data-dir", str(d / "data"), "--config", str(cfg)], {"APIFY_TOKEN": TOKEN})
        check("other host: BASE_URL_NOT_ALLOWED and zero calls", "BASE_URL_NOT_ALLOWED" in out and not mock.calls, out.strip())

        # 5. An actor outside the fixed pair is never started.
        d = root / "actor"; d.mkdir()
        cfg = write_config(d, actor="someone/instagram-auto-commenter")
        mock = MockApify(fixtures)
        with patched(mock, WHEN):
            code, out = run_script(collect, ["--data-dir", str(d / "data"), "--config", str(cfg)], {"APIFY_TOKEN": TOKEN})
        started = [c["path"] for c in posts(mock)]
        check("unknown actor: ACTOR_NOT_ALLOWED and that actor never started",
              "ACTOR_NOT_ALLOWED" in out and not any("auto-commenter" in p for p in started), ", ".join(started))

        # 6. Budget exhausted: the limit is read, no run starts.
        d = root / "exhausted"; d.mkdir()
        cfg = write_config(d)
        mock = MockApify(fixtures, monthly_cap=20.0, used=19.5)
        with patched(mock, WHEN):
            code, out = run_script(collect, ["--data-dir", str(d / "data"), "--config", str(cfg)], {"APIFY_TOKEN": TOKEN})
        check("budget under the reserve: BUDGET_EXHAUSTED and no run started",
              "BUDGET_EXHAUSTED" in out and not posts(mock), out.strip().splitlines()[-1] if out.strip() else "")

        # 7. A normal run: caps, order of calls, hosts, endpoints, and no token on disk or in output.
        d = root / "normal"; d.mkdir()
        tmp = root / "normal-tmp"
        cfg = write_config(d, tmp=tmp)
        mock = MockApify(fixtures, monthly_cap=20.0, used=0.0)
        with patched(mock, WHEN):
            c1, out1 = run_script(collect, ["--data-dir", str(d / "data"), "--config", str(cfg)], {"APIFY_TOKEN": TOKEN})
            import outliers
            c2, out2 = run_script(outliers, ["--data-dir", str(d / "data"), "--config", str(cfg)], {"APIFY_TOKEN": TOKEN})
            c3, out3 = run_script(study, ["--data-dir", str(d / "data"), "--config", str(cfg)], {"APIFY_TOKEN": TOKEN})
        runs = posts(mock)
        per_run = 20 / 5
        shares = {"apify~instagram-reel-scraper": [per_run * 0.4, per_run * 0.3],
                  "apify~instagram-hashtag-scraper": [per_run * 0.3 / 2]}
        caps_ok = all(0 < c["params"].get("maxTotalChargeUsd", 0) <= max(shares[c["path"].split("/")[2]]) + 1e-9
                      and c["params"].get("maxItems") for c in runs)
        check("every run has a positive charge cap within its stage share, and an item cap", caps_ok and len(runs) == 4,
              "; ".join(f"{c['path'].split('/')[2]} cap ${c['params'].get('maxTotalChargeUsd')} items {c['params'].get('maxItems')}" for c in runs))
        order_ok = all(mock.calls[mock.calls.index(c) - 1]["path"] == "/users/me/limits" for c in runs)
        check("the budget is read immediately before every run", order_ok)
        hosts_ok = all(c["base"] == "https://api.apify.com/v2" for c in mock.calls)
        check("every call goes to https://api.apify.com/v2", hosts_ok)
        allowed = re.compile(r"^(GET /users/me/limits|POST /acts/apify~instagram-(reel|hashtag)-scraper/runs|GET /actor-runs/\w+|GET /datasets/\w+/items)$")
        eps = {f"{c['method']} {c['path']}" for c in mock.calls}
        check("only read and run endpoints are used (limits, start run, run status, dataset items)",
              all(allowed.match(e) for e in eps), ", ".join(sorted(eps)))
        leaked = TOKEN in all_text(d / "data") or TOKEN in all_text(tmp) or any(TOKEN in o for o in (out1, out2, out3))
        check("the token is not in any written file or printed line", not leaked)
        check("transcripts stay in the temp folder, not the data folder",
              tmp.exists() and not any("made-up words" in p.read_text(encoding="utf-8") for p in (d / "data").rglob("*.json*")))

        # 8. Dry runs call nothing.
        mock = MockApify(fixtures)
        with patched(mock, WHEN):
            run_script(collect, ["--data-dir", str(d / "data"), "--config", str(cfg), "--dry-run"], {"APIFY_TOKEN": TOKEN})
            run_script(study, ["--data-dir", str(d / "data"), "--config", str(cfg), "--dry-run"], {"APIFY_TOKEN": TOKEN})
        check("dry runs make zero Apify calls", not mock.calls)

        # 9. Cleanup deletes the study temp folder, and refuses a folder holding anything else.
        code, out = run_script(cleanup, ["--config", str(cfg)])
        check("cleanup deletes the temp folder study.py wrote", code == 0 and not tmp.exists(), out.strip())
        unsafe = root / "not-a-temp-folder"; unsafe.mkdir()
        (unsafe / "brief.md").write_text("keep me", encoding="utf-8")
        cfg2 = write_config(root / "nobudget", tmp=unsafe)
        code, out = run_script(cleanup, ["--config", str(cfg2)])
        check("cleanup refuses a folder that holds other files", code == 1 and (unsafe / "brief.md").exists(), out.strip())

        # 10. Static scan: one network client, one host, no shell-outs, nothing that posts.
        src = {p.name: p.read_text(encoding="utf-8") for p in (SKILL / "scripts").glob("*.py")}
        hosts = set(re.findall(r"https?://([\w.-]+)", "\n".join(src.values())))
        check("the scripts name no host but api.apify.com (and instagram.com only to build permalinks)",
              hosts <= {"api.apify.com", "www.instagram.com"}, ", ".join(sorted(hosts)))
        net = [n for n, s in src.items() if "urllib.request" in s or "requests" in s or "http.client" in s]
        check("only common.py opens network connections", net == ["common.py"], ", ".join(net))
        shell = [n for n, s in src.items() if re.search(r"subprocess|os\.system|os\.popen", s)]
        check("no script shells out", not shell, ", ".join(shell))

        # 11. Redirects stay on api.apify.com (urllib copies the Authorization header onto a redirect),
        #     and a stage cap is rounded down, never above the headroom over the reserve.
        import email.message
        import io
        import urllib.request
        import common
        handler = common._ApifyOnlyRedirects()
        req = urllib.request.Request("https://api.apify.com/v2/users/me/limits",
                                     headers={"Authorization": f"Bearer {TOKEN}"})
        try:
            handler.redirect_request(req, io.BytesIO(), 302, "Found", email.message.Message(),
                                     "https://evil.example.com/v2/users/me/limits")
            refused, detail = False, "followed"
        except common.ApifyError as e:
            refused, detail = "REDIRECT_NOT_ALLOWED" in str(e) and TOKEN not in str(e), str(e)
        same = handler.redirect_request(req, io.BytesIO(), 302, "Found", email.message.Message(),
                                        "https://api.apify.com/v2/users/me/limits/")
        check("a redirect off api.apify.com is refused before the token goes there; one within it is followed",
              refused and same is not None and same.full_url.startswith("https://api.apify.com/"), detail)
        check("every request goes through the redirect-guarded opener",
              "urlopen(" not in src["common.py"] and "_OPENER.open(" in src["common.py"])
        small = {"budget": {"monthly_budget_usd": 20, "reserve_usd": 1.0}}
        cap = common.stage_cap(small, "watchlist", {"remaining_usd": 1.126})
        check("a stage cap is rounded down, never above the headroom left over the reserve", cap == 0.12, f"${cap}")
    finally:
        shutil.rmtree(root, ignore_errors=True)
    failed = RESULTS.count(False)
    print(f"{len(RESULTS) - failed} of {len(RESULTS)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
