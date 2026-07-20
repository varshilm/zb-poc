import { cn } from '@/lib/utils';

type AppLoaderProps = {
  /** sm = inline/button, md = cards, lg = full-screen hero */
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  /** light = canvas screens, dark = navy/teal overlays, teal = on brand-teal */
  variant?: 'light' | 'dark' | 'teal';
  className?: string;
  centered?: boolean;
};

const SIZE = {
  sm: 'size-5',
  md: 'size-9',
  lg: 'size-14',
} as const;

export function AppLoader({
  size = 'md',
  label,
  variant = 'light',
  className,
  centered = false,
}: AppLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3',
        centered && 'justify-center',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={cn('app-loader', SIZE[size], variant === 'dark' && 'app-loader--dark', variant === 'teal' && 'app-loader--teal')}
        aria-hidden
      >
        <span className="app-loader__ring" />
        <span className="app-loader__arc" />
        <span className="app-loader__core" />
      </div>
      {label ? (
        <p
          className={cn(
            'text-sm font-medium',
            variant === 'dark' || variant === 'teal' ? 'text-white/75' : 'text-brand-sky',
          )}
        >
          {label}
        </p>
      ) : null}
      <span className="sr-only">{label ?? 'Loading'}</span>
    </div>
  );
}
