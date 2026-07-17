"""Watershed instance segmentation on enamel masks for intra-oral anterior photos.

Pipeline per arch:
  1. Gap-aware vertical window
  2. Enamel mask (Lab luminance + low chroma)
  3. Distance-transform peaks as markers (seeded by column layout)
  4. OpenCV watershed to split touching teeth
"""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np
from scipy.ndimage import maximum_filter

from .arch_localize import arch_vertical_window, find_occlusal_gap
from .mask_refine import relabel_and_filter_teeth
from .segment_overlay import build_segmentation_response, contour_to_polygon, load_bgr, load_gray
from .visible_arch2d import detect_visible_arch2d, merge_arch2d_for_sam


def _build_enamel_mask(
    gray: np.ndarray,
    bgr: np.ndarray,
    y0: int,
    y1: int,
    x_margin: float = 0.14,
) -> tuple[np.ndarray, int, int]:
    h, w = gray.shape
    x0 = int(w * x_margin)
    x1 = int(w * (1.0 - x_margin))
    y0 = max(0, min(h - 2, y0))
    y1 = max(y0 + 2, min(h, y1))

    roi_gray = gray[y0:y1, x0:x1]
    roi_bgr = bgr[y0:y1, x0:x1]

    lab = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2LAB)
    l_channel = lab[:, :, 0]
    clahe = cv2.createCLAHE(clipLimit=2.6, tileGridSize=(6, 6))
    enhanced = clahe.apply(l_channel)

    _, otsu = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    a_channel = lab[:, :, 1].astype(np.float32)
    b_channel = lab[:, :, 2].astype(np.float32)
    chroma = np.sqrt(np.square(a_channel - 128.0) + np.square(b_channel - 128.0))
    chroma_threshold = float(np.percentile(chroma, 58))
    low_chroma = (chroma <= chroma_threshold).astype(np.uint8) * 255

    binary = cv2.bitwise_and(otsu, low_chroma)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)

    return binary, x0, y0


def _peak_in_column(
    enamel: np.ndarray,
    distance: np.ndarray,
    left: int,
    right: int,
) -> tuple[int, int] | None:
    h, w = enamel.shape
    left = max(0, min(w - 1, left))
    right = max(left + 1, min(w, right))

    column_enamel = enamel[:, left:right]
    column_dist = distance[:, left:right]
    if column_enamel.size == 0 or column_enamel.max() == 0:
        return None

    masked_dist = np.where(column_enamel > 0, column_dist, 0.0)
    if masked_dist.max() <= 0:
        return None

    local_y, local_x = np.unravel_index(int(np.argmax(masked_dist)), masked_dist.shape)
    return left + int(local_x), int(local_y)


def _markers_from_arch_teeth(
    enamel: np.ndarray,
    distance: np.ndarray,
    arch_teeth: list[dict[str, Any]],
    offset_x: int,
    offset_y: int,
) -> list[tuple[int, int]]:
    seeds: list[tuple[int, int]] = []
    for tooth in arch_teeth:
        center = tooth.get("center", {})
        cx = float(center.get("x", 0)) - offset_x
        width = max(float(tooth.get("width", 20)), 10.0)
        left = int(cx - width * 0.45)
        right = int(cx + width * 0.45)

        peak = _peak_in_column(enamel, distance, left, right)
        if peak is None:
            local_cx = int(np.clip(round(cx), 0, enamel.shape[1] - 1))
            local_cy = int(np.clip(round(float(center.get("y", 0)) - offset_y), 0, enamel.shape[0] - 1))
            if enamel[local_cy, local_cx] > 0:
                peak = (local_cx, local_cy)
            else:
                continue
        seeds.append(peak)

    return seeds


def _markers_from_distance_peaks(
    enamel: np.ndarray,
    distance: np.ndarray,
    max_count: int = 8,
    min_sep: int = 14,
) -> list[tuple[int, int]]:
    if distance.max() <= 0:
        return []

    peak_mask = (distance == maximum_filter(distance, size=min_sep)) & (distance > 0.18 * distance.max())
    peak_mask &= enamel > 0
    coords = np.column_stack(np.where(peak_mask))
    if coords.size == 0:
        return []

    order = np.argsort(coords[:, 1])
    coords = coords[order]
    seeds: list[tuple[int, int]] = []
    for row, col in coords:
        point = (int(col), int(row))
        if all((point[0] - existing[0]) ** 2 + (point[1] - existing[1]) ** 2 >= min_sep**2 for existing in seeds):
            seeds.append(point)
        if len(seeds) >= max_count:
            break
    return seeds


