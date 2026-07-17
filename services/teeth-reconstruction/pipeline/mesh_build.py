"""Build 3D crowns by extruding real per-tooth mask silhouettes onto the arch.

Each segmented tooth polygon (image space) is normalized into a frontal plane,
extruded along the view axis, and given a domed labial surface. Teeth are pushed
back along Z by their horizontal position to form a believable arch. This keeps the
frontal silhouette faithful to the patient's photo instead of generic primitives.
"""

from __future__ import annotations

import io
from typing import Any

import numpy as np
import trimesh
from shapely.geometry import Polygon

# Anterior teeth protrude more than posterior teeth (visible front surface).
ANTERIOR_DEPTH = 0.075
POSTERIOR_DEPTH = 0.055
ARCH_CURVE_DEPTH = 0.22
FRONT_DOME = 0.012


def _polygon_points(border: dict[str, Any]) -> np.ndarray:
    polygon = border.get("polygon", [])
    pts = np.array([[float(p["x"]), float(p["y"])] for p in polygon], dtype=np.float64)
    return pts


def _normalization(borders: list[dict[str, Any]]):
    all_pts = np.concatenate([_polygon_points(b) for b in borders if len(b.get("polygon", [])) >= 3])
    min_xy = all_pts.min(axis=0)
    max_xy = all_pts.max(axis=0)
    center = (min_xy + max_xy) / 2.0
    span_x = max(max_xy[0] - min_xy[0], 1.0)
    scale = 0.9 / span_x

    def to_local(pts: np.ndarray) -> np.ndarray:
        local = np.empty_like(pts)
        local[:, 0] = (pts[:, 0] - center[0]) * scale
        local[:, 1] = (center[1] - pts[:, 1]) * scale  # flip Y (image down -> world up)
        return local

    return to_local, center, scale


def _tooth_depth(label: str) -> float:
    # FDI-ish: positions 1-3 anterior, 4+ posterior. Labels look like "U6"/"L3".
    digits = "".join(ch for ch in label if ch.isdigit())
    index = int(digits) if digits else 7
    pos_from_center = abs(index - 7) if index <= 14 else 3
    if pos_from_center <= 3:
        return ANTERIOR_DEPTH
    return POSTERIOR_DEPTH


def _smooth_polygon(local_pts: np.ndarray) -> Polygon | None:
    if len(local_pts) < 3:
        return None
    poly = Polygon(local_pts)
    if not poly.is_valid:
        poly = poly.buffer(0)
    if poly.is_empty or poly.area < 1e-6:
        return None
    if poly.geom_type == "MultiPolygon":
        poly = max(poly.geoms, key=lambda g: g.area)
    # Round silhouette corners before extrusion (aligner-like smooth shells).
    smoothed = poly.buffer(0.014).buffer(-0.011)
    if smoothed.is_empty or smoothed.geom_type != "Polygon":
        smoothed = poly.simplify(0.008, preserve_topology=True)
    else:
        smoothed = smoothed.simplify(0.006, preserve_topology=True)
    if smoothed.is_empty or smoothed.geom_type != "Polygon":
        return poly
    return smoothed


def _build_crown(local_pts: np.ndarray, depth: float) -> trimesh.Trimesh | None:
    poly = _smooth_polygon(local_pts)
    if poly is None:
        return None

    try:
        mesh = trimesh.creation.extrude_polygon(poly, height=depth)
    except Exception:  # noqa: BLE001
        return None

    centroid = np.array([poly.centroid.x, poly.centroid.y])
    verts = mesh.vertices
    front_mask = verts[:, 2] >= depth - 1e-6
    if front_mask.any():
        radial = np.linalg.norm(verts[front_mask, :2] - centroid, axis=1)
        r_max = max(radial.max(), 1e-6)
        # Gentle labial curve — avoid "ball on cube" look
        verts[front_mask, 2] += FRONT_DOME * np.power(1.0 - radial / r_max, 2.0)
        mesh.vertices = verts

    try:
        mesh = mesh.subdivide()
        mesh = mesh.subdivide()
        trimesh.smoothing.filter_laplacian(mesh, lamb=0.45, iterations=3)
    except Exception:  # noqa: BLE001
        try:
            mesh = mesh.subdivide()
        except Exception:  # noqa: BLE001
            pass
    mesh.fix_normals()
    return mesh


def _build_arch_scene(
    borders: list[dict[str, Any]],
    to_local,
    arch_name: str,
) -> trimesh.Scene:
    scene = trimesh.Scene()
    arch_borders = [b for b in borders if b.get("arch") == arch_name and len(b.get("polygon", [])) >= 3]
    if not arch_borders:
        return scene

    centroids_x = []
    locals_cache = []
    for border in arch_borders:
        local = to_local(_polygon_points(border))
        locals_cache.append(local)
        centroids_x.append(float(np.mean(local[:, 0])))
    max_abs_x = max((abs(x) for x in centroids_x), default=1.0) or 1.0

    for border, local, cx in zip(arch_borders, locals_cache, centroids_x):
        depth = _tooth_depth(border.get("id", ""))
        crown = _build_crown(local, depth)
        if crown is None:
            continue
        z_back = -ARCH_CURVE_DEPTH * (cx / max_abs_x) ** 2
        crown.apply_translation([0.0, 0.0, z_back])
        scene.add_geometry(crown, node_name=f"{arch_name}_{border.get('id', '')}")

    return scene


def _export_glb(scene: trimesh.Scene) -> bytes:
    if not scene.geometry:
        return _empty_glb()
    buffer = io.BytesIO()
    scene.export(file_obj=buffer, file_type="glb")
    return buffer.getvalue()


def _empty_glb() -> bytes:
    # GLB cannot encode an empty scene; emit a tiny invisible placeholder.
    placeholder = trimesh.creation.box(extents=[1e-4, 1e-4, 1e-4])
    scene = trimesh.Scene()
    scene.add_geometry(placeholder, node_name="placeholder")
    return _export_glb(scene)


def build_arch_mesh_glb(
    fit: dict[str, Any],
    arch2d: dict[str, Any] | None,
    borders: list[dict[str, Any]] | None = None,
) -> tuple[bytes, bytes]:
    valid = [b for b in (borders or []) if len(b.get("polygon", [])) >= 3]
    if not valid:
        return _empty_glb(), _empty_glb()

    # Silhouette extrusion from segmented polygons (templates are low-poly placeholders).
    to_local, _, _ = _normalization(valid)
    upper_scene = _build_arch_scene(valid, to_local, "upper")
    lower_scene = _build_arch_scene(valid, to_local, "lower")

    warnings: list[str] = []
    if not upper_scene.geometry:
        warnings.append("No upper-arch tooth outlines produced a mesh.")
    if not lower_scene.geometry:
        warnings.append("No lower-arch tooth outlines produced a mesh.")

    if warnings and isinstance(fit, dict):
        existing = fit.get("warnings") or []
        fit["warnings"] = [*existing, *warnings]

    return _export_glb(upper_scene), _export_glb(lower_scene)
