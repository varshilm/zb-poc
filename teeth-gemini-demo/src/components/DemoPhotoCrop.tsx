import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

import { cn } from '@/lib/utils';

import {
  DEMO_CROP_SHAPE_LABELS,
  DEMO_RECT_ASPECT_PRESETS,
  type DemoCropShape,
  type DemoRectAspectPreset,
} from '../constants/demoConfig';
import { getCroppedImageDataUrl } from '../utils/cropImage';
import { DemoMouthPentagonCrop } from './DemoMouthPentagonCrop';

type DemoPhotoCropProps = {
  imageUrl: string;
  onCropped: (dataUrl: string) => void;
  className?: string;
};

export function DemoPhotoCrop({ imageUrl, onCropped, className }: DemoPhotoCropProps) {
  const [cropShape, setCropShape] = useState<DemoCropShape>('mouth');
  const [aspectPreset, setAspectPreset] = useState<DemoRectAspectPreset>('4:3');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aspectValue = DEMO_RECT_ASPECT_PRESETS.find((preset) => preset.id === aspectPreset)?.value;

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleApplyRectCrop = async () => {
    if (!croppedAreaPixels) {
      setError('Adjust the crop area first.');
      return;
    }
    setIsExporting(true);
    setError(null);
    try {
      const croppedUrl = await getCroppedImageDataUrl(imageUrl, croppedAreaPixels);
      onCropped(croppedUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to crop image.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <p className="text-sm text-slate-600">
        Choose a crop shape that best frames the teeth. The mouth outline follows the natural oval
        opening of a smile.
      </p>

      <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        {(['rectangle', 'mouth'] as const).map((shape) => (
          <button
            key={shape}
            type="button"
            onClick={() => {
              setCropShape(shape);
              setError(null);
            }}
            className={cn(
              'min-h-11 flex-1 rounded-lg px-3 text-sm font-medium transition-colors',
              cropShape === shape
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {DEMO_CROP_SHAPE_LABELS[shape]}
          </button>
        ))}
      </div>

      {cropShape === 'mouth' ? (
        <DemoMouthPentagonCrop imageUrl={imageUrl} onCropped={onCropped} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {DEMO_RECT_ASPECT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setAspectPreset(preset.id)}
                className={cn(
                  'min-h-9 rounded-full border px-3 text-xs font-medium',
                  aspectPreset === preset.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="relative h-[50dvh] min-h-[280px] overflow-hidden rounded-2xl bg-black">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspectValue}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span>Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="min-h-11 w-full"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={isExporting}
            onClick={() => void handleApplyRectCrop()}
            className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isExporting ? 'Cropping…' : 'Apply crop'}
          </button>
        </>
      )}
    </div>
  );
}
