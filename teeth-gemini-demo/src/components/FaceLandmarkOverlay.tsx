import { useEffect, useRef } from 'react';

import type { NormalizedLandmark } from '../utils/jawMeasurements';

type FaceLandmarkOverlayProps = {
  photoDataUrl: string;
  landmarks: NormalizedLandmark[];
  imageWidth: number;
  imageHeight: number;
  className?: string;
};

const GUIDE_COLOR = '#0d9488';

/** Chord pairs for measurement highlights: [from, to, label] */
const MEASUREMENT_CHORDS: [number, number, string][] = [
  [172, 397, 'Jaw width'],
  [61, 291, 'Mouth width'],
  [234, 454, 'Face width'],
  [152, 1, 'Lower-face height'],
];

function drawMeasurementOverlay(
  canvas: HTMLCanvasElement,
  photo: HTMLImageElement,
  landmarks: NormalizedLandmark[],
  imageWidth: number,
  imageHeight: number,
): void {
  const { width, height } = canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const scaleX = width / imageWidth;
  const scaleY = height / imageHeight;

  const lx = (idx: number) => landmarks[idx].x * imageWidth * scaleX;
  const ly = (idx: number) => landmarks[idx].y * imageHeight * scaleY;

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(photo, 0, 0, width, height);

  for (const [fromIdx, toIdx, label] of MEASUREMENT_CHORDS) {
    if (fromIdx >= landmarks.length || toIdx >= landmarks.length) continue;
    const x1 = lx(fromIdx);
    const y1 = ly(fromIdx);
    const x2 = lx(toIdx);
    const y2 = ly(toIdx);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;

    ctx.strokeStyle = GUIDE_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.fillStyle = GUIDE_COLOR;
    for (const [px, py] of [[x1, y1], [x2, y2]] as [number, number][]) {
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = 'bold 10px system-ui, sans-serif';
    const padding = 4;
    const textW = ctx.measureText(label).width;
    const textH = 11;
    const rx = 4;
    const bx = mx - textW / 2 - padding;
    const by = my - textH / 2 - padding;
    const bw = textW + padding * 2;
    const bh = textH + padding * 2;

    ctx.fillStyle = 'rgba(13,148,136,0.85)';
    ctx.beginPath();
    ctx.moveTo(bx + rx, by);
    ctx.lineTo(bx + bw - rx, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + rx, rx);
    ctx.lineTo(bx + bw, by + bh - rx);
    ctx.arcTo(bx + bw, by + bh, bx + bw - rx, by + bh, rx);
    ctx.lineTo(bx + rx, by + bh);
    ctx.arcTo(bx, by + bh, bx, by + bh - rx, rx);
    ctx.lineTo(bx, by + rx);
    ctx.arcTo(bx, by, bx + rx, by, rx);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, mx, my);
  }
}

export function FaceLandmarkOverlay({
  photoDataUrl,
  landmarks,
  imageWidth,
  imageHeight,
  className,
}: FaceLandmarkOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      drawMeasurementOverlay(canvas, img, landmarks, imageWidth, imageHeight);
    };
    img.src = photoDataUrl;
  }, [photoDataUrl, landmarks, imageWidth, imageHeight]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    />
  );
}
