"""MobileSAM-based per-tooth segmentation, prompted by arch2D tooth boxes.

Uses Ultralytics SAM (Apache-2.0). The `mobile_sam.pt` weights are downloaded
automatically by ultralytics on first run. We prompt with one bounding box per
tooth (derived from the frontend arch2D layout) so SAM returns one mask per tooth.

When no arch2D is provided (multi-view uploads), a synthetic template is
generated from the image dimensions and view role.
"""

from __future__ import annotations

import base64
import io
from typing import Any

import cv2
import numpy as np
from PIL import Image

from .arch_template import generate_synthetic_arch2d
from .mask_refine import relabel_and_filter_teeth
from .segment_overlay import render_instance_mask_png_b64
from .visible_arch2d import merge_arch2d_for_sam

_SAM_MODEL = None
_SAM_LOAD_FAILED = False


def _load_bgr(image_bytes: bytes) -> np.ndarray:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    rgb = np.array(image)
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def _get_sam_model():
    """Lazy-load MobileSAM. Returns None if unavailable so caller can fall back."""
    global _SAM_MODEL, _SAM_LOAD_FAILED
    if _SAM_MODEL is not None:
        return _SAM_MODEL
    if _SAM_LOAD_FAILED:
        return None
    try:
        from ultralytics import SAM

        _SAM_MODEL = SAM("mobile_sam.pt")
        return _SAM_MODEL
    except Exception as exc:  # noqa: BLE001 - degrade gracefully to classical path
        print(f"[segment_sam] MobileSAM unavailable, falling back: {exc}")
        _SAM_LOAD_FAILED = True
        return None


def _collect_tooth_boxes(
    arch2d: dict[str, Any],
    image_w: int,
    image_h: int,
) -> list[dict[str, Any]]:
    boxes: list[dict[str, Any]] = []
    for arch_name in ("upper", "lower"):
        for tooth in arch2d.get(arch_name, []):
            center = tooth.get("center", {})
            cx = float(center.get("x", 0))
            cy = float(center.get("y", 0))
            width = max(float(tooth.get("width", 20)), 6) * 0.88
            height = max(float(tooth.get("height", 24)), 6) * 0.88
            x1 = max(0, cx - width / 2)
            y1 = max(0, cy - height / 2)
            x2 = min(image_w - 1, cx + width / 2)
            y2 = min(image_h - 1, cy + height / 2)
            if x2 <= x1 or y2 <= y1:
                continue
            boxes.append(
                {
                    "label": tooth.get("label") or tooth.get("toothId") or "U1",
                    "arch": arch_name,
                    "bbox": [x1, y1, x2, y2],
                }
            )
    return boxes


def _mask_to_polygon(mask: np.ndarray, bbox: list[float]) -> list[dict[str, float]] | None:
    """Largest contour within the prompt bbox, simplified to a compact polygon."""
    binary = (mask > 0).astype(np.uint8)
    if binary.sum() < 12:
        return None

    # Constrain to a padded bbox to avoid SAM bleeding into neighbouring teeth.
    x1, y1, x2, y2 = (int(v) for v in bbox)
    pad_x = int((x2 - x1) * 0.25)
    pad_y = int((y2 - y1) * 0.25)
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

    epsilon = 0.008 * cv2.arcLength(largest, True)
    approx = cv2.approxPolyDP(largest, epsilon, True)
    if len(approx) < 3:
        return None
    return [{"x": float(p[0][0]), "y": float(p[0][1])} for p in approx]


def segment_teeth_sam(
    image_bytes: bytes,
    arch2d: dict[str, Any] | None,
    role: str = "anterior",
) -> dict[str, Any] | None:
    """Returns {teeth, overlayPngBase64} using MobileSAM, or None to fall back.

    When arch2d is None a synthetic template is generated from the image
    dimensions and the view role so the prompt boxes are still meaningful.
    """
    model = _get_sam_model()
    if model is None:
        return None

    bgr = _load_bgr(image_bytes)
    image_h, image_w = bgr.shape[:2]

    # Synthesise arch layout when none is provided (multi-view uploads)
    effective_arch2d = merge_arch2d_for_sam(image_bytes, arch2d, role=role)
    if not effective_arch2d:
        effective_arch2d = generate_synthetic_arch2d(role, image_w, image_h)

    boxes = _collect_tooth_boxes(effective_arch2d, image_w, image_h)
    if not boxes:
        return None

    bbox_list = [box["bbox"] for box in boxes]
    try:
        results = model(bgr, bboxes=bbox_list, verbose=False)
    except Exception as exc:  # noqa: BLE001
        print(f"[segment_sam] inference failed, falling back: {exc}")
        return None

    if not results or results[0].masks is None:
        return None

    masks = results[0].masks.data.cpu().numpy()  # [N, H, W]
    teeth: list[dict[str, Any]] = []

    for i, box in enumerate(boxes):
        if i >= len(masks):
            break
        mask = masks[i]
        if mask.shape[:2] != (image_h, image_w):
            mask = cv2.resize(mask, (image_w, image_h), interpolation=cv2.INTER_NEAREST)
        polygon = _mask_to_polygon(mask, box["bbox"])
        if not polygon:
            continue

        teeth.append(
            {
                "id": box["label"],
                "arch": box["arch"],
                "polygon": polygon,
                "confidence": 0.9,
            }
        )

    if not teeth:
        return None

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    teeth = relabel_and_filter_teeth(gray, teeth)
    if not teeth:
        return None

    overlay = bgr.copy()
    for tooth in teeth:
        pts = np.array([[int(p["x"]), int(p["y"])] for p in tooth["polygon"]], dtype=np.int32)
        color = (14, 165, 233) if tooth["arch"] == "upper" else (56, 189, 248)
        cv2.polylines(overlay, [pts], True, color, 2)

    blended = cv2.addWeighted(bgr, 0.6, overlay, 0.4, 0)
    success, encoded = cv2.imencode(".png", blended)
    overlay_b64 = base64.b64encode(encoded.tobytes()).decode("ascii") if success else ""

    return {
        "teeth": teeth,
        "overlayPngBase64": overlay_b64,
        "instanceMaskPngBase64": render_instance_mask_png_b64(image_h, image_w, teeth),
        "engine": "mobile_sam",
    }
