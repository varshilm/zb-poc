import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, RotateCcw, ScanFace, AlertCircle } from 'lucide-react';

import { BottomNav, type MainTab } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { setFaceCache } from '@/storage/demoCache';

import { FaceLandmarkOverlay } from '../components/FaceLandmarkOverlay';
import { FaceMesh3DView } from '../components/FaceMesh3DView';
import { JawSizeResultCard } from '../components/JawSizeResultCard';
import { DemoPhotoCapture } from '../components/DemoPhotoCapture';
import { TwinLoader } from '../components/TwinLoader';
import { useFaceScan, type FaceScanResult } from '../hooks/useFaceScan';

type VisualTab = 'overlay' | 'mesh';

const OVERLAY_LEGEND = [{ color: '#0d9488', border: '#0d9488', label: 'Measurements' }];

const MESH_LEGEND = [
  { color: '#e5f3ff', border: '#93c5fd', label: 'Face mesh fill' },
  { color: '#2563eb', border: '#2563eb', label: 'Landmarks' },
  { color: '#0d9488', border: '#0d9488', label: 'Measurements' },
  { color: '#22d3ee', border: '#22d3ee', label: 'Iris calibration' },
];

type JawFitScanPageProps = {
  initialPhotoDataUrl?: string | null;
  /** When set with a photo, restores results without re-running MediaPipe. */
  initialResult?: FaceScanResult | null;
  onExit?: () => void;
  onSelectTab?: (tab: MainTab) => void;
  onOpenScan?: () => void;
};

