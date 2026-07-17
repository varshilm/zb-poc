import type { Point2D } from '@/pages/DentalSimulation/types';

import {
  buildIdealToothPolygon,
  defaultToothDimensions,
  templateForArchIndex,
} from '../geometry/teethTemplates';
import type { ToothBorder2D } from '../types';

export const EDITABLE_VERTEX_COUNT = 12;

export function polygonCentroid(polygon: Point2D[]): Point2D {
  if (polygon.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (const point of polygon) {
    sumX += point.x;
    sumY += point.y;
  }
  return { x: sumX / polygon.length, y: sumY / polygon.length };
}

export function polygonBounds(polygon: Point2D[]) {
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function isNearPoint(a: Point2D, b: Point2D, maxDistance: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= maxDistance;
}

export function findNearestVertexIndex(polygon: Point2D[], point: Point2D, maxDistance = 24): number | null {
  let bestIndex: number | null = null;
  let bestDistance = maxDistance;
  polygon.forEach((vertex, index) => {
    const distance = Math.hypot(vertex.x - point.x, vertex.y - point.y);
    if (distance <= bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i]!.x;
    const yi = polygon[i]!.y;
    const xj = polygon[j]!.x;
    const yj = polygon[j]!.y;
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function findToothAtPoint(borders: ToothBorder2D[], point: Point2D): ToothBorder2D | null {
  for (let index = borders.length - 1; index >= 0; index -= 1) {
    const border = borders[index]!;
    if (pointInPolygon(point, border.polygon)) {
      return border;
    }
  }
  return null;
}

export function cloneBorders(borders: ToothBorder2D[]): ToothBorder2D[] {
  return borders.map((border) => ({
    ...border,
    polygon: border.polygon.map((point) => ({ ...point })),
  }));
}

export function moveBorderVertex(
  borders: ToothBorder2D[],
  toothId: string,
  vertexIndex: number,
  point: Point2D,
): ToothBorder2D[] {
  return borders.map((border) => {
    if (border.toothId !== toothId) return border;
    const polygon = border.polygon.map((vertex, index) =>
      index === vertexIndex ? { ...point } : { ...vertex },
    );
    return { ...border, polygon };
  });
}

export function translateBorder(
  borders: ToothBorder2D[],
  toothId: string,
  delta: Point2D,
): ToothBorder2D[] {
  return borders.map((border) => {
    if (border.toothId !== toothId) return border;
    return {
      ...border,
      polygon: border.polygon.map((vertex) => ({
        x: vertex.x + delta.x,
        y: vertex.y + delta.y,
      })),
    };
  });
}

export function defaultToothRadii(imageWidth: number, imageHeight: number) {
  return {
    radiusX: Math.max(14, imageWidth * 0.032),
    radiusY: Math.max(16, imageHeight * 0.038),
  };
}

export function inferArchFromY(y: number, imageHeight: number): 'upper' | 'lower' {
  return y < imageHeight * 0.48 ? 'upper' : 'lower';
}

export function buildEllipsePolygon(
  center: Point2D,
  radiusX: number,
  radiusY: number,
  vertexCount: number = EDITABLE_VERTEX_COUNT,
): Point2D[] {
  const points: Point2D[] = [];
  for (let index = 0; index < vertexCount; index += 1) {
    const angle = (index / vertexCount) * Math.PI * 2 - Math.PI / 2;
    points.push({
      x: center.x + Math.cos(angle) * radiusX,
      y: center.y + Math.sin(angle) * radiusY,
    });
  }
  return points;
}

export function nextToothId(
  borders: ToothBorder2D[],
  arch: 'upper' | 'lower',
): { toothId: string; index: number } {
  const prefix = arch === 'upper' ? 'U' : 'L';
  const archCount = borders.filter((border) => border.arch === arch).length;
  const index = archCount;
  return { toothId: `${prefix}${index + 1}`, index };
}

export function createToothOutlineAtCenter(
  center: Point2D,
  imageWidth: number,
  imageHeight: number,
  borders: ToothBorder2D[],
): ToothBorder2D {
  const arch = inferArchFromY(center.y, imageHeight);
  const { toothId, index } = nextToothId(borders, arch);
  const template = templateForArchIndex(index);
  const { width, height } = defaultToothDimensions(imageWidth, imageHeight, template);

  return {
    toothId,
    arch,
    index,
    polygon: buildIdealToothPolygon(center, width, height, template, arch === 'upper'),
    confidence: 1,
    source: 'manual',
  };
}

/** Snap an outline to the anatomical 2D tooth template sized to its bounds. */
export function toEditableToothOutline(border: ToothBorder2D, imageWidth: number, imageHeight: number): ToothBorder2D {
  if (border.polygon.length < 3) {
    return border;
  }

  const center = polygonCentroid(border.polygon);
  const bounds = polygonBounds(border.polygon);
  const template = templateForArchIndex(border.index);
  const fallback = defaultToothDimensions(imageWidth, imageHeight, template);
  const width = Math.max(bounds.width, fallback.width * 0.75);
  const height = Math.max(bounds.height, fallback.height * 0.75);

  return {
    ...border,
    polygon: buildIdealToothPolygon(center, width, height, template, border.arch === 'upper'),
  };
}

export function normalizeBordersForEditing(
  borders: ToothBorder2D[],
  imageWidth: number,
  imageHeight: number,
): ToothBorder2D[] {
  return borders.map((border) => {
    if (border.source === 'ml' && border.polygon.length >= 6) {
      return border;
    }
    return toEditableToothOutline(border, imageWidth, imageHeight);
  });
}

export function removeToothBorder(borders: ToothBorder2D[], toothId: string): ToothBorder2D[] {
  return borders.filter((border) => border.toothId !== toothId);
}

export function upsertDetectedToothBorder(
  borders: ToothBorder2D[],
  polygon: Point2D[],
  center: Point2D,
  imageWidth: number,
  imageHeight: number,
): ToothBorder2D {
  const arch = inferArchFromY(center.y, imageHeight);
  const { toothId, index } = nextToothId(borders, arch);
  return {
    toothId,
    arch,
    index,
    polygon,
    confidence: 0.85,
    source: 'manual',
  };
}

export type ContourDragTarget =
  | { mode: 'vertex'; toothId: string; vertexIndex: number }
  | { mode: 'body'; toothId: string; lastPoint: Point2D };

export function resolveContourDragTarget(
  borders: ToothBorder2D[],
  point: Point2D,
  selectedToothId: string | null,
  vertexHitRadius: number,
  centerHitRadius: number,
  allowCreate = true,
): ContourDragTarget | 'create' | null {
  const ordered = selectedToothId
    ? [
        ...borders.filter((border) => border.toothId === selectedToothId),
        ...borders.filter((border) => border.toothId !== selectedToothId),
      ]
    : [...borders].reverse();

  for (const border of ordered) {
    const vertexIndex = findNearestVertexIndex(border.polygon, point, vertexHitRadius);
    if (vertexIndex != null) {
      return { mode: 'vertex', toothId: border.toothId, vertexIndex };
    }
  }

  for (const border of ordered) {
    const center = polygonCentroid(border.polygon);
    if (isNearPoint(center, point, centerHitRadius) || pointInPolygon(point, border.polygon)) {
      return { mode: 'body', toothId: border.toothId, lastPoint: point };
    }
  }

  return allowCreate ? 'create' : null;
}
