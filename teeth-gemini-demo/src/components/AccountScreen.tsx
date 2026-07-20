import { useState } from 'react';

import { clearDemoCache } from '@/storage/demoCache';
import { useDemoSession } from '@/session/DemoSessionContext';

import { BottomNav, type MainTab } from './BottomNav';

type AccountScreenProps = {
  onOpenHome: () => void;
  onOpenShop: () => void;
  onOpenScan: () => void;
  onOpenProgress: () => void;
  onLogout: () => void;
};

export function AccountScreen({
  onOpenHome,
  onOpenShop,
  onOpenScan,
  onOpenProgress,
  onLogout,
}: AccountScreenProps) {
  const { email, clearSession } = useDemoSession();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const handleSelectTab = (tab: MainTab) => {
    if (tab === 'home') onOpenHome();
    if (tab === 'shop') onOpenShop();
    if (tab === 'progress') onOpenProgress();
  };

  const handleClearData = async () => {
    const confirmed = window.confirm(
      'Clear saved scan photos and masks from this device? This cannot be undone.',
    );
    if (!confirmed) return;
    setClearing(true);
    setStatusMessage(null);
    try {
      await clearDemoCache();
      setStatusMessage('Saved demo data cleared.');
    } catch {
      setStatusMessage('Unable to clear saved data.');
    } finally {
      setClearing(false);
    }
  };

  const handleLogout = async () => {
    setClearing(true);
    try {
      await clearDemoCache();
    } catch {
      // still log out
    }
    clearSession();
    setClearing(false);
    onLogout();
  };

  return (
    <main className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#f4f7f8]">
      <div className="app-safe-top app-nav-clearance min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pt-10">
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-brand-navy">Account</h1>
        <p className="mt-2 text-sm text-brand-sky">Demo session controls for this device.</p>

        <section className="mt-6 rounded-[22px] bg-white px-5 py-5 shadow-[0_6px_20px_rgba(33,64,96,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-sky">
            Signed in as
          </p>
          <p className="mt-2 break-all text-base font-semibold text-brand-navy">
            {email.trim() || 'Guest demo user'}
          </p>
        </section>

        <section className="mt-4 space-y-3">
          <button
            type="button"
            disabled={clearing}
            onClick={() => void handleClearData()}
            className="flex min-h-14 w-full items-center justify-center rounded-full border border-[#d5dee1] bg-white text-sm font-semibold text-brand-navy disabled:opacity-60"
          >
            Clear demo data
          </button>
          <button
            type="button"
            disabled={clearing}
            onClick={() => void handleLogout()}
            className="flex min-h-14 w-full items-center justify-center rounded-full bg-brand-teal text-sm font-semibold text-white disabled:opacity-60"
          >
            Log out
          </button>
        </section>

        {statusMessage ? (
          <p className="mt-4 text-sm text-brand-sky" role="status">
            {statusMessage}
          </p>
        ) : null}

        <p className="mt-8 text-xs leading-5 text-brand-sky">
          Scan photos and color masks stay on this device for up to 24 hours and are never uploaded
          by this clear/logout flow. API keys are managed separately.
        </p>
      </div>

      <BottomNav activeTab="account" onSelectTab={handleSelectTab} onOpenScan={onOpenScan} />
    </main>
  );
}
