import { useEffect } from 'react';
import { LoaderCircle, RefreshCw } from 'lucide-react';

import { TeethGeminiResultsView } from '@/features/geminiTeeth/TeethGeminiResultsView';
import { useTeethMaskPipeline } from '@/features/geminiTeeth/useTeethMaskPipeline';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { DemoUploadMaskButton } from './DemoUploadMaskButton';
import { useDemoAutoSegment } from '../hooks/useDemoAutoSegment';

type DemoResultsStepProps = {
  photoFile: File;
  sourcePreviewUrl: string;
  uploadedMaskUrl: string | null;
  onUploadedMask: (maskDataUrl: string) => void;
  onClearUploadedMask: () => void;
  className?: string;
};

export function DemoResultsStep({
  photoFile,
  sourcePreviewUrl,
  uploadedMaskUrl,
  onUploadedMask,
  onClearUploadedMask,
  className,
}: DemoResultsStepProps) {
  const useUploadedMask = Boolean(uploadedMaskUrl);
  const autoSegment = useDemoAutoSegment(photoFile, !useUploadedMask);
  const activeMaskUrl = uploadedMaskUrl ?? autoSegment.maskDataUrl;
  const { processMaskUrl, ...pipeline } = useTeethMaskPipeline();

  useEffect(() => {
    if (!activeMaskUrl) return;
    void processMaskUrl(activeMaskUrl).catch(() => undefined);
  }, [activeMaskUrl, processMaskUrl]);

  const showSegmentFallback =
    !useUploadedMask &&
    (autoSegment.segmentError || (!autoSegment.isSegmenting && !autoSegment.maskDataUrl));

  const showProcessing =
    autoSegment.isSegmenting || (activeMaskUrl && pipeline.isProcessing && !pipeline.maskResult);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {showProcessing ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <LoaderCircle className="size-4 animate-spin" />
          {autoSegment.statusMessage ?? pipeline.statusMessage ?? 'Building 3D preview…'}
        </div>
      ) : null}

      {showSegmentFallback ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p>{autoSegment.segmentError ?? 'Segmentation did not complete.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <DemoUploadMaskButton
              onMaskReady={onUploadedMask}
              label="Upload color mask"
              description="Use a color-coded tooth mask image (one solid color per tooth on black)."
            />
            {autoSegment.segmentError ? (
              <Button type="button" variant="ghost" className="min-h-11" onClick={autoSegment.retry}>
                <RefreshCw className="size-4" />
                Retry AI segmentation
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeMaskUrl ? (
        <>
          <TeethGeminiResultsView
            sourcePreviewUrl={sourcePreviewUrl}
            segmentedImageUrl={pipeline.segmentedImageUrl}
            numberedPreviewUrl={pipeline.numberedPreviewUrl}
            maskResult={pipeline.maskResult}
            statusMessage={pipeline.statusMessage}
            error={pipeline.error}
            isProcessing={pipeline.isProcessing}
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-800">Not happy with this preview?</p>
            <p className="mt-1 text-xs text-slate-600">
              Upload a different color mask to replace the current segmentation.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <DemoUploadMaskButton
                onMaskReady={onUploadedMask}
                label="Upload a different mask"
              />
              {useUploadedMask ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11"
                  onClick={() => {
                    onClearUploadedMask();
                    autoSegment.retry();
                  }}
                >
                  <RefreshCw className="size-4" />
                  Try AI again
                </Button>
              ) : (
                <Button type="button" variant="ghost" className="min-h-11" onClick={autoSegment.retry}>
                  <RefreshCw className="size-4" />
                  Regenerate with AI
                </Button>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
