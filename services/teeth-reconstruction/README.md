# Teeth Reconstruction Service

Local Flask service for per-tooth segmentation and silhouette-driven 3D arch reconstruction from a single frontal smile photo.

## Pipeline

1. **Segmentation (anterior / teeth close-up):** gap-aware enamel mask → distance-transform seeds from visible tooth columns → Voronoi split → watershed boundary refine (`engine: watershed_enamel`). Falls back to per-column brightness, then MobileSAM, then classical template snap.
2. **Segmentation (other views):** MobileSAM or classical snap with synthetic `arch2D` for the view role.
3. **3D reconstruction:** each tooth mask silhouette is extruded into a domed crown and placed on the dental arch.

Inspired by [SJTUzhou](https://github.com/SJTUzhou/3D-Teeth-Reconstruction-from-Five-Intra-oral-Images) and [TeethDreamer](https://github.com/ShanghaiTech-IMPACT/TeethDreamer), using a modern, maintainable Python stack.

> Note: MobileSAM weights (`mobile_sam.pt`, Apache-2.0) are auto-downloaded by Ultralytics on first run. `ultralytics` pulls in PyTorch; first install is large. CPU inference is supported.

## Setup

```bash
cd services/teeth-reconstruction
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export FLASK_APP=app.py
flask run --port 5001
```

Or from repo root:

```bash
npm run teeth:service
```

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Service health check |
| POST | `/teeth/analyze` | 2D border segmentation + overlay PNG |
| POST | `/teeth/reconstruct` | Single-view 3D mesh (GLB) + projection overlay |
| POST | `/teeth/reconstruct/multi` | Multi-view reconstruction (5 orthodontic views) |

### Example: analyze

```bash
curl -X POST http://localhost:5001/teeth/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"<base64>", "mouthRoi": {"sx":0,"sy":0,"sw":400,"sh":300}}'
```

## Frontend wiring

In `.env.local`:

```
VITE_ENABLE_TEETH_ML=true
VITE_TEETH_RECON_API_URL=http://localhost:5001
```

Then run `npm run dev` and upload a frontal smile on `/teeth-modeling`.

## PHI / security

- **Local dev only** — no persistence, no auth in this service.
- Production requires auth, encryption, retention policy, and BAA before sending patient photos.

## Modules

- `pipeline/segment_sam.py` — MobileSAM per-tooth segmentation (primary).
- `pipeline/segment.py` — classical OpenCV fallback.
- `pipeline/mesh_build.py` — silhouette extrusion + arch placement.
- `pipeline/project.py` — overlay of borders projected onto the photo.
- `pipeline/fit_arch.py` — arch scale/depth fitting.

## Upgrade path

1. Swap MobileSAM for a dental-specific segmentation model (e.g. licensed SegmentAnyTooth weights) by adding an engine in `segment_sam.py`.
2. Add a 5-view + GPU neural path (TeethDreamer) for high-fidelity geometry.
3. Extend `fit_arch.py` for full multi-view optimization.
