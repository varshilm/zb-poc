import { canAccessDentalSimulation } from '@/utils/roles';

import type { DevicePreset, DentalSimulationDeviceId, DeviceWarpProfile } from './types';

/**
 * Dental simulation feature toggles. Flip flags here (or wire to remote config later).
 */
export const DENTAL_SIMULATION_FEATURES = {
  /** Overview / Simulation tab on patient detail (role gate still applies). */
  showPatientSimulationNav: true,
  /** Standalone Dental Simulation link in the app sidebar (role gate still applies). */
  showSidebarDentalSimulationNav: true,
  /** Upload, webcam capture, reset, face-mapping status, and source-mode status. */
  showCameraSource: true,
  /** Measurements panel with per-product metric sliders. */
  showProductMeasurements: true,
  /** Smile and teeth detail visualization controls in the device profile panel. */
  showTeethSimulation: true,
  /** Simulation intensity slider for 2D preview and 3D projection. */
  showIntensityAndProjectionMetrics: true,
} as const;

export function isDentalSimulationNavEnabled(roles: readonly string[]): boolean {
  return (
    DENTAL_SIMULATION_FEATURES.showPatientSimulationNav && canAccessDentalSimulation(roles)
  );
}

export function isDentalSimulationSidebarNavEnabled(roles: readonly string[]): boolean {
  return (
    DENTAL_SIMULATION_FEATURES.showSidebarDentalSimulationNav &&
    canAccessDentalSimulation(roles)
  );
}

export const MEDICAL_DISCLAIMER =
  'This is a visual preview based on your facial landmarks to help guide your discussion. It is not a clinical diagnosis, medical prediction, or treatment recommendation.';
//'This visualization is a conservative facial approximation derived from face landmarks. It supports treatment discussion and expectation-setting, but it is not a clinical prediction or diagnostic output.';

export const DEVICE_PRESETS: readonly DevicePreset[] = [
  {
    id: 'expander',
    label: 'Expander',
    shortLabel: 'Expansion',
    summary: 'Subtle widening through the mid-face and smile line.',
    medicalIntent: 'Emphasizes transverse expansion with conservative cheek and smile broadening.',
    caution: 'Keep changes restrained to avoid over-promising skeletal or soft-tissue response.',
    profile: {
      cheekX: 0.06,
      cheekY: -0.01,
      jawX: 0.02,
      jawY: 0,
      chinX: 0,
      chinY: 0,
      mouthX: 0.05,
      mouthY: -0.01,
      upperLipY: -0.01,
      lowerLipY: 0.005,
    },
  },
  {
    id: 'mad',
    label: 'Mandibular Advancement Device',
    shortLabel: 'MAD',
    summary: 'Forward-emphasis through the lower third and chin support.',
    medicalIntent: 'Simulates modest lower-face projection and slightly stronger jaw definition.',
    caution: 'Frontal images cannot express true sagittal advancement, so the preview stays intentionally subtle.',
    profile: {
      cheekX: 0.005,
      cheekY: 0,
      jawX: 0.025,
      jawY: 0.015,
      chinX: 0,
      chinY: 0.03,
      mouthX: 0.01,
      mouthY: -0.005,
      upperLipY: -0.004,
      lowerLipY: 0.012,
    },
  },
  {
    id: 'aligners',
    label: 'Aligners',
    shortLabel: 'Aligners',
    summary: 'Minor smile-line and lip symmetry refinement.',
    medicalIntent: 'Highlights small soft-tissue refinements around the lips and oral commissures.',
    caution: 'Aligner effects are subtle at the face level; large changes would be misleading.',
    profile: {
      cheekX: 0.015,
      cheekY: 0,
      jawX: 0,
      jawY: 0,
      chinX: 0,
      chinY: 0.004,
      mouthX: 0.025,
      mouthY: -0.012,
      upperLipY: -0.01,
      lowerLipY: -0.004,
    },
  },
  {
    id: 'nightGuard',
    label: 'Night Guard',
    shortLabel: 'Night Guard',
    summary: 'Mostly neutral with a mild appliance-presence effect.',
    medicalIntent: 'Keeps the baseline face shape nearly unchanged for a realistic guard-use preview.',
    caution: 'Night guards should not imply structural facial change in an MVP visualizer.',
    profile: {
      cheekX: 0,
      cheekY: 0,
      jawX: 0,
      jawY: 0.004,
      chinX: 0,
      chinY: 0.004,
      mouthX: 0.004,
      mouthY: 0.002,
      upperLipY: 0.006,
      lowerLipY: 0.008,
    },
  },
  {
    id: 'retainer',
    label: 'Retainer',
    shortLabel: 'Retainer',
    summary: 'Near-baseline stabilization with only minimal soft-tissue change.',
    medicalIntent: 'Preserves facial proportions while still letting users compare a supported after state.',
    caution: 'Retainers typically maintain results rather than create new visible facial changes.',
    profile: {
      cheekX: 0.004,
      cheekY: 0,
      jawX: 0,
      jawY: 0.002,
      chinX: 0,
      chinY: 0.002,
      mouthX: 0.008,
      mouthY: -0.002,
      upperLipY: -0.002,
      lowerLipY: 0.002,
    },
  },
] as const;

export const DEFAULT_DEVICE_ID: DentalSimulationDeviceId = 'expander';
export const DEFAULT_INTENSITY = 45;

export const MAX_PREVIEW_EDGE_PX = 960;

export type DeviceMetricControl = {
  key: keyof DeviceWarpProfile;
  label: string;
  helper: string;
  min: number;
  max: number;
  step: number;
};

