import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import {
  createAdjustedPreviewUrl,
  DEFAULT_IMAGE_ADJUSTMENTS,
  exportAdjustedImageFile,
  type ImageAdjustments,
} from '../utils/applyImageAdjustments';

type DemoPhotoAdjustProps = {
  imageUrl: string;
  onAdjusted: (file: File, previewUrl: string) => void;
  className?: string;
};

type SliderRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

function SliderRow({ label, value, min, max, step, onChange }: SliderRowProps) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-700">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span className="tabular-nums text-slate-500">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-11 w-full"
      />
    </label>
  );
}

export function DemoPhotoAdjust({ imageUrl, onAdjusted, className }: DemoPhotoAdjustProps) {
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_IMAGE_ADJUSTMENTS);
  const [previewUrl, setPreviewUrl] = useState(imageUrl);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const url = await createAdjustedPreviewUrl(imageUrl, adjustments);
        if (!cancelled) {
          setPreviewUrl(url);
        }
      } catch {
        if (!cancelled) {
          setPreviewUrl(imageUrl);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [adjustments, imageUrl]);

  const handleContinue = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const file = await exportAdjustedImageFile(imageUrl, adjustments);
      onAdjusted(file, previewUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to export adjusted image.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <p className="text-sm text-slate-600">
        Tune brightness, contrast, and sharpness before sending to AI segmentation.
      </p>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <img src={previewUrl} alt="Adjusted preview" className="max-h-[40dvh] w-full object-contain" />
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <SliderRow
          label="Brightness"
          value={adjustments.brightness}
          min={-0.5}
          max={0.5}
          step={0.01}
          onChange={(brightness) => setAdjustments((current) => ({ ...current, brightness }))}
        />
        <SliderRow
          label="Contrast"
          value={adjustments.contrast}
          min={-50}
          max={50}
          step={1}
          onChange={(contrast) => setAdjustments((current) => ({ ...current, contrast }))}
        />
        <SliderRow
          label="Sharpness"
          value={adjustments.sharpness}
          min={0}
          max={100}
          step={1}
          onChange={(sharpness) => setAdjustments((current) => ({ ...current, sharpness }))}
        />
        <button
          type="button"
          className="text-sm text-slate-600 underline"
          onClick={() => setAdjustments(DEFAULT_IMAGE_ADJUSTMENTS)}
        >
          Reset adjustments
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={isExporting}
        onClick={() => void handleContinue()}
        className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isExporting ? 'Preparing image…' : 'Continue with this image'}
      </button>
    </div>
  );
}
