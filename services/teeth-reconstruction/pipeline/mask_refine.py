"""Post-process SAM masks: gum trim, brightness filter, left-to-right relabeling."""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np


def _polygon_centroid(polygon: list[dict[str, float]]) -> tuple[float, float]:
    xs = [p["x"] for p in polygon]
    ys = [p["y"] for p in polygon]
    return float(np.mean(xs)), float(np.mean(ys))


def _trim_polygon_vertical(
    gray: np.ndarray,
    polygon: list[dict[str, float]],
    arch: str,
) -> list[dict[str, float]]:
    if len(polygon) < 3:
        return polygon
    xs = [p["x"] for p in polygon]
    ys = [p["y"] for p in polygon]
    left, right = int(min(xs)), int(max(xs))
    top, bottom = int(min(ys)), int(max(ys))
    h, w = gray.shape
    left = max(0, min(w - 1, left))
    right = max(left + 1, min(w, right))
    top = max(0, min(h - 1, top))
    bottom = max(top + 1, min(h, bottom))

    column = gray[top:bottom, left:right]
    if column.size == 0:
        return polygon

    row_mean = np.mean(column, axis=1)
    threshold = float(np.percentile(row_mean, 58))
    bright = np.where(row_mean >= threshold)[0]
    if bright.size < 3:
        return polygon

    new_top = top + int(bright.min())
    new_bottom = top + int(bright.max())
    trim = max(1, int((new_bottom - new_top) * 0.05))
    if arch == "upper":
        new_bottom = max(new_top + 3, new_bottom - trim)
    else:
        new_bottom = max(new_top + 3, new_bottom - trim * 2)

    clipped: list[dict[str, float]] = []
    for point in polygon:
        y = float(np.clip(point["y"], new_top, new_bottom))
        clipped.append({"x": point["x"], "y": y})
    return clipped


def _mask_brightness_score(gray: np.ndarray, polygon: list[dict[str, float]]) -> float:
    mask = np.zeros(gray.shape, dtype=np.uint8)
    pts = np.array([[int(p["x"]), int(p["y"])] for p in polygon], dtype=np.int32)
    if len(pts) < 3:
        return 0.0
    cv2.fillPoly(mask, [pts], 1)
    values = gray[mask > 0]
    if values.size == 0:
        return 0.0
    return float(np.mean(values) / 255.0)


def relabel_and_filter_teeth(
    gray: np.ndarray,
    teeth: list[dict[str, Any]],
    min_brightness: float = 0.42,
) -> list[dict[str, Any]]:
    by_arch: dict[str, list[dict[str, Any]]] = {"upper": [], "lower": []}
    for tooth in teeth:
        polygon = tooth.get("polygon") or []
        if len(polygon) < 3:
            continue
        arch = tooth.get("arch", "upper")
        trimmed = _trim_polygon_vertical(gray, polygon, arch)
        score = _mask_brightness_score(gray, trimmed)
        if score < min_brightness:
            continue
        entry = dict(tooth)
        entry["polygon"] = trimmed
        entry["confidence"] = round(min(0.95, max(0.45, score)), 2)
        by_arch[arch if arch in by_arch else "upper"].append(entry)

    refined: list[dict[str, Any]] = []
    for arch_name in ("upper", "lower"):
        arch_teeth = sorted(
            by_arch[arch_name],
            key=lambda t: _polygon_centroid(t.get("polygon", []))[0],
        )
        prefix = "U" if arch_name == "upper" else "L"
        for index, tooth in enumerate(arch_teeth):
            tooth["id"] = f"{prefix}{index + 1}"
            tooth["arch"] = arch_name
            refined.append(tooth)
    return refined
