"""SegmentAnyTooth adapter — dental instance segmentation with FDI labels.

Requires the SegmentAnyTooth package and downloaded weights.
https://github.com/thangngoc89/SegmentAnyTooth

Set SEGMENT_ANY_TOOTH_WEIGHTS to the directory containing per-view YOLO + SAM weights.
"""

from __future__ import annotations

import os
import tempfile
from typing import Any

import cv2
import numpy as np

from .mask_to_teeth import fdi_mask_to_teeth
from .segment_overlay import build_segmentation_response, load_bgr

ROLE_TO_VIEW = {
    "anterior": "front",
    "left": "left",
    "right": "right",
    "maxillary": "upper",
    "mandibular": "lower",
}


def _weights_dir() -> str | None:
    path = os.environ.get("SEGMENT_ANY_TOOTH_WEIGHTS", "").strip()
    if path and os.path.isdir(path):
        return path
    default = os.path.join(os.path.dirname(__file__), "..", "weights", "segmentanytooth")
    if os.path.isdir(default):
        return os.path.abspath(default)
    return None


def is_segment_anytooth_available() -> bool:
    weights = _weights_dir()
    if not weights:
        return False
    try:
        import segmentanytooth  # noqa: F401
    except ImportError:
        return False
    return True


def segment_view_segment_anytooth(image_bytes: bytes, role: str) -> dict[str, Any] | None:
    view = ROLE_TO_VIEW.get(role, "front")
    weights = _weights_dir()
    if not weights:
        return None

    try:
        from segmentanytooth import predict
    except ImportError:
        return None

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        mask = predict(
            image_path=tmp_path,
            view=view,
            weight_dir=weights,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[segment_anytooth] inference failed for {role}: {exc}")
        return None
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    if mask is None or not isinstance(mask, np.ndarray):
        return None

    teeth = fdi_mask_to_teeth(mask.astype(np.uint8))
    if not teeth:
        return None

    bgr = load_bgr(image_bytes)
    return build_segmentation_response(bgr, teeth, "segment_anytooth")
