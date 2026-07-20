import { ShoppingCart, Wallet } from 'lucide-react';

import homeArt from '@/assets/homescreenart.svg';
import logo from '@/assets/zerobrush-logo.svg';

import { BottomNav, type MainTab } from './BottomNav';
import { HeroArtwork } from './HeroArtwork';

type HomeScreenProps = {
  displayName?: string;
  onOpenShop: () => void;
  onOpenScan: () => void;
  onOpenProgress: () => void;
  onOpenAccount: () => void;
};

const FOCUS_ITEMS = [
  { title: "Dentist's Appointment at 1600hrs", points: 50 },
  { title: 'Brush before sleeping', points: 50 },
] as const;

function formatDisplayName(raw?: string): string {
  if (!raw?.trim()) return 'Jennifer Carr';
  const local = raw.includes('@') ? raw.split('@')[0]! : raw;
  return local
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function RewardCoin({ points }: { points: number }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-[15px] font-semibold text-brand-navy">
      <span
        className="relative flex size-[26px] items-center justify-center rounded-full"
        style={{
          background: 'linear-gradient(145deg, #f6d86a 0%, #e8b423 55%, #c99212 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
        }}
        aria-hidden
      >
        <span className="absolute inset-[3px] rounded-full border border-[#f8e59a]" />
        <span className="text-[11px] leading-none text-[#c62828]">★</span>
      </span>
      {points}
    </span>
  );
}

export function HomeScreen({
  displayName,
  onOpenShop,
  onOpenScan,
  onOpenProgress,
  onOpenAccount,
}: HomeScreenProps) {
  const name = formatDisplayName(displayName);

  const handleSelectTab = (tab: MainTab) => {
    if (tab === 'shop') onOpenShop();
    if (tab === 'progress') onOpenProgress();
    if (tab === 'account') onOpenAccount();
  };

  return (
    <main className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#f4f7f8]">
      <div className="app-safe-top app-nav-clearance min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pt-8">
        <header className="flex items-center justify-between pt-1">
          <img src={logo} alt="ZeroBrush" className="h-auto w-[40px]" />
          <div className="flex items-center gap-4 text-brand-navy">
            <button type="button" className="relative" aria-label="Wallet balance 150">
              <Wallet className="size-[22px]" strokeWidth={1.75} />
              <span className="absolute -right-2.5 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e11d48] px-1 text-[10px] font-bold leading-none text-white">
                150
              </span>
            </button>
            <button type="button" aria-label="Cart">
              <ShoppingCart className="size-[22px]" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        <p className="mt-6 pl-3 text-[15px] leading-5 text-[#90a0b0]">Welcome back,</p>
        <p className="mt-0.5 pl-3 text-[22px] font-bold leading-7 tracking-[-0.02em] text-brand-navy">
          {name}
        </p>

        {/*
          homescreenart.svg is a notched card (top-left cutout).
          Headline sits in normal flow inside that cutout; the card pulls up around it.
        */}
        <section className="relative mt-3 w-full" aria-labelledby="home-score-heading">
          <h1
            id="home-score-heading"
            className="relative z-10 max-w-[48%] pl-3 text-[25px] font-bold leading-[1.05] tracking-[-0.035em] text-brand-navy"
          >
            Your smile
            <br />
            looks great
            <br />
            today.
          </h1>

          <div className="relative -mt-[4.2rem]">
            <HeroArtwork
              src={homeArt}
              className="pointer-events-none h-auto select-none"
              placeholderClassName="min-h-[340px]"
              imgProps={{ draggable: false }}
            >
              <div className="absolute left-[4.5%] top-[38%] z-10 flex w-[40%] flex-col items-start">
                <p className="flex items-baseline gap-0.5 leading-none">
                  <span className="text-[42px] font-bold tracking-[-0.03em] text-[#1f9d63]">89</span>
                  <span className="text-[14px] font-semibold text-[#7a8b9c]">/100</span>
                </p>
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-navy">
                  Oral Health Score
                </p>
                <button
                  type="button"
                  className="mt-3 inline-flex min-h-8 items-center rounded-full bg-white px-3.5 text-[13px] font-semibold text-brand-navy shadow-[0_2px_8px_rgba(33,64,96,0.08)]"
                >
                  View Details
                </button>
              </div>
            </HeroArtwork>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-navy">
            Today&apos;s Focus
          </h2>
          <ul className="mt-3 space-y-3">
            {FOCUS_ITEMS.map((item) => (
              <li
                key={item.title}
                className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-4 shadow-[0_6px_18px_rgba(33,64,96,0.06)]"
              >
                <span className="text-[15px] font-medium leading-5 text-brand-navy">{item.title}</span>
                <RewardCoin points={item.points} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <BottomNav activeTab="home" onSelectTab={handleSelectTab} onOpenScan={onOpenScan} />
    </main>
  );
}
