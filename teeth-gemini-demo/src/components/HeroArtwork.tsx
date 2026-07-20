import { useEffect, useRef, useState, type ImgHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type HeroArtworkProps = {
  src: string;
  alt?: string;
  /** Classes for the <img>. */
  className?: string;
  /** Classes for the outer frame that reserves layout space. */
  frameClassName?: string;
  /** Minimum height while loading so text/overlays do not jump. */
  placeholderClassName?: string;
  /** Overlay content (logo badge, score chip, etc.) — shown after load. */
  children?: ReactNode;
  imgProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'className' | 'onLoad'>;
};

/**
 * Large SVG/hero images often decode late and collapse layout until ready.
 * This frame holds space, shows a light spinner, then fades the art in.
 */
export function HeroArtwork({
  src,
  alt = '',
  className,
  frameClassName,
  placeholderClassName = 'min-h-[min(52dvh,420px)]',
  children,
  imgProps,
}: HeroArtworkProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div
      className={cn('relative w-full', frameClassName, !loaded && placeholderClassName)}
      aria-busy={!loaded}
    >
      {!loaded ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-[#e7eef1]/85"
          aria-hidden
        >
          <span className="size-9 animate-spin rounded-full border-[2.5px] border-brand-teal/20 border-t-brand-teal" />
          <span className="sr-only">Loading artwork</span>
        </div>
      ) : null}

      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={cn(
          'block transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          className ?? 'w-full',
        )}
        {...imgProps}
      />

      {loaded ? children : null}
    </div>
  );
}
