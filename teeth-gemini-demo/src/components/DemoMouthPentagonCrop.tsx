import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { cn } from '@/lib/utils';

import { DEFAULT_MOUTH_PENTAGON, type NormalizedPoint } from '../constants/demoConfig';
import { exportPolygonCropDataUrl, scalePolygonFromCenter, translatePolygon } from '../utils/polygonCrop';

type DemoMouthPentagonCropProps = {
  imageUrl: string;
  onCropped: (dataUrl: string) => void;
  className?: string;
};

type DragState =
  | { mode: 'vertex'; index: number }
  | { mode: 'shape'; startX: number; startY: number; origin: NormalizedPoint[] }
  | null;

function clonePolygon(points: readonly NormalizedPoint[]): NormalizedPoint[] {
  return points.map((point) => ({ ...point }));
}

export function DemoMouthPentagonCrop({ imageUrl, onCropped, className }: DemoMouthPentagonCropProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [polygon, setPolygon] = useState<NormalizedPoint[]>(() => clonePolygon(DEFAULT_MOUTH_PENTAGON));
  const [mouthScale, setMouthScale] = useState(1);
  const [dragState, setDragState] = useState<DragState>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.src = imageUrl;
  }, [imageUrl]);

  const getDisplayMetrics = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return { width: 1, height: 1, offsetX: 0, offsetY: 0 };
    }

    const rect = container.getBoundingClientRect();
    const imageAspect = imageSize.width / imageSize.height;
    const containerAspect = rect.width / rect.height;

    if (imageAspect > containerAspect) {
      const width = rect.width;
      const height = width / imageAspect;
      return {
        width,
        height,
        offsetX: 0,
        offsetY: (rect.height - height) / 2,
      };
    }

    const height = rect.height;
    const width = height * imageAspect;
    return {
      width,
      height,
      offsetX: (rect.width - width) / 2,
      offsetY: 0,
    };
  }, [imageSize.height, imageSize.width]);

  const pointerToNormalized = useCallback(
    (clientX: number, clientY: number): NormalizedPoint | null => {
      const container = containerRef.current;
      if (!container) return null;

      const rect = container.getBoundingClientRect();
      const metrics = getDisplayMetrics();
      const localX = clientX - rect.left - metrics.offsetX;
      const localY = clientY - rect.top - metrics.offsetY;

      return {
        x: Math.min(1, Math.max(0, localX / metrics.width)),
        y: Math.min(1, Math.max(0, localY / metrics.height)),
      };
    },
    [getDisplayMetrics],
  );

  const handlePointerDownVertex = (index: number) => (event: ReactPointerEvent) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({ mode: 'vertex', index });
  };

  const handlePointerDownShape = (event: ReactPointerEvent) => {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      mode: 'shape',
      startX: event.clientX,
      startY: event.clientY,
      origin: polygon,
    });
  };

  const handlePointerMove = (event: ReactPointerEvent) => {
    if (!dragState) return;

    if (dragState.mode === 'vertex') {
      const next = pointerToNormalized(event.clientX, event.clientY);
      if (!next) return;
      setPolygon((current) =>
        current.map((point, index) => (index === dragState.index ? next : point)),
      );
      return;
    }

    const container = containerRef.current;
    if (!container) return;
    const metrics = getDisplayMetrics();
    const dx = (event.clientX - dragState.startX) / metrics.width;
    const dy = (event.clientY - dragState.startY) / metrics.height;
    setPolygon(translatePolygon(dragState.origin, dx, dy));
  };

  const handlePointerUp = () => {
    setDragState(null);
  };

  const handleScaleChange = (nextScale: number) => {
    const factor = nextScale / mouthScale;
    setMouthScale(nextScale);
    setPolygon((current) => scalePolygonFromCenter(current, factor));
  };

  const handleReset = () => {
    setMouthScale(1);
    setPolygon(clonePolygon(DEFAULT_MOUTH_PENTAGON));
  };

  const handleApplyCrop = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const croppedUrl = await exportPolygonCropDataUrl(imageUrl, polygon);
      onCropped(croppedUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to crop image.');
    } finally {
      setIsExporting(false);
    }
  };

  const metrics = getDisplayMetrics();
  const displayPoints = polygon.map((point) => ({
    x: metrics.offsetX + point.x * metrics.width,
    y: metrics.offsetY + point.y * metrics.height,
  }));
  const polygonPath = displayPoints.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <p className="text-sm text-slate-600">
        Drag the corner points to match your open-mouth shape, or drag the outline to reposition it.
      </p>

      <div
        ref={containerRef}
        className="relative h-[50dvh] min-h-[280px] overflow-hidden rounded-2xl bg-black touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerDown={handlePointerDownShape}
      >
        <img src={imageUrl} alt="Crop source" className="h-full w-full object-contain" draggable={false} />

        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <polygon
            points={polygonPath}
            fill="rgba(255,255,255,0.12)"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        </svg>

        {displayPoints.map((point, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Adjust mouth corner ${index + 1}`}
            className="absolute z-10 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-sky-500/80 shadow-md"
            style={{ left: point.x, top: point.y }}
            onPointerDown={handlePointerDownVertex(index)}
          />
        ))}
      </div>

      <label className="flex flex-col gap-2 text-sm text-slate-700">
        <span className="flex items-center justify-between">
          <span>Mouth outline size</span>
          <span className="tabular-nums text-slate-500">{mouthScale.toFixed(2)}×</span>
        </span>
        <input
          type="range"
          min={0.65}
          max={1.35}
          step={0.01}
          value={mouthScale}
          onChange={(event) => handleScaleChange(Number(event.target.value))}
          className="min-h-11 w-full"
        />
      </label>

      <button
        type="button"
        className="self-start text-sm text-slate-600 underline"
        onClick={handleReset}
      >
        Reset mouth outline
      </button>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={isExporting}
        onClick={() => void handleApplyCrop()}
        className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isExporting ? 'Cropping…' : 'Apply crop'}
      </button>
    </div>
  );
}
