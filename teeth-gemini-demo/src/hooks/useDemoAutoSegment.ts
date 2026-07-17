import { useCallback, useEffect, useRef, useState } from 'react';

import { getStoredGeminiApiKey } from '@/api/geminiTeethSegment';
import { getStoredOpenAIApiKey } from '@/api/openaiTeethSegment';
import {
  GEMINI_RATE_LIMIT_MAX_RETRIES,
  OPENAI_RATE_LIMIT_MAX_RETRIES,
  requestTeethSegmentation,
  TeethSegmentationError,
} from '@/api/teethSegmentation';

import { DEMO_TEETH_SEGMENT_PROVIDER } from '../constants/demoConfig';

export type DemoAutoSegmentState = {
  maskDataUrl: string | null;
  isSegmenting: boolean;
  segmentError: string | null;
  statusMessage: string | null;
  retry: () => void;
};

function getApiKeyForProvider(): string {
  return DEMO_TEETH_SEGMENT_PROVIDER === 'openai'
    ? getStoredOpenAIApiKey()
    : getStoredGeminiApiKey();
}

export function useDemoAutoSegment(photoFile: File | null, enabled: boolean): DemoAutoSegmentState {
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [segmentError, setSegmentError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const runIdRef = useRef(0);

  const runSegmentation = useCallback(async () => {
    if (!photoFile) return;

    const apiKey = getApiKeyForProvider();
    if (!apiKey) {
      setMaskDataUrl(null);
      setSegmentError('AI segmentation is not configured. Upload a color mask to continue.');
      setStatusMessage(null);
      setIsSegmenting(false);
      return;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setIsSegmenting(true);
    setSegmentError(null);
    setStatusMessage('Generating tooth segmentation…');

    const maxRetries =
      DEMO_TEETH_SEGMENT_PROVIDER === 'openai'
        ? OPENAI_RATE_LIMIT_MAX_RETRIES
        : GEMINI_RATE_LIMIT_MAX_RETRIES;

    try {
      const result = await requestTeethSegmentation({
        provider: DEMO_TEETH_SEGMENT_PROVIDER,
        file: photoFile,
        mimeType: photoFile.type || 'image/jpeg',
        onRateLimitRetry: (attempt, delayMs) => {
          const seconds = Math.ceil(delayMs / 1000);
          setStatusMessage(
            `Segmentation rate limit — retrying in ${seconds}s (attempt ${attempt}/${maxRetries})…`,
          );
        },
      });

      if (runIdRef.current !== runId) return;
      setMaskDataUrl(result.imageDataUrl);
      setStatusMessage(null);
    } catch (caught) {
      if (runIdRef.current !== runId) return;
      const message =
        caught instanceof TeethSegmentationError || caught instanceof Error
          ? caught.message
          : 'Segmentation failed unexpectedly.';
      setSegmentError(message);
      setStatusMessage(null);
    } finally {
      if (runIdRef.current === runId) {
        setIsSegmenting(false);
      }
    }
  }, [photoFile]);

  useEffect(() => {
    if (!enabled || !photoFile) return;
    setMaskDataUrl(null);
    void runSegmentation();
  }, [enabled, photoFile, runSegmentation]);

  const retry = useCallback(() => {
    setMaskDataUrl(null);
    void runSegmentation();
  }, [runSegmentation]);

  return {
    maskDataUrl,
    isSegmenting,
    segmentError,
    statusMessage,
    retry,
  };
}
