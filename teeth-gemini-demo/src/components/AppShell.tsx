import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type AppShellProps = {
  children: ReactNode;
  className?: string;
  fullBleed?: boolean;
};

/**
 * Phone-stage shell.
 * - Narrow portrait phones: full-bleed.
 * - Wider devices (≥430px) and desktop: centered 390×844-ish frame (same aspect as design).
 */
export function AppShell({ children, className, fullBleed = false }: AppShellProps) {
  return (
    <div className="h-dvh overflow-y-auto overscroll-y-contain bg-[#eef2f3] min-[430px]:flex min-[430px]:items-center min-[430px]:justify-center min-[430px]:overflow-hidden min-[430px]:p-3 md:p-4">
      <div
        className={cn(
          'relative h-full min-h-0 w-full overflow-hidden bg-brand-canvas',
          // Wider phones / tablets / desktop → locked phone aspect (≈390×844).
          'min-[430px]:h-[min(844px,calc(100dvh-24px))] min-[430px]:max-w-[390px] min-[430px]:rounded-[28px] min-[430px]:shadow-[0_24px_80px_rgba(33,64,96,0.18)]',
          'md:h-[min(844px,calc(111.111dvh-36px))] md:scale-90 md:rounded-[32px]',
          fullBleed ? '' : 'app-safe-top',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
