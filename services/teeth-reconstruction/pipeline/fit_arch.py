"""Arch parameter fitting for single- and multi-view reconstruction.

The key insight for multi-view: occlusal (maxillary / mandibular) photos show
the dental arch from above / below. The tooth centroids in those views lie
*on* the arch curve, so we can fit a parabolic curve directly to them. This
gives far better arch shape than a single frontal photo where depth is lost.
"""

from __future__ import annotations

from typing import Any

import numpy as np
from scipy.optimize import minimize


# ---------------------------------------------------------------------------
# Polygon utilities
# ---------------------------------------------------------------------------

def _polygon_center(polygon: list[dict[str, float]]) -> tuple[float, float]:
    if not polygon:
        return 0.0, 0.0
    xs = [p["x"] for p in polygon]
    ys = [p["y"] for p in polygon]
    return float(np.mean(xs)), float(np.mean(ys))


def _polygon_width_height(polygon: list[dict[str, float]]) -> tuple[float, float]:
    if not polygon:
        return 0.0, 0.0
    xs = [p["x"] for p in polygon]
    ys = [p["y"] for p in polygon]
    return float(np.max(xs) - np.min(xs)), float(np.max(ys) - np.min(ys))


# ---------------------------------------------------------------------------
# Arch curve fitting from occlusal view
# ---------------------------------------------------------------------------

def _fit_parabola(points: list[tuple[float, float]]) -> dict[str, float] | None:
    """Fit y = a·x² + b·x + c to the given (x,y) centroid set.

    Returns arch parameters: width (span in x), depth (apex-to-chord distance).
    """
    if len(points) < 3:
        return None

    xs = np.array([p[0] for p in points], dtype=float)
    ys = np.array([p[1] for p in points], dtype=float)

    # Normalize to [0, 1] range for numerical stability
    x_min, x_max = xs.min(), xs.max()
    y_min, y_max = ys.min(), ys.max()
    x_span = max(x_max - x_min, 1.0)
    y_span = max(y_max - y_min, 1.0)

    xs_n = (xs - x_min) / x_span
    ys_n = (ys - y_min) / y_span

    # Least-squares parabola fit
    try:
        coeffs = np.polyfit(xs_n, ys_n, 2)
    except Exception:  # noqa: BLE001
        return None

    a, _b, _c = coeffs
    # a > 0 → arch opens upward (mandibular from below), a < 0 → opens downward (maxillary from above)
    arch_depth_norm = abs(a) * 0.25  # depth fraction of half-width

    return {
        "archWidth": float(x_span),
        "archDepth": float(arch_depth_norm * x_span),
        "centerX": float(x_min + x_span / 2),
        "centerY": float(y_min + y_span / 2),
        "parabola_a": float(a),
    }


# ---------------------------------------------------------------------------
# Frontal view fitting
# ---------------------------------------------------------------------------

