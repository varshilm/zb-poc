export const TEETH_ML_ENABLED = false;

export const TEETH_RECON_API_URL = 'http://localhost:5001';

export function isTeethMlConfigured(): boolean {
  return TEETH_ML_ENABLED && Boolean(TEETH_RECON_API_URL);
}
