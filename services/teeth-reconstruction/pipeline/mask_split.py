"""Split merged SAM masks using distance-transform watershed."""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np
from scipy.ndimage import maximum_filter

from .segment_overlay import contour_to_polygon


def _local_maxima_seeds(binary: np.ndarray, min_sep: int = 10) -> list[tuple[int, int]]:
    distance = cv2.distanceTransform(binary, cv2.DIST_L2, 5)
    if distance.max() <= 0:
        return []

    peak_mask = (distance == maximum_filter(distance, size=min_sep)) & (distance > 0.22 * distance.max())
    peak_mask &= binary > 0
    coords = np.column_stack(np.where(peak_mask))
    if coords.size == 0:
        return []

    scored = [(int(col), int(row), float(distance[row, col])) for row, col in coords]
    scored.sort(key=lambda item: item[2], reverse=True)

    seeds: list[tuple[int, int]] = []
    for x, y, _ in scored:
        if all((x - existing[0]) ** 2 + (y - existing[1]) ** 2 >= min_sep**2 for existing in seeds):
            seeds.append((x, y))
    return seeds


def split_mask_watershed(
    mask: np.ndarray,
    bbox: list[float],
    max_instances: int = 3,
) -> list[np.ndarray]:
    """Split a merged binary mask into separate instance masks."""
    binary = (mask > 0).astype(np.uint8)
    if binary.sum() < 24:
        return [binary]

    x1, y1, x2, y2 = (int(v) for v in bbox)
    pad_x = max(4, int((x2 - x1) * 0.15))
    pad_y = max(4, int((y2 - y1) * 0.15))
    rx1 = max(0, x1 - pad_x)
    ry1 = max(0, y1 - pad_y)
    rx2 = min(binary.shape[1], x2 + pad_x)
    ry2 = min(binary.shape[0], y2 + pad_y)
    crop = binary[ry1:ry2, rx1:rx2]
    if crop.sum() < 24:
        return [binary]

    seeds = _local_maxima_seeds(crop, min_sep=max(8, int(min(crop.shape) * 0.18)))
    if len(seeds) < 2:
        return [binary]

    seeds = seeds[:max_instances]
    markers = np.zeros(crop.shape, dtype=np.int32)
    for index, (x, y) in enumerate(seeds, start=2):
        markers[y, x] = index

    distance = cv2.distanceTransform(crop, cv2.DIST_L2, 5)
    height = cv2.normalize(distance, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    ws_input = cv2.cvtColor(255 - height, cv2.COLOR_GRAY2BGR)
    markers_work = markers.copy()
    markers_work[crop == 0] = 1
    cv2.watershed(ws_input, markers_work)

    instances: list[np.ndarray] = []
    for label_id in range(2, int(markers_work.max()) + 1):
        part = np.zeros_like(binary)
        part_crop = (markers_work == label_id).astype(np.uint8)
        part_crop &= crop
        if part_crop.sum() < 20:
            continue
        part[ry1:ry2, rx1:rx2] = part_crop
        instances.append(part)

    return instances if instances else [binary]


def split_merged_tooth_polygons(
    mask: np.ndarray,
    bbox: list[float],
    offset_x: int = 0,
    offset_y: int = 0,
    min_area: float = 24.0,
) -> list[list[dict[str, float]]]:
    polygons: list[list[dict[str, float]]] = []
    for instance in split_mask_watershed(mask, bbox):
        contours, _ = cv2.findContours(instance.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue
        largest = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest) < min_area:
            continue
        polygon = contour_to_polygon(largest, offset_x, offset_y)
        if polygon:
            polygons.append(polygon)
    return polygons


def mask_area_ratio(mask: np.ndarray, bbox: list[float]) -> float:
    binary = mask > 0
    mask_area = float(binary.sum())
    x1, y1, x2, y2 = bbox
    box_area = max(1.0, (x2 - x1) * (y2 - y1))
    return mask_area / box_area
