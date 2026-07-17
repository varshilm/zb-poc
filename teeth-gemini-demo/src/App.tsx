import { useState } from 'react';

import { cn } from '@/lib/utils';

import { GeminiTeethDemoPage } from './pages/GeminiTeethDemoPage';
import { JawFitScanPage } from './pages/JawFitScanPage';

type DemoTab = 'teeth' | 'jaw';

export function App() {
  const [activeTab, setActiveTab] = useState<DemoTab>('teeth');

  return (
    <div className="min-h-dvh bg-slate-100">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl gap-1 px-4 py-2 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab('teeth')}
            className={cn(
              'min-h-10 flex-1 rounded-lg px-3 text-sm font-medium transition-colors',
              activeTab === 'teeth'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            Teeth Preview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('jaw')}
            className={cn(
              'min-h-10 flex-1 rounded-lg px-3 text-sm font-medium transition-colors',
              activeTab === 'jaw'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            Jaw Fit Scan
          </button>
        </div>
      </nav>

      {activeTab === 'teeth' ? <GeminiTeethDemoPage embedded /> : <JawFitScanPage />}
    </div>
  );
}
