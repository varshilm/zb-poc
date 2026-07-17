import type { Point2D } from '@/pages/DentalSimulation/types';

import { polygonBounds, polygonCentroid } from './contourEditorUtils';

export type RgbColor = { r: number; g: number; b: number };

export type ToothMaskRole = 'tooth' | 'gum';

export type ColorToothMask = {
  id: string;
  color: RgbColor;
  colorKey: string;
  polygon: Point2D[];
  centroid: Point2D;
  bounds: ReturnType<typeof polygonBounds>;
  pixelCount: number;
  arch: 'upper' | 'lower';
  /** Sequential arch position index, 0-based left→right */
  archIndex: number;
  /** Whether this region is a tooth or gingival (gum) tissue. */
  role: ToothMaskRole;
};

export type ColorMaskSeparationResult = {
  width: number;
  height: number;
  masks: ColorToothMask[];
  imageData: ImageData;
};

export type ColorMaskSeparationOptions = {
  minPixelCount?: number;
  minTeeth?: number;
  colorMatchTolerance?: number;
  backgroundThreshold?: number;
  simplifyTolerance?: number;
  maxPolygonVertices?: number;
  maxTeethPerArch?: number;
};

const DEFAULT_MIN_TEETH = 4;
const DEFAULT_COLOR_MATCH_TOLERANCE = 48;
const DEFAULT_BACKGROUND_THRESHOLD = 44;
const DEFAULT_SIMPLIFY_TOLERANCE = 2.2;
const DEFAULT_MAX_POLYGON_VERTICES = 40;
const DEFAULT_MAX_TEETH_PER_ARCH = 16;
const MAX_GUMS = 2;

/** Reserved gum color (magenta) — the prompt instructs gums to use exactly this. */
export const GUM_COLOR: RgbColor = { r: 255, g: 0, b: 255 };
const GUM_MATCH_DISTANCE_SQ = 130 * 130;

function colorKey(color: RgbColor): string {
  return `${color.r},${color.g},${color.b}`;
}

function isBackgroundPixel(r: number, g: number, b: number, threshold: number): boolean {
  return r <= threshold && g <= threshold && b <= threshold;
}

/** True when a color is close to the reserved magenta gum color. */
export function isGumColor(r: number, g: number, b: number): boolean {
  const dr = r - GUM_COLOR.r;
  const dg = g - GUM_COLOR.g;
  const db = b - GUM_COLOR.b;
  return dr * dr + dg * dg + db * db <= GUM_MATCH_DISTANCE_SQ;
}

function readPixel(data: Uint8ClampedArray, width: number, x: number, y: number): RgbColor {
  const index = (y * width + x) * 4;
  return {
    r: data[index] ?? 0,
    g: data[index + 1] ?? 0,
    b: data[index + 2] ?? 0,
  };
}

/** Squared color distance — cheap enough for per-pixel flood-fill matching. */
function colorDistanceSq(a: RgbColor, b: RgbColor): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

type FloodResult = {
  pixels: Point2D[];
  colorSum: { r: number; g: number; b: number };
};

/**
 * Spatially connected flood fill: grows a region from a seed pixel while the
 * color stays within tolerance of the seed. Because teeth are separated by black
 * gaps, two teeth that happen to share a hue stay as distinct components.
 */
function floodFillConnected(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  seedColor: RgbColor,
  visited: Uint8Array,
  toleranceSq: number,
  backgroundThreshold: number,
): FloodResult {
  const pixels: Point2D[] = [];
  const colorSum = { r: 0, g: 0, b: 0 };
  const stack: number[] = [startY * width + startX];

  while (stack.length > 0) {
    const flat = stack.pop()!;
    if (visited[flat]) continue;
    const x = flat % width;
    const y = (flat - x) / width;

    const pixel = readPixel(data, width, x, y);
    if (isBackgroundPixel(pixel.r, pixel.g, pixel.b, backgroundThreshold)) continue;
    if (colorDistanceSq(pixel, seedColor) > toleranceSq) continue;

    visited[flat] = 1;
    pixels.push({ x, y });
    colorSum.r += pixel.r;
    colorSum.g += pixel.g;
    colorSum.b += pixel.b;

    if (x + 1 < width) stack.push(flat + 1);
    if (x - 1 >= 0) stack.push(flat - 1);
    if (y + 1 < height) stack.push(flat + width);
    if (y - 1 >= 0) stack.push(flat - width);
  }

  return { pixels, colorSum };
}

function perpendicularDistance(point: Point2D, start: Point2D, end: Point2D): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
  const projX = start.x + t * dx;
  const projY = start.y + t * dy;
  return Math.hypot(point.x - projX, point.y - projY);
}

/** Uniformly sub-sample a polygon to at most `maxVertices` points while preserving shape. */
export function limitPolygonVertices(points: Point2D[], maxVertices: number): Point2D[] {
  if (points.length <= maxVertices) return points;
  const step = points.length / maxVertices;
  const result: Point2D[] = [];
  for (let i = 0; i < maxVertices; i += 1) {
    result.push(points[Math.round(i * step) % points.length]!);
  }
  return result;
}

