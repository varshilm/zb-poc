/** Google Gemini configuration for AI tooth segmentation. */

export const DEFAULT_GEMINI_IMAGE_MODEL =
  (import.meta.env.VITE_GEMINI_IMAGE_MODEL as string | undefined)?.trim() ||
  'gemini-2.0-flash-exp';

export const DEFAULT_GEMINI_API_KEY =
  (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() ?? '';
