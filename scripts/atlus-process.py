#!/usr/bin/env python3
"""Punch checker JPEG sheets, slice sprites, classify camera perspective.

Writes public/vault/atlus/{folder}/{perspective}/*.png + manifest.json.
Originals in public/vault/_raw stay untouched.
Failed / leftover blobs go to public/vault/atlus/_quarantine/.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace/public/vault/atlus")
RAW = Path("/workspace/public/vault/_raw")
QDIR = ROOT / "_quarantine"

try:
    from scipy import ndimage  # type: ignore

    HAVE_SCIPY = True
except Exception:
    HAVE_SCIPY = False


def paper_mask(rgb: np.ndarray) -> np.ndarray:
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    sat = mx - mn
    mean = rgb.mean(axis=2)
    # light checker / paper + mid-gray cells
    paper = ((mean > 168) & (sat < 28)) | ((mean > 145) & (sat < 14) & (mx < 230))
    grayish = (sat < 18) & (mean > 118) & (mean < 175)
    # faint JPEG ringing on white (slightly warmer/cooler)
    ring = (mean > 188) & (sat < 36) & (mx > 200)
    return paper | grayish | ring


def _label(mask: np.ndarray) -> tuple[np.ndarray, int]:
    if HAVE_SCIPY:
        lab, n = ndimage.label(mask)
        return lab.astype(np.int32), int(n)
    h, w = mask.shape
    lab = np.zeros((h, w), dtype=np.int32)
    n = 0
    for y in range(h):
        for x in range(w):
            if not mask[y, x] or lab[y, x]:
                continue
            n += 1
            stack = [(x, y)]
            while stack:
                cx, cy = stack.pop()
                if cx < 0 or cy < 0 or cx >= w or cy >= h:
                    continue
                if lab[cy, cx] or not mask[cy, cx]:
                    continue
                lab[cy, cx] = n
                stack.extend(((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)))
    return lab, n


def punch_checker(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    arr = np.array(rgba)
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    paper = paper_mask(rgb)

    # edge-connected paper → alpha 0
    edge = np.zeros((h, w), dtype=bool)
    edge[0, :] = True
    edge[-1, :] = True
    edge[:, 0] = True
    edge[:, -1] = True
    seed = edge & paper
    if HAVE_SCIPY:
        struct = np.ones((3, 3), dtype=bool)
        flooded = ndimage.binary_propagation(seed, mask=paper, structure=struct)
    else:
        # 4-neigh BFS via python only on seed edges
        from collections import deque

        flooded = np.zeros((h, w), dtype=bool)
        q = deque(zip(*np.nonzero(seed)))
        while q:
            y, x = q.popleft()
            if flooded[y, x]:
                continue
            if not paper[y, x]:
                continue
            flooded[y, x] = True
            if x + 1 < w:
                q.append((y, x + 1))
            if x > 0:
                q.append((y, x - 1))
            if y + 1 < h:
                q.append((y + 1, x))
            if y > 0:
                q.append((y - 1, x))
    arr[flooded, 3] = 0

    # isolated interior checker islands
    island = (arr[:, :, 3] > 0) & paper
    lab, n = _label(island)
    if n:
        # bincount index 0 is background
        counts = np.bincount(lab.ravel())
        small = np.zeros(counts.shape[0], dtype=bool)
        small[1:] = counts[1:] < 4200
        arr[small[lab], 3] = 0

    # fringe despill: paper pixels next to transparent
    alpha = arr[:, :, 3]
    neigh0 = (
        (np.pad(alpha, ((1, 0), (0, 0)))[:-1] == 0)
        | (np.pad(alpha, ((0, 1), (0, 0)))[1:] == 0)
        | (np.pad(alpha, ((0, 0), (1, 0)))[:, :-1] == 0)
        | (np.pad(alpha, ((0, 0), (0, 1)))[:, 1:] == 0)
    )
    fringe = (alpha > 0) & paper & neigh0
    arr[fringe, 3] = 0
    return Image.fromarray(arr)


def components(arr: np.ndarray, min_area=180):
    h, w = arr.shape[:2]
    a = arr[:, :, 3] > 24
    lab, n = _label(a)
    out = []
    if n == 0:
        return out
    # bounding boxes via where
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if ys.size == 0:
            continue
        pix = int(ys.size)
        minx, maxx = int(xs.min()), int(xs.max())
        miny, maxy = int(ys.min()), int(ys.max())
        bw = maxx - minx + 1
        bh = maxy - miny + 1
        if pix < min_area or bw < 10 or bh < 10:
            continue
        if bw > w * 0.92 and bh > h * 0.92:
            continue
        # leftover checker-ish blobs: very high paper ratio
        pad = 2
        x0 = max(0, minx - pad)
        y0 = max(0, miny - pad)
        x1 = min(w, maxx + 1 + pad)
        y1 = min(h, maxy + 1 + pad)
        crop = arr[y0:y1, x0:x1].copy()
        out.append({"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0, "area": pix, "img": crop})
    return out


def classify_perspective(crop: np.ndarray, folder: str) -> str:
    if folder == "ui":
        return "ui"
    a = crop[:, :, 3] > 24
    h, w = a.shape
    if h < 4 or w < 4:
        return "threequarter"
    aspect = w / max(1, h)
    widths = a.sum(axis=1).astype(np.float32)
    top = float(widths[: max(1, h // 4)].mean())
    mid = float(widths[h // 3 : 2 * h // 3].mean()) if h > 6 else float(widths.mean())
    bot = float(widths[3 * h // 4 :].mean()) if h > 8 else float(widths[-1])
    area = float(a.sum())
    gy = np.abs(a.astype(np.int16)[1:, :] - a.astype(np.int16)[:-1, :])
    gx = np.abs(a.astype(np.int16)[:, 1:] - a.astype(np.int16)[:, :-1])
    diag = 0
    if gy.shape[1] > 1 and gx.shape[0] > 1:
        diag = int(((gy[:, 1:] > 0) & (gx[1:, :] > 0)).sum())
    diag_r = diag / max(1.0, area)
    peak = top < mid * 0.72 and mid > 4
    squat = aspect > 0.85 and aspect < 1.25 and abs(top - bot) < mid * 0.18
    # true top-down: squat footprint, no lid peak, few diagonals
    if squat and not peak and diag_r < 0.08 and aspect < 1.35 and area > 400:
        return "topdown"
    # side elevation: very wide, flat top
    if aspect >= 2.15 and not peak:
        return "side"
    # tall billboard / wall panel
    if aspect <= 0.55 and bot > top * 0.8:
        return "side"
    return "threequarter"


def kind_for(folder: str) -> str:
    return {"interiors": "prop", "props": "prop", "ui": "ui"}.get(folder, "prop")


def pretty_name(folder: str, stem: str, i: int, persp: str, w: int, h: int) -> str:
    nice = stem.replace("_", " ").strip()
    nice = re.sub(r"^[0-9a-f]{20,}$", "glyph", nice, flags=re.I)
    labels = {
        "interiors": "Interior",
        "props": "Street",
        "ui": "UI",
    }
    prefix = labels.get(folder, folder)
    # named UI frames keep their title
    if folder == "ui" and len(stem) > 8 and not re.fullmatch(r"[A-Za-z0-9]{4,6}", stem):
        title = re.sub(r"[_-]+", " ", stem)
        title = re.sub(r"\b(png|jpg|frame|icon)\b", "", title, flags=re.I)
        return title.strip().title() or f"UI {stem}"
    cam = {"threequarter": "3/4", "topdown": "top", "side": "side", "ui": "flat"}.get(persp, persp)
    return f"{prefix} {nice} · {cam} {i + 1}"


def is_named_ui_png(path: Path) -> bool:
    n = path.stem.lower()
    keys = ("cyberpunk", "hologram", "futuristic", "high_tech", "minimap", "energy", "health", "hotbar", "inventory")
    return path.suffix.lower() == ".png" and any(k in n for k in keys)


def already_alpha(arr: np.ndarray) -> bool:
    a = arr[:, :, 3]
    return bool((a < 250).mean() > 0.04 and (a < 8).mean() > 0.02)


def leftover_ratio(crop: np.ndarray) -> float:
    a = crop[:, :, 3] > 24
    if not a.any():
        return 1.0
    rgb = crop[:, :, :3].astype(np.int16)
    paper = paper_mask(rgb)
    return float((paper & a).sum()) / float(a.sum())


def is_ui_composition(comps: list, w: int, h: int) -> bool:
    """HUD mockups stay whole; regular icon grids still slice."""
    if not comps:
        return True
    areas = [c["area"] for c in comps]
    canvas = float(w * h)
    largest = max(areas)
    if largest > 0.28 * canvas:
        return True
    if len(comps) >= 16:
        med = float(np.median(np.array(areas, dtype=np.float32)))
        similar = sum(1 for a in areas if 0.45 * med < a < 2.4 * med) / len(areas)
        if similar < 0.55:
            return True
        if largest > 0.42 * sum(areas) and len(comps) > 24:
            return True
    return False


def process_sheet(path: Path, folder: str, items: list, quarantined: list):
    try:
        im = Image.open(path)
    except Exception as e:
        print("skip", path, e)
        return
    arr0 = np.array(im.convert("RGBA"))
    keep_whole = is_named_ui_png(path) or (folder == "ui" and path.suffix.lower() == ".png" and already_alpha(arr0))
    if keep_whole:
        persp = "ui"
        dest_dir = ROOT / folder / persp
        dest_dir.mkdir(parents=True, exist_ok=True)
        name = f"{path.stem}.png"
        Image.fromarray(arr0).save(dest_dir / name, "PNG")
        h, w = arr0.shape[:2]
        items.append(
            {
                "id": f"atlus-{folder}-{path.stem}",
                "name": pretty_name(folder, path.stem, 0, persp, w, h),
                "kind": kind_for(folder),
                "folder": folder,
                "perspective": persp,
                "w": int(w),
                "h": int(h),
                "sourceUrl": f"/vault/atlus/{folder}/{persp}/{name}",
                "sheet": path.stem,
            }
        )
        print(f"  {path.name}: 1 whole (alpha png)")
        return

    punched = punch_checker(im)
    arr = np.array(punched)
    h, w = arr.shape[:2]
    comps = components(arr)
    stem = path.stem

    if folder == "ui" and is_ui_composition(comps, w, h):
        dest_dir = ROOT / folder / "ui"
        dest_dir.mkdir(parents=True, exist_ok=True)
        name = f"{stem}.png"
        punched.save(dest_dir / name, "PNG")
        items.append(
            {
                "id": f"atlus-{folder}-{stem}",
                "name": pretty_name(folder, stem, 0, "ui", w, h),
                "kind": "ui",
                "folder": folder,
                "perspective": "ui",
                "w": int(w),
                "h": int(h),
                "sourceUrl": f"/vault/atlus/{folder}/ui/{name}",
                "sheet": stem,
            }
        )
        print(f"  {path.name}: 1 hud (composition)")
        return

    kept = 0
    for i, c in enumerate(comps):
        persp = classify_perspective(c["img"], folder)
        ratio = leftover_ratio(c["img"])
        dest_name = f"{stem}_{i:02d}.png"
        rec = {
            "id": f"atlus-{folder}-{stem}-{i:02d}",
            "name": pretty_name(folder, stem, i, persp, c["w"], c["h"]),
            "kind": kind_for(folder),
            "folder": folder,
            "perspective": persp,
            "w": int(c["w"]),
            "h": int(c["h"]),
            "sourceUrl": f"/vault/atlus/{folder}/{persp}/{dest_name}",
            "sheet": stem,
        }
        if ratio > 0.62 and c["area"] < 900:
            QDIR.mkdir(parents=True, exist_ok=True)
            Image.fromarray(c["img"]).save(QDIR / dest_name, "PNG")
            rec["sourceUrl"] = f"/vault/atlus/_quarantine/{dest_name}"
            rec["quarantine"] = True
            quarantined.append(rec)
            continue
        dest_dir = ROOT / folder / persp
        dest_dir.mkdir(parents=True, exist_ok=True)
        Image.fromarray(c["img"]).save(dest_dir / dest_name, "PNG")
        items.append(rec)
        kept += 1
    print(f"  {path.name}: {kept} sprites ({len(comps) - kept} quarantined)")


def main():
    folders = sys.argv[1:] or ["interiors", "props", "ui"]
    items: list = []
    quarantined: list = []
    for folder in folders:
        src = RAW / folder
        if not src.exists():
            print("missing", src)
            continue
        files = sorted([*src.glob("*.jpg"), *src.glob("*.jpeg"), *src.glob("*.png")])
        print(folder, len(files), "sheets")
        for f in files:
            process_sheet(f, folder, items, quarantined)
    ROOT.mkdir(parents=True, exist_ok=True)
    counts: dict[str, int] = {}
    for it in items:
        key = f"{it['folder']}/{it['perspective']}"
        counts[key] = counts.get(key, 0) + 1
    manifest = {
        "count": len(items),
        "quarantined": len(quarantined),
        "by": counts,
        "items": items,
        "quarantine": quarantined,
    }
    (ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print("DONE", len(items), "sprites", counts, "quarantined", len(quarantined))


if __name__ == "__main__":
    main()
