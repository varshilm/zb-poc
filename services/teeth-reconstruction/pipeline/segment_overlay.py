"""Shared helpers for segmentation engines (overlay PNG + image decode)."""

from __future__ import annotations

import base64
from typing import Any

import cv2
import numpy as np


def load_bgr(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("Unable to decode image bytes")
    return bgr


def load_gray(image_bytes: bytes) -> np.ndarray:
    return cv2.cvtColor(load_bgr(image_bytes), cv2.COLOR_BGR2GRAY)


def contour_to_polygon(
    contour: np.ndarray,
    offset_x: int = 0,
    offset_y: int = 0,
) -> list[dict[str, float]] | None:
    if contour is None or len(contour) < 3:
        return None
    epsilon = 0.011 * cv2.arcLength(contour, True)
    approx = cv2.approxPolyDP(contour, epsilon, True)
    if len(approx) < 3:
        return None
    return [
        {"x": float(point[0][0] + offset_x), "y": float(point[0][1] + offset_y)}
        for point in approx
    ]


def _fdi_outline_color(fdi: int) -> tuple[int, int, int]:
    """Distinct BGR colors per FDI tooth for overlay readability."""
    palette = (
        (56, 189, 248),
        (14, 165, 233),
        (34, 197, 94),
        (250, 204, 21),
        (249, 115, 22),
        (239, 68, 68),
        (168, 85, 247),
        (236, 72, 153),
    )
    return palette[fdi % len(palette)]


def _instance_mask_color(instance_index: int) -> tuple[int, int, int]:
    """Distinct BGR fill per instance (YOLO-style instance segmentation visualization)."""
    rng = np.random.default_rng(instance_index * 9973 + 42)
    return (
        int(rng.integers(48, 256)),
        int(rng.integers(48, 256)),
        int(rng.integers(48, 256)),
    )


def render_instance_mask_png_b64(
    image_height: int,
    image_width: int,
    teeth: list[dict[str, Any]],
) -> str:
    """Filled per-tooth polygons on a black canvas — instance segmentation style."""
    canvas = np.zeros((image_height, image_width, 3), dtype=np.uint8)
    for index, tooth in enumerate(teeth):
        polygon = tooth.get("polygon") or []
        if len(polygon) < 3:
            continue
        pts = np.array([[int(p["x"]), int(p["y"])] for p in polygon], dtype=np.int32)
        color = _instance_mask_color(index)
        cv2.fillPoly(canvas, [pts], color)

    success, encoded = cv2.imencode(".png", canvas)
    if not success:
        return ""
    return base64.b64encode(encoded.tobytes()).decode("ascii")


def build_segmentation_response(
    bgr: np.ndarray,
    teeth: list[dict[str, Any]],
    engine: str,
) -> dict[str, Any]:
    overlay = bgr.copy()
    for tooth in teeth:
        pts = np.array([[int(p["x"]), int(p["y"])] for p in tooth["polygon"]], dtype=np.int32)
        if len(pts) < 2:
            continue
        fdi = int(tooth.get("fdi") or tooth.get("id") or 0)
        color = _fdi_outline_color(fdi) if fdi > 0 else (
            (14, 165, 233) if tooth["arch"] == "upper" else (56, 189, 248)
        )
        cv2.polylines(overlay, [pts], True, color, 2)
        label = str(tooth.get("id") or tooth.get("fdi") or "")
        if label:
            cx = int(np.mean([p["x"] for p in tooth["polygon"]]))
            cy = int(np.mean([p["y"] for p in tooth["polygon"]]))
            cv2.putText(overlay, label, (cx - 10, cy + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    blended = cv2.addWeighted(bgr, 0.55, overlay, 0.45, 0)
    success, encoded = cv2.imencode(".png", blended)
    overlay_b64 = base64.b64encode(encoded.tobytes()).decode("ascii") if success else ""

    image_h, image_w = bgr.shape[:2]
    instance_mask_b64 = render_instance_mask_png_b64(image_h, image_w, teeth)

    return {
        "teeth": teeth,
        "overlayPngBase64": overlay_b64,
        "instanceMaskPngBase64": instance_mask_b64,
        "engine": engine,
    }
