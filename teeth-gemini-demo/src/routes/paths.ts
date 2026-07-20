import type { FaceScanResult } from '@/hooks/useFaceScan';

/** Central route paths for the demo app. Use these instead of string literals. */
export const paths = {
  splash: '/',
  onboarding: '/onboarding',
  login: '/login',
  home: '/home',
  shop: '/shop',
  progress: '/progress',
  account: '/account',
  scan: '/scan',
  scanTeeth: '/scan/teeth',
  scanFace: '/scan/face',
} as const;

export type AppPath = (typeof paths)[keyof typeof paths];

export type ScanTeethLocationState = {
  debugMaskUrl?: string | null;
};

export type ScanFaceLocationState = {
  photoDataUrl?: string | null;
  result?: FaceScanResult | null;
};
