import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

import { BottomNav, type MainTab } from '@/components/BottomNav';
import { AppLoader } from '@/components/AppLoader';
import { cn } from '@/lib/utils';
import { DEBUG_ENABLED } from '@/config/debug';
import { getTeethCache } from '@/storage/demoCache';

import { DemoPhotoAdjust } from '../components/DemoPhotoAdjust';
import { DemoPhotoCapture } from '../components/DemoPhotoCapture';
import { DemoPhotoCrop } from '../components/DemoPhotoCrop';
import { DemoResultsStep } from '../components/DemoResultsStep';
import { DEMO_DISCLAIMER } from '../constants/demoConfig';

const STEPS = ['Capture', 'Crop', 'Adjust', 'Results'] as const;

type GeminiTeethDemoPageProps = {
  /** When true (inside App tab layout) the per-page header is suppressed. */
  embedded?: boolean;
  initialCaptureUrl?: string | null;
  initialDebugMaskUrl?: string | null;
  /** When false, skip auto-loading the 24h teeth mask cache (e.g. explicit new capture). */
  preferCachedMask?: boolean;
  onExit?: () => void;
  onSelectTab?: (tab: MainTab) => void;
  onOpenScan?: () => void;
};

function applyMaskRestore(
  maskDataUrl: string,
  sourcePreviewUrl: string | undefined,
  setters: {
    setCaptureUrl: (v: string | null) => void;
    setCroppedUrl: (v: string | null) => void;
    setAdjustedFile: (v: File | null) => void;
    setAdjustedPreviewUrl: (v: string | null) => void;
    setUploadedMaskUrl: (v: string | null) => void;
    setResultsSessionKey: (fn: (key: number) => number) => void;
    setStepIndex: (v: number) => void;
  },
) {
  setters.setCaptureUrl(null);
  setters.setCroppedUrl(null);
  setters.setAdjustedFile(new File([], 'cached-color-mask.png', { type: 'image/png' }));
  setters.setAdjustedPreviewUrl(sourcePreviewUrl ?? maskDataUrl);
  setters.setUploadedMaskUrl(maskDataUrl);
  setters.setResultsSessionKey((key) => key + 1);
  setters.setStepIndex(3);
}

