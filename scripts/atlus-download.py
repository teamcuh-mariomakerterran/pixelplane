#!/usr/bin/env python3
"""Download Atlus Drive sheets listed in scripts/atlus-ids.json.

Copies local matches from attachments/packs first, then pulls the rest
from Drive in parallel. Originals stay in public/vault/_raw/{folder}/.
"""
from __future__ import annotations

import json
import shutil
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen

RAW = Path("/workspace/public/vault/_raw")
IDS = Path("/workspace/scripts/atlus-ids.json")
ATTACH = Path("/workspace/attachments")
PACKS = [
    Path("/workspace/public/packs/goodies"),
    Path("/workspace/public/packs/night-district"),
    Path("/workspace/public/starter-pack"),
    Path("/workspace/public/pixel-icons"),
]
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36"


def local_match(name: str) -> Path | None:
    hits = [ATTACH / name]
    if name == "crt_overlay.jpg":
        hits.append(ATTACH / "crt overlay.jpg")
    for p in hits:
        if p.exists() and p.stat().st_size > 2000:
            return p
    for root in PACKS:
        if not root.exists():
            continue
        for p in root.rglob(name):
            if p.is_file() and p.stat().st_size > 2000:
                return p
    return None


def fetch(fid: str, dest: Path) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 2000:
        head = dest.read_bytes()[:80]
        if not head.lstrip().lower().startswith(b"<!doctype") and not head.lstrip().lower().startswith(b"<html"):
            return True
        dest.unlink(missing_ok=True)
    urls = [
        f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t",
        f"https://drive.google.com/uc?export=download&id={fid}&confirm=t",
    ]
    last_err = None
    for url in urls:
        try:
            req = Request(url, headers={"User-Agent": UA})
            with urlopen(req, timeout=45) as r:
                data = r.read()
            if len(data) < 800:
                last_err = f"tiny {len(data)}"
                continue
            if data.lstrip()[:20].lower().startswith(b"<!doctype") or data.lstrip()[:15].lower().startswith(b"<html"):
                last_err = "html interstitial"
                continue
            dest.write_bytes(data)
            return True
        except Exception as e:
            last_err = e
            time.sleep(0.2)
    print("fail", fid, dest.name, last_err)
    dest.unlink(missing_ok=True)
    return False


def one(folder: str, rec: dict) -> tuple[str, str, str]:
    dest = RAW / folder / rec["name"]
    loc = local_match(rec["name"])
    if loc:
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists() or dest.stat().st_size < 2000:
            shutil.copy2(loc, dest)
        return folder, rec["name"], "local"
    if fetch(rec["id"], dest):
        return folder, rec["name"], "drive"
    return folder, rec["name"], "fail"


def main():
    data = json.loads(IDS.read_text())
    jobs = [(folder, rec) for folder, files in data.items() for rec in files]
    ok = fail = copied = 0
    with ThreadPoolExecutor(max_workers=10) as ex:
        futs = [ex.submit(one, folder, rec) for folder, rec in jobs]
        for i, fut in enumerate(as_completed(futs), 1):
            folder, name, status = fut.result()
            if status == "fail":
                fail += 1
                print("miss", folder, name)
            elif status == "local":
                copied += 1
                ok += 1
            else:
                ok += 1
            if i % 20 == 0 or i == len(jobs):
                print(f"  {i}/{len(jobs)} ok={ok} local={copied} fail={fail}")
    print("downloaded", ok, "failed", fail, "from_local", copied)


if __name__ == "__main__":
    main()
