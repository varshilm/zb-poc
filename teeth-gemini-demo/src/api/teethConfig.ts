/** Teeth reconstruction service configuration (local Flask by default). */

export const TEETH_ML_ENABLED =
  (import.meta.env.VITE_ENABLE_TEETH_ML as string | undefined)?.trim() === 'true';

export const TEETH_RECON_API_URL = (
  (import.meta.env.VITE_TEETH_RECON_API_URL as string | undefined)?.trim() ||
  'http://localhost:5001'
).replace(/\/$/, '');

/** Optional TeethDreamer GPU service (Linux + NVIDIA only). */
export const TEETH_DREAMER_API_URL = (
  (import.meta.env.VITE_TEETH_DREAMER_API_URL as string | undefined)?.trim() || ''
).replace(/\/$/, '');

export function isTeethMlConfigured(): boolean {
  return TEETH_ML_ENABLED && Boolean(TEETH_RECON_API_URL);
}

export function isTeethDreamerConfigured(): boolean {
  return TEETH_ML_ENABLED && Boolean(TEETH_DREAMER_API_URL);
}
