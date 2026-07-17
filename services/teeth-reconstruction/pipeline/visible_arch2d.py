"""Detect visible anterior teeth columns from intra-oral / smile photos.

Produces arch2D seed boxes aligned to actual bright tooth columns instead of
a fixed 14-tooth lip-landmark template (which mis-prompts SAM on close-up shots).
"""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np

from .arch_localize import arch_vertical_window, find_occlusal_gap
from .arch_template import _tooth_entry


def _load_gray(image_bytes: bytes) -> tuple[np.ndarray, np.ndarray]:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("Unable to decode image bytes")
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
    return bgr, clahe.apply(gray)


def _brightness_projection(gray: np.ndarray, y0: int, y1: int) -> np.ndarray:
    h, w = gray.shape
    y0 = max(0, min(h - 1, y0))
    y1 = max(y0 + 1, min(h, y1))
    roi = gray[y0:y1, :].astype(np.float32)
    projection = np.mean(roi, axis=0)
    if projection.max() > 0:
        projection = projection / projection.max()
    return projection


def _vertical_edge_projection(gray: np.ndarray, y0: int, y1: int) -> np.ndarray:
    h, w = gray.shape
    y0 = max(0, min(h - 1, y0))
    y1 = max(y0 + 1, min(h, y1))
    roi = gray[y0:y1, :]
    sobel_x = cv2.Sobel(roi, cv2.CV_32F, 1, 0, ksize=3)
    projection = np.mean(np.abs(sobel_x), axis=0)
    if projection.max() > 0:
        projection = projection / projection.max()
    return projection


def _column_activation_projection(gray: np.ndarray, y0: int, y1: int) -> np.ndarray:
    """Blend enamel brightness with inter-tooth vertical edges."""
    bright = _brightness_projection(gray, y0, y1)
    edges = _vertical_edge_projection(gray, y0, y1)
    return np.clip(bright * 0.72 + edges * 0.28, 0.0, 1.0)


def _split_upper_lower(gray: np.ndarray) -> int:
    h, _ = gray.shape
    margin = int(h * 0.08)
    projection = np.mean(gray[margin : h - margin, :], axis=1)
    if projection.size < 8:
        return h // 2
    smooth = cv2.GaussianBlur(projection.astype(np.float32), (0, 0), 4)
    start = int(h * 0.28)
    end = int(h * 0.72)
    valley = start + int(np.argmin(smooth[start:end]))
    return max(int(h * 0.3), min(int(h * 0.7), valley))


