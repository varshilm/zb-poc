"""SAM2 / MobileSAM instance segmentation prompted by detections (bbox + center point).

This is the core of the no-custom-weights pipeline:
  YOLO/CV detections → SAM prompt → optional watershed split → FDI assignment.
"""

from __future__ import annotations

import os
from typing import Any

import cv2
import numpy as np

from .fdi_assign import assign_fdi_numbers
from .mask_refine import relabel_and_filter_teeth
from .mask_split import mask_area_ratio, split_merged_tooth_polygons
from .segment_overlay import build_segmentation_response, load_bgr
from .tooth_detector import ToothDetection, detect_tooth_candidates, is_yolo_detector_available

_SAM_MODEL = None
_SAM_LOAD_FAILED = False
_SAM_MODEL_NAME = ""


def _sam_model_path() -> str:
    return os.environ.get("SAM_MODEL", "sam2.1_b.pt").strip() or "sam2.1_b.pt"


def _get_sam_model():
    global _SAM_MODEL, _SAM_LOAD_FAILED, _SAM_MODEL_NAME
    if _SAM_MODEL is not None:
        return _SAM_MODEL
    if _SAM_LOAD_FAILED:
        return None

    candidates = [_sam_model_path(), "sam2_b.pt", "mobile_sam.pt"]
    try:
        from ultralytics import SAM
    except ImportError as exc:
        print(f"[sam_prompt] ultralytics SAM unavailable: {exc}")
        _SAM_LOAD_FAILED = True
        return None

    for name in candidates:
        try:
            _SAM_MODEL = SAM(name)
            _SAM_MODEL_NAME = name
            print(f"[sam_prompt] loaded {name}")
            return _SAM_MODEL
        except Exception as exc:  # noqa: BLE001
            print(f"[sam_prompt] failed to load {name}: {exc}")

    _SAM_LOAD_FAILED = True
    return None


def is_sam_available() -> bool:
    try:
        from ultralytics import SAM  # noqa: F401
    except ImportError:
        return False
    return not _SAM_LOAD_FAILED


def sam_model_name() -> str:
    _get_sam_model()
    return _SAM_MODEL_NAME


def _mask_to_polygon(
    mask: np.ndarray,
    bbox: list[float],
    offset_x: int = 0,
    offset_y: int = 0,
) -> list[dict[str, float]] | None:
    binary = (mask > 0).astype(np.uint8)
    if binary.sum() < 12:
        return None

    x1, y1, x2, y2 = (int(v) for v in bbox)
    pad_x = int((x2 - x1) * 0.2)
    pad_y = int((y2 - y1) * 0.2)
    region = np.zeros_like(binary)
    rx1 = max(0, x1 - pad_x)
    ry1 = max(0, y1 - pad_y)
    rx2 = min(binary.shape[1], x2 + pad_x)
    ry2 = min(binary.shape[0], y2 + pad_y)
    region[ry1:ry2, rx1:rx2] = 1
    binary = binary & region

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    largest = max(contours, key=cv2.contourArea)
    if cv2.contourArea(largest) < 12:
        return None

    epsilon = 0.009 * cv2.arcLength(largest, True)
    approx = cv2.approxPolyDP(largest, epsilon, True)
    if len(approx) < 3:
        return None
    return [
        {"x": float(point[0][0] + offset_x), "y": float(point[0][1] + offset_y)}
        for point in approx
    ]


