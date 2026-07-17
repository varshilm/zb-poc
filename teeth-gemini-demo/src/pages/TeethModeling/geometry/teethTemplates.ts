import type { Point2D } from '@/pages/DentalSimulation/types';

import type { ToothKind } from '../types';

export type ToothTemplate = {
  kind: ToothKind;
  widthFactor: number;
  heightFactor: number;
  neckInsetFactor: number;
  cuspDepthFactor: number;
  cornerRoundFactor: number;
};

export const TOOTH_COUNT_PER_ARCH = 14;

export const IDEAL_TOOTH_TEMPLATES: readonly ToothTemplate[] = [
  { kind: 'secondMolar', widthFactor: 1.26, heightFactor: 0.96, neckInsetFactor: 0.12, cuspDepthFactor: 0.08, cornerRoundFactor: 0.22 },
  { kind: 'firstMolar', widthFactor: 1.18, heightFactor: 0.98, neckInsetFactor: 0.12, cuspDepthFactor: 0.085, cornerRoundFactor: 0.22 },
  { kind: 'secondPremolar', widthFactor: 1.02, heightFactor: 1.0, neckInsetFactor: 0.14, cuspDepthFactor: 0.1, cornerRoundFactor: 0.24 },
  { kind: 'firstPremolar', widthFactor: 0.98, heightFactor: 1.02, neckInsetFactor: 0.14, cuspDepthFactor: 0.11, cornerRoundFactor: 0.24 },
  { kind: 'canine', widthFactor: 0.98, heightFactor: 0.98, neckInsetFactor: 0.16, cuspDepthFactor: 0.16, cornerRoundFactor: 0.2 },
  { kind: 'lateralIncisor', widthFactor: 0.92, heightFactor: 0.94, neckInsetFactor: 0.19, cuspDepthFactor: 0.12, cornerRoundFactor: 0.18 },
  { kind: 'centralIncisor', widthFactor: 1.08, heightFactor: 0.9, neckInsetFactor: 0.18, cuspDepthFactor: 0.07, cornerRoundFactor: 0.18 },
  { kind: 'centralIncisor', widthFactor: 1.08, heightFactor: 0.9, neckInsetFactor: 0.18, cuspDepthFactor: 0.07, cornerRoundFactor: 0.18 },
  { kind: 'lateralIncisor', widthFactor: 0.92, heightFactor: 0.94, neckInsetFactor: 0.19, cuspDepthFactor: 0.12, cornerRoundFactor: 0.18 },
  { kind: 'canine', widthFactor: 0.98, heightFactor: 0.98, neckInsetFactor: 0.16, cuspDepthFactor: 0.16, cornerRoundFactor: 0.2 },
  { kind: 'firstPremolar', widthFactor: 0.98, heightFactor: 1.02, neckInsetFactor: 0.14, cuspDepthFactor: 0.11, cornerRoundFactor: 0.24 },
  { kind: 'secondPremolar', widthFactor: 1.02, heightFactor: 1.0, neckInsetFactor: 0.14, cuspDepthFactor: 0.1, cornerRoundFactor: 0.24 },
  { kind: 'firstMolar', widthFactor: 1.18, heightFactor: 0.98, neckInsetFactor: 0.12, cuspDepthFactor: 0.085, cornerRoundFactor: 0.22 },
  { kind: 'secondMolar', widthFactor: 1.26, heightFactor: 0.96, neckInsetFactor: 0.12, cuspDepthFactor: 0.08, cornerRoundFactor: 0.22 },
];

