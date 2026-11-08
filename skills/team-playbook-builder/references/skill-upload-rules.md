# Claude Skill Upload Rules

Last verified: 2026-11-08, against Claude's Help Center, the claude.com skills docs, Anthropic's platform docs and the Agent Skills specification (links at the end). The generated playbook must pass every rule here so it uploads on the first try.

## The Rules the Playbook Must Meet

| Rule | Where it comes from |
|---|---|
| A folder named after the skill, with SKILL.md at the folder's root. SKILL.md is the only required file | claude.com docs; Help Center |
| The ZIP holds that one folder at its root, not loose files. Claude looks for `folder-name/SKILL.md` inside the archive | Help Center; claude.com docs |
| The folder name matches the skill's `name` | Help Center (a mismatch is a listed upload failure); claude.com docs |
| `name`: lowercase letters, numbers and hyphens, 64 characters or fewer, no "claude" or "anthropic" | claude.com docs; platform docs (reserved words) |
| `name` can't start or end with a hyphen or contain two hyphens in a row | Agent Skills specification |
| `description`: required, 1,024 characters or fewer, no angle brackets (no XML tags) | claude.com docs; platform docs |
| Frontmatter keys: `name` and `description`, plus optional `license`, `compatibility` (500 characters or fewer), `metadata`, `allowed-tools` | Agent Skills specification |
| Keep SKILL.md under 500 lines; move detail into reference files | claude.com docs |
| Invalid characters in the name or description and oversized ZIPs are listed upload failures. Claude.ai publishes no size number; the API's limit is 30 MB uncompressed, so a text playbook is far inside it | Help Center; platform docs |

Where the sources disagree, the playbook meets the stricter reading:
- The Help Center's "How to create custom skills" page calls the file `skill.md`, calls `name` "human-friendly," and caps `description` at 200 characters. The claude.com docs use `SKILL.md`, lowercase-hyphen names and 1,024 characters. The Amplified library's skills use `SKILL.md` and lowercase-hyphen names, and Amplified's Reel Editor uploads with an 833-character description, so the playbook follows the claude.com rules. If an upload is ever rejected for the description, shorten it to under 200 characters and package again.
- Plans: the Help Center lists skills on Free, Pro, Max, Ultra, Team and Enterprise. The claude.com docs and platform docs leave Free out. Tell agents on Free to try the upload, and if the option isn't there, that's the reason.

Every skill needs code execution turned on (Help Center). On Free, Pro, Max and Ultra it's on by default.

## Check and Package

Save this script as `check_playbook.py`, outside the playbook folder, and run:

`python3 check_playbook.py path/to/team-slug-playbook --out path/for/zip --must-not-contain "removed name" --must-not-contain "removed figure"`

