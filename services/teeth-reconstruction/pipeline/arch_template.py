"""Synthetic arch2D template generator.

When no frontend arch2D is available (e.g. multi-view upload without landmark
detection), this module synthesises plausible tooth bounding-box positions from
the image dimensions and the known view role.

Supported roles: anterior, maxillary, mandibular, left, right
"""

from __future__ import annotations

import math
from typing import Any


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_KINDS_FULL = [
    "secondMolar", "firstMolar", "secondPremolar", "firstPremolar",
    "canine", "lateralIncisor", "centralIncisor",
]
# Width factors relative to central incisor (mirrors IDEAL_TOOTH_TEMPLATES)
_WIDTH_FACTORS = [1.26, 1.18, 1.02, 0.98, 0.98, 0.92, 1.08]
_TOTAL_W = sum(_WIDTH_FACTORS) * 2  # both sides


def _tooth_entry(
    label: str,
    arch: str,
    index: int,
    cx: float,
    cy: float,
    width: float,
    height: float,
    rotation: float = 0.0,
) -> dict[str, Any]:
    return {
        "label": label,
        "arch": arch,
        "index": index,
        "center": {"x": cx, "y": cy},
        "width": width,
        "height": height,
        "rotationRadians": rotation,
    }


# ---------------------------------------------------------------------------
# Per-role generators
# ---------------------------------------------------------------------------

def _anterior_arch(image_w: int, image_h: int) -> dict[str, list]:
    """Frontal smile view — two horizontal rows, 14 teeth total per arch."""
    arch_w = image_w * 0.68
    x_start = (image_w - arch_w) / 2.0
    tooth_h = min(image_h * 0.15, 55.0)
    base_unit = arch_w / _TOTAL_W

    upper: list = []
    lower: list = []

    # Left half (i=0 is leftmost = second molar)
    cum_x = x_start
    for i, (kind, wf) in enumerate(zip(_KINDS_FULL, _WIDTH_FACTORS)):
        w = wf * base_unit
        cx = cum_x + w / 2
        cum_x += w
        upper.append(_tooth_entry(f"U{i + 1}", "upper", i, cx, image_h * 0.38, w, tooth_h))
        lower.append(_tooth_entry(f"L{i + 1}", "lower", i, cx, image_h * 0.58, w, tooth_h * 0.88))

    # Right half (mirror: reverse order)
    for i, (kind, wf) in enumerate(zip(reversed(_KINDS_FULL), reversed(_WIDTH_FACTORS))):
        w = wf * base_unit
        cx = cum_x + w / 2
        cum_x += w
        idx = 7 + i
        upper.append(_tooth_entry(f"U{idx + 1}", "upper", idx, cx, image_h * 0.38, w, tooth_h))
        lower.append(_tooth_entry(f"L{idx + 1}", "lower", idx, cx, image_h * 0.58, w, tooth_h * 0.88))

    return {"upper": upper, "lower": lower}


def _occlusal_arch(image_w: int, image_h: int, arch: str) -> dict[str, list]:
    """Top/bottom-down view — teeth in an elliptical arch pattern."""
    cx_center = image_w * 0.5
    cy_center = image_h * 0.5
    arch_rx = image_w * 0.38  # semi-major (mesiodistal)
    arch_ry = image_h * 0.30  # semi-minor (buccolingual depth)

    tooth_count = 14
    tooth_w = arch_rx * 0.18
    tooth_h = arch_ry * 0.22

    teeth: list = []
    for idx in range(tooth_count):
        t = (idx + 0.5) / tooth_count  # 0→1 across full arch
        angle = math.pi - t * math.pi   # π → 0  (left to right)
        # Occlusal arch: x from side-to-side, y = depth
        tx = cx_center + math.cos(angle) * arch_rx
        # For maxillary (top-down), arch opens towards top of image
        # For mandibular (bottom-up), arch opens towards bottom
        ty_offset = -math.sin(angle) * arch_ry if arch == "upper" else math.sin(angle) * arch_ry
        ty = cy_center + ty_offset
        label = f"U{idx + 1}" if arch == "upper" else f"L{idx + 1}"
        teeth.append(_tooth_entry(label, arch, idx, tx, ty, tooth_w, tooth_h))

    return {"upper": teeth if arch == "upper" else [], "lower": teeth if arch == "lower" else []}


def _buccal_arch(image_w: int, image_h: int, side: str) -> dict[str, list]:
    """Side (buccal) view — 6 visible teeth in two horizontal lines."""
    visible = 6  # roughly how many posterior teeth are visible
    arch_w = image_w * 0.62
    x_start = image_w * 0.18
    tooth_w = arch_w / visible
    tooth_h = min(image_h * 0.16, 52.0)

    upper: list = []
    lower: list = []
    for i in range(visible):
        cx = x_start + (i + 0.5) * tooth_w
        upper.append(_tooth_entry(f"U{i + 1}", "upper", i, cx, image_h * 0.38, tooth_w * 0.9, tooth_h))
        lower.append(_tooth_entry(f"L{i + 1}", "lower", i, cx, image_h * 0.57, tooth_w * 0.9, tooth_h * 0.88))

    return {"upper": upper, "lower": lower}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_synthetic_arch2d(role: str, image_w: int, image_h: int) -> dict[str, Any]:
    """Return a synthetic arch2D dict suitable for prompting SAM / template segmentation."""
    if role == "anterior":
        return _anterior_arch(image_w, image_h)
    if role == "maxillary":
        return _occlusal_arch(image_w, image_h, "upper")
    if role == "mandibular":
        return _occlusal_arch(image_w, image_h, "lower")
    if role in ("left", "right"):
        return _buccal_arch(image_w, image_h, role)
    # Unknown role → fall back to anterior layout
    return _anterior_arch(image_w, image_h)
