"""Tooth candidate detection — YOLO when weights are available, CV fallback otherwise.

Output: bounding boxes + center points for SAM prompting (not FDI labels).
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

import cv2
import numpy as np
from scipy.ndimage import maximum_filter

from .arch_template import generate_synthetic_arch2d
from .arch_localize import arch_vertical_window, find_occlusal_gap
from .segment_overlay import load_bgr
from .visible_arch2d import detect_visible_arch2d, merge_arch2d_for_sam

_YOLO_MODEL = None
_YOLO_LOAD_FAILED = False


@dataclass
class ToothDetection:
    bbox: list[float]
    center: dict[str, float]
    arch: str
    confidence: float
    source: str


def _arch2d_to_detections(arch2d: dict[str, Any], source: str) -> list[ToothDetection]:
    detections: list[ToothDetection] = []
    for arch_name in ("upper", "lower"):
        for tooth in arch2d.get(arch_name, []):
            center = tooth.get("center", {})
            cx = float(center.get("x", 0))
            cy = float(center.get("y", 0))
            width = max(float(tooth.get("width", 20)), 8.0)
            height = max(float(tooth.get("height", 24)), 8.0)
            x1 = max(0.0, cx - width / 2)
            y1 = max(0.0, cy - height / 2)
            x2 = cx + width / 2
            y2 = cy + height / 2
            detections.append(
                ToothDetection(
                    bbox=[x1, y1, x2, y2],
                    center={"x": cx, "y": cy},
                    arch=arch_name,
                    confidence=0.75,
                    source=source,
                )
            )
    return detections


def _enamel_mask(bgr: np.ndarray, y0: int, y1: int) -> np.ndarray:
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    y0 = max(0, min(h - 2, y0))
    y1 = max(y0 + 2, min(h, y1))
    roi = bgr[y0:y1, :]
    lab = cv2.cvtColor(roi, cv2.COLOR_BGR2LAB)
    l_channel = lab[:, :, 0]
    clahe = cv2.createCLAHE(clipLimit=2.4, tileGridSize=(6, 6))
    enhanced = clahe.apply(l_channel)
    _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    full = np.zeros((h, w), dtype=np.uint8)
    full[y0:y1, :] = binary
    return full


def _distance_peak_detections(
    bgr: np.ndarray,
    arch: str,
    max_count: int = 14,
    min_sep: int = 16,
) -> list[ToothDetection]:
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    gap = find_occlusal_gap(gray)
    y0, y1 = arch_vertical_window(gray, arch, gap)
    enamel = _enamel_mask(bgr, y0, y1)
    if enamel.sum() < 64:
        return []

    distance = cv2.distanceTransform(enamel, cv2.DIST_L2, 5)
    peak_mask = (distance == maximum_filter(distance, size=min_sep)) & (distance > 0.2 * distance.max())
    peak_mask &= enamel > 0
    coords = np.column_stack(np.where(peak_mask))
    if coords.size == 0:
        return []

    order = np.argsort(-coords[:, 0] * 10000 + coords[:, 1])  # sort by y then x
    coords = coords[order]
    seeds: list[tuple[int, int, float]] = []
    for row, col in coords:
        point = (int(col), int(row))
        if all((point[0] - existing[0]) ** 2 + (point[1] - existing[1]) ** 2 >= min_sep**2 for existing, _, _ in seeds):
            seeds.append((point[0], point[1], float(distance[row, col])))
        if len(seeds) >= max_count:
            break

    detections: list[ToothDetection] = []
    for x, y, score in sorted(seeds, key=lambda item: item[0]):
        box_w = max(18.0, min(48.0, bgr.shape[1] * 0.06))
        box_h = max(20.0, min(56.0, bgr.shape[0] * 0.08))
        detections.append(
            ToothDetection(
                bbox=[x - box_w / 2, y - box_h / 2, x + box_w / 2, y + box_h / 2],
                center={"x": float(x), "y": float(y)},
                arch=arch,
                confidence=round(min(0.9, 0.55 + score / 40.0), 2),
                source="distance_peaks",
            )
        )
    return detections


def _get_yolo_model():
    global _YOLO_MODEL, _YOLO_LOAD_FAILED
    if _YOLO_MODEL is not None:
        return _YOLO_MODEL
    if _YOLO_LOAD_FAILED:
        return None

    model_path = os.environ.get("TOOTH_YOLO_MODEL", "").strip()
    if not model_path:
        return None

    try:
        from ultralytics import YOLO

        _YOLO_MODEL = YOLO(model_path)
        return _YOLO_MODEL
    except Exception as exc:  # noqa: BLE001
        print(f"[tooth_detector] YOLO unavailable: {exc}")
        _YOLO_LOAD_FAILED = True
        return None


def _detect_with_yolo(image_bytes: bytes, role: str) -> list[ToothDetection]:
    model = _get_yolo_model()
    if model is None:
        return []

    bgr = load_bgr(image_bytes)
    image_h, image_w = bgr.shape[:2]
    try:
        results = model(bgr, verbose=False)
    except Exception as exc:  # noqa: BLE001
        print(f"[tooth_detector] YOLO inference failed: {exc}")
        return []

    if not results:
        return []

    detections: list[ToothDetection] = []
    boxes = results[0].boxes
    if boxes is None:
        return []

    for box in boxes:
        xyxy = box.xyxy[0].cpu().numpy()
        x1, y1, x2, y2 = (float(v) for v in xyxy)
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0
        conf = float(box.conf[0]) if box.conf is not None else 0.7

        arch = "upper" if cy < image_h * 0.5 else "lower"
        if role == "maxillary":
            arch = "upper"
        elif role == "mandibular":
            arch = "lower"

        detections.append(
            ToothDetection(
                bbox=[x1, y1, x2, y2],
                center={"x": cx, "y": cy},
                arch=arch,
                confidence=conf,
                source="yolo",
            )
        )

    detections.sort(key=lambda item: (item.arch, item.center["x"]))
    return detections


def _detect_with_cv(image_bytes: bytes, role: str) -> list[ToothDetection]:
    bgr = load_bgr(image_bytes)
    image_h, image_w = bgr.shape[:2]

    if role == "anterior":
        arch2d = merge_arch2d_for_sam(image_bytes, None, role=role)
        if not arch2d or len(arch2d.get("upper", [])) + len(arch2d.get("lower", [])) < 3:
            arch2d = detect_visible_arch2d(image_bytes)
        return _arch2d_to_detections(arch2d, "cv_columns")

    if role == "maxillary":
        peaks = _distance_peak_detections(bgr, "upper", max_count=16)
        if len(peaks) >= 4:
            return peaks
        return _arch2d_to_detections(generate_synthetic_arch2d(role, image_w, image_h), "template")

    if role == "mandibular":
        peaks = _distance_peak_detections(bgr, "lower", max_count=16)
        if len(peaks) >= 4:
            return peaks
        return _arch2d_to_detections(generate_synthetic_arch2d(role, image_w, image_h), "template")

    if role in ("left", "right"):
        arch2d = generate_synthetic_arch2d(role, image_w, image_h)
        return _arch2d_to_detections(arch2d, "template_buccal")

    arch2d = detect_visible_arch2d(image_bytes)
    return _arch2d_to_detections(arch2d, "cv_columns")


def detect_tooth_candidates(image_bytes: bytes, role: str = "anterior") -> list[ToothDetection]:
    """Return tooth bounding boxes + centers for SAM prompting."""
    yolo_detections = _detect_with_yolo(image_bytes, role)
    if len(yolo_detections) >= 2:
        return yolo_detections
    return _detect_with_cv(image_bytes, role)


def is_yolo_detector_available() -> bool:
    model_path = os.environ.get("TOOTH_YOLO_MODEL", "").strip()
    return bool(model_path) and not _YOLO_LOAD_FAILED
