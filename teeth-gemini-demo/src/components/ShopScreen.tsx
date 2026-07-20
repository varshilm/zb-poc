import { ArrowLeft, Bell, Plus, ShoppingCart } from 'lucide-react';

import logo from '@/assets/zerobrush-logo.svg';
import product1 from '@/assets/product1.png';
import product2 from '@/assets/product2.png';
import product3 from '@/assets/product3.png';

import { BottomNav, type MainTab } from './BottomNav';

type ShopScreenProps = {
  onBack: () => void;
  onOpenHome: () => void;
  onOpenScan: () => void;
  onOpenProgress: () => void;
  onOpenAccount: () => void;
};

const PRODUCTS = [
  {
    id: 'custom-zerobrush',
    image: product1,
    tag: 'Removes plaque buildup',
    name: 'Custom ZeroBrush',
    price: '$549',
  },
  {
    id: 'probiotic-lozenges',
    image: product2,
    tag: 'Microbiome profile',
    name: 'Probiotic lozenges',
    price: '$49',
  },
  {
    id: 'enamel-toothpaste',
    image: product3,
    tag: 'Protects enamel',
    name: 'Enamel Toothpaste',
    price: '$1,249',
  },
  {
    id: 'zerobrush-pro',
    image: product1,
    tag: 'Removes plaque buildup',
    name: 'ZeroBrush Pro',
    price: '$549',
  },
] as const;

export function ShopScreen({
  onBack,
  onOpenHome,
  onOpenScan,
  onOpenProgress,
  onOpenAccount,
}: ShopScreenProps) {
  const handleSelectTab = (tab: MainTab) => {
    if (tab === 'home') onOpenHome();
    if (tab === 'progress') onOpenProgress();
    if (tab === 'account') onOpenAccount();
  };

  return (
    <main className="relative flex h-full min-h-0 flex-col overflow-hidden bg-brand-canvas">
      <div className="app-safe-top app-nav-clearance min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pt-10">
        <header className="flex items-center justify-between gap-3 pt-1">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to home"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-navy shadow-sm"
            >
              <ArrowLeft className="size-5" />
            </button>
            <img src={logo} alt="" className="h-auto w-8 shrink-0" />
            <h1 className="truncate text-xl font-bold text-brand-navy">Shop</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="relative flex size-10 items-center justify-center rounded-full bg-white text-brand-navy shadow-sm"
              aria-label="Notifications 150"
            >
              <Bell className="size-5" />
              <span className="absolute -right-1 -top-1 rounded-full bg-[#e11d48] px-1.5 py-0.5 text-[10px] font-bold text-white">
                150
              </span>
            </button>
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-full bg-white text-brand-navy shadow-sm"
              aria-label="Cart"
            >
              <ShoppingCart className="size-5" />
            </button>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-4">
          {PRODUCTS.map((product) => (
            <article key={product.id} className="flex flex-col">
              <div className="overflow-hidden rounded-[22px] bg-[#eef2f3]">
                <img
                  src={product.image}
                  alt={product.name}
                  className="aspect-square w-full object-cover"
                />
              </div>
              <span className="mt-3 inline-flex w-fit rounded-full bg-[#e8eef0] px-2.5 py-1 text-[11px] font-medium text-brand-ink">
                {product.tag}
              </span>
              <h2 className="mt-2 text-sm font-bold leading-5 text-brand-navy">{product.name}</h2>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-brand-navy">{product.price}</span>
                <button
                  type="button"
                  aria-label={`Add ${product.name}`}
                  className="flex size-8 items-center justify-center rounded-full bg-brand-teal text-white"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <BottomNav activeTab="shop" onSelectTab={handleSelectTab} onOpenScan={onOpenScan} />
    </main>
  );
}
