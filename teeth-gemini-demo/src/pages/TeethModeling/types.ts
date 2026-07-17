import type { DetectedFaceState, Point2D } from '@/pages/DentalSimulation/types';
import type { FaceMeshData } from '@/types/patientDetails';
import type { PreparedImageState } from '@/pages/DentalSimulation/types';

import type { TeethReconstructResponse } from '@/api/teethReconstruct';

import type { TeethAnalysisViewId } from './constants';

export type NormalizedLandmark = {
  x: number;
  y: number;
  z: number;
};

export type MouthRoiRect = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

export type ToothKind =
  | 'centralIncisor'
  | 'lateralIncisor'
  | 'canine'
  | 'firstPremolar'
  | 'secondPremolar'
  | 'firstMolar'
  | 'secondMolar';

export type ToothBorderSource = 'template' | 'edge' | 'ml' | 'manual';

export type ToothBorder2D = {
  toothId: string;
  arch: 'upper' | 'lower';
  index: number;
  polygon: Point2D[];
  confidence: number;
  source: ToothBorderSource;
};

export type DottedToothLayout = {
  toothId: string;
  arch: 'upper' | 'lower';
  dots: Point2D[];
};

export type TeethMeshToothSpec = {
  toothId: string;
  arch: 'upper' | 'lower';
  kind?: ToothKind;
  outline: Point2D[];
  dots: Point2D[];
  depthHint: number;
  center: Point2D;
  width: number;
  height: number;
  rotationRadians?: number;
};

export type TeethMeshBuildSpec = {
  upper: TeethMeshToothSpec[];
  lower: TeethMeshToothSpec[];
  mouthFrame: {
    center: Point2D;
    width: number;
    depth: number;
  };
};

export type TeethDigitalTwin = {
  borders: ToothBorder2D[];
  dottedLayout: DottedToothLayout[];
  meshBuildSpec: TeethMeshBuildSpec;
  mlOverlayPng?: string;
  mlInstanceMaskPng?: string;
};

export type TeethReconstructionResult = TeethReconstructResponse;

export type ToothInstance2D = {
  index: number;
  arch: 'upper' | 'lower';
  label: string;
  kind: ToothKind;
  center: Point2D;
  width: number;
  height: number;
  rotationRadians: number;
};

export type ArchCurve3D = {
  points: readonly { x: number; y: number; z: number }[];
  archWidth: number;
  archDepth: number;
};

export type TeethArch3D = {
  upper: ArchCurve3D | null;
  lower: ArchCurve3D | null;
};

export type TeethQualityAssessment = {
  lipGapRatio: number;
  hasVisibleTeeth: boolean;
  confidenceLabel: string;
  isFrontalAligned: boolean;
  warnings: string[];
};

export type TeethCaptureMode = 'fullFace' | 'teethOnly';

export type TeethAnalysisResult = {
  detectedFace: DetectedFaceState;
  landmarksNormalized: NormalizedLandmark[];
  faceMeshPreview: FaceMeshData;
  mouthRoi: MouthRoiRect;
  innerLipPolygon: Point2D[];
  arch2D: {
    upper: ToothInstance2D[];
    lower: ToothInstance2D[];
  };
  arch3D: TeethArch3D;
  digitalTwin: TeethDigitalTwin;
  reconstruction: TeethReconstructionResult | null;
  mlServiceError: string | null;
  captureMode: TeethCaptureMode;
  quality: TeethQualityAssessment;
};

export type TeethCaptureState = {
  preparedImage: PreparedImageState | null;
  analysis: TeethAnalysisResult | null;
  captureMode: TeethCaptureMode;
  isModelLoading: boolean;
  isAnalyzing: boolean;
  isMlProcessing: boolean;
  isReconstructing: boolean;
  modelError: string | null;
  analysisError: string | null;
};

export type TeethCaptureSession = {
  photos: readonly { role: string; imageUrl: string }[];
};

export type TeethModelingViewState = {
  activeView: TeethAnalysisViewId;
};

export type SmileJourneyStepId = 'capture' | 'analyze' | 'design' | 'model3d' | 'export';
