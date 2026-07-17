"""Teeth reconstruction local service — segmentation + template mesh fitting."""

from __future__ import annotations

import base64
import io
import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from pipeline.border_merge import borders_for_role, merge_borders_by_tooth
from pipeline.column_segment import segment_teeth_columns
from pipeline.dental_model import merge_view_results
from pipeline.fit_arch import fit_arch_params
from pipeline.image_quality import assess_image_quality
from pipeline.mesh_build import build_arch_mesh_glb
from pipeline.project import render_projection_overlay
from pipeline.prompt_pipeline import run_view_segmentation, segmentation_capabilities
from pipeline.sam_prompt_segment import segment_tooth_at_point
from pipeline.segment import segment_teeth_borders
from pipeline.segment_sam import segment_teeth_sam
from pipeline.visible_arch2d import merge_arch2d_for_sam
from pipeline.watershed_segment import segment_teeth_watershed


def run_segmentation(image_bytes, mouth_roi, arch2d, role: str = "anterior", capture_mode: str | None = None):
    """Anterior: watershed enamel split → column threshold → SAM → classical."""
    if capture_mode == "teethOnly":
        arch2d = None

    if role == "anterior":
        watershed_result = segment_teeth_watershed(image_bytes, arch2d, role=role)
        if watershed_result and watershed_result.get("teeth"):
            return watershed_result

        column_result = segment_teeth_columns(image_bytes, arch2d, role=role)
        if column_result and column_result.get("teeth"):
            return column_result

    effective_arch2d = merge_arch2d_for_sam(image_bytes, arch2d, role=role) or arch2d
    sam_result = segment_teeth_sam(image_bytes, effective_arch2d, role=role)
    if sam_result and sam_result.get("teeth"):
        return sam_result
    return segment_teeth_borders(image_bytes, mouth_roi, effective_arch2d, role=role)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


def _decode_image(image_base64: str):
    payload = image_base64.split(",", 1)[-1]
    raw = base64.b64decode(payload)
    return raw


@app.get("/health")
def health():
    caps = segmentation_capabilities()
    return jsonify({
        "status": "ok",
        "service": "teeth-reconstruction",
        **caps,
    })


@app.post("/teeth/analyze/view")
def analyze_view():
    """Single guided intraoral view — quality check + detect→SAM segmentation."""
    body = request.get_json(silent=True) or {}
    image_base64 = body.get("imageBase64")
    role = body.get("role", "anterior")
    if not image_base64:
        return jsonify({"error": "imageBase64 is required"}), 400

    caps = segmentation_capabilities()
    if not caps.get("sam"):
        return jsonify({
            "error": "SAM model is not available",
            "setupHint": "Install ultralytics and ensure sam2.1_b.pt or mobile_sam.pt can download. "
            "Set SAM_MODEL=sam2.1_b.pt optionally.",
        }), 503

    image_bytes = _decode_image(image_base64)
    quality = assess_image_quality(image_bytes)
    seg = run_view_segmentation(image_bytes, role)
    if not seg:
        return jsonify({
            "role": role,
            "engine": "none",
            "quality": quality,
            "teeth": [],
            "error": "Segmentation returned no teeth for this view",
            "capabilities": caps,
        }), 422

    return jsonify({
        "role": role,
        "engine": seg.get("engine", "sam_prompt"),
        "quality": quality,
        "teeth": seg.get("teeth", []),
        "overlayPngBase64": seg.get("overlayPngBase64", ""),
        "instanceMaskPngBase64": seg.get("instanceMaskPngBase64", ""),
        "detectionCount": seg.get("detectionCount"),
    })


@app.post("/teeth/analyze/five-view")
def analyze_five_view():
    """All five guided views → merged PersonalizedDentalModel JSON."""
    body = request.get_json(silent=True) or {}
    views = body.get("views") or []
    if len(views) < 1:
        return jsonify({"error": "At least one view is required"}), 400

    caps = segmentation_capabilities()
    if not caps.get("sam"):
        return jsonify({
            "error": "SAM model is not available",
            "setupHint": "Install ultralytics. SAM weights auto-download on first run.",
        }), 503

    view_results: list = []
    for view in views:
        image_base64 = view.get("imageBase64")
        role = view.get("role", "anterior")
        if not image_base64:
            continue

        image_bytes = _decode_image(image_base64)
        quality = assess_image_quality(image_bytes)
        seg = run_view_segmentation(image_bytes, role)
        view_results.append({
            "role": role,
            "engine": seg.get("engine", "sam_prompt") if seg else "none",
            "quality": quality,
            "teeth": seg.get("teeth", []) if seg else [],
            "overlayPngBase64": seg.get("overlayPngBase64", "") if seg else "",
            "instanceMaskPngBase64": seg.get("instanceMaskPngBase64", "") if seg else "",
            "detectionCount": seg.get("detectionCount") if seg else 0,
        })

    if not any(view.get("teeth") for view in view_results):
        return jsonify({
            "error": "Unable to segment teeth in any view",
            "views": view_results,
            "capabilities": caps,
        }), 422

    dental_model = merge_view_results(view_results)
    return jsonify({"dentalModel": dental_model, "views": view_results, "capabilities": caps})


