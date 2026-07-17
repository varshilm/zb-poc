import { DEFAULT_OPENAI_API_KEY, DEFAULT_OPENAI_IMAGE_MODEL } from '@/api/openaiConfig';
import { TEETH_COLOR_MASK_PROMPT } from '@/api/geminiTeethSegment';

const OPENAI_API_BASE = 'https://api.openai.com/v1';
export const TEETH_OPENAI_API_KEY_STORAGE = 'teeth_openai_api_key';

export { DEFAULT_OPENAI_IMAGE_MODEL };

export type OpenAITeethSegmentResult = {
  imageDataUrl: string;
  mimeType: string;
  model: string;
};

export type OpenAITeethSegmentErrorCode =
  | 'missing_api_key'
  | 'invalid_api_key'
  | 'rate_limit'
  | 'blocked'
  | 'no_image'
  | 'network'
  | 'unknown';

const MAX_RATE_LIMIT_RETRIES = 2;
const DEFAULT_RATE_LIMIT_DELAY_MS = 12_000;

export const OPENAI_RATE_LIMIT_MAX_RETRIES = MAX_RATE_LIMIT_RETRIES;

export class OpenAITeethSegmentError extends Error {
  readonly code: OpenAITeethSegmentErrorCode;

  constructor(code: OpenAITeethSegmentErrorCode, message: string) {
    super(message);
    this.name = 'OpenAITeethSegmentError';
    this.code = code;
  }
}

export function getStoredOpenAIApiKey(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const fromStorage = window.localStorage.getItem(TEETH_OPENAI_API_KEY_STORAGE)?.trim();
  if (fromStorage) {
    return fromStorage;
  }
  return DEFAULT_OPENAI_API_KEY;
}

export function setStoredOpenAIApiKey(apiKey: string): void {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    window.localStorage.removeItem(TEETH_OPENAI_API_KEY_STORAGE);
    return;
  }
  window.localStorage.setItem(TEETH_OPENAI_API_KEY_STORAGE, trimmed);
}

export function clearStoredOpenAIApiKey(): void {
  window.localStorage.removeItem(TEETH_OPENAI_API_KEY_STORAGE);
}

function parseRetryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after');
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, 120_000);
  }
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) {
    return Math.min(Math.max(dateMs - Date.now(), 0), 120_000);
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function parseOpenAIError(status: number, body: string): OpenAITeethSegmentError {
  if (status === 401 || status === 403) {
    return new OpenAITeethSegmentError('invalid_api_key', 'OpenAI API key is invalid or unauthorized.');
  }
  if (status === 429) {
    return new OpenAITeethSegmentError(
      'rate_limit',
      'OpenAI rate limit reached (HTTP 429). Wait and retry, or upload a color mask created externally.',
    );
  }

  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; code?: string } };
    const message = parsed.error?.message ?? body;
    if (/api key|authentication|invalid/i.test(message)) {
      return new OpenAITeethSegmentError('invalid_api_key', message);
    }
    if (/quota|rate limit|too many requests/i.test(message)) {
      return new OpenAITeethSegmentError('rate_limit', message);
    }
    if (/safety|blocked|policy|content/i.test(message)) {
      return new OpenAITeethSegmentError('blocked', message);
    }
    return new OpenAITeethSegmentError('unknown', message);
  } catch {
    return new OpenAITeethSegmentError('unknown', body || `OpenAI request failed (${status}).`);
  }
}

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

export type RequestOpenAITeethSegmentationOptions = {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  onRateLimitRetry?: (attempt: number, delayMs: number) => void;
};

export async function requestOpenAITeethSegmentation(
  imageFile: Blob,
  mimeType: string,
  options: RequestOpenAITeethSegmentationOptions = {},
): Promise<OpenAITeethSegmentResult> {
  const apiKey = options.apiKey?.trim() || getStoredOpenAIApiKey();
  if (!apiKey) {
    throw new OpenAITeethSegmentError(
      'missing_api_key',
      'An OpenAI API key is required. Set VITE_OPENAI_API_KEY in .env or upload a color mask.',
    );
  }

  const model = options.model?.trim() || DEFAULT_OPENAI_IMAGE_MODEL;
  const fetchImpl = options.fetchImpl ?? fetch;

  const formData = new FormData();
  const fileName = mimeType.includes('png') ? 'smile.png' : 'smile.jpg';
  formData.append('image', imageFile, fileName);
  formData.append('prompt', TEETH_COLOR_MASK_PROMPT);
  formData.append('model', model);
  formData.append('n', '1');
  formData.append('size', 'auto');
  formData.append('quality', 'high');
  formData.append('output_format', 'png');

  const url = `${OPENAI_API_BASE}/images/edits`;

  let response: Response | null = null;
  let bodyText = '';
  try {
    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });
      bodyText = await response.text();

      if (response.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) {
        break;
      }

      const delayMs = parseRetryAfterMs(response) ?? DEFAULT_RATE_LIMIT_DELAY_MS * (attempt + 1);
      options.onRateLimitRetry?.(attempt + 1, delayMs);
      await sleep(delayMs);
    }
  } catch {
    throw new OpenAITeethSegmentError('network', 'Unable to reach OpenAI API. Check your connection.');
  }

  if (!response || !response.ok) {
    throw parseOpenAIError(response?.status ?? 0, bodyText);
  }

  let parsed: OpenAIImageResponse;
  try {
    parsed = JSON.parse(bodyText) as OpenAIImageResponse;
  } catch {
    throw new OpenAITeethSegmentError('unknown', 'OpenAI returned an unreadable response.');
  }

  const first = parsed.data?.[0];
  if (first?.b64_json) {
    return {
      imageDataUrl: `data:image/png;base64,${first.b64_json}`,
      mimeType: 'image/png',
      model,
    };
  }

  if (first?.url) {
    const imageResponse = await fetchImpl(first.url);
    if (!imageResponse.ok) {
      throw new OpenAITeethSegmentError('no_image', 'OpenAI image URL could not be downloaded.');
    }
    const blob = await imageResponse.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Unable to read OpenAI image.'));
        }
      };
      reader.onerror = () => reject(new Error('Unable to read OpenAI image.'));
      reader.readAsDataURL(blob);
    });
    return {
      imageDataUrl: dataUrl,
      mimeType: blob.type || 'image/png',
      model,
    };
  }

  throw new OpenAITeethSegmentError(
    'no_image',
    'OpenAI did not return an image. Try another photo or upload a color mask externally.',
  );
}
