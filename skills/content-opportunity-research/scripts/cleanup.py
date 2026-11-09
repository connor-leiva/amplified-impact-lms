"""Delete the run's temp folder, where full captions and transcripts lived.

It deletes only a folder that looks like the one study.py writes: not a
top-level or home folder, holding nothing but .json files. Anything else is
left alone and reported, so a typo in media_tmp_dir can't delete real files.

Usage: python cleanup.py [--config path]
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import load_config  # noqa: E402


def unsafe_reason(tmp: Path):
    resolved = tmp.resolve()
    if len(resolved.parts) < 3 or resolved in (Path.home().resolve(), Path.cwd().resolve()):
        return "it is a top-level, home, or current folder"
    for item in resolved.iterdir():
        if item.is_dir() or item.suffix != ".json":
            return f"it holds {item.name}, which study.py does not write"
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--config")
    args = parser.parse_args()
    tmp = Path((load_config(args.config).get("output") or {}).get("media_tmp_dir", "/tmp/content-research-media"))
    if not tmp.exists():
        print(f"Nothing to delete at {tmp}")
        return 0
    reason = unsafe_reason(tmp)
    if reason:
        print(f"NOT_DELETED: {tmp} was left alone because {reason}. Delete the transcript files by hand.")
        return 1
    shutil.rmtree(tmp)
    print(f"Deleted {tmp}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