export function simplifyPolygon(points: Point2D[], tolerance: number): Point2D[] {
  if (points.length <= 3) {
    return points.map((point) => ({ ...point }));
  }

  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i += 1) {
    const distance = perpendicularDistance(points[i]!, points[0]!, points[end]!);
    if (distance > maxDistance) {
      index = i;
      maxDistance = distance;
    }
  }

  if (maxDistance > tolerance) {
    const left = simplifyPolygon(points.slice(0, index + 1), tolerance);
    const right = simplifyPolygon(points.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0]!, points[end]!].map((point) => ({ ...point }));
}

function traceBoundary(pixels: Point2D[], width: number, height: number): Point2D[] {
  if (pixels.length === 0) return [];

  const mask = new Uint8Array(width * height);
  for (const point of pixels) {
    mask[point.y * width + point.x] = 1;
  }

  let start = pixels[0]!;
  for (const point of pixels) {
    if (point.y < start.y || (point.y === start.y && point.x < start.x)) {
      start = point;
    }
  }

  const neighbors: Point2D[] = [
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
  ];

  const contour: Point2D[] = [];
  let current = start;
  let direction = 0;
  const maxSteps = pixels.length * 8 + 8;

  for (let step = 0; step < maxSteps; step += 1) {
    contour.push({ ...current });

    let found = false;
    for (let offset = 0; offset < neighbors.length; offset += 1) {
      const neighborIndex = (direction + offset) % neighbors.length;
      const delta = neighbors[neighborIndex]!;
      const next = { x: current.x + delta.x, y: current.y + delta.y };
      if (next.x < 0 || next.y < 0 || next.x >= width || next.y >= height) continue;
      if (!mask[next.y * width + next.x]) continue;
      current = next;
      direction = (neighborIndex + 6) % neighbors.length;
      found = true;
      break;
    }

    if (!found) break;
    if (current.x === start.x && current.y === start.y && contour.length > 2) break;
  }

  return contour.length >= 3 ? contour : pixels;
}

function inferArch(centroidY: number, imageHeight: number): 'upper' | 'lower' {
  return centroidY < imageHeight * 0.5 ? 'upper' : 'lower';
}

function defaultMinPixelCount(width: number, height: number): number {
  return Math.max(120, Math.round(width * height * 0.0004));
}

function capArchMasks(masks: ColorToothMask[], maxPerArch: number): ColorToothMask[] {
  const upper = masks.filter((m) => m.arch === 'upper');
  const lower = masks.filter((m) => m.arch === 'lower');

  const keepLargest = (archMasks: ColorToothMask[]) =>
    [...archMasks].sort((a, b) => b.pixelCount - a.pixelCount).slice(0, maxPerArch);

  return [...keepLargest(upper), ...keepLargest(lower)];
}

export function extractToothMasksFromImageData(
  imageData: ImageData,
  options: ColorMaskSeparationOptions = {},
): ColorMaskSeparationResult {
  const {
    colorMatchTolerance = DEFAULT_COLOR_MATCH_TOLERANCE,
    backgroundThreshold = DEFAULT_BACKGROUND_THRESHOLD,
    simplifyTolerance = DEFAULT_SIMPLIFY_TOLERANCE,
    maxPolygonVertices = DEFAULT_MAX_POLYGON_VERTICES,
    maxTeethPerArch = DEFAULT_MAX_TEETH_PER_ARCH,
  } = options;

  const { width, height, data } = imageData;
  const minPixelCount = options.minPixelCount ?? defaultMinPixelCount(width, height);
  const toleranceSq = colorMatchTolerance * colorMatchTolerance;

  const visited = new Uint8Array(width * height);
  const masks: ColorToothMask[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const flat = y * width + x;
      if (visited[flat]) continue;

      const seed = readPixel(data, width, x, y);
      if (isBackgroundPixel(seed.r, seed.g, seed.b, backgroundThreshold)) {
        visited[flat] = 1;
        continue;
      }

      const { pixels, colorSum } = floodFillConnected(
        data,
        width,
        height,
        x,
        y,
        seed,
        visited,
        toleranceSq,
        backgroundThreshold,
      );
      if (pixels.length < minPixelCount) continue;

      const boundary = traceBoundary(pixels, width, height);
      const simplified = simplifyPolygon(boundary, simplifyTolerance);
      const polygon = limitPolygonVertices(simplified, maxPolygonVertices);
      if (polygon.length < 3) continue;

      const centroid = polygonCentroid(polygon);
      const bounds = polygonBounds(polygon);
      const avgColor: RgbColor = {
        r: Math.round(colorSum.r / pixels.length),
        g: Math.round(colorSum.g / pixels.length),
        b: Math.round(colorSum.b / pixels.length),
      };
      const role: ToothMaskRole = isGumColor(avgColor.r, avgColor.g, avgColor.b) ? 'gum' : 'tooth';

      masks.push({
        id: 'pending',
        color: avgColor,
        colorKey: colorKey(avgColor),
        polygon,
        centroid,
        bounds,
        pixelCount: pixels.length,
        arch: inferArch(centroid.y, height),
        archIndex: 0,
        role,
      });
    }
  }

  // Separate gums from teeth: teeth get capped per arch + numbered; gums kept as-is.
  const toothMasks = masks.filter((m) => m.role === 'tooth');
  const gumMasks = masks
    .filter((m) => m.role === 'gum')
    .sort((a, b) => b.pixelCount - a.pixelCount)
    .slice(0, MAX_GUMS);

  const cappedTeeth = capArchMasks(toothMasks, maxTeethPerArch);
  cappedTeeth.sort((left, right) => {
    if (left.arch !== right.arch) {
      return left.arch === 'upper' ? -1 : 1;
    }
    return left.centroid.x - right.centroid.x;
  });

  cappedTeeth
    .filter((m) => m.arch === 'upper')
    .forEach((mask, index) => {
      mask.id = `U${index + 1}`;
      mask.archIndex = index;
    });
  cappedTeeth
    .filter((m) => m.arch === 'lower')
    .forEach((mask, index) => {
      mask.id = `L${index + 1}`;
      mask.archIndex = index;
    });

  gumMasks.forEach((mask) => {
    mask.id = mask.arch === 'upper' ? 'GUM-U' : 'GUM-L';
  });

  // Gums first so they render behind the teeth
  return { width, height, masks: [...gumMasks, ...cappedTeeth], imageData };
}

