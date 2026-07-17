"""Merge per-view tooth borders — one polygon per tooth id."""

from __future__ import annotations

from typing import Any

# Lower number = higher priority when the same tooth appears in multiple views.
_ROLE_PRIORITY: dict[str, int] = {
    "anterior": 0,
    "left": 1,
    "right": 1,
    "maxillary": 2,
    "mandibular": 2,
}


def merge_borders_by_tooth(all_borders: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep the best border per (arch, tooth id). Prefers the anterior view."""
    best: dict[tuple[str, str], tuple[int, dict[str, Any]]] = {}

    for border in all_borders:
        arch = border.get("arch", "upper")
        tooth_id = border.get("id", "")
        if not tooth_id or len(border.get("polygon", [])) < 3:
            continue

        key = (arch, tooth_id)
        role = border.get("sourceRole", "anterior")
        priority = _ROLE_PRIORITY.get(role, 9)

        if key not in best or priority < best[key][0]:
            best[key] = (priority, border)

    return [entry[1] for entry in best.values()]


def borders_for_role(
    all_borders: list[dict[str, Any]],
    role: str,
) -> list[dict[str, Any]]:
    """Return borders that originated from a specific capture view."""
    return [b for b in all_borders if b.get("sourceRole") == role]