export function GeminiTeethDemoPage({
  embedded = false,
  initialCaptureUrl = null,
  initialDebugMaskUrl = null,
  preferCachedMask = true,
  onExit,
  onSelectTab,
  onOpenScan,
}: GeminiTeethDemoPageProps) {
  const [stepIndex, setStepIndex] = useState(
    initialDebugMaskUrl ? 3 : initialCaptureUrl ? 1 : 0,
  );
  const [captureUrl, setCaptureUrl] = useState<string | null>(initialCaptureUrl);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [adjustedFile, setAdjustedFile] = useState<File | null>(() =>
    initialDebugMaskUrl ? new File([], 'debug-color-mask.png', { type: 'image/png' }) : null,
  );
  const [adjustedPreviewUrl, setAdjustedPreviewUrl] = useState<string | null>(
    initialDebugMaskUrl,
  );
  const [uploadedMaskUrl, setUploadedMaskUrl] = useState<string | null>(initialDebugMaskUrl);
  const [resultsSessionKey, setResultsSessionKey] = useState(0);
  const [cacheChecked, setCacheChecked] = useState(
    Boolean(initialDebugMaskUrl) || !preferCachedMask,
  );

  useEffect(() => {
    if (initialDebugMaskUrl || !preferCachedMask) return undefined;

    let cancelled = false;
    void (async () => {
      try {
        const cached = await getTeethCache();
        if (cancelled) return;
        if (cached?.maskDataUrl) {
          applyMaskRestore(cached.maskDataUrl, cached.sourcePreviewUrl, {
            setCaptureUrl,
            setCroppedUrl,
            setAdjustedFile,
            setAdjustedPreviewUrl,
            setUploadedMaskUrl,
            setResultsSessionKey,
            setStepIndex,
          });
        }
      } finally {
        if (!cancelled) setCacheChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialDebugMaskUrl, preferCachedMask]);

  const currentStep = STEPS[stepIndex];
  const showMainNav = Boolean(onSelectTab && onOpenScan);

  const resetForNewCapture = () => {
    setCroppedUrl(null);
    setAdjustedFile(null);
    setAdjustedPreviewUrl(null);
    setUploadedMaskUrl(null);
    setResultsSessionKey((key) => key + 1);
  };

  const startFreshScan = () => {
    setCaptureUrl(null);
    resetForNewCapture();
    setStepIndex(0);
  };

  const nav = showMainNav ? (
    <BottomNav
      activeTab="scan"
      onSelectTab={onSelectTab!}
      onOpenScan={onOpenScan!}
    />
  ) : null;

  if (!cacheChecked) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-brand-canvas">
        <AppLoader size="lg" label="Restoring your last scan…" centered />
      </div>
    );
  }

  if (currentStep === 'Capture') {
    return (
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
        <DemoPhotoCapture
          scanKind="teeth"
          debugEnabled={DEBUG_ENABLED}
          onBack={onExit}
          className={showMainNav ? 'pb-24' : undefined}
          onCaptured={(dataUrl) => {
            setCaptureUrl(dataUrl);
            resetForNewCapture();
            setStepIndex(1);
          }}
          onDebugMaskUpload={(dataUrl) => {
            applyMaskRestore(dataUrl, dataUrl, {
              setCaptureUrl,
              setCroppedUrl,
              setAdjustedFile,
              setAdjustedPreviewUrl,
              setUploadedMaskUrl,
              setResultsSessionKey,
              setStepIndex,
            });
          }}
        />
        {nav}
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-brand-canvas">
      {!embedded ? (
        <header className="border-b border-[#dde5e7] bg-white px-5 py-4">
          <h1 className="text-lg font-semibold text-brand-navy">Teeth 3D Preview</h1>
          <p className="mt-1 text-xs text-brand-sky">{DEMO_DISCLAIMER}</p>
        </header>
      ) : null}

      <header className="app-safe-top bg-brand-canvas px-5 pt-8">
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onExit}
            aria-label="Back to home"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-navy shadow-sm"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-teal">
              Teeth scan
            </p>
            <h1 className="text-xl font-bold text-brand-navy">{currentStep}</h1>
          </div>
        </div>

        <ol className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {STEPS.map((step, index) => (
            <li
              key={step}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold',
                index === stepIndex
                  ? 'bg-brand-teal text-white'
                  : index < stepIndex
                    ? 'bg-[#dcebec] text-brand-teal'
                    : 'bg-white text-brand-sky',
              )}
            >
              {step}
            </li>
          ))}
        </ol>
      </header>

      <main
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pt-4',
          showMainNav ? 'app-nav-clearance' : 'pb-28',
        )}
      >
        <div className="rounded-[24px] border border-[#e0e7e9] bg-white p-4 shadow-[0_10px_32px_rgba(33,64,96,0.08)]">
          {currentStep === 'Crop' && captureUrl ? (
            <DemoPhotoCrop
              imageUrl={captureUrl}
              onCropped={(dataUrl) => {
                setCroppedUrl(dataUrl);
                setAdjustedFile(null);
                setAdjustedPreviewUrl(null);
                setUploadedMaskUrl(null);
                setResultsSessionKey((key) => key + 1);
                setStepIndex(2);
              }}
            />
          ) : null}

          {currentStep === 'Adjust' && croppedUrl ? (
            <DemoPhotoAdjust
              imageUrl={croppedUrl}
              onAdjusted={(file, previewUrl) => {
                setAdjustedFile(file);
                setAdjustedPreviewUrl(previewUrl);
                setUploadedMaskUrl(null);
                setResultsSessionKey((key) => key + 1);
                setStepIndex(3);
              }}
            />
          ) : null}

          {currentStep === 'Results' && adjustedFile && adjustedPreviewUrl ? (
            <DemoResultsStep
              key={resultsSessionKey}
              photoFile={adjustedFile}
              sourcePreviewUrl={adjustedPreviewUrl}
              uploadedMaskUrl={uploadedMaskUrl}
              onUploadedMask={setUploadedMaskUrl}
              onClearUploadedMask={() => setUploadedMaskUrl(null)}
              onScanAgain={startFreshScan}
            />
          ) : null}
        </div>
      </main>

      {nav}
    </div>
  );
}
