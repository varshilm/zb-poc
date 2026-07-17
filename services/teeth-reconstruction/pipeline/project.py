"""Project reconstructed borders onto the source photo."""

from __future__ import annotations

import io
from typing import Any

import cv2
import numpy as np
from PIL import Image


def render_projection_overlay(
    image_bytes: bytes,
    borders: list[dict[str, Any]],
    fit: dict[str, Any],
) -> bytes:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    bgr = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    overlay = bgr.copy()

    for border in borders:
        polygon = border.get("polygon", [])
        if len(polygon) < 3:
            continue
        pts = np.array([[int(p["x"]), int(p["y"])] for p in polygon], dtype=np.int32)
        color = (14, 165, 233) if border.get("arch") == "upper" else (56, 189, 248)
        cv2.fillPoly(overlay, [pts], color)
        cv2.polylines(overlay, [pts], True, (15, 23, 42), 2)

    blended = cv2.addWeighted(bgr, 0.55, overlay, 0.45, 0)
    fit_error = fit.get("fit_error", 0)
    cv2.putText(
        blended,
        f"Fit error: {fit_error:.2f}",
        (16, 28),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 255, 255),
        2,
    )

    success, encoded = cv2.imencode(".png", blended)
    if not success:
        return b""
    return encoded.tobytes()