export class ColorMaskSeparationError extends Error {
  readonly foundCount: number;

  constructor(foundCount: number, minTeeth: number) {
    super(`Color separation found ${foundCount} teeth; at least ${minTeeth} are required.`);
    this.name = 'ColorMaskSeparationError';
    this.foundCount = foundCount;
  }
}

export async function extractToothMasksFromImageUrl(
  imageUrl: string,
  options: ColorMaskSeparationOptions = {},
): Promise<ColorMaskSeparationResult> {
  const image = await loadImageElement(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to read segmentation image.');
  }
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const result = extractToothMasksFromImageData(imageData, options);

  const minTeeth = options.minTeeth ?? DEFAULT_MIN_TEETH;
  const toothCount = result.masks.filter((m) => m.role === 'tooth').length;
  if (toothCount < minTeeth) {
    throw new ColorMaskSeparationError(toothCount, minTeeth);
  }

  return result;
}

const NUMBERED_BACKGROUND_THRESHOLD = 40;

/**
 * Render a white clear-aligner styled numbered preview. The per-tooth colors are used
 * only to locate teeth; every tooth is recolored to a uniform frosted white with a top
 * gloss sheen. Small tooth numbers are written on top for identification.
 */
export function renderNumberedMaskPreview(
  maskImageUrl: string,
  masks: ColorToothMask[],
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Unable to render numbered mask preview.'));
        return;
      }

      // Read the mask and recolor every tooth pixel to frosted white
      const source = document.createElement('canvas');
      source.width = width;
      source.height = height;
      const sourceCtx = source.getContext('2d');
      if (!sourceCtx) {
        reject(new Error('Unable to process numbered mask preview.'));
        return;
      }
      sourceCtx.drawImage(image, 0, 0);
      const pixels = sourceCtx.getImageData(0, 0, width, height);
      const { data } = pixels;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        if (isBackgroundPixel(r, g, b, NUMBERED_BACKGROUND_THRESHOLD)) {
          data[i + 3] = 0;
        } else if (isGumColor(r, g, b)) {
          // Gums → realistic pink
          data[i] = 226;
          data[i + 1] = 124;
          data[i + 2] = 142;
          data[i + 3] = 255;
        } else {
          // Teeth → frosted white
          data[i] = 238;
          data[i + 1] = 244;
          data[i + 2] = 252;
          data[i + 3] = 255;
        }
      }
      sourceCtx.putImageData(pixels, 0, 0);

      // Dark backdrop, then the white teeth, then a gloss sheen
      ctx.fillStyle = '#0b1020';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(source, 0, 0);

      const gloss = ctx.createLinearGradient(0, 0, 0, height);
      gloss.addColorStop(0, 'rgba(255,255,255,0.28)');
      gloss.addColorStop(0.4, 'rgba(255,255,255,0.04)');
      gloss.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = gloss;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      for (const mask of masks) {
        if (mask.role !== 'tooth') continue;
        const { centroid, id, bounds } = mask;
        const fontSize = Math.max(9, Math.min(bounds.width, bounds.height) * 0.22);
        ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = Math.max(1.5, fontSize * 0.18);
        ctx.strokeText(id, centroid.x, centroid.y);

        ctx.fillStyle = 'rgba(30,41,59,0.95)';
        ctx.fillText(id, centroid.x, centroid.y);
      }

      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => reject(new Error('Unable to load mask for numbered preview.'));
    image.src = maskImageUrl;
  });
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load segmentation image.'));
    image.src = url;
  });
}
