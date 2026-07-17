import {
  GeminiTeethSegmentError,
  requestGeminiTeethSegmentation,
  type RequestGeminiTeethSegmentationOptions,
} from '@/api/geminiTeethSegment';
import {
  OpenAITeethSegmentError,
  requestOpenAITeethSegmentation,
  type RequestOpenAITeethSegmentationOptions,
} from '@/api/openaiTeethSegment';

export type TeethSegmentProvider = 'gemini' | 'openai';

export type TeethSegmentationResult = {
  imageDataUrl: string;
  mimeType: string;
  model: string;
  provider: TeethSegmentProvider;
};

export type TeethSegmentationErrorCode =
  | 'missing_api_key'
  | 'invalid_api_key'
  | 'rate_limit'
  | 'blocked'
  | 'no_image'
  | 'network'
  | 'unknown';

export class TeethSegmentationError extends Error {
  readonly code: TeethSegmentationErrorCode;
  readonly provider: TeethSegmentProvider;

  constructor(provider: TeethSegmentProvider, code: TeethSegmentationErrorCode, message: string) {
    super(message);
    this.name = 'TeethSegmentationError';
    this.code = code;
    this.provider = provider;
  }
}

export type RequestTeethSegmentationOptions = {
  provider: TeethSegmentProvider;
  file: Blob;
  mimeType: string;
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  onRateLimitRetry?: (attempt: number, delayMs: number) => void;
};

function mapProviderError(
  provider: TeethSegmentProvider,
  error: GeminiTeethSegmentError | OpenAITeethSegmentError,
): TeethSegmentationError {
  return new TeethSegmentationError(provider, error.code, error.message);
}

export async function requestTeethSegmentation(
  options: RequestTeethSegmentationOptions,
): Promise<TeethSegmentationResult> {
  const { provider, file, mimeType } = options;
  const sharedOptions = {
    apiKey: options.apiKey,
    model: options.model,
    fetchImpl: options.fetchImpl,
    onRateLimitRetry: options.onRateLimitRetry,
  };

  try {
    if (provider === 'gemini') {
      const result = await requestGeminiTeethSegmentation(file, mimeType, sharedOptions as RequestGeminiTeethSegmentationOptions);
      return { ...result, provider };
    }

    const result = await requestOpenAITeethSegmentation(file, mimeType, sharedOptions as RequestOpenAITeethSegmentationOptions);
    return { ...result, provider };
  } catch (caught) {
    if (caught instanceof GeminiTeethSegmentError) {
      throw mapProviderError('gemini', caught);
    }
    if (caught instanceof OpenAITeethSegmentError) {
      throw mapProviderError('openai', caught);
    }
    throw caught;
  }
}

export function isTeethSegmentationError(error: unknown): error is TeethSegmentationError {
  return error instanceof TeethSegmentationError;
}

export { GEMINI_RATE_LIMIT_MAX_RETRIES } from '@/api/geminiTeethSegment';
export { OPENAI_RATE_LIMIT_MAX_RETRIES } from '@/api/openaiTeethSegment';
