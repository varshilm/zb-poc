import { useEffect } from 'react';

import splashMark from '@/assets/landingasset.svg';

import { AppLoader } from './AppLoader';

type SplashScreenProps = {
  onComplete: () => void;
  durationMs?: number;
};

export function SplashScreen({ onComplete, durationMs = 1500 }: SplashScreenProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onComplete, durationMs);
    return () => window.clearTimeout(timeoutId);
  }, [durationMs, onComplete]);

  return (
    <main
      className="flex h-full min-h-0 flex-col items-center justify-center gap-8 bg-brand-canvas"
      aria-label="ZeroBrush is loading"
    >
      <img
        src={splashMark}
        alt="ZeroBrush"
        className="splash-mark h-auto w-[102px]"
      />
      <AppLoader size="md" variant="light" />
    </main>
  );
}
