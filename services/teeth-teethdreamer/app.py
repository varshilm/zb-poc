"""TeethDreamer GPU wrapper — optional high-fidelity reconstruction backend.

Runs on Linux + NVIDIA GPU only. On Mac, /health explains that TeethDreamer
is not available locally; use teeth-reconstruction instead.
"""

from __future__ import annotations

import base64
import os
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

TEETHDREAMER_HOME = Path(os.environ.get("TEETHDREAMER_HOME", "/opt/TeethDreamer"))
REQUIRED_CKPTS = [
    "ckpt/TeethDreamer.ckpt",
    "ckpt/zero123-xl.ckpt",
    "ckpt/ViT-L-14.ckpt",
    "ckpt/sam_vit_b_01ec64.pth",
]

ROLE_TO_INDEX = {
    "anterior": 0,
    "left": 1,
    "right": 2,
    "maxillary": 3,
    "mandibular": 4,
}


def dreamer_status() -> dict:
    missing = [p for p in REQUIRED_CKPTS if not (TEETHDREAMER_HOME / p).exists()]
    script_ok = (TEETHDREAMER_HOME / "TeethDreamer.py").exists()
    return {
        "home": str(TEETHDREAMER_HOME),
        "scriptPresent": script_ok,
        "checkpointsPresent": len(missing) == 0,
        "missingCheckpoints": missing,
        "ready": script_ok and len(missing) == 0,
    }


@app.get("/health")
def health():
    status = dreamer_status()
    return jsonify({
        "status": "ok" if status["ready"] else "setup_required",
        "service": "teeth-teethdreamer",
        "platform": "nvidia_cuda_required",
        "teethDreamer": status,
        "message": (
            "TeethDreamer is ready for inference."
            if status["ready"]
            else "Install TeethDreamer + checkpoints on a Linux NVIDIA GPU host. "
            "See docs/teethdreamer-integration.md"
        ),
    })


@app.post("/teeth/reconstruct/teethdreamer")
def reconstruct_teethdreamer():
    body = request.get_json(silent=True) or {}
    views = body.get("views") or []

    if len(views) < 5:
        return jsonify({
            "error": "TeethDreamer requires all 5 intra-oral views "
            "(anterior, left, right, maxillary, mandibular).",
        }), 400

    status = dreamer_status()
    if not status["ready"]:
        return jsonify({
            "error": "TeethDreamer is not installed on this host.",
            "teethDreamer": status,
            "hint": "Deploy on a Linux machine with NVIDIA GPU. Mac (Apple Silicon) is not supported.",
            "docs": "docs/teethdreamer-integration.md",
        }), 503

    roles = {v.get("role") for v in views if v.get("imageBase64")}
    required = set(ROLE_TO_INDEX.keys())
    if not required.issubset(roles):
        return jsonify({
            "error": f"Missing views. Required: {sorted(required)}. Got: {sorted(roles)}.",
        }), 400

    # Validate images decode
    for view in views:
        image_base64 = view.get("imageBase64", "")
        if not image_base64:
            continue
        payload = image_base64.split(",", 1)[-1]
        try:
            base64.b64decode(payload)
        except Exception:
            return jsonify({"error": f"Invalid image for role {view.get('role')}"}), 400

    # Full pipeline orchestration (seg → TeethDreamer.py → instant-nsr-pl) is GPU-specific
    # and long-running; wire subprocess calls here once TEETHDREAMER_HOME is populated.
    return jsonify({
        "error": "TeethDreamer inference orchestration is not yet wired in this wrapper.",
        "teethDreamer": status,
        "nextSteps": [
            "Complete automated segmentation (replace interactive seg_teeth.py).",
            "Run TeethDreamer.py on GPU with segmented inputs.",
            "Run instant-nsr-pl/run.py for upper and lower arches.",
            "Return GLB + projection overlay to the webapp.",
        ],
    }), 501


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5003"))
    app.run(host="0.0.0.0", port=port, debug=True)