Pass one `--must-not-contain` for every name and figure in the removal log (an agent's name tied to a split, the split itself, a removed phone number). The script checks the folder against the rules above and the playbook's own rules (an Owner and Last updated line in every reference file, no em or en dashes, no phone numbers, account numbers or access codes), then writes `team-slug-playbook.zip` and reopens it to confirm the folder sits at the root. It prints errors and stops without writing a ZIP until they're fixed. Emails print as warnings: keep only shared team inboxes.

```python
import argparse, os, re, sys, zipfile

ALLOWED = {"name", "description", "license", "allowed-tools", "metadata", "compatibility"}
TEXT = re.compile(r"\.(md|txt|json|ya?ml|csv|tsv|py|js|html)$", re.I)
DASH = re.compile("[" + chr(0x2013) + chr(0x2014) + "]")
JUNK = {".DS_Store", "__pycache__", "Thumbs.db"}


def scalar(raw):
    v = raw.strip()
    if len(v) > 1 and v[0] == v[-1] and v[0] in "\"'":
        return v[1:-1]
    return v


def frontmatter(text):
    m = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n", text, re.S)
    if not m:
        return None, None, text
    data, cur, lines, i = {}, None, m.group(1).splitlines(), 0
    while i < len(lines):
        line = lines[i]
        top = re.match(r"^([A-Za-z][\w-]*):\s*(.*)$", line)
        nested = re.match(r"^\s+([A-Za-z][\w-]*):\s*(.*)$", line)
        if not line.strip() or line.strip().startswith("#"):
            pass
        elif top:
            k, raw = top.groups()
            cur = None
            if raw == "":
                data[k], cur = {}, k
            elif raw in (">", "|", ">-", "|-"):
                block = []
                while i + 1 < len(lines) and re.match(r"^\s+", lines[i + 1]):
                    i += 1
                    block.append(lines[i].strip())
                data[k] = (" " if raw.startswith(">") else "\n").join(block)
            else:
                data[k] = scalar(raw)
        elif nested and cur:
            data[cur][nested.group(1)] = scalar(nested.group(2))
        i += 1
    return data, m.group(1), text[m.end():]


def files_in(folder):
    out = []
    for root, dirs, names in os.walk(folder):
        dirs[:] = sorted(d for d in dirs if d not in JUNK and not d.startswith("."))
        for n in sorted(names):
            if n in JUNK or n.startswith("."):
                continue
            out.append(os.path.join(root, n))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--out", default=".")
    ap.add_argument("--must-not-contain", action="append", default=[])
    a = ap.parse_args()
    folder = os.path.abspath(a.folder.rstrip("/"))
    name = os.path.basename(folder)
    errors, warnings = [], []

    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name) or len(name) > 64:
        errors.append(f"folder name '{name}': lowercase letters, numbers and single hyphens, 64 characters max")
    if re.search(r"claude|anthropic", name, re.I):
        errors.append("the name must not contain 'claude' or 'anthropic'")
    all_files = files_in(folder)
    skill_mds = [f for f in all_files if os.path.basename(f).lower() == "skill.md"]
    if os.path.join(folder, "SKILL.md") not in skill_mds:
        errors.append("no SKILL.md at the folder root")
    if len(skill_mds) > 1:
        errors.append("more than one SKILL.md in the folder")

    text = open(os.path.join(folder, "SKILL.md"), encoding="utf-8").read() if os.path.exists(os.path.join(folder, "SKILL.md")) else ""
    data, raw_fm, body = frontmatter(text)
    if data is None:
        errors.append("SKILL.md has no frontmatter between --- lines")
        data, body = {}, text
    try:
        import yaml
        parsed = yaml.safe_load(raw_fm or "")
        if not isinstance(parsed, dict):
            errors.append("frontmatter is not a YAML mapping")
    except ImportError:
        for line in (raw_fm or "").splitlines():
            m = re.match(r"^\s*[A-Za-z][\w-]*:\s*(.*)$", line)
            if m and m.group(1) and m.group(1)[0] not in "\"'>|" and (": " in m.group(1) or " #" in m.group(1)):
                errors.append("a frontmatter value has ': ' or ' #' and needs quotes")
    except Exception as e:
        errors.append(f"frontmatter is not valid YAML: {e}")
    for k in data:
        if k not in ALLOWED:
            errors.append(f"frontmatter key '{k}' is not allowed")
    if data.get("name") != name:
        errors.append("frontmatter name must equal the folder name")
    d = data.get("description")
    if not isinstance(d, str) or not d.strip():
        errors.append("description is missing")
    else:
        if len(d) > 1024:
            errors.append(f"description is {len(d)} characters (1,024 max)")
        if re.search(r"[<>]", d):
            errors.append("description has an angle bracket")
    if "compatibility" in data and len(str(data["compatibility"])) > 500:
        errors.append("compatibility is over 500 characters")
    md = data.get("metadata")
    if not isinstance(md, dict) or not md.get("author") or not md.get("version"):
        errors.append("metadata needs author and version")
    n = len(body.split("\n"))
    if n > 500:
        errors.append(f"SKILL.md body is {n} lines (500 max)")
    elif n > 150:
        warnings.append(f"SKILL.md body is {n} lines (aim for about 100)")
    for ref in sorted(set(re.findall(r"references/[\w.-]+\.md", text))):
        if not os.path.exists(os.path.join(folder, ref)):
            errors.append(f"SKILL.md names {ref}, which is missing")

    total = 0
    pats = [
        ("a phone number", re.compile(r"(?<!\d)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?!\d)")),
        ("a Social Security number", re.compile(r"(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)")),
        ("a long number (account or routing?)", re.compile(r"(?<![\d.,$])\d{8,17}(?![\d,]|\.\d)")),
        ("an account or routing detail", re.compile(r"(routing|account|acct|aba)\s*(number|no\.?|#)?\s*[:#]?\s*\d{4,}", re.I)),
        ("an access code or password", re.compile(r"\b(code|password|passcode|pin|combo)\b\s*(is|:|=)?\s*\d{3,}", re.I)),
    ]
    for f in all_files:
        total += os.path.getsize(f)
        rel = os.path.relpath(f, folder)
        if not TEXT.search(f):
            continue
        t = open(f, encoding="utf-8", errors="replace").read()
        if DASH.search(t):
            errors.append(f"{rel} has an em or en dash")
        for label, p in pats:
            if p.search(t):
                errors.append(f"{rel} has what looks like {label}")
        for e in sorted(set(re.findall(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", t))):
            warnings.append(f"{rel} has the email {e}: keep it only if it's a shared team inbox")
        for i, term in enumerate(a.must_not_contain, 1):
            if term and term.lower() in t.lower():
                errors.append(f"{rel} contains must-not-contain term #{i}")
        if rel.startswith("references") and rel.endswith(".md"):
            if not re.search(r"^Owner:", t, re.M) or not re.search(r"^Last updated:", t, re.M):
                errors.append(f"{rel} needs an Owner: line and a Last updated: line")
    if total > 30 * 1024 * 1024:
        warnings.append("the folder is over 30 MB; keep a playbook to text files")

    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("ERROR:", e)
    if errors:
        print(f"{len(errors)} error(s). Fix them and run again. No ZIP written.")
        sys.exit(1)

    os.makedirs(a.out, exist_ok=True)
    zpath = os.path.join(a.out, f"{name}.zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        dirs = sorted({os.path.relpath(os.path.dirname(f), folder) for f in all_files})
        for d in dirs:
            info = zipfile.ZipInfo(name + "/" + ("" if d == "." else d.replace(os.sep, "/") + "/"))
            info.external_attr = (0o40755 << 16) | 0x10
            z.writestr(info, "")
        for f in all_files:
            z.write(f, f"{name}/{os.path.relpath(f, folder)}".replace(os.sep, "/"))
    with zipfile.ZipFile(zpath) as z:
        names = z.namelist()
        assert all(x.startswith(name + "/") for x in names), "every entry must sit inside the one folder"
        names = [x for x in names if not x.endswith("/")]
        assert f"{name}/SKILL.md" in names, "SKILL.md must sit at the folder root"
    print(f"OK: {zpath} ({os.path.getsize(zpath)} bytes, {len(names)} files, one folder '{name}/' at the root)")


main()
```

## Without Code Execution

Give every file in full, each under a heading with its path, then these steps for the leader:
1. Make a folder named exactly `team-slug-playbook`, with a `references` folder inside it.
2. Save each file as plain text under the path shown (SKILL.md in the main folder, the rest in `references`).
3. Zip the folder itself, not the files inside it. On a Mac, Control-click the folder and choose Compress. On Windows, right-click the folder, choose Show more options, then Send to, then Compressed (zipped) folder.
4. The ZIP's name should be `team-slug-playbook.zip`.

## Sources

- Claude Help Center, "Use skills in Claude" (plans, code execution, Customize > Skills upload path, upload failure reasons): https://support.claude.com/en/articles/12512180-use-skills-in-claude (checked 2026-11-08)
- Claude Help Center, "How to create custom skills" (skill.md, ZIP structure, 200-character description): https://support.claude.com/en/articles/12512198-how-to-create-custom-skills (checked 2026-11-08)
- claude.com docs, "Create a skill" (SKILL.md, name rules, 1,024 characters, 500 lines, ZIP root): https://claude.com/docs/skills/how-to (checked 2026-11-08)
- Anthropic platform docs, Agent Skills overview (reserved words "anthropic" and "claude", no XML tags): https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview (checked 2026-11-08 by Amplified's vendor review)
- Anthropic platform docs, skills guide (30 MB upload limit on the API): https://platform.claude.com/docs/en/build-with-claude/skills-guide (checked 2026-11-08 by Amplified's vendor review)
- Agent Skills specification (frontmatter keys, hyphen rules, compatibility length): https://agentskills.io/specification (checked 2026-11-08 by Amplified's vendor review)
- Apple Support, "Zip and unzip files and folders on Mac": https://support.apple.com/guide/mac-help/zip-and-unzip-files-and-folders-on-mac-mchlp2528/mac (checked 2026-11-08)
- Microsoft Support, "Zip and unzip files": https://support.microsoft.com/en-us/windows/zip-and-unzip-files-8d28fa72-f2f9-712f-67df-f80cf89fd4e5 (checked 2026-11-08)