export function JawFitScanPage({
  initialPhotoDataUrl = null,
  initialResult = null,
  onExit,
  onSelectTab,
  onOpenScan,
}: JawFitScanPageProps) {
  const { state, scan, reset, preload, seedResult } = useFaceScan();
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(initialPhotoDataUrl);
  const [visualTab, setVisualTab] = useState<VisualTab>('overlay');
  const initialScanStartedRef = useRef(false);
  const showMainNav = Boolean(onSelectTab && onOpenScan);

  // Pre-load MediaPipe WASM when the page mounts so there's no delay on submit.
  useEffect(() => {
    preload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialScanStartedRef.current) return;
    if (initialPhotoDataUrl && initialResult) {
      initialScanStartedRef.current = true;
      setPhotoDataUrl(initialPhotoDataUrl);
      seedResult(initialResult);
      return;
    }
    if (!initialPhotoDataUrl) return;
    initialScanStartedRef.current = true;
    scan(initialPhotoDataUrl);
  }, [initialPhotoDataUrl, initialResult, scan, seedResult]);

  useEffect(() => {
    if (state.status !== 'done' || !photoDataUrl) return;
    void setFaceCache({ photoDataUrl, result: state.result });
  }, [state, photoDataUrl]);

  const handleCapture = (dataUrl: string) => {
    setPhotoDataUrl(dataUrl);
    scan(dataUrl);
  };

  const handleRetry = () => {
    reset();
    setPhotoDataUrl(null);
    setVisualTab('overlay');
  };

  const isCapture    = state.status === 'idle' || !photoDataUrl;
  const isProcessing = state.status === 'loading-model' || state.status === 'scanning';
  const isError      = state.status === 'error';
  const isDone       = state.status === 'done';

  const nav = showMainNav ? (
    <BottomNav activeTab="scan" onSelectTab={onSelectTab!} onOpenScan={onOpenScan!} />
  ) : null;

  if (isCapture) {
    return (
      <div className="relative h-full min-h-0">
        <DemoPhotoCapture
          scanKind="face"
          orientation="portrait"
          onBack={onExit}
          onCaptured={handleCapture}
          className={showMainNav ? 'pb-24' : undefined}
        />
        {nav}
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="relative h-full min-h-0">
        <TwinLoader
          status={
            state.status === 'loading-model'
              ? 'Preparing your face scan'
              : 'Measuring jaw geometry'
          }
          onCancel={handleRetry}
        />
        {nav}
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 overflow-y-auto bg-brand-canvas">
      <div className="app-safe-top px-5 pt-8">
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onExit}
            aria-label="Back to home"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-navy shadow-sm"
          >
            <ArrowLeft className="size-5" />
          </button>
          <ScanFace className="h-6 w-6 text-brand-teal" />
          <div>
            <h2 className="text-lg font-bold text-brand-navy">Jaw Fit Scan</h2>
            <p className="text-xs text-brand-sky">
              MediaPipe face scan → jaw measurements
            </p>
          </div>
        </div>
      </div>

      <div className={cn('px-5 pt-4', showMainNav ? 'app-nav-clearance' : 'pb-12')}>
        {/* Step indicator */}
        <div className="mb-4 flex items-center gap-2">
          {(['Capture', 'Results'] as const).map((step, i) => {
            const isActive   = i === 0 ? isCapture || isProcessing : isDone || isError;
            const isComplete = i === 0 && (isDone || isError);
            return (
              <div key={step} className="flex items-center gap-2">
                {i > 0 && <div className="h-px w-6 bg-slate-200" />}
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    isActive
                      ? 'bg-slate-900 text-white'
                      : isComplete
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-400',
                  )}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Error ── */}
        {isError && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-[20px] border border-red-200 bg-red-50 px-4 py-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-800">Scan failed</p>
                <p className="text-xs text-red-700">{state.message}</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleRetry}
              className="min-h-12 w-full rounded-full border-[#cad8db] text-brand-navy"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Try another photo
            </Button>
            <Button
              variant="outline"
              onClick={onExit}
              className="min-h-12 w-full rounded-full border-[#cad8db] text-brand-navy"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to home
            </Button>
          </div>
        )}

        {/* ── Results ── */}
        {isDone && state.result && (
          <div className="space-y-4">

            {/* View tab switcher */}
            <div className="flex gap-1 rounded-2xl border border-[#dce5e7] bg-white p-1">
              <button
                type="button"
                onClick={() => setVisualTab('overlay')}
                className={cn(
                  'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
                  visualTab === 'overlay'
                    ? 'bg-brand-teal text-white'
                    : 'text-brand-sky hover:bg-[#f0f4f5]',
                )}
              >
                Face Overlay
              </button>
              <button
                type="button"
                onClick={() => setVisualTab('mesh')}
                className={cn(
                  'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
                  visualTab === 'mesh'
                    ? 'bg-brand-teal text-white'
                    : 'text-brand-sky hover:bg-[#f0f4f5]',
                )}
              >
                Face Mesh
              </button>
            </div>

            {/* Visualisation panel */}
            <div
              className={cn(
                'overflow-hidden rounded-[24px] border border-[#dce5e7]',
                visualTab === 'overlay' ? 'bg-white' : 'bg-[#f8f8f8]',
              )}
            >
              {visualTab === 'overlay' ? (
                <FaceLandmarkOverlay
                  photoDataUrl={photoDataUrl!}
                  landmarks={state.result.landmarks}
                  imageWidth={state.result.imageWidth}
                  imageHeight={state.result.imageHeight}
                />
              ) : (
                <FaceMesh3DView
                  landmarks={state.result.landmarks}
                  imageWidth={state.result.imageWidth}
                  imageHeight={state.result.imageHeight}
                  aspectRatio="3 / 4"
                  className="rounded-xl"
                />
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 rounded-2xl border border-[#e4eaec] bg-white px-4 py-3 text-xs">
              {(visualTab === 'overlay' ? OVERLAY_LEGEND : MESH_LEGEND).map(({ color, border, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-slate-600">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full border"
                    style={{ background: color, borderColor: border }}
                  />
                  {label}
                </span>
              ))}
            </div>

            {/* Measurement card */}
            <JawSizeResultCard measurements={state.result.measurements} />

            {/* Retry */}
            <Button
              variant="outline"
              onClick={handleRetry}
              className="min-h-12 w-full rounded-full border-[#cad8db] text-brand-navy"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Scan another photo
            </Button>
            <Button
              variant="outline"
              onClick={onExit}
              className="min-h-12 w-full rounded-full border-[#cad8db] text-brand-navy"
            >
              Back to home
            </Button>
          </div>
        )}
      </div>
      {nav}
    </div>
  );
}
