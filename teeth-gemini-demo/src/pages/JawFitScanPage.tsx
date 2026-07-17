import { useEffect, useState } from 'react';
import { Camera, ChevronLeft, RotateCcw, ScanFace, AlertCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { FaceLandmarkOverlay } from '../components/FaceLandmarkOverlay';
import { FaceMesh3DView } from '../components/FaceMesh3DView';
import { JawSizeResultCard } from '../components/JawSizeResultCard';
import { DemoPhotoCapture } from '../components/DemoPhotoCapture';
import { useFaceScan } from '../hooks/useFaceScan';

type VisualTab = 'overlay' | 'mesh';

const OVERLAY_LEGEND = [{ color: '#0d9488', border: '#0d9488', label: 'Measurements' }];

const MESH_LEGEND = [
  { color: '#e5f3ff', border: '#93c5fd', label: 'Face mesh fill' },
  { color: '#2563eb', border: '#2563eb', label: 'Landmarks' },
  { color: '#0d9488', border: '#0d9488', label: 'Measurements' },
  { color: '#22d3ee', border: '#22d3ee', label: 'Iris calibration' },
];

function ScanningSpinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

function CaptureGuidance() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <Camera className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Photo tips for best accuracy</p>
          <ul className="mt-1 list-disc pl-4 text-xs text-blue-700">
            <li>Face the camera straight on, about arm&apos;s length away</li>
            <li>Use even, front-facing lighting — avoid strong shadows</li>
            <li>Remove glasses and keep your full face visible</li>
            <li>Relax your jaw so your natural mouth width is shown</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function JawFitScanPage() {
  const { state, scan, reset, preload } = useFaceScan();
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [visualTab, setVisualTab] = useState<VisualTab>('overlay');

  // Pre-load MediaPipe WASM when the page mounts so there's no delay on submit.
  useEffect(() => {
    preload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="mx-auto w-full max-w-3xl pb-12">
      {/* Page header */}
      <div className="px-4 pt-4 sm:px-6">
        <div className="flex items-center gap-3">
          <ScanFace className="h-6 w-6 text-slate-700" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Jaw Fit Scan</h2>
            <p className="text-xs text-slate-500">
              MediaPipe face scan → jaw measurements
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 sm:px-6">
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

        {/* ── Capture ── */}
        {isCapture && (
          <div className="space-y-4">
            <CaptureGuidance />
            <DemoPhotoCapture onCaptured={handleCapture} orientation="portrait" />
          </div>
        )}

        {/* ── Processing ── */}
        {isProcessing && photoDataUrl && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <img
              src={photoDataUrl}
              alt="Processing"
              className="w-full object-contain opacity-60"
              style={{ maxHeight: 320 }}
            />
            <ScanningSpinner
              label={
                state.status === 'loading-model'
                  ? 'Loading face-scan model…'
                  : 'Detecting landmarks…'
              }
            />
          </div>
        )}

        {/* ── Error ── */}
        {isError && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-800">Scan failed</p>
                <p className="text-xs text-red-700">{state.message}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleRetry} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              Try another photo
            </Button>
          </div>
        )}

        {/* ── Results ── */}
        {isDone && state.result && (
          <div className="space-y-4">

            {/* View tab switcher */}
            <div className="flex rounded-lg border border-slate-200 bg-white p-1 gap-1">
              <button
                type="button"
                onClick={() => setVisualTab('overlay')}
                className={cn(
                  'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
                  visualTab === 'overlay'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-50',
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
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                Face Mesh
              </button>
            </div>

            {/* Visualisation panel */}
            <div
              className={cn(
                'overflow-hidden rounded-xl border border-slate-200',
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
            <div className="flex flex-wrap gap-3 rounded-lg border border-slate-100 bg-white px-4 py-2 text-xs">
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
              className="w-full border-slate-300 text-slate-700"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Scan another photo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
