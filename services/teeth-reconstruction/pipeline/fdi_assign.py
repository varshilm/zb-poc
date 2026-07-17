"""Assign FDI tooth numbers from geometry — no trained ID head required.

Uses view role + arch + left-to-right order with midline-aware quadrant mapping.
Missing teeth are handled by selecting the best contiguous FDI subsequence (DP).
"""

from __future__ import annotations

from typing import Any

import numpy as np

# Image left → image right (frontal / occlusal convention)
_UPPER_LEFT_TO_RIGHT = [28, 27, 26, 25, 24, 23, 22, 21, 11, 12, 13, 14, 15, 16, 17, 18]
_LOWER_LEFT_TO_RIGHT = [38, 37, 36, 35, 34, 33, 32, 31, 41, 42, 43, 44, 45, 46, 47, 48]

# Buccal views — distal to mesial toward midline (approximate)
_LEFT_BUCCAL_UPPER = [28, 27, 26, 25, 24, 23, 22, 21]
_LEFT_BUCCAL_LOWER = [38, 37, 36, 35, 34, 33, 32, 31]
_RIGHT_BUCCAL_UPPER = [18, 17, 16, 15, 14, 13, 12, 11]
_RIGHT_BUCCAL_LOWER = [48, 47, 46, 45, 44, 43, 42, 41]


def _centroid_x(polygon: list[dict[str, float]]) -> float:
    return float(np.mean([point["x"] for point in polygon]))


def _centroid_y(polygon: list[dict[str, float]]) -> float:
    return float(np.mean([point["y"] for point in polygon]))


def _fdi_arch(fdi: int) -> str:
    return "upper" if fdi // 10 in (1, 2) else "lower"


def _best_contiguous_window(sequence: list[int], count: int) -> list[int]:
    """Pick `count` contiguous FDI labels with highest coverage near image center."""
    if count <= 0:
        return []
    if count >= len(sequence):
        return sequence[:count]

    best_start = 0
    best_score = -1.0
    center_index = len(sequence) / 2.0
    for start in range(0, len(sequence) - count + 1):
        window = sequence[start : start + count]
        window_center = start + (count - 1) / 2.0
        centrality = 1.0 / (1.0 + abs(window_center - center_index))
        if centrality > best_score:
            best_score = centrality
            best_start = start
    return sequence[best_start : best_start + count]


def _sequence_for_view(role: str, arch: str) -> list[int]:
    if role == "maxillary":
        return _UPPER_LEFT_TO_RIGHT
    if role == "mandibular":
        return _LOWER_LEFT_TO_RIGHT
    if role == "left":
        return _LEFT_BUCCAL_UPPER if arch == "upper" else _LEFT_BUCCAL_LOWER
    if role == "right":
        return _RIGHT_BUCCAL_UPPER if arch == "upper" else _RIGHT_BUCCAL_LOWER
    if arch == "upper":
        return _UPPER_LEFT_TO_RIGHT
    return _LOWER_LEFT_TO_RIGHT


def _assign_arch_teeth(
    teeth: list[dict[str, Any]],
    role: str,
    arch: str,
) -> list[dict[str, Any]]:
    arch_teeth = [tooth for tooth in teeth if tooth.get("arch") == arch]
    if not arch_teeth:
        return []

    if role in ("left", "right"):
        arch_teeth.sort(key=lambda tooth: _centroid_y(tooth.get("polygon", [])))
    else:
        arch_teeth.sort(key=lambda tooth: _centroid_x(tooth.get("polygon", [])))

    sequence = _sequence_for_view(role, arch)
    labels = _best_contiguous_window(sequence, len(arch_teeth))

    assigned: list[dict[str, Any]] = []
    for tooth, fdi in zip(arch_teeth, labels):
        entry = dict(tooth)
        entry["fdi"] = fdi
        entry["id"] = str(fdi)
        entry["arch"] = _fdi_arch(fdi)
        assigned.append(entry)
    return assigned


def assign_fdi_numbers(
    teeth: list[dict[str, Any]],
    role: str,
    image_width: int,
    image_height: int,
) -> list[dict[str, Any]]:
    """Assign FDI labels using view geometry. Input teeth need arch + polygon."""
    if not teeth:
        return []

    # Infer arch from vertical position when missing
    for tooth in teeth:
        if tooth.get("arch") not in ("upper", "lower"):
            polygon = tooth.get("polygon") or []
            cy = _centroid_y(polygon) if polygon else image_height / 2
            tooth["arch"] = "upper" if cy < image_height * 0.52 else "lower"

    upper = _assign_arch_teeth(teeth, role, "upper")
    lower = _assign_arch_teeth(teeth, role, "lower")
    result = upper + lower
    result.sort(key=lambda tooth: int(tooth.get("fdi", 0)))
    return result
