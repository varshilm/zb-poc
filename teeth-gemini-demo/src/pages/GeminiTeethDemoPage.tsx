import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { DemoPhotoAdjust } from '../components/DemoPhotoAdjust';
import { DemoPhotoCapture } from '../components/DemoPhotoCapture';
import { DemoPhotoCrop } from '../components/DemoPhotoCrop';
import { DemoResultsStep } from '../components/DemoResultsStep';
import { DEMO_DISCLAIMER } from '../constants/demoConfig';

const STEPS = ['Capture', 'Crop', 'Adjust', 'Results'] as const;

type GeminiTeethDemoPageProps = {
  /** When true (inside App tab layout) the per-page header is suppressed. */
  embedded?: boolean;
};

export function GeminiTeethDemoPage({ embedded = false }: GeminiTeethDemoPageProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [captureUrl, setCaptureUrl] = useState<string | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [adjustedFile, setAdjustedFile] = useState<File | null>(null);
  const [adjustedPreviewUrl, setAdjustedPreviewUrl] = useState<string | null>(null);
  const [uploadedMaskUrl, setUploadedMaskUrl] = useState<string | null>(null);
  const [resultsSessionKey, setResultsSessionKey] = useState(0);

  const currentStep = STEPS[stepIndex];

  const canGoBack = stepIndex > 0;
  const canGoNext =
    (currentStep === 'Capture' && Boolean(captureUrl)) ||
    (currentStep === 'Crop' && Boolean(croppedUrl)) ||
    (currentStep === 'Adjust' && Boolean(adjustedFile));

  const goBack = () => {
    if (canGoBack) {
      setStepIndex((index) => index - 1);
    }
  };

  const goNext = () => {
    if (stepIndex < STEPS.length - 1 && canGoNext) {
      setStepIndex((index) => index + 1);
    }
  };

  const resetForNewCapture = () => {
    setCroppedUrl(null);
    setAdjustedFile(null);
    setAdjustedPreviewUrl(null);
    setUploadedMaskUrl(null);
    setResultsSessionKey((key) => key + 1);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      {!embedded ? (
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Teeth 3D Preview</h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">{DEMO_DISCLAIMER}</p>
        </header>
      ) : null}

      <div className="px-4 py-3 sm:px-6">
        <ol className="flex gap-1 overflow-x-auto pb-1">
          {STEPS.map((step, index) => (
            <li
              key={step}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-medium',
                index === stepIndex
                  ? 'bg-slate-900 text-white'
                  : index < stepIndex
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-white text-slate-400',
              )}
            >
              {step}
            </li>
          ))}
        </ol>
      </div>

      <main className="flex-1 px-4 pb-28 sm:px-6">
        <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          {currentStep === 'Capture' ? (
            <DemoPhotoCapture
              onCaptured={(dataUrl) => {
                setCaptureUrl(dataUrl);
                resetForNewCapture();
                setStepIndex(1);
              }}
            />
          ) : null}

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
            />
          ) : null}
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1"
            disabled={!canGoBack}
            onClick={goBack}
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
          {currentStep !== 'Results' ? (
            <Button
              type="button"
              className="min-h-11 flex-1"
              disabled={!canGoNext || currentStep === 'Capture'}
              onClick={goNext}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