def _split_wide_band(
    projection: np.ndarray,
    left: int,
    right: int,
    max_width: int,
) -> list[tuple[int, int]]:
    width = right - left
    if width <= max_width:
        return [(left, right)]

    segment = projection[left:right]
    if segment.size < 4:
        return [(left, right)]

    # Split at the deepest valley between local peaks
    smooth = cv2.GaussianBlur(segment.astype(np.float32), (0, 0), 2)
    target_parts = max(2, int(np.ceil(width / max_width)))
    valleys = [0]
    search_start = 0
    part_width = width // target_parts
    for part in range(1, target_parts):
        window_start = max(1, search_start + int(part_width * 0.55))
        window_end = min(len(smooth) - 1, search_start + int(part_width * 1.45))
        if window_end <= window_start:
            break
        valley = window_start + int(np.argmin(smooth[window_start:window_end]))
        valleys.append(valley)
        search_start = valley
    valleys.append(width)

    bands: list[tuple[int, int]] = []
    for index in range(len(valleys) - 1):
        band_left = left + valleys[index]
        band_right = left + valleys[index + 1]
        if band_right - band_left >= max(6, max_width // 3):
            bands.append((band_left, band_right))
    return bands or [(left, right)]


def _find_column_bands(projection: np.ndarray, target_count: int) -> list[tuple[int, int]]:
    w = len(projection)
    if w < 20:
        return []

    smooth = cv2.GaussianBlur(projection.astype(np.float32), (0, 0), 3)
    threshold = max(0.12, float(np.percentile(smooth, 52)))
    active = smooth >= threshold

    min_band_width = max(8, int(w * 0.028))
    max_band_width = max(min_band_width + 4, int(w * 0.13))
    mouth_left = int(w * 0.18)
    mouth_right = int(w * 0.82)

    bands: list[tuple[int, int]] = []
    start = None
    for x in range(w):
        if active[x] and start is None:
            start = x
        elif not active[x] and start is not None:
            if x - start >= min_band_width:
                bands.append((start, x))
            start = None
    if start is not None and w - start >= min_band_width:
        bands.append((start, w))

    expanded: list[tuple[int, int]] = []
    for left, right in bands:
        expanded.extend(_split_wide_band(smooth, left, right, max_band_width))

    bands = [
        (left, right)
        for left, right in expanded
        if mouth_left <= (left + right) / 2 <= mouth_right and right - left >= min_band_width
    ]

    if len(bands) <= target_count:
        return bands

    # Merge weakest bands until we reach target_count
    while len(bands) > target_count:
        scores = []
        for left, right in bands:
            scores.append(float(np.mean(smooth[left:right])))
        weakest = int(np.argmin(scores))
        if weakest == 0:
            bands[0] = (bands[0][0], bands[1][1])
            bands.pop(1)
        elif weakest == len(bands) - 1:
            bands[-2] = (bands[-2][0], bands[-1][1])
            bands.pop()
        else:
            left_score = scores[weakest - 1]
            right_score = scores[weakest + 1]
            if left_score <= right_score:
                bands[weakest - 1] = (bands[weakest - 1][0], bands[weakest][1])
                bands.pop(weakest)
            else:
                bands[weakest] = (bands[weakest][0], bands[weakest + 1][1])
                bands.pop(weakest + 1)

    return bands


def _select_central_bands(
    bands: list[tuple[int, int]],
    image_width: int,
    projection: np.ndarray,
    target_count: int,
) -> list[tuple[int, int]]:
    if len(bands) <= target_count:
        return bands

    center_x = image_width / 2.0
    scored: list[tuple[float, tuple[int, int]]] = []
    for left, right in bands:
        mid = (left + right) / 2.0
        width = right - left
        peak = float(np.max(projection[left:right])) if right > left else 0.0
        centrality = 1.0 / (1.0 + abs(mid - center_x) / max(image_width * 0.22, 1.0))
        width_penalty = 1.0 if width <= image_width * 0.14 else 0.65
        scored.append((peak * centrality * width_penalty, (left, right)))

    scored.sort(key=lambda item: item[0], reverse=True)
    selected: list[tuple[int, int]] = []
    min_gap = max(10, int(image_width * 0.04))
    for _, band in scored:
        if len(selected) >= target_count:
            break
        mid = (band[0] + band[1]) / 2.0
        if any(abs(mid - (other[0] + other[1]) / 2.0) < min_gap for other in selected):
            continue
        selected.append(band)

    return sorted(selected, key=lambda band: band[0])


def _refine_vertical_bounds(
    gray: np.ndarray,
    left: int,
    right: int,
    y0: int,
    y1: int,
    arch: str,
    gap: dict[str, int] | None = None,
) -> tuple[int, int]:
    h, w = gray.shape
    left = max(0, min(w - 1, left))
    right = max(left + 1, min(w, right))

    if gap is not None:
        arch_y0, arch_y1 = arch_vertical_window(gray, arch, gap)
        y0 = max(y0, arch_y0)
        y1 = min(y1, arch_y1)

    y0 = max(0, min(h - 1, y0))
    y1 = max(y0 + 1, min(h, y1))

    column = gray[y0:y1, left:right]
    if column.size == 0:
        return y0, y1

    clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(4, 4))
    enhanced = clahe.apply(column)
    _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=1)

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        row_brightness = np.mean(column, axis=1)
        threshold = float(np.percentile(row_brightness, 68))
        bright_rows = np.where(row_brightness >= threshold)[0]
        if bright_rows.size < 3:
            return y0, y1
        top = y0 + int(bright_rows.min())
        bottom = y0 + int(bright_rows.max())
    else:
        largest = max(contours, key=cv2.contourArea)
        _, local_y, _, local_h = cv2.boundingRect(largest)
        top = y0 + local_y
        bottom = y0 + local_y + local_h

    if arch == "upper":
        bottom = max(top + 6, bottom - max(2, int((bottom - top) * 0.08)))
    else:
        if gap is not None:
            max_bottom = int(gap["gap_bottom"] + h * 0.10)
            bottom = min(bottom, max_bottom)
        bottom = max(top + 6, top + int((bottom - top) * 0.75))

    return top, bottom


