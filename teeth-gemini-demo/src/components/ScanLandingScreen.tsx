import { useState } from 'react';
import { ArrowLeft, ScanFace, ScanLine } from 'lucide-react';

import landingArtwork from '@/assets/facelanding.svg';
import logo from '@/assets/zerobrush-logo.svg';
import { cn } from '@/lib/utils';

import { BottomNav, type MainTab } from './BottomNav';
import { HeroArtwork } from './HeroArtwork';

export type ScanKind = 'teeth' | 'face';

type ScanLandingScreenProps = {
  onSelectScan: (kind: ScanKind) => void;
  onBack?: () => void;
  onSelectTab?: (tab: MainTab) => void;
  onOpenScan?: () => void;
};

const SCAN_OPTIONS = [
  {
    id: 'teeth',
    label: 'Teeth scan',
    description: 'Create a guided teeth preview',
    icon: ScanLine,
  },
  {
    id: 'face',
    label: 'Face scan',
    description: 'Measure your smile and jaw fit',
    icon: ScanFace,
  },
] as const;

export function ScanLandingScreen({
  onSelectScan,
  onBack,
  onSelectTab,
  onOpenScan,
}: ScanLandingScreenProps) {
  const [selectedScan, setSelectedScan] = useState<ScanKind>('teeth');
  const showMainNav = Boolean(onSelectTab && onOpenScan);

  return (
    <main className="relative flex h-full min-h-0 flex-col overflow-hidden bg-brand-canvas">
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5',
          showMainNav ? 'app-nav-clearance' : 'pb-5',
        )}
      >
        {onBack ? (
          <div className="app-safe-top mx-auto flex w-full max-w-[390px] items-center pt-8">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to home"
              className="mt-1 flex size-10 items-center justify-center rounded-full bg-white text-brand-navy shadow-sm"
            >
              <ArrowLeft className="size-5" />
            </button>
          </div>
        ) : null}

        <div className="mx-auto flex w-full max-w-[390px] flex-col">
          {/* Slightly inset from the text column; height follows SVG aspect — page may scroll. */}
          <div className="relative mx-auto mt-1 w-full max-w-[370px] shrink-0 px-1">
            <HeroArtwork
              src={landingArtwork}
              alt="Digital smile scan preview"
              className="h-auto w-full object-contain object-top"
              placeholderClassName="min-h-[280px]"
            >
              <div className="absolute right-[4%] top-[1.0%] flex size-[80px] items-center justify-center">
                <img src={logo} alt="ZeroBrush" className="h-auto w-[54px]" />
              </div>
            </HeroArtwork>
          </div>

          <section
            className="relative z-10 -mt-5 flex flex-col px-3"
            aria-labelledby="scan-landing-title"
          >
            <h1
              id="scan-landing-title"
              className="pl-4 text-[32px] font-bold leading-[1.08] tracking-[-0.035em] text-brand-navy"
            >
              Let&apos;s Scan
              <br />
              Your Smile
            </h1>
            <p className="mt-3 pl-4 text-[15px] leading-6 text-brand-sky">
              Choose a guided scan to generate personalized oral-health insights in just a few
              moments.
            </p>

            <div
              className="mt-5 grid grid-cols-2 gap-3"
              role="radiogroup"
              aria-label="Scan type"
            >
              {SCAN_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedScan === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedScan(option.id)}
                    className={cn(
                      'rounded-[20px] border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal',
                      isSelected
                        ? 'border-brand-teal bg-[#e7f2f2] shadow-[0_6px_18px_rgba(0,102,110,0.1)]'
                        : 'border-[#dce4e6] bg-white',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-6',
                        isSelected ? 'text-brand-teal' : 'text-brand-sky',
                      )}
                    />
                    <span className="mt-3 block text-sm font-semibold text-brand-navy">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs leading-4 text-brand-sky">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pb-2">
              <button
                type="button"
                onClick={() => onSelectScan(selectedScan)}
                className="min-h-14 w-full rounded-full bg-brand-teal px-5 font-semibold text-white shadow-[0_8px_22px_rgba(0,102,110,0.2)] transition hover:bg-[#00565d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal active:scale-[0.98]"
              >
                Scan Now
              </button>
            </div>
          </section>
        </div>
      </div>

      {showMainNav ? (
        <BottomNav activeTab="scan" onSelectTab={onSelectTab!} onOpenScan={onOpenScan!} />
      ) : null}
    </main>
  );
}
