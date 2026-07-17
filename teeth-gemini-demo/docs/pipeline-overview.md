# Teeth Gemini Demo — Pipeline Overview

Living document for tech-PM and engineering stakeholders. Describes what each POC does today, known accuracy limits, and plausible evolution paths.

**App:** `teeth-gemini-demo/`  
**Last updated:** 2026-07-03

---

## Table of contents

1. [App overview](#app-overview)
2. [POC 1 — Teeth Preview](#poc-1--teeth-preview)
3. [POC 2 — Jaw Fit Scan](#poc-2--jaw-fit-scan)
4. [Presentation scripts](#presentation-scripts)

---

## App overview

The demo app hosts two independent proof-of-concepts behind a tab switcher:

| Tab | Purpose | Primary output |
|-----|---------|----------------|
| **Teeth Preview** | AI teeth segmentation → visual 3D model | Numbered 2D mask + glass 3D teeth |
| **Jaw Fit Scan** | Face landmarks → real-world measurements | Mouth/jaw widths in mm (iris + IPD calibration) |

```mermaid
flowchart TB
  subgraph app["Teeth Gemini Demo App"]
    direction LR
    POC1[Teeth Preview POC<br/>2D mask → 3D teeth]
    POC2[Jaw Fit Scan POC<br/>face landmarks → mm measurements]
  end

  POC1 --> O1[Output: visual tooth model<br/>for demo / education]
  POC2 --> O2[Output: jaw & mouth dimensions<br/>for sizing estimates]

  POC1 -.->|accuracy gap| G1[Generative AI mask]
  POC2 -.->|accuracy gap| G2[Single photo + average calibration]

  G1 --> F1[Future: trained segmentation or scan input]
  G2 --> F2[Future: profile depth + personalized scale]
```

---

## POC 1 — Teeth Preview

### Current pipeline

```mermaid
flowchart LR
  subgraph input["User input"]
    A[Capture or upload smile photo]
    B[Crop mouth region<br/>rectangle or mouth outline]
    C[Adjust brightness / contrast / sharpness]
  end

  subgraph ai["AI segmentation (background)"]
    D{API key present?}
    E[ChatGPT or Gemini<br/>color mask generation]
    F[Manual upload<br/>color mask fallback]
  end

  subgraph output["Results"]
    G[Parse mask →<br/>one color per tooth + gums]
    H[2D numbered preview]
    I[3D glass teeth view<br/>built from mask silhouette]
  end

  A --> B --> C --> D
  D -->|Yes| E
  D -->|No / error / user override| F
  E --> G
  F --> G
  G --> H
  G --> I
```

**Summary:** Photo in → AI (or manual mask) labels each tooth → we turn that 2D map into a numbered preview and a lightweight 3D model.

**Configuration:** Provider (OpenAI / Gemini) is set in `src/constants/demoConfig.ts` — not exposed in the UI. Default: ChatGPT.

**Flow steps in the app:** Capture → Crop → Adjust → Results (segmentation runs automatically on Results).

### Accuracy reality and evolution

Generative image models produce **approximate** tooth boundaries. The 3D view is a **stylized extrusion** from the 2D mask — not clinical geometry.

```mermaid
flowchart TB
  subgraph today["Today — generative AI mask (POC)"]
    T1[Smile photo]
    T2[GPT / Gemini image model]
    T3[Color-coded mask<br/>approximate tooth boundaries]
    T4[3D preview from 2D mask]
    T1 --> T2 --> T3 --> T4
  end

  subgraph limits["Known limitations"]
    L1[Not clinically precise]
    L2[Tooth edges can drift / merge / miss]
    L3[Lighting and crop quality affect output]
    L4[No true 3D geometry — depth is inferred]
  end

  subgraph paths["Paths to higher accuracy"]
    P1["Short term: human-in-the-loop<br/>crop + adjust + upload corrected mask<br/>(already supported)"]
    P2["Medium term: dedicated segmentation model<br/>U-Net / dental CV model on labeled teeth"]
    P3["Long term: clinical-grade input<br/>intraoral scan or CBCT → true 3D mesh"]
  end

  today --> limits
  limits --> paths
```

### Approach comparison (for planning discussions)

| | Generative AI (today) | Dedicated segmentation (concrete next step) | Clinical scan (gold standard) |
|---|---|---|---|
| **Input** | Phone photo | Phone photo | Scanner / CBCT |
| **Accuracy** | Directional / demo | Much tighter boundaries | Clinical |
| **Cost / speed** | Fast, cheap API | Model hosting + training | Hardware + workflow |
| **3D truth** | Stylized from 2D | Still mostly 2D→3D | Real 3D |

### Key code references

| Area | Path |
|------|------|
| Demo wizard | `teeth-gemini-demo/src/pages/GeminiTeethDemoPage.tsx` |
| Auto-segment hook | `teeth-gemini-demo/src/hooks/useDemoAutoSegment.ts` |
| Unified API | `src/api/teethSegmentation.ts` |
| Mask parsing + numbered 2D | `src/pages/TeethModeling/utils/colorMaskSeparation.ts` |
| 3D scene | `src/features/geminiTeeth/useTeethGemini3DScene.ts` |
| Mask → 3D geometry | `src/pages/TeethModeling/rendering/geminiMaskTo3D.ts` |

---

## POC 2 — Jaw Fit Scan

### Current pipeline

```mermaid
flowchart LR
  subgraph capture["Capture"]
    A[Selfie — camera or upload]
  end

  subgraph detect["Face analysis"]
    B[MediaPipe Face Landmarker<br/>478 landmarks on face]
    C{Iris visible?}
    D["Calibrate: iris diameter<br/>assume 11.7 mm"]
    E["Fallback: IPD<br/>assume 63 mm"]
  end

  subgraph measure["Measurements (mm)"]
    F[Mouth width]
    G[Jaw width]
    H[Face width]
    I[Lower-face height]
  end

  subgraph show["Presentation"]
    J[Face overlay — measurement lines on photo]
    K[Face mesh — 3D landmark view]
    L[Side-by-side Iris vs IPD table]
  end

  A --> B --> C
  C -->|Yes — preferred| D
  C -->|No| E
  D --> F & G & H & I
  E --> F & G & H & I
  F & G & H & I --> J & K & L
```

**Summary:** Selfie → MediaPipe finds face points → we scale pixels to mm using the eye as a ruler → show mouth/jaw widths with clear accuracy caveats.

**Flow in the app:** Capture → Results (MediaPipe pre-loads when the tab opens).

### Pixel → millimeter calibration

```mermaid
flowchart TB
  subgraph scale["Pixel → millimeter"]
    S1[Measure reference in pixels<br/>iris width or pupil distance]
    S2[Divide by known average size in mm]
    S3[Apply scale to jaw / mouth landmark chords]
  end

  subgraph compare["Two methods shown to user"]
    I["Iris — recommended<br/>±5–8% typical error"]
    P["IPD fallback<br/>±10–20% typical error"]
  end

  S1 --> S2 --> S3
  S3 --> I
  S3 --> P
```

**Landmarks used (MediaPipe indices):**

| Measurement | Landmarks | Use |
|-------------|-----------|-----|
| Mouth width | 61 → 291 | Primary sizing input |
| Jaw width (bigonial) | 172 → 397 | Handle-length proxy |
| Face width (bizygomatic) | 234 → 454 | Scale cross-check |
| Lower-face height | 152 → 1 | Vertical reference |

**Why iris is preferred over IPD:** Lower population variance (±3.4% vs ±11%+), less sensitive to head tilt, and closer to the jaw region in the image (similar lens distortion profile).

### Accuracy notes (shown in UI)

- **Calibration:** ±5–8% (iris) or ±10–20% (IPD fallback)
- **Landmark placement:** ±2–4% on well-lit, face-parallel photos
- **Jaw depth:** Not available from a single frontal photo
- **Not clinical:** Directional estimates only — CBCT or intraoral scan required for dental planning

### Future improvements

```mermaid
flowchart LR
  subgraph now["Current POC"]
    N1[Single frontal photo]
    N2[Population-average calibration]
    N3[Width and height only<br/>no jaw depth]
  end

  subgraph next["Near-term improvements"]
    X1[Guided capture UX<br/>lighting, distance, no glasses]
    X2[User-specific calibration<br/>optional measured iris / IPD]
    X3[Confidence score per measurement]
  end

  subgraph later["Higher accuracy paths"]
    Y1[Side-profile photo<br/>→ depth estimate]
    Y2[Multi-photo fusion<br/>front + side]
    Y3[Clinical validation study<br/>vs calipers / intraoral scan]
    Y4[Cross-check with intraoral width<br/>gold standard for mouth size]
  end

  now --> next --> later
```

### Key code references

| Area | Path |
|------|------|
| Demo page | `teeth-gemini-demo/src/pages/JawFitScanPage.tsx` |
| Face scan hook | `teeth-gemini-demo/src/hooks/useFaceScan.ts` |
| Measurements + calibration | `teeth-gemini-demo/src/utils/jawMeasurements.ts` |
| Constants + accuracy notes | `teeth-gemini-demo/src/constants/demoConfig.ts` |
| MediaPipe (shared) | `src/pages/DentalSimulation/faceLandmarker.ts` |

---

## Presentation scripts

### Teeth Preview (~30 seconds)

> We take a smile photo, optionally crop and tune it, then either ChatGPT/Gemini or a human-uploaded mask colors each tooth. That mask drives a 2D numbered view and a lightweight 3D preview. It's fast and good for demos, but boundaries are approximate — the product path is either better segmentation models or clinical 3D input.

### Jaw Fit Scan (~30 seconds)

> We take a frontal selfie, MediaPipe finds facial landmarks, and we convert pixel distances to millimeters using the iris as a ruler (IPD as backup). We show both calibrations so stakeholders see the uncertainty. Depth isn't available from one front photo — that's a clear future item (side view or scan).

---

## Maintaining this document

Update this file when:

- Pipeline steps or tabs change in the demo app
- A new segmentation provider or calibration method is added
- Accuracy claims or landmark indices change
- A planned improvement moves from "future" to "shipped"

Related user-facing copy: `teeth-gemini-demo/README.md` (setup and run instructions only).
