import { LoaderCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ColorMaskSeparationResult } from '@/pages/TeethModeling/utils/colorMaskSeparation';

import { useTeethGemini3DScene } from './useTeethGemini3DScene';

export type TeethGeminiResultsViewProps = {
  sourcePreviewUrl?: string | null;
  segmentedImageUrl: string | null;
  numberedPreviewUrl: string | null;
  maskResult: ColorMaskSeparationResult | null;
  statusMessage?: string | null;
  error?: string | null;
  isProcessing?: boolean;
  className?: string;
  viewportClassName?: string;
  showSourcePanel?: boolean;
};

export function TeethGeminiResultsView({
  sourcePreviewUrl,
  segmentedImageUrl,
  numberedPreviewUrl,
  maskResult,
  statusMessage,
  error,
  isProcessing = false,
  className,
  viewportClassName,
  showSourcePanel = true,
}: TeethGeminiResultsViewProps) {
  const hostRef = useTeethGemini3DScene({ maskResult, segmentedImageUrl });

  const hasPreviews = Boolean(sourcePreviewUrl || segmentedImageUrl || numberedPreviewUrl);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {statusMessage ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          {isProcessing ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {statusMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <p>{error}</p>
        </div>
      ) : null}

      {hasPreviews ? (
        <div
          className={cn(
            'grid gap-3',
            showSourcePanel ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2',
          )}
        >
          {showSourcePanel ? (
            <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <figcaption className="border-b border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">
                Source photo
              </figcaption>
              {sourcePreviewUrl ? (
                <img
                  src={sourcePreviewUrl}
                  alt="Source smile"
                  className="max-h-72 w-full object-contain"
                />
              ) : (
                <div className="flex h-40 items-center justify-center px-4 text-center text-xs text-slate-400">
                  No source attached
                </div>
              )}
            </figure>
          ) : null}

          <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
            <figcaption className="border-b border-slate-700 px-3 py-2 text-xs font-medium text-slate-200">
              Color mask
            </figcaption>
            {segmentedImageUrl ? (
              <img
                src={segmentedImageUrl}
                alt="Color-coded tooth segmentation"
                className="max-h-72 w-full object-contain"
              />
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                Waiting for mask…
              </div>
            )}
          </figure>

          <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
            <figcaption className="border-b border-slate-700 px-3 py-2 text-xs font-medium text-slate-200">
              Numbered teeth (2D)
            </figcaption>
            {numberedPreviewUrl ? (
              <img
                src={numberedPreviewUrl}
                alt="Numbered tooth segmentation"
                className="max-h-72 w-full object-contain"
              />
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                Numbers appear after processing…
              </div>
            )}
          </figure>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-900">
        {maskResult ? (
          <div
            ref={hostRef}
            className={cn('h-[360px] min-h-[280px] w-full sm:h-[440px]', viewportClassName)}
          />
        ) : (
          <div className="flex h-[360px] min-h-[220px] items-center justify-center px-6 text-center text-sm text-slate-400">
            3D preview appears after mask processing.
          </div>
        )}
      </div>

      {maskResult ? (
        <div className="flex flex-wrap gap-1.5">
          {maskResult.masks.map((mask) => (
            <span
              key={mask.id}
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                mask.role === 'gum'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700',
              )}
            >
              {mask.role === 'gum' ? (mask.arch === 'upper' ? 'Upper gum' : 'Lower gum') : mask.id}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
