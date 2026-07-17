"""Per-column enamel segmentation for intra-oral anterior photos.

More reliable than MobileSAM on retractor close-ups: each tooth column is
thresholded inside a gap-aware vertical window so lower masks stay on crowns,
not the gingiva below.
"""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np

from .arch_localize import arch_vertical_window, find_occlusal_gap
from .mask_refine import relabel_and_filter_teeth
from .segment_overlay import build_segmentation_response, contour_to_polygon, load_bgr, load_gray
from .visible_arch2d import detect_visible_arch2d, merge_arch2d_for_sam


def _segment_column(
    gray: np.ndarray,
    left: int,
    right: int,
    y0: int,
    y1: int,
    arch: str,
) -> list[dict[str, float]] | None:
    h, w = gray.shape
    left = max(0, min(w - 2, left))
    right = max(left + 2, min(w, right))
    y0 = max(0, min(h - 2, y0))
    y1 = max(y0 + 2, min(h, y1))

    column = gray[y0:y1, left:right]
    if column.size == 0:
        return None

    clahe = cv2.createCLAHE(clipLimit=2.4, tileGridSize=(4, 4))
    enhanced = clahe.apply(column)
    blurred = cv2.GaussianBlur(enhanced, (3, 3), 0)
    _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    min_area = max(24, (right - left) * (y1 - y0) * 0.08)
    valid = [contour for contour in contours if cv2.contourArea(contour) >= min_area]
    if not valid:
        return None

    largest = max(valid, key=cv2.contourArea)
    x, y, bw, bh = cv2.boundingRect(largest)
    if bw < 3 or bh < 4:
        return None

    if arch == "lower":
        # Keep crown enamel; drop gingiva that often sits below the incisal third.
        crown_bottom = y + int(bh * 0.72)
        mask = np.zeros_like(binary)
        cv2.drawContours(mask, [largest], -1, 255, thickness=cv2.FILLED)
        mask[crown_bottom:, :] = 0
        trimmed_contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if trimmed_contours:
            largest = max(trimmed_contours, key=cv2.contourArea)
    else:
        # Upper teeth: trim a little cervical gum at the bottom of the blob.
        crown_bottom = y + int(bh * 0.9)
        mask = np.zeros_like(binary)
        cv2.drawContours(mask, [largest], -1, 255, thickness=cv2.FILLED)
        mask[crown_bottom:, :] = 0
        trimmed_contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if trimmed_contours:
            largest = max(trimmed_contours, key=cv2.contourArea)

    return contour_to_polygon(largest, left, y0)


def _boxes_from_arch2d(arch2d: dict[str, Any]) -> list[dict[str, Any]]:
    boxes: list[dict[str, Any]] = []
    for arch_name in ("upper", "lower"):
        for tooth in arch2d.get(arch_name, []):
            center = tooth.get("center", {})
            cx = float(center.get("x", 0))
            cy = float(center.get("y", 0))
            width = max(float(tooth.get("width", 20)), 8)
            height = max(float(tooth.get("height", 24)), 8)
            boxes.append(
                {
                    "label": tooth.get("label") or tooth.get("toothId") or "U1",
                    "arch": arch_name,
                    "bbox": [
                        cx - width * 0.5,
                        cy - height * 0.5,
                        cx + width * 0.5,
                        cy + height * 0.5,
                    ],
                }
            )
    return boxes


def segment_teeth_columns(
    image_bytes: bytes,
    arch2d: dict[str, Any] | None = None,
    role: str = "anterior",
) -> dict[str, Any] | None:
    if role != "anterior":
        return None

    gray = load_gray(image_bytes)
    bgr = load_bgr(image_bytes)
    gap = find_occlusal_gap(gray)
    effective_arch2d = merge_arch2d_for_sam(image_bytes, arch2d, role=role) or arch2d
    if not effective_arch2d:
        effective_arch2d = detect_visible_arch2d(image_bytes)

    teeth: list[dict[str, Any]] = []
    for box in _boxes_from_arch2d(effective_arch2d):
        x1, y1, x2, y2 = (int(v) for v in box["bbox"])
        arch_name = box["arch"]
        arch_y0, arch_y1 = arch_vertical_window(gray, arch_name, gap)
        pad_x = max(2, int((x2 - x1) * 0.08))
        left = max(0, x1 - pad_x)
        right = min(gray.shape[1], x2 + pad_x)

        polygon = _segment_column(gray, left, right, arch_y0, arch_y1, arch_name)
        if not polygon:
            continue

        xs = [point["x"] for point in polygon]
        ys = [point["y"] for point in polygon]
        centroid_y = float(np.mean(ys))

        if arch_name == "upper" and centroid_y > gap["gap_top"] + 8:
            continue
        if arch_name == "lower":
            if centroid_y < gap["gap_bottom"] - 6:
                continue
            if centroid_y > gap["gap_bottom"] + gray.shape[0] * 0.09:
                continue

        teeth.append(
            {
                "id": box["label"],
                "arch": arch_name,
                "polygon": polygon,
                "confidence": 0.78,
            }
        )

    if not teeth:
        return None

    teeth = relabel_and_filter_teeth(gray, teeth, min_brightness=0.38)
    if not teeth:
        return None

    return build_segmentation_response(bgr, teeth, "column_brightness")