def _detect_jaw_teeth(
    gray: np.ndarray,
    arch: str,
    y0: int,
    y1: int,
    target_count: int,
    gap: dict[str, int] | None = None,
) -> list[dict[str, Any]]:
    projection = _column_activation_projection(gray, y0, y1)
    bands = _find_column_bands(projection, target_count)
    bands = _select_central_bands(bands, gray.shape[1], projection, target_count)
    if not bands:
        return []

    teeth: list[dict[str, Any]] = []
    for index, (left, right) in enumerate(bands):
        top, bottom = _refine_vertical_bounds(gray, left, right, y0, y1, arch, gap)
        width = float(right - left)
        height = float(max(bottom - top, 6))
        cx = (left + right) / 2.0
        cy = (top + bottom) / 2.0
        prefix = "U" if arch == "upper" else "L"
        teeth.append(
            _tooth_entry(
                f"{prefix}{index + 1}",
                arch,
                index,
                cx,
                cy,
                max(width * 0.92, 8.0),
                max(height * 0.95, 10.0),
            )
        )
    return teeth


def detect_visible_arch2d(
    image_bytes: bytes,
    teeth_per_arch: int = 6,
) -> dict[str, list[dict[str, Any]]]:
    """Return arch2D with boxes on visible tooth columns (typically 4–8 per jaw)."""
    _, gray = _load_gray(image_bytes)
    h, w = gray.shape
    gap = find_occlusal_gap(gray)
    split_y = gap["gap_center"]

    upper_margin = int(h * 0.04)
    lower_margin = int(h * 0.04)
    upper = _detect_jaw_teeth(
        gray,
        "upper",
        upper_margin,
        max(gap["gap_top"] - 4, upper_margin + 8),
        teeth_per_arch,
        gap,
    )
    lower_search_top = min(gap["gap_bottom"] + 4, h - lower_margin - 8)
    lower_search_bottom = min(h - lower_margin, gap["gap_bottom"] + int(h * 0.10))
    lower = _detect_jaw_teeth(
        gray,
        "lower",
        lower_search_top,
        max(lower_search_top + 12, lower_search_bottom),
        min(teeth_per_arch, 4),
        gap,
    )
    return {"upper": upper, "lower": lower}


def should_use_image_arch2d(arch2d: dict[str, Any] | None) -> bool:
    if not arch2d:
        return True
    upper = arch2d.get("upper") or []
    lower = arch2d.get("lower") or []
    return len(upper) > 8 or len(lower) > 8


def merge_arch2d_for_sam(
    image_bytes: bytes,
    arch2d: dict[str, Any] | None,
    role: str = "anterior",
) -> dict[str, Any]:
    if role != "anterior":
        return arch2d or {}
    detected = detect_visible_arch2d(image_bytes)
    if len(detected.get("upper", [])) + len(detected.get("lower", [])) >= 3:
        return detected
    if arch2d and not should_use_image_arch2d(arch2d):
        return arch2d
    return arch2d or detected
