"""Orchestrate guided-view segmentation — prompt pipeline primary, SegmentAnyTooth optional."""

from __future__ import annotations

from typing import Any

from .sam_prompt_segment import pipeline_status, segment_view_prompt_pipeline
from .segment_anytooth import is_segment_anytooth_available, segment_view_segment_anytooth


def run_view_segmentation(image_bytes: bytes, role: str) -> dict[str, Any] | None:
    """Run the best available segmentation engine for a guided intraoral view."""
    if is_segment_anytooth_available():
        result = segment_view_segment_anytooth(image_bytes, role)
        if result and result.get("teeth"):
            return result

    result = segment_view_prompt_pipeline(image_bytes, role)
    if result and result.get("teeth"):
        return result

    return result


def segmentation_capabilities() -> dict[str, Any]:
    status = pipeline_status()
    segment_anytooth = is_segment_anytooth_available()
    status["segmentAnyTooth"] = segment_anytooth
    status["primaryEngine"] = "segment_anytooth" if segment_anytooth else "sam_prompt"
    return status
