# Teeth Gemini Demo

Mobile-first React proof of concept containing two independent dental experiences:

- **Teeth Preview** turns a frontal smile photo into an AI-generated color mask, a numbered 2D preview, and an interactive glass-like 3D approximation.
- **Jaw Fit Scan** uses MediaPipe face landmarks to estimate mouth and jaw dimensions and recommend a toothbrush-head size.

This is an illustrative product and engineering demo, not a clinical scan, diagnosis, radiograph, CBCT result, or treatment plan.

## Quick start

Requirements: Node.js 24 or newer and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5174. An AI key is optional because the Teeth Preview can accept a manually uploaded color mask.

## Product flows

### Teeth Preview

1. **Capture** — open the device camera or upload a frontal smile photo.
2. **Crop** — use a free/fixed rectangle or adjust the five-point mouth outline.
3. **Adjust** — tune brightness, contrast, and sharpness; the result is exported as an image file.
4. **Segment** — the configured AI provider generates a black-background mask with a separate solid color for each tooth and magenta for gum tissue.
5. **Interpret** — browser-side canvas processing finds connected color regions, traces and simplifies their contours, assigns `U1…U16` / `L1…L16`, and creates a numbered preview.
6. **Render** — Three.js extrudes the 2D contours into an orbitable, glass-like approximation. This is not anatomically reconstructed tooth depth.

If segmentation is unavailable or inaccurate, the Results step supports uploading a replacement mask and retrying the AI request.

### Jaw Fit Scan

1. Capture or upload a front-facing portrait.
2. MediaPipe Face Landmarker runs locally in the browser and returns one face mesh.
3. Iris diameter is used as the preferred pixel-to-millimeter calibration; average interpupillary distance is the fallback.
4. Mouth, jaw, and face measurements are derived from landmark distances.
5. Mouth width thresholds map the result to `S`, `M`, `L`, or `XL`, with a photo overlay and interactive face-mesh view.

The jaw estimate is sensitive to camera angle, lighting, glasses, image resolution, and natural variation in iris/IPD size. A frontal image cannot measure jaw depth.

## Architecture and data flow

```text
src/App.tsx
├── Teeth Preview
│   ├── pages/GeminiTeethDemoPage.tsx       step orchestration
│   ├── components/DemoPhoto*.tsx           capture, crop, adjust
│   ├── hooks/useDemoAutoSegment.ts         provider request and retries
│   ├── api/teethSegmentation.ts            OpenAI/Gemini adapter
│   ├── features/.../useTeethMaskPipeline   mask parsing and numbering
│   └── features/.../useTeethGemini3DScene  Three.js lifecycle
└── Jaw Fit Scan
    ├── pages/JawFitScanPage.tsx             scan state and results UI
    ├── hooks/useFaceScan.ts                 MediaPipe orchestration
    ├── utils/jawMeasurements.ts             calibration and measurements
    └── FaceLandmarkOverlay/FaceMesh3DView   2D and 3D visualization
```

Important implementation details:

- Navigation is local React state; there is no router or backend-owned session.
- Photos, masks, contours, and meshes stay in browser memory as files, data URLs, canvas pixels, and Three.js objects.
- The default segmentation provider is the compile-time constant `DEMO_TEETH_SEGMENT_PROVIDER` in `src/constants/demoConfig.ts`; it is not selectable in the UI.
- OpenAI and Gemini provider modules normalize errors into `TeethSegmentationError` codes and retry rate limits.
- Mask parsing requires at least four detected teeth, ignores near-black pixels, uses connected-component flood fill, and caps each arch at 16 teeth.
- `src/pages/TeethModeling/` and `src/pages/DentalSimulation/` contain reusable geometry, rendering, landmark, and type utilities rather than mounted routes.

For stakeholder diagrams, accuracy trade-offs, future approaches, and presentation scripts, see [`docs/pipeline-overview.md`](docs/pipeline-overview.md).

## Configuration

Create `.env` from [`.env.example`](.env.example). Vite exposes all `VITE_*` values to browser code.

| Variable | Purpose | Default |
|---|---|---|
| `VITE_OPENAI_API_KEY` | OpenAI image API key for the default provider | empty |
| `VITE_OPENAI_IMAGE_MODEL` | OpenAI image model | `gpt-image-1` |
| `VITE_GEMINI_API_KEY` | Gemini API key when the provider constant is `gemini` | empty |
| `VITE_GEMINI_IMAGE_MODEL` | Gemini image model | `gemini-2.0-flash-exp` |
| `VITE_ENABLE_TEETH_ML` | Enables the optional reconstruction client configuration | `false` |
| `VITE_TEETH_RECON_API_URL` | Reconstruction service base URL | `http://localhost:5001` |
| `VITE_TEETH_DREAMER_API_URL` | Reserved TeethDreamer service URL | empty |
| `VITE_ROLE_LABELS` | Optional JSON role-label overrides | empty |

Provider selection requires changing `DEMO_TEETH_SEGMENT_PROVIDER` and restarting Vite.

> Do not ship browser-embedded API keys. Production usage should send image requests through an authenticated backend proxy with rate limits, validation, logging, and secret management.

### Optional reconstruction service

`src/api/teethReconstruct.ts` defines clients for:

- `POST /teeth/reconstruct`
- `POST /teeth/reconstruct/multi`

The currently mounted Teeth Preview does not call this client; its visible 3D result is generated locally from mask contours. Treat the reconstruction variables and client as integration scaffolding until a result flow explicitly wires them in.

## Development

| Command | Description |
|---|---|
| `npm run dev` | Start Vite on port 5174 |
| `npm run build` | Build production assets into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run lint` | Lint JS/TS/React source files |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Run Jest in watch mode |

Tests currently cover image adjustments and polygon cropping. AI provider responses, color-mask separation, Three.js rendering, face measurements, and full user flows do not yet have automated coverage.

## Runtime dependencies and constraints

- The Jaw Fit Scan downloads MediaPipe WASM from jsDelivr and the face-landmarker model from Google Storage, then requests a GPU delegate. It therefore needs network access on first load and a compatible browser.
- Camera capture requires browser media permission and generally a secure origin outside localhost.
- AI segmentation calls third-party APIs directly from the browser and sends the adjusted mouth photo to the selected provider.
- The result quality is bounded by the generated mask. Tooth numbering is left-to-right within inferred upper/lower halves, not FDI or Universal clinical notation.
- Object URLs, render loops, controls, observers, and Three.js resources are disposed when the result scene unmounts.

## Working on the project

- Keep the two POCs independent unless a feature explicitly combines their data.
- Preserve the manual mask fallback when changing segmentation behavior.
- Update `.env.example`, this README, and `src/vite-env.d.ts` together when adding environment variables.
- Put provider-specific behavior in `src/api/*TeethSegment.ts` and keep UI code dependent on the normalized adapter.
- Keep heavy image/geometry logic out of page components; use hooks and the existing `TeethModeling` / `DentalSimulation` utilities.
- Test with mobile layouts and both camera and file-upload paths.
- Keep user-facing accuracy limitations visible when measurement or reconstruction behavior changes.
