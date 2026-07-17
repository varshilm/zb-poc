/** OpenAI configuration for AI tooth segmentation. */

export const DEFAULT_OPENAI_IMAGE_MODEL =
  (import.meta.env.VITE_OPENAI_IMAGE_MODEL as string | undefined)?.trim() || 'gpt-image-1';

export const DEFAULT_OPENAI_API_KEY =
  (import.meta.env.VITE_OPENAI_API_KEY as string | undefined)?.trim() ?? '';
