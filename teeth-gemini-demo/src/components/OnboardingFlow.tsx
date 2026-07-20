import { useState } from 'react';

import onboardingOne from '@/assets/onboarding1.svg';
import onboardingTwo from '@/assets/onboarding2.svg';
import onboardingThree from '@/assets/onboarding3.svg';
import logo from '@/assets/zerobrush-logo.svg';
import { cn } from '@/lib/utils';

import { HeroArtwork } from './HeroArtwork';

const SLIDES = [
  {
    artwork: onboardingOne,
    title: (
      <>
        Smile Bright.
        <br />
        Shine Brighter.
      </>
    ),
    description:
      'A healthier smile starts with better care. Personalized care to keep you smiling every day.',
  },
  {
    artwork: onboardingTwo,
    title: (
      <>
        See Beyond
        <br />
        the Surface.
      </>
    ),
    description:
      'Scan. Detect. Stay one step ahead. Understand your oral health before problems appear.',
  },
  {
    artwork: onboardingThree,
    title: (
      <>
        Care That
        <br />
        Grows With You.
      </>
    ),
    description:
      'Your oral health evolves, so should your care. Personalized products and support for life.',
  },
] as const;

type OnboardingFlowProps = {
  onComplete: () => void;
};

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const slide = SLIDES[slideIndex]!;
  const isLast = slideIndex === SLIDES.length - 1;

  const continueFlow = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setSlideIndex((index) => index + 1);
  };

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-brand-canvas px-5">
      <section
        key={slideIndex}
        className="mx-auto flex min-h-full w-full max-w-[390px] animate-[fade-in_280ms_ease-out] flex-col pb-5"
        aria-labelledby="onboarding-title"
      >
        {/* Slightly inset from the text column; height follows SVG aspect — page may scroll. */}
        <div className="relative mx-auto w-full max-w-[370px] shrink-0 px-1 pt-2">
          <HeroArtwork
            src={slide.artwork}
            className="h-auto w-full object-contain object-top"
            placeholderClassName="min-h-[280px]"
          >
            <div className="absolute right-[4%] top-[1.0%] flex size-[80px] items-center justify-center">
              <img src={logo} alt="ZeroBrush" className="h-auto w-[54px]" />
            </div>
          </HeroArtwork>
        </div>

        <div className="relative z-10 -mt-5 flex flex-1 flex-col px-3">
          <h1
            id="onboarding-title"
            className="max-w-[330px] pl-4 text-[32px] font-bold leading-[1.08] tracking-[-0.035em] text-brand-navy"
          >
            {slide.title}
          </h1>
          <p className="mt-4 max-w-[335px] pl-4 text-[15px] leading-6 text-brand-sky">
            {slide.description}
          </p>

          <div className="app-safe-bottom mt-8 flex items-center justify-between gap-6 pt-2">
            <div className="flex items-center gap-2" aria-label={`Page ${slideIndex + 1} of 3`}>
              {SLIDES.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Go to onboarding page ${index + 1}`}
                  aria-current={index === slideIndex ? 'step' : undefined}
                  onClick={() => setSlideIndex(index)}
                  className={cn(
                    'h-2 rounded-full transition-[width,background-color] duration-300',
                    index === slideIndex ? 'w-8 bg-brand-teal' : 'w-2 bg-[#d7d7d7]',
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={continueFlow}
              className="min-h-14 min-w-[132px] rounded-full bg-brand-teal px-8 text-base font-semibold text-white shadow-[0_8px_22px_rgba(0,102,110,0.2)] transition hover:bg-[#00565d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal active:scale-[0.98]"
            >
              {isLast ? "Let's go" : 'Next'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
