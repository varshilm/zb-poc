import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

import type { DetectedFaceState, FacialAnchorSet, Point2D } from './types';

const FACE_LANDMARKER_WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const FACE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

type NormalizedLandmark = {
  x: number;
  y: number;
  z: number;
};

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null;

function toPoint2D(landmark: NormalizedLandmark | undefined, width: number, height: number): Point2D {
  if (!landmark) {
    return { x: 0, y: 0 };
  }

  return {
    x: landmark.x * width,
    y: landmark.y * height,
  };
}

function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getConfidenceLabel(faceWidth: number): string {
  if (faceWidth >= 260) {
    return 'High confidence frontal capture';
  }

  if (faceWidth >= 180) {
    return 'Good alignment';
  }

  return 'Limited detail, keep interpretation conservative';
}

export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(FACE_LANDMARKER_WASM_ROOT);

      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_LANDMARKER_MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numFaces: 1,
        // Keep fairly permissive so slightly off-angle/mobile captures still map.
        minFaceDetectionConfidence: 0.45,
        minFacePresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    })();
  }

  return faceLandmarkerPromise;
}

export function extractDetectedFaceState(
  landmarks: readonly NormalizedLandmark[],
  width: number,
  height: number,
): DetectedFaceState | null {
  if (landmarks.length < 455) {
    return null;
  }

  const anchors: FacialAnchorSet = {
    forehead: toPoint2D(landmarks[10], width, height),
    noseTip: toPoint2D(landmarks[1], width, height),
    leftCheek: toPoint2D(landmarks[234], width, height),
    rightCheek: toPoint2D(landmarks[454], width, height),
    leftJaw: toPoint2D(landmarks[172], width, height),
    rightJaw: toPoint2D(landmarks[397], width, height),
    chin: toPoint2D(landmarks[152], width, height),
    mouthLeft: toPoint2D(landmarks[61], width, height),
    mouthRight: toPoint2D(landmarks[291], width, height),
    upperLip: toPoint2D(landmarks[13], width, height),
    lowerLip: toPoint2D(landmarks[14], width, height),
    faceWidth: 0,
    faceHeight: 0,
  };

  anchors.faceWidth = distance(anchors.leftCheek, anchors.rightCheek);
  anchors.faceHeight = distance(anchors.forehead, anchors.chin);

  if (anchors.faceWidth <= 0 || anchors.faceHeight <= 0) {
    return null;
  }

  return {
    anchors,
    confidenceLabel: getConfidenceLabel(anchors.faceWidth),
  };
}
