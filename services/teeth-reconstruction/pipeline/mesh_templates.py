"""Place anatomical tooth GLB templates on the fitted arch."""

from __future__ import annotations

import io
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import trimesh

ARCH_CURVE_DEPTH = 0.28
ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets" / "templates"

_KINDS_BY_INDEX = [
    "secondMolar",
    "firstMolar",
    "secondPremolar",
    "firstPremolar",
    "canine",
    "lateralIncisor",
    "centralIncisor",
    "centralIncisor",
    "lateralIncisor",
    "canine",
    "firstPremolar",
    "secondPremolar",
    "firstMolar",
    "secondMolar",
]


def _kind_from_label(label: str) -> tuple[str, str]:
    arch = "upper" if label.upper().startswith("U") else "lower"
    digits = "".join(ch for ch in label if ch.isdigit())
    index = int(digits) - 1 if digits else 6
    index = max(0, min(13, index))
    return _KINDS_BY_INDEX[index], arch


@lru_cache(maxsize=32)
def _load_template(kind: str, arch: str) -> trimesh.Trimesh | None:
    path = ASSETS_DIR / f"{kind}_{arch}.glb"
    if not path.exists():
        return None
    try:
        loaded = trimesh.load(path, force="mesh")
        if isinstance(loaded, trimesh.Trimesh):
            return loaded.copy()
        if isinstance(loaded, trimesh.Scene):
            meshes = [g for g in loaded.geometry.values() if isinstance(g, trimesh.Trimesh)]
            if meshes:
                return trimesh.util.concatenate(meshes)
    except Exception:  # noqa: BLE001
        return None
    return None


def _polygon_points(border: dict[str, Any]) -> np.ndarray:
    polygon = border.get("polygon", [])
    return np.array([[float(p["x"]), float(p["y"])] for p in polygon], dtype=np.float64)


def _normalization(borders: list[dict[str, Any]]):
    all_pts = np.concatenate(
        [_polygon_points(b) for b in borders if len(b.get("polygon", [])) >= 3]
    )
    min_xy = all_pts.min(axis=0)
    max_xy = all_pts.max(axis=0)
    center = (min_xy + max_xy) / 2.0
    span_x = max(max_xy[0] - min_xy[0], 1.0)
    scale = 0.92 / span_x

    def to_local(pts: np.ndarray) -> np.ndarray:
        local = np.empty_like(pts)
        local[:, 0] = (pts[:, 0] - center[0]) * scale
        local[:, 1] = (center[1] - pts[:, 1]) * scale
        return local

    return to_local


def _build_arch_scene(
    borders: list[dict[str, Any]],
    to_local,
    arch_name: str,
) -> trimesh.Scene:
    scene = trimesh.Scene()
    arch_borders = [
        b for b in borders if b.get("arch") == arch_name and len(b.get("polygon", [])) >= 3
    ]
    if not arch_borders:
        return scene

    centroids_x: list[float] = []
    placements: list[tuple[dict[str, Any], np.ndarray, float, float, float]] = []

    for border in arch_borders:
        pts = _polygon_points(border)
        local = to_local(pts)
        cx = float(np.mean(local[:, 0]))
        cy = float(np.mean(local[:, 1]))
        width = float(np.max(local[:, 0]) - np.min(local[:, 0]))
        height = float(np.max(local[:, 1]) - np.min(local[:, 1]))
        centroids_x.append(cx)
        placements.append((border, local, cx, cy, max(width, 0.04), max(height, 0.05)))

    max_abs_x = max((abs(x) for x in centroids_x), default=1.0) or 1.0

    for border, _local, cx, cy, width, height in placements:
        label = border.get("id", "U7")
        kind, template_arch = _kind_from_label(label)
        template = _load_template(kind, template_arch)
        if template is None:
            continue

        mesh = template.copy()
        bounds = mesh.bounds
        template_size = bounds[1] - bounds[0]
        template_width = max(float(template_size[0]), 1e-6)
        template_height = max(float(template_size[1]), 1e-6)
        template_depth = max(float(template_size[2]), 1e-6)

        sx = width / template_width
        sy = height / template_height
        sz = (width * 0.72) / template_depth
        mesh.apply_scale([sx, sy, sz])

        # Center template on tooth centroid; templates are authored near origin.
        mesh_centroid = mesh.centroid
        z_back = -ARCH_CURVE_DEPTH * (cx / max_abs_x) ** 2
        mesh.apply_translation([
            cx - mesh_centroid[0],
            cy - mesh_centroid[1],
            z_back - mesh_centroid[2],
        ])

        scene.add_geometry(mesh, node_name=f"{arch_name}_{label}")

    return scene


def _export_glb(scene: trimesh.Scene) -> bytes:
    buffer = io.BytesIO()
    scene.export(file_obj=buffer, file_type="glb")
    return buffer.getvalue()


def _empty_glb() -> bytes:
    placeholder = trimesh.creation.box(extents=[1e-4, 1e-4, 1e-4])
    scene = trimesh.Scene()
    scene.add_geometry(placeholder, node_name="placeholder")
    return _export_glb(scene)


def build_template_arch_mesh_glb(
    borders: list[dict[str, Any]] | None,
) -> tuple[bytes, bytes]:
    valid = [b for b in (borders or []) if len(b.get("polygon", [])) >= 3]
    if not valid:
        return _empty_glb(), _empty_glb()

    to_local = _normalization(valid)
    upper_scene = _build_arch_scene(valid, to_local, "upper")
    lower_scene = _build_arch_scene(valid, to_local, "lower")
    return _export_glb(upper_scene), _export_glb(lower_scene)
