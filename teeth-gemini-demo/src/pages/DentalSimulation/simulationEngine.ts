import { MAX_PREVIEW_EDGE_PX } from './constants';
import type {
  DevicePreset,
  FacialAnchorSet,
  Point2D,
  SmileEffectSettings,
  TeethEffectSettings,
} from './types';

type WarpControlPoint = {
  from: Point2D;
  to: Point2D;
  radius: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function sampleBilinear(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const clampedX = clamp(x, 0, width - 1);
  const clampedY = clamp(y, 0, height - 1);

  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const dx = clampedX - x0;
  const dy = clampedY - y0;

  const index = (px: number, py: number) => (py * width + px) * 4;
  const q11 = index(x0, y0);
  const q21 = index(x1, y0);
  const q12 = index(x0, y1);
  const q22 = index(x1, y1);

  const blend = (channel: number) => {
    const top = source[q11 + channel] * (1 - dx) + source[q21 + channel] * dx;
    const bottom = source[q12 + channel] * (1 - dx) + source[q22 + channel] * dx;
    return top * (1 - dy) + bottom * dy;
  };

  return [blend(0), blend(1), blend(2), blend(3)];
}

export function getScaledDimensions(width: number, height: number): { width: number; height: number } {
  const largestEdge = Math.max(width, height);

  if (largestEdge <= MAX_PREVIEW_EDGE_PX) {
    return { width, height };
  }

  const scale = MAX_PREVIEW_EDGE_PX / largestEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function buildWarpControlPoints(
  anchors: FacialAnchorSet,
  preset: DevicePreset,
  intensity: number,
  smileEffect?: SmileEffectSettings,
  teethEffect?: TeethEffectSettings,
): WarpControlPoint[] {
  const normalizedIntensity = clamp(intensity, 0, 100) / 100;
  const strength = normalizedIntensity * 0.85;
  const halfWidth = anchors.faceWidth / 2;
  const halfHeight = anchors.faceHeight / 2;
  const centerX = anchors.noseTip.x;

  const moveX = (point: Point2D, factor: number) => {
    const direction = point.x < centerX ? -1 : 1;
    return point.x + direction * halfWidth * factor * strength;
  };

  const moveY = (point: Point2D, factor: number) => point.y + halfHeight * factor * strength;

  const points: WarpControlPoint[] = [
    {
      from: anchors.leftCheek,
      to: {
        x: moveX(anchors.leftCheek, preset.profile.cheekX),
        y: moveY(anchors.leftCheek, preset.profile.cheekY),
      },
      radius: anchors.faceWidth * 0.22,
    },
    {
      from: anchors.rightCheek,
      to: {
        x: moveX(anchors.rightCheek, preset.profile.cheekX),
        y: moveY(anchors.rightCheek, preset.profile.cheekY),
      },
      radius: anchors.faceWidth * 0.22,
    },
    {
      from: anchors.leftJaw,
      to: {
        x: moveX(anchors.leftJaw, preset.profile.jawX),
        y: moveY(anchors.leftJaw, preset.profile.jawY),
      },
      radius: anchors.faceWidth * 0.2,
    },
    {
      from: anchors.rightJaw,
      to: {
        x: moveX(anchors.rightJaw, preset.profile.jawX),
        y: moveY(anchors.rightJaw, preset.profile.jawY),
      },
      radius: anchors.faceWidth * 0.2,
    },
    {
      from: anchors.chin,
      to: {
        x: anchors.chin.x + halfWidth * preset.profile.chinX * strength,
        y: moveY(anchors.chin, preset.profile.chinY),
      },
      radius: anchors.faceWidth * 0.26,
    },
    {
      from: anchors.mouthLeft,
      to: {
        x: moveX(anchors.mouthLeft, preset.profile.mouthX),
        y: moveY(anchors.mouthLeft, preset.profile.mouthY),
      },
      radius: anchors.faceWidth * 0.14,
    },
    {
      from: anchors.mouthRight,
      to: {
        x: moveX(anchors.mouthRight, preset.profile.mouthX),
        y: moveY(anchors.mouthRight, preset.profile.mouthY),
      },
      radius: anchors.faceWidth * 0.14,
    },
    {
      from: anchors.upperLip,
      to: {
        x: anchors.upperLip.x,
        y: moveY(anchors.upperLip, preset.profile.upperLipY),
      },
      radius: anchors.faceWidth * 0.12,
    },
    {
      from: anchors.lowerLip,
      to: {
        x: anchors.lowerLip.x,
        y: moveY(anchors.lowerLip, preset.profile.lowerLipY),
      },
      radius: anchors.faceWidth * 0.12,
    },
  ];

  const shouldApplySmile =
    smileEffect?.enabled &&
    (preset.id === 'aligners' || preset.id === 'expander');

  if (shouldApplySmile) {
    const modeMultiplier = smileEffect?.mode === 'demo' ? 1.0 : 0.45;
    // Keep this conservative: small widening + tiny corner lift. Scales with intensity.
    const smileStrength = strength * modeMultiplier;
    const widenFactor = 0.018 * smileStrength;
    const cornerLiftFactor = -0.01 * smileStrength;

    const widenX = (point: Point2D) => {
      const direction = point.x < centerX ? -1 : 1;
      return point.x + direction * anchors.faceWidth * widenFactor;
    };

    points.push(
      {
        from: anchors.mouthLeft,
        to: {
          x: widenX(anchors.mouthLeft),
          y: anchors.mouthLeft.y + anchors.faceHeight * cornerLiftFactor,
        },
        radius: anchors.faceWidth * 0.16,
      },
      {
        from: anchors.mouthRight,
        to: {
          x: widenX(anchors.mouthRight),
          y: anchors.mouthRight.y + anchors.faceHeight * cornerLiftFactor,
        },
        radius: anchors.faceWidth * 0.16,
      },
    );
  }

  if (teethEffect?.enabled) {
    const modeMultiplier = teethEffect.mode === 'demo' ? 1.15 : 0.6;
    const teethStrength = strength * modeMultiplier;
    const mouthWidth = distance(anchors.mouthLeft, anchors.mouthRight);
    const lipHeight = Math.max(distance(anchors.upperLip, anchors.lowerLip), anchors.faceHeight * 0.01);
    const centerX = (anchors.mouthLeft.x + anchors.mouthRight.x) / 2;
    // const centerY = (anchors.upperLip.y + anchors.lowerLip.y) / 2;

    // Generic teeth-detail mouth refinement (product-independent).
    const productScale = 1;
    const archWiden = 0.012 * teethStrength * productScale;
    const upperLift = -0.015 * teethStrength * productScale;
    const lowerDrop = 0.009 * teethStrength * productScale;

    const cornerShiftX = mouthWidth * archWiden;
    const verticalSpread = lipHeight * 0.25;

    points.push(
      {
        from: anchors.mouthLeft,
        to: {
          x: anchors.mouthLeft.x - cornerShiftX,
          y: anchors.mouthLeft.y - verticalSpread * 0.25,
        },
        radius: anchors.faceWidth * 0.16,
      },
      {
        from: anchors.mouthRight,
        to: {
          x: anchors.mouthRight.x + cornerShiftX,
          y: anchors.mouthRight.y - verticalSpread * 0.25,
        },
        radius: anchors.faceWidth * 0.16,
      },
      {
        from: anchors.upperLip,
        to: {
          x: centerX + (anchors.upperLip.x - centerX) * (1 - archWiden * 0.35),
          y: anchors.upperLip.y + anchors.faceHeight * upperLift,
        },
        radius: anchors.faceWidth * 0.12,
      },
      {
        from: anchors.lowerLip,
        to: {
          x: centerX + (anchors.lowerLip.x - centerX) * (1 - archWiden * 0.25),
          y: anchors.lowerLip.y + anchors.faceHeight * lowerDrop,
        },
        radius: anchors.faceWidth * 0.13,
      },
    );
  }

  return points;
}

function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function renderSimulatedImage(
  image: HTMLImageElement,
  anchors: FacialAnchorSet,
  preset: DevicePreset,
  intensity: number,
  smileEffect?: SmileEffectSettings,
  teethEffect?: TeethEffectSettings,
): string {
  const canvas = createCanvas(image.naturalWidth, image.naturalHeight);
  const context = canvas.getContext('2d');

  if (!context) {
    return image.src;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const original = context.getImageData(0, 0, canvas.width, canvas.height);
  const output = context.createImageData(canvas.width, canvas.height);
  const controlPoints = buildWarpControlPoints(anchors, preset, intensity, smileEffect, teethEffect);

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      let sourceX = x;
      let sourceY = y;

      for (const controlPoint of controlPoints) {
        const dx = x - controlPoint.to.x;
        const dy = y - controlPoint.to.y;
        const distanceSquared = dx * dx + dy * dy;
        const radiusSquared = controlPoint.radius * controlPoint.radius;
        const influence = Math.exp(-distanceSquared / (radiusSquared * 0.85));
        sourceX -= (controlPoint.to.x - controlPoint.from.x) * influence;
        sourceY -= (controlPoint.to.y - controlPoint.from.y) * influence;
      }

      const [red, green, blue, alpha] = sampleBilinear(
        original.data,
        canvas.width,
        canvas.height,
        sourceX,
        sourceY,
      );
      const pixelIndex = (y * canvas.width + x) * 4;
      output.data[pixelIndex] = red;
      output.data[pixelIndex + 1] = green;
      output.data[pixelIndex + 2] = blue;
      output.data[pixelIndex + 3] = alpha;
    }
  }

  context.putImageData(output, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}

export async function loadImageElement(fileOrUrl: File | string): Promise<HTMLImageElement> {
  const image = new Image();
  image.crossOrigin = 'anonymous';

  const source =
    typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Unable to load the selected face image.'));
    image.src = source;
  });

  return image;
}
