import { MeasurementKey } from "@/utils/constants";
import { PatientRow } from "./patient";

export interface PatientHealthScores {
  /** Latest mouth breathing bias score (0–100), lower is better. */
  mouthBreathingBiasScore: number | null;
  mouthBreathingBiasScoreDelta: number | null;
  /** Latest risk_dhr from the most recent face scan. */
  riskDhr: number | null;
  riskDhrDelta: number | null;
  /** Latest SonuCheck congestion score. */
  sonuCheckScore: number | null;
  sonuCheckScoreDelta: number | null;
  /** Latest per-posture SonuCheck scores. */
  sonuCheckLatestPostureScores: {
    supineScore: number | null;
    supineScoreDelta: number | null;
    standingScore: number | null;
    standingScoreDelta: number | null;
  } | null;
  /** Latest Voice OSA percentage score. */
  voiceOsaPercentageScore: number | null;
  voiceOsaPercentageScoreDelta: number | null;
}

export type PatientDetail = {
    /** Backend user id for recommendations / scan recordings APIs. */
    uid: string;
    patId: string;
    name: string;
    email: string | null;
    phone: string | null;
    physicianReferralCode: string | null;
    age?: string | null;
    firstScanDate?: string | null;
    lastScanDate: string | null;
    measurements: Record<string, number>;
    faceMesh: FaceMeshData;
  /** Summary health scores returned by getPatientDetails. */
  healthScores: PatientHealthScores;
  /** Latest questionnaire response from the questionnaires collection, when available. */
  latestQuestionnaire: LatestQuestionnaire | null;
};

export type LatestQuestionnaire = {
  dryMouth?: boolean;
  lipSeal?: boolean;
  witnessedApnea?: boolean;
  daytimeFatigue?: boolean;
  loudSnoring?: boolean;
};

export interface UsePatientMeasurementTrendParams {
    /** Patient uid; sent as backend `patId` query param. */
    uid: string;
    /** Used when mapping API response if `patId` is omitted. */
    fallbackPatId?: string;
    measurementKey: MeasurementKey;
    startDate: string;
    endDate: string;
  }
  
export interface UsePatientDetailResult {
    patient?: Partial<PatientRow>;
    detail?: PatientDetail;
    isLoading: boolean;
    isError: boolean;
}

export interface FaceMeshPoint {
    x: number;
    y: number;
    z: number;
}

/**
 * ARKit `ARFaceGeometry` / SceneKit `ARSCNFaceGeometry` supply vertices plus a fixed triangle index buffer
 * (e.g. 1,220 vertices and 6,912 indices). When `triangleIndices` is omitted, the viewer falls back to a
 * convex hull approximation (not anatomically correct).
 */
export type FaceMeshData = {
    vertices: FaceMeshPoint[];
    /** Each consecutive triple is one triangle; values are 0-based indices into `vertices`. */
    triangleIndices?: number[];
};

export type PatientDetailApiResponse = {
    message?: string;
    data?: Partial<PatientDetail>;
};

export type PatientLastScan = {
    patId: string;
    firstScanDate: string | null;
    lastScanDate: string | null;
    firstMeasurements: Record<string, number>;
    lastMeasurements: Record<string, number>;
    firstFaceMesh: FaceMeshData;
    lastFaceMesh: FaceMeshData;
    /** Firebase Storage object path for the latest face scan image (e.g. faceScan/{uid}/file.jpg). */
    lastImagePath: string | null;
};

export type PatientLastScanApiResponse = {
    message?: string;
    data?: Partial<PatientLastScan> & {
      firstMeasurements?: Record<string, unknown>;
      lastMeasurements?: Record<string, unknown>;
      firstFaceMesh?: unknown;
      lastFaceScan?: { faceMesh?: unknown; imagePath?: unknown };
      lastFaceMesh?: unknown;
      lastImagePath?: unknown;
    };
};

/**
 * airway trend chart card interface
 */
export interface LastScanScoresCardProps {
    /** Patient uid for `getFaceScan`. */
    uid: string;
    measurements?: Record<string, number>;
    className?: string;
}
export interface PatientMeasurementTrendPoint {
    month: string;
    value: number;
}

export interface PatientMeasurementTrendData {
    uid: string;
    measurementKey: string;
    points: PatientMeasurementTrendPoint[];
}

export interface PatientMeasurementTrendApiResponse {
    message?: string;
    data?: PatientMeasurementTrendData;
}

export interface AirwayTrendChartCardProps {
    className?: string;
    /** Patient uid for `getAirwayScanTrend`. */
    uid: string;
    /** Used when mapping API response if `patId` is omitted. */
    fallbackPatId?: string;
}

export interface FetchPatientMeasurementTrendParams {
    uid: string;
    fallbackPatId?: string;
    measurementKey: string;
    startDate: string;
    endDate: string;
}

export interface ScanRecording {
    sessionId: string;
    date: string;
    time: string;
    isBaseline: boolean;
    osaScore: number | null;
    percentageScore: number | null;
    supineCongestionScore: number | null;
    standingCongestionScore: number | null;
    audioPaths: {
      supine: string[];
      standing: string[];
    };
}

export interface ScanRecordingsData {
    patId: string;
    recordings: ScanRecording[];
}

export interface ScanRecordingsApiResponse {
    message?: string;
    data?: unknown[] | {
      patId?: unknown;
      recordings?: unknown;
    };
}