def _segment_one_detection(
    model,
    bgr: np.ndarray,
    detection: ToothDetection,
    image_h: int,
    image_w: int,
) -> list[dict[str, Any]]:
    bbox = detection.bbox
    center = detection.center
    x1, y1, x2, y2 = bbox
    x1 = max(0.0, min(image_w - 1, x1))
    y1 = max(0.0, min(image_h - 1, y1))
    x2 = max(x1 + 1, min(image_w, x2))
    y2 = max(y1 + 1, min(image_h, y2))
    bbox = [x1, y1, x2, y2]

    cx = float(center["x"])
    cy = float(center["y"])
    try:
        results = model(
            bgr,
            bboxes=[bbox],
            points=[[cx, cy]],
            labels=[1],
            verbose=False,
        )
    except TypeError:
        # Older ultralytics SAM builds may not accept points + bboxes together
        results = model(bgr, bboxes=[bbox], verbose=False)
    except Exception as exc:  # noqa: BLE001
        print(f"[sam_prompt] inference failed: {exc}")
        return []

    if not results or results[0].masks is None:
        return []

    mask = results[0].masks.data[0].cpu().numpy()
    if mask.shape[:2] != (image_h, image_w):
        mask = cv2.resize(mask, (image_w, image_h), interpolation=cv2.INTER_NEAREST)

    teeth: list[dict[str, Any]] = []
    merge_ratio = mask_area_ratio(mask, bbox)
    if merge_ratio > 1.65:
        polygons = split_merged_tooth_polygons(mask, bbox)
        for polygon in polygons:
            teeth.append(
                {
                    "arch": detection.arch,
                    "polygon": polygon,
                    "confidence": round(detection.confidence * 0.92, 2),
                }
            )
    else:
        polygon = _mask_to_polygon(mask, bbox)
        if polygon:
            teeth.append(
                {
                    "arch": detection.arch,
                    "polygon": polygon,
                    "confidence": detection.confidence,
                }
            )
    return teeth


def segment_view_prompt_pipeline(
    image_bytes: bytes,
    role: str = "anterior",
) -> dict[str, Any] | None:
    """Full detect → SAM → split → FDI pipeline for one intraoral view."""
    model = _get_sam_model()
    if model is None:
        return None

    bgr = load_bgr(image_bytes)
    image_h, image_w = bgr.shape[:2]
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    detections = detect_tooth_candidates(image_bytes, role)
    if not detections:
        return None

    teeth: list[dict[str, Any]] = []
    detector_source = detections[0].source if detections else "none"

    for detection in detections:
        teeth.extend(_segment_one_detection(model, bgr, detection, image_h, image_w))

    if not teeth:
        return None

    teeth = relabel_and_filter_teeth(gray, teeth, min_brightness=0.38)
    if not teeth:
        return None

    teeth = assign_fdi_numbers(teeth, role, image_w, image_h)
    if not teeth:
        return None

    engine = f"sam_prompt/{sam_model_name()}"
    if is_yolo_detector_available():
        engine += "+yolo"
    else:
        engine += f"+{detector_source}"

    response = build_segmentation_response(bgr, teeth, engine)
    response["detectionCount"] = len(detections)
    return response


def _infer_arch_from_y(y: float, image_h: int) -> str:
    return "upper" if y < image_h * 0.48 else "lower"


def segment_tooth_at_point(
    image_bytes: bytes,
    x: float,
    y: float,
    radius: float | None = None,
) -> dict[str, Any] | None:
    """Segment a single tooth mask from a click point (bbox + SAM point prompt)."""
    model = _get_sam_model()
    if model is None:
        return None

    bgr = load_bgr(image_bytes)
    image_h, image_w = bgr.shape[:2]
    cx = float(max(0.0, min(image_w - 1, x)))
    cy = float(max(0.0, min(image_h - 1, y)))
    pad = radius if radius is not None else max(18.0, min(image_w, image_h) * 0.045)

    detection = ToothDetection(
        bbox=[
            max(0.0, cx - pad),
            max(0.0, cy - pad),
            min(float(image_w), cx + pad),
            min(float(image_h), cy + pad),
        ],
        center={"x": cx, "y": cy},
        arch=_infer_arch_from_y(cy, image_h),
        confidence=0.88,
        source="click",
    )

    teeth = _segment_one_detection(model, bgr, detection, image_h, image_w)
    if not teeth:
        return None

    best = max(teeth, key=lambda tooth: len(tooth.get("polygon") or []))
    polygon = best.get("polygon")
    if not polygon or len(polygon) < 3:
        return None

    return {
        "arch": best.get("arch", detection.arch),
        "polygon": polygon,
        "confidence": float(best.get("confidence", detection.confidence)),
        "engine": f"sam_point/{sam_model_name()}",
    }


def pipeline_status() -> dict[str, Any]:
    return {
        "sam": is_sam_available(),
        "samModel": _SAM_MODEL_NAME or _sam_model_path(),
        "yolo": is_yolo_detector_available(),
    }
