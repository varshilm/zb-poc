import type { TeethEffectSettings } from '@/pages/DentalSimulation/types';
import { canAccessDentalSimulation } from '@/utils/roles';

import type { TeethCaptureMode } from './types';

/**
 * Teeth-only modeling feature toggles.
 */
export const TEETH_MODELING_FEATURES = {
  /** Standalone Teeth Modeling link in the app sidebar (role gate still applies). */
  showTeethModelingNav: true,
} as const;

export function isTeethModelingNavEnabled(roles: readonly string[]): boolean {
  return TEETH_MODELING_FEATURES.showTeethModelingNav && canAccessDentalSimulation(roles);
}

export const TEETH_MODELING_DISCLAIMER =
  'Tooth outlines and 3D approximation are derived from photo segmentation — not clinical CBCT, radiographs, or a treatment plan.';

export const ML_SERVICE_REQUIRED_MESSAGE =
  'Teeth reconstruction requires VITE_ENABLE_TEETH_ML=true and a running service at VITE_TEETH_RECON_API_URL.';

export const TEETH_ANALYSIS_VIEW_LABELS = {
  detectedTeeth: 'Detected teeth',
  mouthCrop: 'Mouth crop',
  toothBorders: 'Tooth borders',
  lipMask: 'Inner lip mask',
  localHeatmap: 'Local heatmap',
  idealArches: 'Ideal arch diagram',
  dottedTeeth: 'Template teeth on photo',
  idealComparison: 'Ideal vs yours',
  templateOverlay: 'Template overlay',
  projectionOverlay: 'ML reconstruction',
  instanceMasks: 'Instance masks',
  landmarks: 'Face landmarks (debug)',
} as const;

export type TeethAnalysisViewId = keyof typeof TEETH_ANALYSIS_VIEW_LABELS;

export const TEETH_ANALYSIS_VIEW_ORDER: readonly TeethAnalysisViewId[] = [
  'mouthCrop',
  'toothBorders',
  'templateOverlay',
  'idealComparison',
  'idealArches',
  'dottedTeeth',
  'detectedTeeth',
  'instanceMasks',
  'lipMask',
  'localHeatmap',
  'projectionOverlay',
  'landmarks',
];

export const TEETH_CAPTURE_MODE_LABELS = {
  fullFace: 'Full face smile',
  teethOnly: 'Teeth close-up',
} as const satisfies Record<TeethCaptureMode, string>;

export const TEETH_CAPTURE_MODE_ORDER = ['fullFace', 'teethOnly'] as const satisfies readonly TeethCaptureMode[];

export const SMILE_MARKETING_CAPABILITIES = [
  {
    id: 'ai-smile-scan',
    title: 'AI Smile Scan',
    description: 'Guided selfie capture with instant quality feedback.',
  },
  {
    id: 'smile-health-map',
    title: 'Smile Health Map',
    description: 'Heatmap and mouth-region analysis patients can understand.',
  },
  {
    id: 'digital-smile-design',
    title: 'Digital Smile Design',
    description: 'Personalized 2D overlay with doctor adjust controls.',
  },
  {
    id: '3d-smile-model',
    title: '3D Smile Model',
    description: 'Interactive dotted, solid, glossy, and lattice arch previews.',
  },
  {
    id: 'shareable-assets',
    title: 'Shareable Assets',
    description: 'Export hero images for website and social media.',
  },
  {
    id: 'virtual-consult',
    title: 'Virtual Consult Funnel',
    description: 'Public smile preview flow with book-a-consult CTA.',
  },
] as const;

export const SMILE_PREVIEW_BOOK_CTA_URL = 'https://example.com/book-consultation';

export const SMILE_JOURNEY_STEPS = [
  { id: 'capture', label: 'Capture' },
  { id: 'analyze', label: 'Analyze' },
  { id: 'design', label: 'Design' },
  { id: 'model3d', label: '3D model' },
  { id: 'export', label: 'Export' },
] as const;

export const LIP_GAP_VISIBILITY_THRESHOLD = 0.018;

export const FRONTAL_SYMMETRY_THRESHOLD = 0.08;

/** Baseline overlay — no device simulation warp (matches dental simulation teeth-off behavior). */
export const BASELINE_TEETH_EFFECT: TeethEffectSettings = {
  enabled: false,
  mode: 'subtle',
};

export const BASELINE_OVERLAY_INTENSITY = 0;
