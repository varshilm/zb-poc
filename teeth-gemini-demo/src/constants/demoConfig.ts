import type { TeethSegmentProvider } from '@/api/teethSegmentation';

/** Demo app configuration — provider selection is not exposed in the UI. */
export const DEMO_TEETH_SEGMENT_PROVIDER: TeethSegmentProvider = 'openai';

export type DemoCropShape = 'rectangle' | 'mouth';

export const DEMO_CROP_SHAPE_LABELS: Record<DemoCropShape, string> = {
  rectangle: 'Rectangle',
  mouth: 'Mouth outline',
};

/** Free crop or fixed aspect ratios for rectangular mode. */
export type DemoRectAspectPreset = 'free' | '4:3' | '3:4' | '1:1';

export const DEMO_RECT_ASPECT_PRESETS: Array<{
  id: DemoRectAspectPreset;
  label: string;
  value: number | undefined;
}> = [
  { id: 'free', label: 'Free', value: undefined },
  { id: '4:3', label: '4:3', value: 4 / 3 },
  { id: '3:4', label: '3:4', value: 3 / 4 },
  { id: '1:1', label: 'Square', value: 1 },
];

/**
 * Default pentagon tracing an open-mouth oval from a frontal smile.
 * Normalized 0–1 coordinates relative to the full image.
 */
export const DEFAULT_MOUTH_PENTAGON = [
  { x: 0.18, y: 0.32 },
  { x: 0.5, y: 0.14 },
  { x: 0.82, y: 0.32 },
  { x: 0.74, y: 0.86 },
  { x: 0.26, y: 0.86 },
] as const;

export type NormalizedPoint = { x: number; y: number };

export const DEMO_DISCLAIMER =
  'AI-generated segmentation is illustrative only — not clinical CBCT, radiographs, or a treatment plan.';

// ---------------------------------------------------------------------------
// Jaw Fit Scan constants
// ---------------------------------------------------------------------------

/** Average adult iris diameter in mm. SD ~0.4mm; range 11.0–12.4mm. */
export const IRIS_DIAMETER_MM = 11.7;

/** Average adult interpupillary distance in mm. Used as fallback when iris
 *  contour landmarks (indices 469-472, 474-477) are unavailable. */
export const IPD_AVERAGE_MM = 63;

export type ToothbrushSize = 'S' | 'M' | 'L' | 'XL';

export type JawSizeThreshold = {
  size: ToothbrushSize;
  label: string;
  description: string;
  maxMouthWidthMm: number;
};

/** Mouth width (landmarks 61→291) thresholds for toothbrush head sizing. */
export const JAW_SIZE_THRESHOLDS: JawSizeThreshold[] = [
  { size: 'S', label: 'Petite', description: 'Child or small adult mouth', maxMouthWidthMm: 42 },
  { size: 'M', label: 'Standard', description: 'Standard adult mouth', maxMouthWidthMm: 49 },
  { size: 'L', label: 'Wide', description: 'Wider adult mouth', maxMouthWidthMm: 56 },
  { size: 'XL', label: 'Extra-wide', description: 'Extra-wide adult mouth', maxMouthWidthMm: Infinity },
];

export type CalibrationMethod = 'iris' | 'ipd';

export const JAW_SCAN_ACCURACY_NOTES = [
  {
    title: 'Calibration accuracy: ±5–8%',
    detail:
      'Iris diameter varies from 11.0 to 12.4mm across adults. The 11.7mm baseline can introduce up to ±4% error before any other factor.',
  },
  {
    title: 'Landmark placement: ±2–4%',
    detail:
      'Best on well-lit, face-parallel photos at arm\'s length. Side angles, glasses, or uneven lighting degrade accuracy.',
  },
  {
    title: 'Jaw depth: not available from this photo',
    detail:
      'Frontal photos only give width and height. A side-profile photo or 3D intraoral scan is required for depth.',
  },
] as const;
