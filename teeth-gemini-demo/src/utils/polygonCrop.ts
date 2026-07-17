import type { NormalizedPoint } from '../constants/demoConfig';

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Unable to load image for cropping.')));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function polygonBoundingBox(points: Array<{ x: number; y: number }>) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function scalePolygonFromCenter(
  points: NormalizedPoint[],
  scale: number,
): NormalizedPoint[] {
  const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length;

  return points.map((point) => ({
    x: clamp(centerX + (point.x - centerX) * scale, 0, 1),
    y: clamp(centerY + (point.y - centerY) * scale, 0, 1),
  }));
}

export function translatePolygon(points: NormalizedPoint[], dx: number, dy: number): NormalizedPoint[] {
  return points.map((point) => ({
    x: clamp(point.x + dx, 0, 1),
    y: clamp(point.y + dy, 0, 1),
  }));
}

export async function exportPolygonCropDataUrl(
  imageSrc: string,
  polygon: NormalizedPoint[],
  backgroundColor = '#000000',
): Promise<string> {
  const image = await loadImage(imageSrc);
  const pixelPolygon = polygon.map((point) => ({
    x: point.x * image.naturalWidth,
    y: point.y * image.naturalHeight,
  }));

  const bounds = polygonBoundingBox(pixelPolygon);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bounds.width));
  canvas.height = Math.max(1, Math.round(bounds.height));
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to crop image.');
  }

  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.beginPath();
  pixelPolygon.forEach((point, index) => {
    const x = point.x - bounds.minX;
    const y = point.y - bounds.minY;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.closePath();
  context.clip();
  context.drawImage(image, -bounds.minX, -bounds.minY);
  context.restore();

  return canvas.toDataURL('image/jpeg', 0.92);
}
