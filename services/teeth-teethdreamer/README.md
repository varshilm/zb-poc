# TeethDreamer GPU wrapper service

Optional **high-fidelity** teeth reconstruction backend using
[TeethDreamer](https://github.com/ShanghaiTech-IMPACT/TeethDreamer).

> **Does not run on Apple Silicon.** Deploy on Linux with an NVIDIA GPU (cloud recommended).

## Prerequisites

1. Clone TeethDreamer and install its environment (see upstream README).
2. Download all checkpoints into `TEETHDREAMER_HOME/ckpt/`.
3. NVIDIA driver + CUDA 11.6+ compatible GPU.

## Local wrapper (development)

```bash
cd services/teeth-teethdreamer
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export TEETHDREAMER_HOME=/path/to/TeethDreamer
export PORT=5003
python app.py
```

`GET /health` reports whether TeethDreamer checkpoints are visible.

## Docker (production on GPU host)

```bash
docker build -t teeth-dreamer .
docker run --gpus all -p 5003:5003 \
  -e TEETHDREAMER_HOME=/opt/TeethDreamer \
  -v /path/to/TeethDreamer:/opt/TeethDreamer:ro \
  teeth-dreamer
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service + TeethDreamer availability |
| POST | `/teeth/reconstruct/teethdreamer` | 5 intra-oral views → GLB meshes (async job when fully wired) |

Request body matches the webapp multi-view payload:

```json
{
  "views": [
    { "role": "anterior", "imageBase64": "..." },
    { "role": "left", "imageBase64": "..." },
    { "role": "right", "imageBase64": "..." },
    { "role": "maxillary", "imageBase64": "..." },
    { "role": "mandibular", "imageBase64": "..." }
  ]
}
```

## Status

The wrapper currently validates inputs and reports setup status. Full subprocess orchestration
(TeethDreamer.py + instant-nsr-pl) is staged behind `TEETHDREAMER_HOME` — enable once
checkpoints are installed on a GPU machine.

See [docs/teethdreamer-integration.md](../../docs/teethdreamer-integration.md) for Mac vs GPU guidance.
