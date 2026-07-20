import { ChartLine, Home, UserRound } from 'lucide-react';

import { cn } from '@/lib/utils';

export type MainTab = 'home' | 'shop' | 'scan' | 'progress' | 'account';

type BottomNavProps = {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  onOpenScan: () => void;
};

const SHOP_OUTLINE_PATH =
  'M20 11.2422V18H21C21 18 21.3686 18.0555 21.3575 18.9906C21.3464 19.9258 21 20 21 20H1C1 20 0.528086 19.7835 0.48868 18.9906C0.449274 18.1978 1 18 1 18H2V11.2422C0.79401 10.435 0 9.0602 0 7.5C0 6.67286 0.22443 5.87621 0.63322 5.19746L3.3453 0.5C3.52393 0.1906 3.85406 0 4.21132 0H17.7887C18.1459 0 18.4761 0.1906 18.6547 0.5L21.3575 5.18172C21.7756 5.87621 22 6.67286 22 7.5C22 9.0602 21.206 10.435 20 11.2422ZM18 11.9725C17.8358 11.9907 17.669 12 17.5 12C16.2409 12 15.0789 11.478 14.25 10.6132C13.4211 11.478 12.2591 12 11 12C9.7409 12 8.5789 11.478 7.75 10.6132C6.9211 11.478 5.75911 12 4.5 12C4.331 12 4.16417 11.9907 4 11.9725V18H18V11.9725ZM4.78865 2L2.35598 6.21321C2.12409 6.59843 2 7.0389 2 7.5C2 8.8807 3.11929 10 4.5 10C5.53096 10 6.44467 9.3703 6.82179 8.4295C7.1574 7.59223 8.3426 7.59223 8.67821 8.4295C9.0553 9.3703 9.969 10 11 10C12.031 10 12.9447 9.3703 13.3218 8.4295C13.6574 7.59223 14.8426 7.59223 15.1782 8.4295C15.5553 9.3703 16.469 10 17.5 10C18.8807 10 20 8.8807 20 7.5C20 7.0389 19.8759 6.59843 19.6347 6.19746L17.2113 2H4.78865Z';

const SHOP_FILLED_PATH =
  'M21 18C21 18 21.5641 18.5211 21.5431 19.0248C21.5221 19.5285 21 20 21 20H1C1 20 0.472472 19.5705 0.451486 19.0248C0.430499 18.4791 1 18 1 18H2V11.2422C0.79401 10.435 0 9.0602 0 7.5C0 6.67286 0.22443 5.87621 0.63322 5.19746L3.3453 0.5C3.52393 0.1906 3.85406 0 4.21132 0H17.7887C18.1459 0 18.4761 0.1906 18.6547 0.5L21.3575 5.18172C21.7756 5.87621 22 6.67286 22 7.5C22 9.0602 21.206 10.435 20 11.2422V18H21ZM4.78865 2L2.35598 6.21321C2.12409 6.59843 2 7.0389 2 7.5C2 8.8807 3.11929 10 4.5 10C5.53096 10 6.44467 9.3703 6.82179 8.4295C7.1574 7.59223 8.3426 7.59223 8.67821 8.4295C9.0553 9.3703 9.969 10 11 10C12.031 10 12.9447 9.3703 13.3218 8.4295C13.6574 7.59223 14.8426 7.59223 15.1782 8.4295C15.5553 9.3703 16.469 10 17.5 10C18.8807 10 20 8.8807 20 7.5C20 7.0389 19.8759 6.59843 19.6347 6.19746L17.2113 2H4.78865Z';

function ShopIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg
      className={className}
      width="22"
      height="20"
      viewBox="0 0 22 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d={filled ? SHOP_FILLED_PATH : SHOP_OUTLINE_PATH} />
    </svg>
  );
}

function ScanToothIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="19"
      height="19"
      viewBox="0 0 19 19"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M3.20572 3.39018C3.92921 2.522 5.0071 2 6.5 2C7.40702 2 8.2486 2.2673 8.9538 2.72714C9.7364 3.23739 10.3501 3.98416 10.6936 4.86377C10.8945 5.37822 11.4744 5.63239 11.9888 5.43149C12.5033 5.23058 12.7575 4.65067 12.5565 4.13623C12.269 3.39989 11.8515 2.72943 11.3324 2.15272C11.7044 2.05311 12.0957 2 12.5 2C13.9929 2 15.0708 2.522 15.7943 3.39018C16.538 4.28262 17 5.65442 17 7.5C17 10.4029 16.5142 12.8848 15.7699 14.6024C14.985 16.4138 14.1026 17 13.5 17C13.3503 17 13.2246 16.9648 13.0385 16.6417C12.8127 16.2496 12.6541 15.6821 12.4471 14.9221C12.2731 14.2831 12.0569 13.4894 11.6947 12.8604C11.2871 12.1523 10.6003 11.5 9.5 11.5C8.3997 11.5 7.7129 12.1523 7.30525 12.8604C6.94313 13.4894 6.72692 14.2831 6.55289 14.9221C6.3459 15.6821 6.18726 16.2496 5.9615 16.6417C5.77544 16.9648 5.64973 17 5.5 17C4.8974 17 4.01501 16.4138 3.23006 14.6024C2.48575 12.8848 2 10.4029 2 7.5C2 5.65442 2.46203 4.28262 3.20572 3.39018ZM9.5 0.73245C8.6019 0.2645 7.5808 0 6.5 0C4.4929 0 2.82079 0.728 1.66928 2.10982C0.53797 3.46738 0 5.34558 0 7.5C0 10.5971 0.51425 13.3652 1.39494 15.3976C2.23499 17.3362 3.6026 19 5.5 19C6.60027 19 7.28706 18.3477 7.6947 17.6396C8.0692 16.9892 8.2876 16.1626 8.4648 15.5131C8.6626 14.7875 8.8192 14.2392 9.0385 13.8583C9.2246 13.5352 9.3503 13.5 9.5 13.5C9.6497 13.5 9.7754 13.5352 9.9615 13.8583C10.1808 14.2392 10.3374 14.7875 10.5352 15.5131C10.7123 16.1625 10.9308 16.9892 11.3053 17.6396C11.7129 18.3477 12.3997 19 13.5 19C15.3974 19 16.765 17.3362 17.6051 15.3976C18.4858 13.3652 19 10.5971 19 7.5C19 5.34558 18.462 3.46738 17.3307 2.10982C16.1792 0.728 14.5071 0 12.5 0C11.4192 0 10.3981 0.2645 9.5 0.73245Z" />
    </svg>
  );
}

export function BottomNav({ activeTab, onSelectTab, onOpenScan }: BottomNavProps) {
  return (
    <nav
      className="app-safe-bottom absolute inset-x-0 bottom-0 z-30 border-t border-[#e4eaec] bg-white/95 px-3 pt-2 backdrop-blur"
      aria-label="Main"
    >
      <div className="grid grid-cols-5 items-end gap-1">
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          aria-current={activeTab === 'home' ? 'page' : undefined}
          className={cn(
            'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium',
            activeTab === 'home' ? 'text-brand-teal' : 'text-brand-sky',
          )}
        >
          <Home
            className="size-5"
            fill={activeTab === 'home' ? 'currentColor' : 'none'}
            strokeWidth={activeTab === 'home' ? 0 : 2}
          />
          Home
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('shop')}
          aria-current={activeTab === 'shop' ? 'page' : undefined}
          className={cn(
            'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium',
            activeTab === 'shop' ? 'text-brand-teal' : 'text-brand-sky',
          )}
        >
          <ShopIcon className="h-5 w-[22px]" filled={activeTab === 'shop'} />
          Shop
        </button>

        <button
          type="button"
          onClick={onOpenScan}
          aria-current={activeTab === 'scan' ? 'page' : undefined}
          aria-label="Open scan"
          className={cn(
            'relative -top-4 flex flex-col items-center gap-1 text-[11px] font-medium',
            activeTab === 'scan' ? 'text-brand-teal' : 'text-brand-navy',
          )}
        >
          <span
            className={cn(
              'flex size-14 items-center justify-center rounded-[18px] text-white shadow-[0_10px_24px_rgba(0,102,110,0.28)]',
              activeTab === 'scan'
                ? 'bg-brand-teal ring-4 ring-[#d7ecee]'
                : 'bg-brand-teal',
            )}
          >
            <ScanToothIcon className="size-7" />
          </span>
          Scan
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('progress')}
          aria-current={activeTab === 'progress' ? 'page' : undefined}
          className={cn(
            'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium',
            activeTab === 'progress' ? 'text-brand-teal' : 'text-brand-sky',
          )}
        >
          <ChartLine
            className="size-5"
            fill={activeTab === 'progress' ? 'currentColor' : 'none'}
            strokeWidth={activeTab === 'progress' ? 0 : 2}
          />
          Progress
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('account')}
          aria-current={activeTab === 'account' ? 'page' : undefined}
          className={cn(
            'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium',
            activeTab === 'account' ? 'text-brand-teal' : 'text-brand-sky',
          )}
        >
          <UserRound
            className="size-5"
            fill={activeTab === 'account' ? 'currentColor' : 'none'}
            strokeWidth={activeTab === 'account' ? 0 : 2}
          />
          Account
        </button>
      </div>
    </nav>
  );
}