@app.post("/teeth/analyze/point")
def analyze_tooth_point():
    """Click-to-segment a single tooth outline (SAM point + local bbox prompt)."""
    body = request.get_json(silent=True) or {}
    image_base64 = body.get("imageBase64")
    if not image_base64:
        return jsonify({"error": "imageBase64 is required"}), 400

    try:
        x = float(body.get("x"))
        y = float(body.get("y"))
    except (TypeError, ValueError):
        return jsonify({"error": "x and y are required numbers"}), 400

    radius = body.get("radius")
    parsed_radius = float(radius) if radius is not None else None

    image_bytes = _decode_image(image_base64)
    result = segment_tooth_at_point(image_bytes, x, y, parsed_radius)
    if not result:
        return jsonify({
            "tooth": None,
            "engine": "none",
            "error": "Could not segment a tooth at this location",
        }), 422

    return jsonify({
        "tooth": {
            "arch": result["arch"],
            "polygon": result["polygon"],
            "confidence": result["confidence"],
        },
        "engine": result.get("engine", "sam_point"),
    })


@app.post("/teeth/analyze")
def analyze_teeth():
    body = request.get_json(silent=True) or {}
    image_base64 = body.get("imageBase64")
    if not image_base64:
        return jsonify({"error": "imageBase64 is required"}), 400

    mouth_roi = body.get("mouthRoi")
    arch2d = body.get("arch2D")
    capture_mode = body.get("captureMode")
    image_bytes = _decode_image(image_base64)

    result = run_segmentation(image_bytes, mouth_roi, arch2d, capture_mode=capture_mode)
    return jsonify(result)


@app.post("/teeth/reconstruct")
def reconstruct_teeth():
    body = request.get_json(silent=True) or {}
    image_base64 = body.get("imageBase64")
    borders = body.get("borders") or []
    arch2d = body.get("arch2D")
    if not image_base64:
        return jsonify({"error": "imageBase64 is required"}), 400
    if not borders:
        return jsonify({"error": "borders are required"}), 400

    image_bytes = _decode_image(image_base64)
    fit = fit_arch_params(borders, arch2d)
    upper_glb, lower_glb = build_arch_mesh_glb(fit, arch2d, borders)
    overlay_png = render_projection_overlay(image_bytes, borders, fit)

    return jsonify(
        {
            "upperMeshGlbBase64": base64.b64encode(upper_glb).decode("ascii"),
            "lowerMeshGlbBase64": base64.b64encode(lower_glb).decode("ascii"),
            "camera": {"fov": 42, "position": [0, 0.12, 1.35]},
            "projectionOverlayBase64": base64.b64encode(overlay_png).decode("ascii"),
            "quality": {
                "fitError": fit.get("fit_error", 0.0),
                "warnings": fit.get("warnings", []),
            },
        }
    )


@app.post("/teeth/reconstruct/multi")
def reconstruct_multi():
    body = request.get_json(silent=True) or {}
    views = body.get("views") or []
    if len(views) < 1:
        return jsonify({"error": "At least 1 view is required for multi-view reconstruction"}), 400

    all_borders: list = []
    view_borders: list = []  # {role, borders} per view
    arch2d = None
    anterior_image_bytes = None

    for view in views:
        image_base64 = view.get("imageBase64")
        role = view.get("role", "anterior")
        if not image_base64:
            continue

        image_bytes = _decode_image(image_base64)
        if role == "anterior" or anterior_image_bytes is None:
            anterior_image_bytes = image_bytes

        result = run_segmentation(
            image_bytes,
            view.get("mouthRoi"),
            view.get("arch2D"),
            role=role,
        )
        view_teeth = result.get("teeth", [])
        # Tag each border with its source view role for downstream fitting
        for border in view_teeth:
            border["sourceRole"] = role

        all_borders.extend(view_teeth)
        view_borders.append({"role": role, "borders": view_teeth})

        if view.get("arch2D"):
            arch2d = view.get("arch2D")

    if not all_borders:
        return jsonify({"error": "Unable to segment any view"}), 400

    merged_borders = merge_borders_by_tooth(all_borders)
    overlay_borders = borders_for_role(all_borders, "anterior") or merged_borders

    fit = fit_arch_params(
        merged_borders,
        arch2d,
        multi_view=True,
        view_borders=view_borders,
    )
    upper_glb, lower_glb = build_arch_mesh_glb(fit, arch2d, merged_borders)
    overlay_png = render_projection_overlay(anterior_image_bytes or b"", overlay_borders, fit)

    response_body = {
        "upperMeshGlbBase64": base64.b64encode(upper_glb).decode("ascii"),
        "lowerMeshGlbBase64": base64.b64encode(lower_glb).decode("ascii"),
        "camera": {"fov": 42, "position": [0, 0.12, 1.35]},
        "projectionOverlayBase64": base64.b64encode(overlay_png).decode("ascii"),
        "quality": {
            "fitError": fit.get("fit_error", 0.0),
            "warnings": fit.get("warnings", []),
            "viewCount": len(views),
        },
    }

    # Return occlusal arch curve if derived from an occlusal view
    if fit.get("occlusalArch"):
        response_body["occlusalArch"] = fit["occlusalArch"]

    return jsonify(response_body)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=True)
