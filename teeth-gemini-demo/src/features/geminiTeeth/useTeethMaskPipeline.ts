import { useCallback, useState } from 'react';

import {
  extractToothMasksFromImageUrl,
  renderNumberedMaskPreview,
  type ColorMaskSeparationResult,
} from '@/pages/TeethModeling/utils/colorMaskSeparation';

export type TeethMaskPipelineState = {
  maskResult: ColorMaskSeparationResult | null;
  segmentedImageUrl: string | null;
  numberedPreviewUrl: string | null;
  statusMessage: string | null;
  error: string | null;
  isProcessing: boolean;
};

export function useTeethMaskPipeline() {
  const [maskResult, setMaskResult] = useState<ColorMaskSeparationResult | null>(null);
  const [segmentedImageUrl, setSegmentedImageUrl] = useState<string | null>(null);
  const [numberedPreviewUrl, setNumberedPreviewUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const reset = useCallback(() => {
    setMaskResult(null);
    setSegmentedImageUrl(null);
    setNumberedPreviewUrl(null);
    setStatusMessage(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  const processMaskUrl = useCallback(async (maskDataUrl: string) => {
    setIsProcessing(true);
    setError(null);
    setSegmentedImageUrl(maskDataUrl);
    setStatusMessage('Parsing tooth colors from segmentation map…');

    try {
      const separation = await extractToothMasksFromImageUrl(maskDataUrl);
      setStatusMessage(`Found ${separation.masks.length} regions — building 3D preview…`);
      const numberedUrl = await renderNumberedMaskPreview(maskDataUrl, separation.masks);
      setMaskResult(separation);
      setNumberedPreviewUrl(numberedUrl);
      setStatusMessage(null);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Color mask processing failed unexpectedly.';
      setError(message);
      setStatusMessage(null);
      throw caught;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    maskResult,
    segmentedImageUrl,
    numberedPreviewUrl,
    statusMessage,
    error,
    isProcessing,
    setError,
    setStatusMessage,
    setIsProcessing,
    reset,
    processMaskUrl,
  };
}
