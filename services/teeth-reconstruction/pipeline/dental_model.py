"""Build PersonalizedDentalModel JSON from multi-view segmentation results."""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np


def _polygon_centroid(polygon: list[dict[str, float]]) -> tuple[float, float]:
    xs = [p["x"] for p in polygon]
    ys = [p["y"] for p in polygon]
    return float(np.mean(xs)), float(np.mean(ys))


def _extract_parameters(polygon: list[dict[str, float]], fdi: int, arch: str, confidence: float) -> dict[str, Any]:
    pts = np.array([[p["x"], p["y"]] for p in polygon], dtype=np.float32)
    rect = cv2.minAreaRect(pts)
    (cx, cy), (width, height), angle = rect
    if width < height:
        width, height = height, width
        angle += 90.0

    return {
        "fdi": fdi,
        "arch": arch,
        "width": round(float(width), 2),
        "height": round(float(height), 2),
        "rotationDegrees": round(float(angle), 2),
        "tiltDegrees": 0.0,
        "center": {"x": round(float(cx), 1), "y": round(float(cy), 1)},
        "polygon": polygon,
        "confidence": confidence,
    }


def merge_view_results(view_results: list[dict[str, Any]]) -> dict[str, Any]:
    """Prefer occlusal views for each arch, then buccal, then frontal."""
    priority = {"maxillary": 4, "mandibular": 4, "left": 3, "right": 3, "anterior": 2}

    by_fdi: dict[int, dict[str, Any]] = {}
    for view in view_results:
        role = view.get("role", "")
        role_priority = priority.get(role, 1)
        for tooth in view.get("teeth", []):
            fdi = int(tooth.get("fdi") or tooth.get("id", 0))
            if fdi <= 0:
                continue
            existing = by_fdi.get(fdi)
            if existing is None or role_priority >= existing.get("_priority", 0):
                by_fdi[fdi] = {**tooth, "_priority": role_priority, "_sourceRole": role}

    teeth: dict[str, Any] = {}
    for fdi, tooth in sorted(by_fdi.items()):
        polygon = tooth.get("polygon") or []
        if len(polygon) < 3:
            continue
        arch = tooth.get("arch", "upper" if fdi // 10 in (1, 2) else "lower")
        params = _extract_parameters(polygon, fdi, arch, float(tooth.get("confidence", 0.8)))
        teeth[str(fdi)] = params

    return {
        "version": 1,
        "sourceViews": [view.get("role") for view in view_results if view.get("role")],
        "teeth": teeth,
    }