def _fit_frontal(
    upper_centers: list[tuple[float, float]],
    lower_centers: list[tuple[float, float]],
) -> tuple[np.ndarray, np.ndarray, float]:
    """Fit scale/translate/depth params for frontal borders."""

    def arch_error(params: np.ndarray, centers: list[tuple[float, float]]) -> float:
        if not centers:
            return 0.0
        scale, tx, ty, depth = params
        error = 0.0
        for cx, cy in centers:
            fitted_x = cx * scale + tx
            fitted_y = cy * scale + ty
            error += (fitted_x - cx) ** 2 + (fitted_y - cy) ** 2 + depth ** 2 * 0.01
        return error / len(centers)

    upper_params = np.array([1.0, 0.0, 0.0, 0.12])
    lower_params = np.array([1.0, 0.0, 0.0, 0.10])

    if upper_centers:
        res = minimize(arch_error, upper_params, args=(upper_centers,), method="Nelder-Mead")
        upper_params = res.x
    if lower_centers:
        res = minimize(arch_error, lower_params, args=(lower_centers,), method="Nelder-Mead")
        lower_params = res.x

    fit_error = float(
        arch_error(upper_params, upper_centers) + arch_error(lower_params, lower_centers)
    ) / max(1, int(bool(upper_centers)) + int(bool(lower_centers)))

    return upper_params, lower_params, fit_error


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def fit_arch_params(
    borders: list[dict[str, Any]],
    arch2d: dict[str, Any] | None,
    multi_view: bool = False,
    view_borders: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Fit arch parameters from segmented borders.

    Args:
        borders:     All tooth borders (from any view).
        arch2d:      Frontend arch2D template (used as fallback / reference).
        multi_view:  True when borders originate from multiple photos.
        view_borders: List of per-view metadata: {role, borders, imageSize}.
                      When present, occlusal views are used for arch shape.
    """
    warnings: list[str] = []

    # -----------------------------------------------------------------------
    # Separate into occlusal vs frontal/buccal borders
    # -----------------------------------------------------------------------
    occlusal_upper_borders: list[dict[str, Any]] = []
    occlusal_lower_borders: list[dict[str, Any]] = []
    frontal_borders: list[dict[str, Any]] = borders  # default: all borders

    if view_borders:
        frontal_borders = []
        for vb in view_borders:
            role = vb.get("role", "")
            vborders = vb.get("borders", [])
            if role == "maxillary":
                occlusal_upper_borders.extend(vborders)
            elif role == "mandibular":
                occlusal_lower_borders.extend(vborders)
            else:
                frontal_borders.extend(vborders)

    # -----------------------------------------------------------------------
    # Extract arch curve from occlusal views (the main quality improvement)
    # -----------------------------------------------------------------------
    occlusal_arch: dict[str, Any] | None = None
    if occlusal_upper_borders:
        upper_centers = [_polygon_center(b.get("polygon", [])) for b in occlusal_upper_borders]
        if len(upper_centers) >= 3:
            occlusal_arch = _fit_parabola(upper_centers)
            if occlusal_arch:
                warnings.append("Arch curve fitted from maxillary occlusal view — improved depth accuracy.")
    elif occlusal_lower_borders:
        lower_centers = [_polygon_center(b.get("polygon", [])) for b in occlusal_lower_borders]
        if len(lower_centers) >= 3:
            occlusal_arch = _fit_parabola(lower_centers)
            if occlusal_arch:
                warnings.append("Arch curve fitted from mandibular occlusal view — improved depth accuracy.")

    # -----------------------------------------------------------------------
    # Frontal/buccal border fitting (scale, translate, depth)
    # -----------------------------------------------------------------------
    upper_frontal_centers: list[tuple[float, float]] = []
    lower_frontal_centers: list[tuple[float, float]] = []

    for border in frontal_borders:
        center = _polygon_center(border.get("polygon", []))
        if border.get("arch") == "upper":
            upper_frontal_centers.append(center)
        else:
            lower_frontal_centers.append(center)

    upper_params, lower_params, fit_error = _fit_frontal(upper_frontal_centers, lower_frontal_centers)

    if multi_view and not view_borders:
        warnings.append("Multi-view fit uses averaged border centres across views.")

    if fit_error > 100:
        warnings.append("High fit error — borders may be noisy for this capture.")

    # -----------------------------------------------------------------------
    # Compute per-tooth width hints from frontal borders
    # -----------------------------------------------------------------------
    tooth_widths: dict[str, float] = {}
    for border in frontal_borders:
        bid = border.get("id", "")
        if bid:
            w, _ = _polygon_width_height(border.get("polygon", []))
            tooth_widths[bid] = float(w)

    return {
        "upper": {
            "scale": float(upper_params[0]),
            "tx": float(upper_params[1]),
            "ty": float(upper_params[2]),
            "depth": float(upper_params[3]),
        },
        "lower": {
            "scale": float(lower_params[0]),
            "tx": float(lower_params[1]),
            "ty": float(lower_params[2]),
            "depth": float(lower_params[3]),
        },
        "fit_error": fit_error,
        "warnings": warnings,
        "arch2d": arch2d,
        "borders": borders,
        # Arch curve fitted from occlusal view (if available) — used by frontend
        "occlusalArch": occlusal_arch,
        # Per-tooth widths from frontal segmentation
        "toothWidths": tooth_widths,
    }
