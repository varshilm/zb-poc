"""Locate upper/lower arch bands and the inter-occlusal gap in intra-oral photos."""

from __future__ import annotations

import cv2
import numpy as np


def find_occlusal_gap(gray: np.ndarray) -> dict[str, int]:
    """Return approximate gap between upper and lower anterior teeth."""
    h, w = gray.shape
    x0 = int(w * 0.22)
    x1 = int(w * 0.78)
    profile = gray[:, x0:x1].mean(axis=1).astype(np.float32)
    smooth = cv2.GaussianBlur(profile.reshape(-1, 1), (1, 0), 7).reshape(-1)

    search_start = int(h * 0.28)
    search_end = int(h * 0.72)
    if search_end <= search_start + 8:
        split = h // 2
        return {"gap_top": split - 6, "gap_bottom": split + 6, "gap_center": split}

    segment = smooth[search_start:search_end].astype(np.float32)
    window = max(5, int(h * 0.018))
    kernel = np.ones(window, dtype=np.float32) / float(window)
    rolling = np.convolve(segment, kernel, mode="valid")
    gap_offset = int(np.argmin(rolling))
    gap_center = search_start + gap_offset + window // 2
    gap_half = max(6, int(h * 0.022))

    return {
        "gap_top": max(0, gap_center - gap_half),
        "gap_bottom": min(h - 1, gap_center + gap_half),
        "gap_center": gap_center,
    }


def arch_vertical_window(gray: np.ndarray, arch: str, gap: dict[str, int]) -> tuple[int, int]:
    h = gray.shape[0]
    gap_top = int(gap["gap_top"])
    gap_bottom = int(gap["gap_bottom"])

    if arch == "upper":
        y0 = int(h * 0.03)
        y1 = max(y0 + 12, gap_top - 4)
    else:
        y0 = min(h - 12, gap_bottom + 3)
        y1 = min(h - int(h * 0.03), gap_bottom + int(h * 0.095))

    if y1 <= y0 + 8:
        if arch == "upper":
            y0, y1 = int(h * 0.05), max(int(h * 0.05) + 12, gap_top)
        else:
            y0, y1 = min(h - int(h * 0.05) - 12, gap_bottom), h - int(h * 0.05)

    return y0, y1
