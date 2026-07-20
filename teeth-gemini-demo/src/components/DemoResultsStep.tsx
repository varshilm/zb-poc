import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

import { TeethGeminiResultsView } from '@/features/geminiTeeth/TeethGeminiResultsView';
import { useTeethMaskPipeline } from '@/features/geminiTeeth/useTeethMaskPipeline';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { setTeethCache } from '@/storage/demoCache';

import { DemoUploadMaskButton } from './DemoUploadMaskButton';
import { TwinLoader } from './TwinLoader';
import { useDemoAutoSegment } from '../hooks/useDemoAutoSegment';

type DemoResultsStepProps = {
  photoFile: File;
  sourcePreviewUrl: string;
  uploadedMaskUrl: string | null;
  onUploadedMask: (maskDataUrl: string) => void;
  onClearUploadedMask: () => void;
  /** Start a brand-new capture → crop → adjust → results flow. */
  onScanAgain?: () => void;
  className?: string;
};

export function DemoResultsStep({
  photoFile,
  sourcePreviewUrl,
  uploadedMaskUrl,
  onUploadedMask,
  onClearUploadedMask,
  onScanAgain,
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

  useEffect(() => {
    if (!activeMaskUrl || !pipeline.maskResult) return;
    void setTeethCache({
      maskDataUrl: activeMaskUrl,
      sourcePreviewUrl: sourcePreviewUrl || undefined,
    });
  }, [activeMaskUrl, pipeline.maskResult, sourcePreviewUrl]);

  const showSegmentFallback =
    !useUploadedMask &&
    (autoSegment.segmentError || (!autoSegment.isSegmenting && !autoSegment.maskDataUrl));

  const showProcessing =
    autoSegment.isSegmenting || (activeMaskUrl && pipeline.isProcessing && !pipeline.maskResult);

  if (showProcessing) {
    return (
      <TwinLoader
        compact
        status={autoSegment.statusMessage ?? pipeline.statusMessage ?? 'Building your teeth preview'}
      />
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
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
            <p className="text-sm font-medium text-slate-800">Want a new scan?</p>
            <p className="mt-1 text-xs text-slate-600">
              Start over with a fresh photo, or swap in a different color mask.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {onScanAgain ? (
                <Button
                  type="button"
                  className="min-h-11 rounded-full bg-brand-teal text-white hover:bg-[#00565d]"
                  onClick={onScanAgain}
                >
                  <RefreshCw className="size-4" />
                  Scan again
                </Button>
              ) : null}
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