def _voronoi_labels(enamel: np.ndarray, seeds: list[tuple[int, int]]) -> np.ndarray:
    labels = np.zeros(enamel.shape, dtype=np.int32)
    ys, xs = np.where(enamel > 0)
    if len(xs) == 0 or not seeds:
        return labels

    seed_array = np.array(seeds, dtype=np.float32)
    pixel_x = xs[:, None].astype(np.float32)
    pixel_y = ys[:, None].astype(np.float32)
    distance_sq = np.square(pixel_x - seed_array[None, :, 0]) + np.square(pixel_y - seed_array[None, :, 1])
    labels[ys, xs] = np.argmin(distance_sq, axis=1) + 2
    return labels


def _refine_labels_with_watershed(enamel: np.ndarray, labels: np.ndarray) -> np.ndarray:
    distance = cv2.distanceTransform(enamel, cv2.DIST_L2, 5)
    markers = np.ones(enamel.shape, dtype=np.int32)
    markers[enamel == 0] = 1

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    for label_id in range(2, int(labels.max()) + 1):
        cell = (labels == label_id).astype(np.uint8)
        core = cv2.erode(cell, kernel, iterations=2)
        if core.sum() > 0:
            markers[core > 0] = label_id
        else:
            markers[cell > 0] = label_id

    height = cv2.normalize(distance, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    watershed_image = cv2.cvtColor(255 - height, cv2.COLOR_GRAY2BGR)
    cv2.watershed(watershed_image, markers)
    return markers


def _split_enamel_instances(
    enamel: np.ndarray,
    distance: np.ndarray,
    seeds: list[tuple[int, int]],
) -> np.ndarray:
    if not seeds:
        return np.zeros(enamel.shape, dtype=np.int32)

    voronoi = _voronoi_labels(enamel, seeds)
    if voronoi.max() < 2:
        return voronoi

    return _refine_labels_with_watershed(enamel, voronoi)


def _labels_to_polygons(
    labels: np.ndarray,
    enamel: np.ndarray,
    offset_x: int,
    offset_y: int,
    min_area: float,
) -> list[list[dict[str, float]]]:
    polygons: list[list[dict[str, float]]] = []
    for label_id in range(2, int(labels.max()) + 1):
        mask = ((labels == label_id).astype(np.uint8) * 255)
        mask = cv2.bitwise_and(mask, enamel)
        if mask.sum() < min_area:
            continue

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue

        largest = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest) < min_area:
            continue

        polygon = contour_to_polygon(largest, offset_x, offset_y)
        if polygon:
            polygons.append(polygon)
    return polygons


def _passes_arch_gate(
    polygon: list[dict[str, float]],
    arch: str,
    gap: dict[str, int],
    image_height: int,
) -> bool:
    ys = [point["y"] for point in polygon]
    centroid_y = float(np.mean(ys))

    if arch == "upper":
        if centroid_y > gap["gap_top"] + 10:
            return False
        if centroid_y < image_height * 0.1:
            return False
    if arch == "lower":
        if centroid_y < gap["gap_bottom"] - 8:
            return False
        if centroid_y > gap["gap_bottom"] + image_height * 0.068:
            return False
    return True


def _segment_arch_watershed(
    gray: np.ndarray,
    bgr: np.ndarray,
    arch: str,
    gap: dict[str, int],
    arch_teeth: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    y0, y1 = arch_vertical_window(gray, arch, gap)
    enamel, offset_x, offset_y = _build_enamel_mask(gray, bgr, y0, y1)
    if enamel.sum() < 48:
        return []

    distance = cv2.distanceTransform(enamel, cv2.DIST_L2, 5)
    seeds = _markers_from_arch_teeth(enamel, distance, arch_teeth, offset_x, offset_y)
    if len(seeds) < 2:
        seeds = _markers_from_distance_peaks(enamel, distance, max_count=8 if arch == "upper" else 5)

    if not seeds:
        return []

    labels = _split_enamel_instances(enamel, distance, seeds)

    roi_area = enamel.shape[0] * enamel.shape[1]
    min_area = max(28.0, roi_area * 0.0018)
    polygons = _labels_to_polygons(labels, enamel, offset_x, offset_y, min_area)

    teeth: list[dict[str, Any]] = []
    for polygon in polygons:
        if not _passes_arch_gate(polygon, arch, gap, gray.shape[0]):
            continue
        teeth.append(
            {
                "id": "U1",
                "arch": arch,
                "polygon": polygon,
                "confidence": 0.8,
            }
        )
    return teeth


def segment_teeth_watershed(
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
    for arch_name in ("upper", "lower"):
        arch_teeth = effective_arch2d.get(arch_name, [])
        teeth.extend(_segment_arch_watershed(gray, bgr, arch_name, gap, arch_teeth))

    if not teeth:
        return None

    teeth = relabel_and_filter_teeth(gray, teeth, min_brightness=0.36)
    if not teeth:
        return None

    return build_segmentation_response(bgr, teeth, "watershed_enamel")
