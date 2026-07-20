import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, Bug, Camera, CameraOff, Upload } from 'lucide-react';

import { cn } from '@/lib/utils';

type DemoPhotoCaptureProps = {
  onCaptured: (dataUrl: string) => void;
  className?: string;
  /** Preview frame aspect. Default landscape for teeth capture; portrait for jaw fit. */
  orientation?: 'landscape' | 'portrait';
  scanKind?: 'teeth' | 'face';
  onBack?: () => void;
  /** When true, show the teeth debug color-mask upload control. */
  debugEnabled?: boolean;
  onDebugMaskUpload?: (dataUrl: string) => void;
};

async function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Unable to read camera stream metadata.'));
    };
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('error', onError);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read file.'));
      }
    };
    reader.onerror = () => reject(new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });
}

export function DemoPhotoCapture({
  onCaptured,
  className,
  orientation = 'landscape',
  scanKind = orientation === 'portrait' ? 'face' : 'teeth',
  onBack,
  debugEnabled = false,
  onDebugMaskUpload,
}: DemoPhotoCaptureProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [debugUploadError, setDebugUploadError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const debugMaskInputRef = useRef<HTMLInputElement | null>(null);
  const isPortrait = orientation === 'portrait';
  const isFaceScan = scanKind === 'face';
  const showDebugMask = Boolean(debugEnabled && onDebugMaskUpload && !isFaceScan);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (!cameraActive) return undefined;

    let cancelled = false;
    const attach = async () => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        if (cancelled) return;
        const video = videoRef.current;
        const stream = streamRef.current;
        if (video && stream) {
          video.muted = true;
          video.playsInline = true;
          video.srcObject = stream;
          try {
            await waitForVideoMetadata(video);
            await video.play();
            setCameraError(null);
            return;
          } catch (error) {
            setCameraError(
              error instanceof Error ? error.message : 'Unable to start the camera preview.',
            );
            return;
          }
        }
        await new Promise((resolve) => window.setTimeout(resolve, 50));
      }
      setCameraError('Unable to attach the camera stream. Please try again.');
    };

    void attach();
    return () => {
      cancelled = true;
    };
  }, [cameraActive]);

  const handleStartCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isPortrait
          ? {
              facingMode: 'user',
              width: { ideal: 720 },
              height: { ideal: 1280 },
              aspectRatio: { ideal: 3 / 4 },
            }
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (error) {
      setCameraError(
        error instanceof Error ? error.message : 'Unable to access the camera in this browser.',
      );
      stopCamera();
    }
  };

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
      setCameraError('Camera stream is not ready yet.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('Unable to capture a frame from the camera.');
      return;
    }
    context.drawImage(video, 0, 0);
    stopCamera();
    onCaptured(canvas.toDataURL('image/jpeg', 0.95));
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      stopCamera();
      const dataUrl = await readFileAsDataUrl(file);
      onCaptured(dataUrl);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'Unable to load the selected file.');
    }
  };

  const handleDebugMaskUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onDebugMaskUpload) return;
    setDebugUploadError(null);
    try {
      stopCamera();
      onDebugMaskUpload(await readFileAsDataUrl(file));
    } catch (caught) {
      setDebugUploadError(
        caught instanceof Error ? caught.message : 'Unable to load the selected color mask.',
      );
    }
  };

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden bg-brand-navy',
        className,
      )}
    >
      <div
        className={cn(
          'relative flex min-h-0 flex-1 items-center justify-center overflow-hidden',
          isFaceScan ? 'bg-[#40b7ac]' : 'bg-brand-navy',
        )}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to scan selection"
            className="absolute left-5 top-[max(36px,calc(env(safe-area-inset-top)+16px))] z-20 flex size-11 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/30"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : null}

        <div className="absolute top-[max(40px,calc(env(safe-area-inset-top)+20px))] z-10 rounded-full bg-black/30 px-4 py-2 text-center text-xs font-medium text-white/85 backdrop-blur-sm">
          {isFaceScan ? 'Align your face so it fills the frame' : 'Bite down and center your teeth'}
        </div>

        {cameraActive ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
          />
        ) : isFaceScan ? (
          <div className="flex flex-col items-center justify-center gap-4 px-10 text-center text-white/70">
            <div className="flex size-20 items-center justify-center rounded-full border border-white/25 bg-white/10">
              <Camera className="size-8" />
            </div>
            <p className="max-w-[250px] text-sm leading-5">
              Open your front camera or upload a clear photo to begin.
            </p>
          </div>
        ) : (
          <div className="absolute inset-x-0 top-[56%] z-10 mx-auto flex aspect-4/3 w-[76%] max-h-[46%] -translate-y-1/2 flex-col items-center justify-center rounded-[28px] border border-white/40 px-6 text-center text-white/70 shadow-[0_0_0_999px_rgba(9,24,42,0.18)]">
            <div className="flex size-20 items-center justify-center rounded-full border border-white/25 bg-white/10">
              <Camera className="size-8" />
            </div>
            <p className="mt-4 max-w-[190px] text-sm leading-5">
              Open your front camera or upload a clear photo to begin.
            </p>
          </div>
        )}

        {isFaceScan ? (
          <div className="pointer-events-none absolute inset-x-[16%] top-[18%] bottom-[10%]">
            <span className="absolute left-0 top-0 size-12 rounded-tl-[18px] border-l-[3px] border-t-[3px] border-[#ff605c]" />
            <span className="absolute right-0 top-0 size-12 rounded-tr-[18px] border-r-[3px] border-t-[3px] border-[#ff605c]" />
            <span className="absolute bottom-0 left-0 size-12 rounded-bl-[18px] border-b-[3px] border-l-[3px] border-[#ff605c]" />
            <span className="absolute bottom-0 right-0 size-12 rounded-br-[18px] border-b-[3px] border-r-[3px] border-[#ff605c]" />
          </div>
        ) : cameraActive ? (
          <div className="pointer-events-none absolute inset-x-0 top-[56%] mx-auto aspect-4/3 w-[76%] max-h-[46%] -translate-y-1/2 rounded-[28px] border border-white/40 shadow-[0_0_0_999px_rgba(9,24,42,0.18)]" />
        ) : null}
      </div>

      <section className="relative z-20 shrink-0 rounded-t-[30px] bg-brand-teal px-5 pb-5 pt-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/55">
          Step 1: {isFaceScan ? 'Capture your smile' : 'Capture your teeth'}
        </p>
        <h1 className="mt-3 max-w-[330px] text-[28px] font-bold leading-[1.12] tracking-[-0.025em]">
          {isFaceScan ? 'Say cheese and snap a photo' : 'Frame your smile clearly'}
        </h1>

        {cameraError ? (
          <p className="mt-4 rounded-2xl bg-[#7f1d1d]/35 px-4 py-3 text-sm text-white">
            {cameraError}
          </p>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void handleFileChange(event)}
        />

        {showDebugMask ? (
          <div className="mt-5">
            <input
              ref={debugMaskInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => void handleDebugMaskUpload(event)}
            />
            <button
              type="button"
              onClick={() => debugMaskInputRef.current?.click()}
              className="flex min-h-14 w-full items-center gap-3 rounded-[20px] border border-dashed border-white/40 bg-white/10 px-4 text-left text-white"
            >
              <Bug className="size-5 shrink-0" />
              <span>
                <span className="block text-sm font-semibold">Debug color mask</span>
                <span className="block text-xs text-white/70">
                  Upload a prepared mask and skip the AI request
                </span>
              </span>
            </button>
            {debugUploadError ? (
              <p className="mt-2 text-xs text-red-100">{debugUploadError}</p>
            ) : null}
          </div>
        ) : null}

        <div className="app-safe-bottom mt-6 flex gap-3">
          {cameraActive ? (
            <>
              <button
                type="button"
                className="min-h-14 flex-1 rounded-full bg-white px-5 font-semibold text-brand-teal transition active:scale-[0.98]"
                onClick={() => void handleCapture()}
              >
                {isFaceScan ? 'Capture' : 'Take photo'}
              </button>
              <button
                type="button"
                aria-label="Stop camera"
                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/15 text-white"
                onClick={stopCamera}
              >
                <CameraOff className="size-5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="min-h-14 flex-1 rounded-full bg-white px-5 font-semibold text-brand-teal transition active:scale-[0.98]"
                onClick={() => void handleStartCamera()}
              >
                Open camera
              </button>
              <button
                type="button"
                aria-label="Upload photo"
                title="Upload photo"
                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/15 text-white"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-5" />
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
