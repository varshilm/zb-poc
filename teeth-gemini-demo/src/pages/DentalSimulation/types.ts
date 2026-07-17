export type DentalSimulationDeviceId =
  | 'expander'
  | 'mad'
  | 'aligners'
  | 'nightGuard'
  | 'retainer';

export type SourceMode = 'upload' | 'camera';

/** Decoded source image ready for face detection and simulation (data URL, safe for canvas). */
export type PreparedImageState = {
  element: HTMLImageElement;
  url: string;
};

export type SmileEffectMode = 'subtle' | 'demo';

export type SmileEffectSettings = {
  enabled: boolean;
  mode: SmileEffectMode;
};

export type TeethEffectMode = 'subtle' | 'demo';

export type TeethEffectSettings = {
  enabled: boolean;
  mode: TeethEffectMode;
};

export interface Point2D {
  x: number;
  y: number;
}

export interface FacialAnchorSet {
  forehead: Point2D;
  noseTip: Point2D;
  leftCheek: Point2D;
  rightCheek: Point2D;
  leftJaw: Point2D;
  rightJaw: Point2D;
  chin: Point2D;
  mouthLeft: Point2D;
  mouthRight: Point2D;
  upperLip: Point2D;
  lowerLip: Point2D;
  faceWidth: number;
  faceHeight: number;
}

export interface DeviceWarpProfile {
  cheekX: number;
  cheekY: number;
  jawX: number;
  jawY: number;
  chinX: number;
  chinY: number;
  mouthX: number;
  mouthY: number;
  upperLipY: number;
  lowerLipY: number;
}

export interface DevicePreset {
  id: DentalSimulationDeviceId;
  label: string;
  shortLabel: string;
  summary: string;
  medicalIntent: string;
  caution: string;
  profile: DeviceWarpProfile;
}

export interface DetectedFaceState {
  anchors: FacialAnchorSet;
  confidenceLabel: string;
}
