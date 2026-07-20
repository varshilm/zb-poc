import { DEFAULT_GEMINI_API_KEY, DEFAULT_GEMINI_IMAGE_MODEL } from '@/api/geminiConfig';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
export const TEETH_GEMINI_API_KEY_STORAGE = 'teeth_gemini_api_key';

export { DEFAULT_GEMINI_IMAGE_MODEL };

/** Copy-paste prompt for Gemini, ChatGPT, or other image tools (external or API). */
export const TEETH_COLOR_MASK_PROMPT = `Convert this dental photo into a flat 2D vector-style semantic segmentation map (not a photo).

Background: solid pure black (#000000), nothing else visible — no skin, no lips outside the mouth, no shadows.

Gums AND lips: paint as a single solid flat region using pure magenta (#FF00FF). No gradient, no texture — flat fill only, following the scalloped gumline shape.

Teeth: paint each tooth as one flat solid fill using ONLY these colors, assigning them in order from left to right, upper arch then lower arch, reusing the list if there are more teeth than colors:
#0057FF (blue), #FF8A00 (orange), #FFD500 (yellow), #00C853 (green), #8B4513 (brown), #FFB300 (gold), #00BCD4 (cyan), #7C4DFF (violet), #C0C0C0 (silver), #A0522D (rust)

Do not use any pink, red, or magenta tone anywhere except the gums/lips region.

Separate every tooth from its neighbor with a thin solid black outline (like a coloring-book line).

Style: flat vector illustration / label map, hard edges, no shading, no gradients, no text, no numbers, no legend.

Output one image, same aspect ratio as input.`;

const TEETH_SEGMENTATION_PROMPT = TEETH_COLOR_MASK_PROMPT;

export type GeminiTeethSegmentResult = {
  imageDataUrl: string;
  mimeType: string;
  model: string;
};

export type GeminiTeethSegmentErrorCode =
  | 'missing_api_key'
  | 'invalid_api_key'
  | 'rate_limit'
  | 'blocked'
  | 'no_image'
  | 'network'
  | 'unknown';

const MAX_RATE_LIMIT_RETRIES = 2;
const DEFAULT_RATE_LIMIT_DELAY_MS = 12_000;

export const GEMINI_RATE_LIMIT_MAX_RETRIES = MAX_RATE_LIMIT_RETRIES;

export class GeminiTeethSegmentError extends Error {
  readonly code: GeminiTeethSegmentErrorCode;

  constructor(code: GeminiTeethSegmentErrorCode, message: string) {
    super(message);
    this.name = 'GeminiTeethSegmentError';
    this.code = code;
  }
}

export function getStoredGeminiApiKey(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const fromStorage = window.localStorage.getItem(TEETH_GEMINI_API_KEY_STORAGE)?.trim();
  if (fromStorage) {
    return fromStorage;
  }
  return DEFAULT_GEMINI_API_KEY;
}

export function setStoredGeminiApiKey(apiKey: string): void {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    window.localStorage.removeItem(TEETH_GEMINI_API_KEY_STORAGE);
    return;
  }
  window.localStorage.setItem(TEETH_GEMINI_API_KEY_STORAGE, trimmed);
}

export function clearStoredGeminiApiKey(): void {
  window.localStorage.removeItem(TEETH_GEMINI_API_KEY_STORAGE);
}

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unable to read image file.'));
        return;
      }
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });
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

function parseGeminiError(status: number, body: string): GeminiTeethSegmentError {
  if (status === 401 || status === 403) {
    return new GeminiTeethSegmentError('invalid_api_key', 'Gemini API key is invalid or unauthorized.');
  }
  if (status === 429) {
    return new GeminiTeethSegmentError(
      'rate_limit',
      'Gemini rate limit reached (HTTP 429). Image models have low free-tier quotas — wait 30–60 seconds and try again, or enable billing in Google AI Studio.',
    );
  }

  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; status?: string } };
    const message = parsed.error?.message ?? body;
    if (/api key/i.test(message)) {
      return new GeminiTeethSegmentError('invalid_api_key', message);
    }
    if (/quota|rate limit|resource exhausted|too many requests/i.test(message)) {
      return new GeminiTeethSegmentError(
        'rate_limit',
        `${message} Wait a minute and retry, or check quotas in Google AI Studio.`,
      );
    }
    if (/safety|blocked|policy/i.test(message)) {
      return new GeminiTeethSegmentError('blocked', message);
    }
    return new GeminiTeethSegmentError('unknown', message);
  } catch {
    return new GeminiTeethSegmentError('unknown', body || `Gemini request failed (${status}).`);
  }
}

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { mimeType?: string; data?: string };
        inline_data?: { mime_type?: string; data?: string };
      }>;
    };
    finishReason?: string;
  }>;
};

function extractImagePart(response: GeminiGenerateResponse): { mimeType: string; data: string } | null {
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const inline = (part.inlineData ?? part.inline_data) as
        | { mimeType?: string; mime_type?: string; data?: string }
        | undefined;
      const mimeType = inline?.mimeType ?? inline?.mime_type;
      const data = inline?.data;
      if (mimeType?.startsWith('image/') && data) {
        return { mimeType, data };
      }
    }
  }
  return null;
}

export type RequestGeminiTeethSegmentationOptions = {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  /** Called before each automatic retry after HTTP 429. */
  onRateLimitRetry?: (attempt: number, delayMs: number) => void;
};

export async function requestGeminiTeethSegmentation(
  imageFile: Blob,
  mimeType: string,
  options: RequestGeminiTeethSegmentationOptions = {},
): Promise<GeminiTeethSegmentResult> {
  const apiKey = options.apiKey?.trim() || getStoredGeminiApiKey();
  if (!apiKey) {
    throw new GeminiTeethSegmentError(
      'missing_api_key',
      'A Gemini API key is required. Set VITE_GEMINI_API_KEY in .env or upload a color mask.',
    );
  }

  const model = options.model?.trim() || DEFAULT_GEMINI_IMAGE_MODEL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const base64 = await fileToBase64(imageFile);

  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64,
            },
          },
          { text: TEETH_SEGMENTATION_PROMPT },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['IMAGE'],
      temperature: 0.2,
    },
  };

  let response: Response | null = null;
  let bodyText = '';
  try {
    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    throw new GeminiTeethSegmentError('network', 'Unable to reach Gemini API. Check your connection.');
  }

  if (!response || !response.ok) {
    throw parseGeminiError(response?.status ?? 0, bodyText);
  }

  let parsed: GeminiGenerateResponse;
  try {
    parsed = JSON.parse(bodyText) as GeminiGenerateResponse;
  } catch {
    throw new GeminiTeethSegmentError('unknown', 'Gemini returned an unreadable response.');
  }

  const imagePart = extractImagePart(parsed);
  if (!imagePart) {
    throw new GeminiTeethSegmentError(
      'no_image',
      'Gemini did not return an image. Try another photo or model.',
    );
  }

  return {
    imageDataUrl: `data:${imagePart.mimeType};base64,${imagePart.data}`,
    mimeType: imagePart.mimeType,
    model,
  };
}
