"""Mouth crop segmentation — template arch snap with OpenCV edge refinement.

When no arch2D is provided (multi-view uploads without landmark detection),
a synthetic template is generated from image dimensions and view role.

As a last-resort fallback, a brightness-based contour detection is used:
teeth are typically the brightest, most textured region in intra-oral photos.
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


def _load_bgr(image_bytes: bytes) -> np.ndarray:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    rgb = np.array(image)
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def _polygon_from_template(
    center_x: float,
    center_y: float,
    width: float,
    height: float,
    rotation: float,
    steps: int = 24,
) -> list[dict[str, float]]:
    points = []
    for i in range(steps):
        angle = (i / steps) * 2 * np.pi
        local_x = np.cos(angle) * width * 0.48
        local_y = np.sin(angle) * height * 0.48
        rotated_x = local_x * np.cos(rotation) - local_y * np.sin(rotation)
        rotated_y = local_x * np.sin(rotation) + local_y * np.cos(rotation)
        points.append({"x": center_x + rotated_x, "y": center_y + rotated_y})
    return points


def _refine_center_with_edges(
    gray: np.ndarray, center_x: float, center_y: float, radius: float
) -> tuple[float, float]:
    h, w = gray.shape
    x0 = max(0, int(center_x - radius))
    y0 = max(0, int(center_y - radius))
    x1 = min(w, int(center_x + radius))
    y1 = min(h, int(center_y + radius))
    crop = gray[y0:y1, x0:x1]
    if crop.size == 0:
        return center_x, center_y
    edges = cv2.Canny(crop, 40, 120)
    ys, xs = np.where(edges > 0)
    if len(xs) == 0:
        return center_x, center_y
    return float(np.mean(xs) + x0), float(np.mean(ys) + y0)


# ---------------------------------------------------------------------------
# Brightness-based auto-detection (last-resort fallback)
# ---------------------------------------------------------------------------

def _segment_by_brightness(
    bgr: np.ndarray,
    role: str,
) -> list[dict[str, Any]]:
    """Find teeth by brightness + contours, no arch prior needed.

    Works best for intra-oral photos where teeth are the brightest region.
    Returns a list of border dicts in the same format as the template method.
    """
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # Focus on the central region where teeth are most likely to appear
    y_start = int(h * 0.15)
    y_end = int(h * 0.85)
    x_start = int(w * 0.05)
    x_end = int(w * 0.95)
    roi = gray[y_start:y_end, x_start:x_end]

    # Enhance local contrast
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(roi)

    # Otsu threshold to isolate bright regions (teeth)
    _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return []

    # Filter contours by size — tooth-like blobs
    min_area = (roi.shape[0] * roi.shape[1]) * 0.002
    max_area = (roi.shape[0] * roi.shape[1]) * 0.25
    valid = [c for c in contours if min_area < cv2.contourArea(c) < max_area]

    if not valid:
        return []

    # Sort by x position (left to right)
    valid.sort(key=lambda c: cv2.boundingRect(c)[0])

    # Assign arch based on y-position relative to the ROI midpoint
    roi_mid_y = roi.shape[0] / 2

    teeth: list[dict[str, Any]] = []
    upper_idx = 0
    lower_idx = 0

    for contour in valid:
        epsilon = 0.015 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)
        if len(approx) < 3:
            continue

        # Shift coordinates back to full image space
        polygon = [
            {"x": float(p[0][0] + x_start), "y": float(p[0][1] + y_start)}
            for p in approx
        ]
        cx_local, cy_local = cv2.boundingRect(contour)[:2]
        cy_center = cy_local + cv2.boundingRect(contour)[3] / 2

        # Occlusal views: all contours belong to one arch
        if role == "maxillary":
            arch_name = "upper"
            idx = upper_idx
            upper_idx += 1
        elif role == "mandibular":
            arch_name = "lower"
            idx = lower_idx
            lower_idx += 1
        else:
            # Anterior / buccal: upper row is above midpoint, lower row is below
            if cy_center < roi_mid_y:
                arch_name = "upper"
                idx = upper_idx
                upper_idx += 1
            else:
                arch_name = "lower"
                idx = lower_idx
                lower_idx += 1

        prefix = "U" if arch_name == "upper" else "L"
        teeth.append({
            "id": f"{prefix}{idx + 1}",
            "arch": arch_name,
            "polygon": polygon,
            "confidence": 0.55,
            "source": "brightness",
        })

    return teeth


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def segment_teeth_borders(
    image_bytes: bytes,
    mouth_roi: dict[str, float] | None,
    arch2d: dict[str, Any] | None,
    role: str = "anterior",
) -> dict[str, Any]:
    bgr = _load_bgr(image_bytes)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    image_h, image_w = bgr.shape[:2]

    teeth: list[dict[str, Any]] = []

    # Use image-aligned arch2D when lip template has too many teeth for the visible frame
    effective_arch2d = merge_arch2d_for_sam(image_bytes, arch2d, role=role)
    if not effective_arch2d:
        effective_arch2d = generate_synthetic_arch2d(role, image_w, image_h)

    for arch_name in ("upper", "lower"):
        for tooth in effective_arch2d.get(arch_name, []):
            center = tooth.get("center", {})
            cx = float(center.get("x", 0))
            cy = float(center.get("y", 0))
            width = float(tooth.get("width", 20))
            height = float(tooth.get("height", 24))
            rotation = float(tooth.get("rotationRadians", 0))
            label = tooth.get("label") or tooth.get("toothId") or "U1"

            refined_cx, refined_cy = _refine_center_with_edges(
                gray, cx, cy, max(width, height) * 0.35
            )
            polygon = _polygon_from_template(refined_cx, refined_cy, width, height, rotation)

            teeth.append({
                "id": label,
                "arch": arch_name,
                "polygon": polygon,
                "confidence": 0.72 if arch2d else 0.55,
            })

    # Fallback: if template produced no teeth, try brightness detection
    if not teeth:
        teeth = _segment_by_brightness(bgr, role)

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    teeth = relabel_and_filter_teeth(gray, teeth)

    overlay = bgr.copy()
    for t in teeth:
        pts = np.array([[int(p["x"]), int(p["y"])] for p in t.get("polygon", [])], dtype=np.int32)
        if len(pts) >= 2:
            color = (14, 165, 233) if t.get("arch") == "upper" else (56, 189, 248)
            cv2.polylines(overlay, [pts], True, color, 2)

    if mouth_roi:
        sx = int(mouth_roi.get("sx", 0))
        sy = int(mouth_roi.get("sy", 0))
        sw = int(mouth_roi.get("sw", bgr.shape[1]))
        sh = int(mouth_roi.get("sh", bgr.shape[0]))
        cv2.rectangle(overlay, (sx, sy), (sx + sw, sy + sh), (148, 163, 184), 1)

    success, encoded = cv2.imencode(".png", overlay)
    overlay_b64 = ""
    if success:
        overlay_b64 = base64.b64encode(encoded.tobytes()).decode("ascii")

    image_h, image_w = bgr.shape[:2]
    return {
        "teeth": teeth,
        "overlayPngBase64": overlay_b64,
        "instanceMaskPngBase64": render_instance_mask_png_b64(image_h, image_w, teeth),
    }
