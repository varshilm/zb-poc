import {
  IRIS_DIAMETER_MM,
  IPD_AVERAGE_MM,
  JAW_SIZE_THRESHOLDS,
  type CalibrationMethod,
  type ToothbrushSize,
} from '../constants/demoConfig';

export type NormalizedLandmark = { x: number; y: number; z: number };

export type CalibrationResult = {
  method: CalibrationMethod;
  referenceDistanceMm: number;
  referenceDistancePx: number;
  pixelsPerMm: number;
  accuracyNote: string;
  /** Tighter bound = more accurate. Lower is better. */
  expectedErrorPct: number;
};

export type JawMeasurementsMm = {
  jawWidthMm: number;
  mouthWidthMm: number;
  faceWidthMm: number;
  lowerFaceHeightMm: number;
};

export type ToothbrushSizeResult = {
  size: ToothbrushSize;
  label: string;
  description: string;
};

/** One complete calibration + measurement set. */
export type CalibrationSet = {
  calibration: CalibrationResult;
  measurements: JawMeasurementsMm;
};

export type FaceScanMeasurements = {
  /** Iris-based calibration — null when iris contour landmarks are not detected. */
  iris: CalibrationSet | null;
  /** IPD-based calibration — always present. */
  ipd: CalibrationSet;
  /**
   * Which set to treat as primary.
   *
   * Iris is preferred when available:
   *  - Inter-individual variation is ±3.4% (11.0–12.4mm) vs ±11% for IPD.
   *  - Iris and jaw landmarks are in the same image region so lens distortion
   *    affects them proportionally, reducing systematic bias.
   */
  recommended: 'iris' | 'ipd';
};

function pixelDist(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  imageWidth: number,
  imageHeight: number,
): number {
  const dx = (a.x - b.x) * imageWidth;
  const dy = (a.y - b.y) * imageHeight;
  return Math.sqrt(dx * dx + dy * dy);
}

function calibrateFromIris(
  landmarks: NormalizedLandmark[],
  imageWidth: number,
  imageHeight: number,
): CalibrationResult | null {
  if (landmarks.length < 478) return null;

  const rightIrisWidth = pixelDist(landmarks[469], landmarks[471], imageWidth, imageHeight);
  const leftIrisWidth = pixelDist(landmarks[474], landmarks[476], imageWidth, imageHeight);
  const irisDiameterPx = (rightIrisWidth + leftIrisWidth) / 2;

  if (irisDiameterPx <= 4) return null;

  return {
    method: 'iris',
    referenceDistanceMm: IRIS_DIAMETER_MM,
    referenceDistancePx: irisDiameterPx,
    pixelsPerMm: irisDiameterPx / IRIS_DIAMETER_MM,
    accuracyNote: `Iris diameter (${IRIS_DIAMETER_MM}mm avg, ±3.4% population variance). Expected total error: ±5–8%.`,
    expectedErrorPct: 6.5,
  };
}

function calibrateFromIPD(
  landmarks: NormalizedLandmark[],
  imageWidth: number,
  imageHeight: number,
): CalibrationResult {
  // Prefer iris-center landmarks (468, 473) when available; fall back to
  // outer eye corners (33, 263) if iris model wasn't loaded.
  const hasIrisCenters = landmarks.length >= 478;
  const ipdPx = hasIrisCenters
    ? pixelDist(landmarks[468], landmarks[473], imageWidth, imageHeight)
    : pixelDist(landmarks[33], landmarks[263], imageWidth, imageHeight);

  return {
    method: 'ipd',
    referenceDistanceMm: IPD_AVERAGE_MM,
    referenceDistancePx: ipdPx,
    pixelsPerMm: ipdPx / IPD_AVERAGE_MM,
    accuracyNote: `IPD (${IPD_AVERAGE_MM}mm avg, ±11% population variance + head-tilt bias). Expected total error: ±10–20%.`,
    expectedErrorPct: 15,
  };
}

function measureFromCalibration(
  landmarks: NormalizedLandmark[],
  calibration: CalibrationResult,
  imageWidth: number,
  imageHeight: number,
): JawMeasurementsMm {
  const { pixelsPerMm } = calibration;
  return {
    jawWidthMm:         pixelDist(landmarks[172], landmarks[397], imageWidth, imageHeight) / pixelsPerMm,
    mouthWidthMm:       pixelDist(landmarks[61],  landmarks[291], imageWidth, imageHeight) / pixelsPerMm,
    faceWidthMm:        pixelDist(landmarks[234], landmarks[454], imageWidth, imageHeight) / pixelsPerMm,
    lowerFaceHeightMm:  pixelDist(landmarks[152], landmarks[1],   imageWidth, imageHeight) / pixelsPerMm,
  };
}

export function getToothbrushSize(mouthWidthMm: number): ToothbrushSizeResult {
  for (const threshold of JAW_SIZE_THRESHOLDS) {
    if (mouthWidthMm < threshold.maxMouthWidthMm) {
      return { size: threshold.size, label: threshold.label, description: threshold.description };
    }
  }
  const last = JAW_SIZE_THRESHOLDS[JAW_SIZE_THRESHOLDS.length - 1];
  return { size: last.size, label: last.label, description: last.description };
}

export function computeFaceScanMeasurements(
  landmarks: NormalizedLandmark[],
  imageWidth: number,
  imageHeight: number,
): FaceScanMeasurements {
  const irisCalibration = calibrateFromIris(landmarks, imageWidth, imageHeight);
  const ipdCalibration = calibrateFromIPD(landmarks, imageWidth, imageHeight);

  const iris: CalibrationSet | null = irisCalibration
    ? { calibration: irisCalibration, measurements: measureFromCalibration(landmarks, irisCalibration, imageWidth, imageHeight) }
    : null;

  const ipd: CalibrationSet = {
    calibration: ipdCalibration,
    measurements: measureFromCalibration(landmarks, ipdCalibration, imageWidth, imageHeight),
  };

  return { iris, ipd, recommended: iris ? 'iris' : 'ipd' };
}

/** Returns the recommended set (iris when available, otherwise IPD). */
export function getRecommendedSet(m: FaceScanMeasurements): CalibrationSet {
  return m.recommended === 'iris' && m.iris ? m.iris : m.ipd;
}