export const TOOTH_ROW_KINDS_3D = [
  'molar',
  'molar',
  'premolar',
  'premolar',
  'canine',
  'incisor',
  'incisor',
  'incisor',
  'incisor',
  'canine',
  'premolar',
  'premolar',
  'molar',
  'molar',
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type CubicSegment = [Point2D, Point2D, Point2D, Point2D];

function cubicBezierPoint(
  t: number,
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
): Point2D {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

function sampleCubicSegments(segments: CubicSegment[], targetVertexCount: number): Point2D[] {
  if (segments.length === 0) return [];
  const stepsPerSegment = Math.max(2, Math.ceil(targetVertexCount / segments.length));
  const points: Point2D[] = [];

  segments.forEach(([p0, p1, p2, p3], segmentIndex) => {
    const startStep = segmentIndex === 0 ? 0 : 1;
    for (let step = startStep; step <= stepsPerSegment; step += 1) {
      points.push(cubicBezierPoint(step / stepsPerSegment, p0, p1, p2, p3));
    }
  });

  return points;
}

function buildIdealToothSegments(
  width: number,
  height: number,
  template: ToothTemplate,
  isUpper: boolean,
): CubicSegment[] {
  const halfW = width / 2;
  const halfH = height / 2;
  const neckInset = halfW * template.neckInsetFactor;
  const cuspDepth = height * template.cuspDepthFactor;
  const cornerRound = clamp(width * template.cornerRoundFactor, 2, width * 0.42);
  const incisalY = isUpper ? halfH : -halfH;
  const gingivalY = isUpper ? -halfH : halfH;
  const cuspY = isUpper ? incisalY - cuspDepth : incisalY + cuspDepth;
  const shoulderPull = template.kind.includes('molar') ? 0.9 : template.kind === 'canine' ? 0.82 : 0.75;
  const sideBulge = template.kind.includes('molar') ? 1 : 0.95;
  const gingivalArcDepth = height * (template.kind.includes('molar') ? 0.16 : 0.12);
  const gingivalArcSign = isUpper ? 1 : -1;

  const p = (x: number, y: number): Point2D => ({ x, y });

  return [
    [
      p(-halfW + neckInset, gingivalY),
      p(-halfW * (0.98 * sideBulge), gingivalY * 0.3),
      p(-halfW * (0.94 * sideBulge), incisalY * 0.45),
      p(-halfW * shoulderPull, incisalY),
    ],
    [
      p(-halfW * shoulderPull, incisalY),
      p(-cornerRound, incisalY),
      p(-cornerRound * 0.25, cuspY),
      p(0, cuspY),
    ],
    [
      p(0, cuspY),
      p(cornerRound * 0.25, cuspY),
      p(cornerRound, incisalY),
      p(halfW * shoulderPull, incisalY),
    ],
    [
      p(halfW * shoulderPull, incisalY),
      p(halfW * (0.94 * sideBulge), incisalY * 0.45),
      p(halfW * (0.98 * sideBulge), gingivalY * 0.3),
      p(halfW - neckInset, gingivalY),
    ],
    [
      p(halfW - neckInset, gingivalY),
      p(halfW * 0.26, gingivalY - gingivalArcSign * gingivalArcDepth),
      p(-halfW * 0.26, gingivalY - gingivalArcSign * gingivalArcDepth),
      p(-halfW + neckInset, gingivalY),
    ],
  ];
}

export function templateForArchIndex(index: number): ToothTemplate {
  const clamped = clamp(index, 0, IDEAL_TOOTH_TEMPLATES.length - 1);
  return IDEAL_TOOTH_TEMPLATES[clamped]!;
}

export function defaultToothDimensions(
  imageWidth: number,
  imageHeight: number,
  template: ToothTemplate,
): { width: number; height: number } {
  const baseWidth = Math.max(28, imageWidth * 0.064);
  const baseHeight = Math.max(32, imageHeight * 0.076);
  return {
    width: baseWidth * template.widthFactor,
    height: baseHeight * template.heightFactor,
  };
}

/** Anatomical 2D crown outline sampled from the same curves as drawIdealToothOutline. */
export function buildIdealToothPolygon(
  center: Point2D,
  width: number,
  height: number,
  template: ToothTemplate,
  isUpper: boolean,
  targetVertexCount = 12,
): Point2D[] {
  const segments = buildIdealToothSegments(width, height, template, isUpper);
  const localPoints = sampleCubicSegments(segments, targetVertexCount);
  return localPoints.map((point) => ({
    x: center.x + point.x,
    y: center.y + point.y,
  }));
}

export function drawIdealToothOutline(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  template: ToothTemplate,
  isUpper: boolean,
): void {
  const halfW = width / 2;
  const halfH = height / 2;
  const neckInset = halfW * template.neckInsetFactor;
  const cuspDepth = height * template.cuspDepthFactor;
  const cornerRound = clamp(width * template.cornerRoundFactor, 2, width * 0.42);
  const incisalY = isUpper ? halfH : -halfH;
  const gingivalY = isUpper ? -halfH : halfH;
  const cuspY = isUpper ? incisalY - cuspDepth : incisalY + cuspDepth;
  const shoulderPull = template.kind.includes('molar') ? 0.9 : template.kind === 'canine' ? 0.82 : 0.75;
  const sideBulge = template.kind.includes('molar') ? 1 : 0.95;
  const gingivalArcDepth = height * (template.kind.includes('molar') ? 0.16 : 0.12);

  context.beginPath();
  context.moveTo(centerX - halfW + neckInset, centerY + gingivalY);
  context.bezierCurveTo(
    centerX - halfW * (0.98 * sideBulge),
    centerY + gingivalY * 0.3,
    centerX - halfW * (0.94 * sideBulge),
    centerY + incisalY * 0.45,
    centerX - halfW * shoulderPull,
    centerY + incisalY,
  );
  context.bezierCurveTo(
    centerX - cornerRound,
    centerY + incisalY,
    centerX - cornerRound * 0.25,
    centerY + cuspY,
    centerX,
    centerY + cuspY,
  );
  context.bezierCurveTo(
    centerX + cornerRound * 0.25,
    centerY + cuspY,
    centerX + cornerRound,
    centerY + incisalY,
    centerX + halfW * shoulderPull,
    centerY + incisalY,
  );
  context.bezierCurveTo(
    centerX + halfW * (0.94 * sideBulge),
    centerY + incisalY * 0.45,
    centerX + halfW * (0.98 * sideBulge),
    centerY + gingivalY * 0.3,
    centerX + halfW - neckInset,
    centerY + gingivalY,
  );
  context.bezierCurveTo(
    centerX + halfW * 0.26,
    centerY + gingivalY - (isUpper ? 1 : -1) * gingivalArcDepth,
    centerX - halfW * 0.26,
    centerY + gingivalY - (isUpper ? 1 : -1) * gingivalArcDepth,
    centerX - halfW + neckInset,
    centerY + gingivalY,
  );
  context.closePath();
}
