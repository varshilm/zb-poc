"""Convert SegmentAnyTooth FDI label masks to per-tooth polygon borders."""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np


def _fdi_arch(fdi: int) -> str:
    quadrant = fdi // 10
    return "upper" if quadrant in (1, 2) else "lower"


def _contour_to_polygon(contour: np.ndarray) -> list[dict[str, float]] | None:
    if contour is None or len(contour) < 3:
        return None
    epsilon = 0.01 * cv2.arcLength(contour, True)
    approx = cv2.approxPolyDP(contour, epsilon, True)
    if len(approx) < 3:
        return None
    return [{"x": float(p[0][0]), "y": float(p[0][1])} for p in approx]


def fdi_mask_to_teeth(mask: np.ndarray, min_area: float = 48.0) -> list[dict[str, Any]]:
    """Each non-zero pixel value is an FDI tooth number."""
    teeth: list[dict[str, Any]] = []
    for label in np.unique(mask):
        fdi = int(label)
        if fdi <= 0:
            continue

        binary = (mask == fdi).astype(np.uint8) * 255
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue

        largest = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest) < min_area:
            continue

        polygon = _contour_to_polygon(largest)
        if not polygon:
            continue

        teeth.append(
            {
                "fdi": fdi,
                "id": str(fdi),
                "arch": _fdi_arch(fdi),
                "polygon": polygon,
                "confidence": 0.92,
            }
        )

    teeth.sort(key=lambda tooth: tooth["fdi"])
    return teeth
