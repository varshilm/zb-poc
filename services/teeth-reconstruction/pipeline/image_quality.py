"""Intraoral photo quality checks before segmentation."""

from __future__ import annotations

import cv2
import numpy as np


def assess_image_quality(image_bytes: bytes) -> dict:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        return {
            "isAcceptable": False,
            "blurScore": 0.0,
            "meanBrightness": 0.0,
            "warnings": ["Unable to decode image"],
        }

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    mean_brightness = float(np.mean(gray))

    warnings: list[str] = []
    if blur_score < 80:
        warnings.append("Photo may be blurry — hold steady and use flash.")
    if mean_brightness < 70:
        warnings.append("Photo is under-exposed — enable flash or increase lighting.")
    if mean_brightness > 210:
        warnings.append("Photo is over-exposed — reduce direct glare.")

    h, w = gray.shape
    if w < 640 or h < 480:
        warnings.append("Resolution is low — move closer or use a higher-quality camera.")

    is_acceptable = blur_score >= 60 and 55 <= mean_brightness <= 225

    return {
        "isAcceptable": is_acceptable,
        "blurScore": round(blur_score, 1),
        "meanBrightness": round(mean_brightness, 1),
        "warnings": warnings,
    }