export const DEVICE_METRIC_CONTROLS: Record<DentalSimulationDeviceId, readonly DeviceMetricControl[]> = {
  expander: [
    {
      key: 'cheekX',
      label: 'Paranasal / cheek widening',
      helper: 'RME/SARME studies consistently report mild lateral changes around paranasal-cheek region and alar base.',
      min: 0,
      max: 12,
      step: 0.5,
    },
    {
      key: 'mouthX',
      label: 'Smile arc width',
      helper: 'Applied conservatively to reflect reduced buccal corridor appearance after transverse expansion.',
      min: 0,
      max: 12,
      step: 0.5,
    },
    {
      key: 'upperLipY',
      label: 'Upper lip support',
      helper: 'Small vertical lip support shift only; avoid large lip prediction from a frontal image.',
      min: -4,
      max: 4,
      step: 0.5,
    },
    {
      key: 'chinY',
      label: 'Lower-third balance',
      helper: 'Keep near neutral because expansion primarily affects mid-face and nasal soft tissues.',
      min: -4,
      max: 4,
      step: 0.5,
    },
  ],
  mad: [
    {
      key: 'chinY',
      label: 'Chin prominence projection',
      helper: 'MAD evidence is stronger for occlusal/dental adaptation than dramatic facial soft-tissue change; keep subtle.',
      min: -2,
      max: 10,
      step: 0.5,
    },
    {
      key: 'jawY',
      label: 'Mandibular border definition',
      helper: 'Represents perceived lower-third definition, not true skeletal movement.',
      min: -2,
      max: 8,
      step: 0.5,
    },
    {
      key: 'lowerLipY',
      label: 'Lower lip posture',
      helper: 'MAD and incisor changes can influence lip posture over time; use conservative range in MVP.',
      min: -4,
      max: 8,
      step: 0.5,
    },
    {
      key: 'mouthY',
      label: 'Oral commissure posture',
      helper: 'Mild cue to represent altered oral posture from mandibular advancement usage.',
      min: -4,
      max: 4,
      step: 0.5,
    },
  ],
  aligners: [
    {
      key: 'mouthX',
      label: 'Smile symmetry / width',
      helper: 'Aligner-related facial effects are usually subtle; smile contour refinements are the primary visible cue.',
      min: -2,
      max: 8,
      step: 0.5,
    },
    {
      key: 'upperLipY',
      label: 'Upper lip profile support',
      helper: 'Tooth movement and elastics can alter upper lip support in select cases; modeled as low-amplitude shift.',
      min: -5,
      max: 5,
      step: 0.5,
    },
    {
      key: 'lowerLipY',
      label: 'Lower lip contour',
      helper: 'Lower lip contour response varies with incisor movement; keep bounded for realistic MVP output.',
      min: -5,
      max: 5,
      step: 0.5,
    },
    {
      key: 'chinY',
      label: 'Chin contour carryover',
      helper: 'Included as a very small secondary effect, not a jaw-position predictor.',
      min: -3,
      max: 3,
      step: 0.5,
    },
  ],
  nightGuard: [
    {
      key: 'upperLipY',
      label: 'Upper lip fullness cue',
      helper: 'Night guard is expected to have minimal facial change; this only simulates temporary appliance presence.',
      min: -2,
      max: 4,
      step: 0.5,
    },
    {
      key: 'lowerLipY',
      label: 'Lower lip fullness cue',
      helper: 'Maintains near-baseline while allowing providers to demonstrate subtle guard-related fullness.',
      min: -2,
      max: 4,
      step: 0.5,
    },
    {
      key: 'mouthY',
      label: 'Mouth closure posture',
      helper: 'Small mouth posture cue only; no structural jaw prediction.',
      min: -2,
      max: 3,
      step: 0.5,
    },
  ],
  retainer: [
    {
      key: 'mouthX',
      label: 'Smile maintenance offset',
      helper: 'Retainers are modeled as maintenance appliances with near-zero change in facial dimensions.',
      min: -2,
      max: 3,
      step: 0.5,
    },
    {
      key: 'upperLipY',
      label: 'Upper lip maintenance',
      helper: 'Retainer phase aims at preserving results; only tiny adjustments should be used.',
      min: -2,
      max: 2,
      step: 0.5,
    },
    {
      key: 'lowerLipY',
      label: 'Lower lip maintenance',
      helper: 'Keeps the simulation close to baseline stabilization.',
      min: -2,
      max: 2,
      step: 0.5,
    },
  ],
};

/** Face mesh measurement labels shown when a product uses each metric control. */
export const METRIC_MESH_MEASUREMENT_LABELS: Record<keyof DeviceWarpProfile, string> = {
  cheekX: 'Cheek width (L↔R)',
  cheekY: 'Cheek vertical (L↔R)',
  jawX: 'Jaw width (L↔R)',
  jawY: 'Jaw vertical (L↔R)',
  chinX: 'Chin width (L↔R)',
  chinY: 'Chin vertical (L↔R)',
  mouthX: 'Mouth width (L↔R)',
  mouthY: 'Mouth vertical (L↔R)',
  upperLipY: 'Upper lip vertical (L↔R)',
  lowerLipY: 'Lower lip vertical (L↔R)',
};

export const PROJECTION_MVP_APPROACH = [
  'Use stable facial landmarks (alar base, paranasal-cheek zone, oral commissures, lips, chin) as control points.',
  'Apply appliance-specific low-amplitude displacement fields instead of unconstrained global morphing.',
  'Bound each metric with clinically conservative ranges and expose provider-tunable controls per appliance.',
  'Treat output as visual counseling support only and keep a clear non-diagnostic disclaimer.',
] as const;
