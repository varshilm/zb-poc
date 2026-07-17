import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, CameraOff, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DemoPhotoCaptureProps = {
  onCaptured: (dataUrl: string) => void;
  className?: string;
  /** Preview frame aspect. Default landscape for teeth capture; portrait for jaw fit. */
  orientation?: 'landscape' | 'portrait';
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
}: DemoPhotoCaptureProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isPortrait = orientation === 'portrait';
  const previewAspectClass = isPortrait ? 'aspect-[3/4]' : 'aspect-[4/3]';

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

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <p className="text-sm text-slate-600">
        Capture or upload a frontal smile photo. Frame the teeth clearly in good lighting.
      </p>

      {cameraActive ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
          <video
            ref={videoRef}
            className={cn(previewAspectClass, 'w-full object-cover')}
            playsInline
            muted
          />
        </div>
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500',
            previewAspectClass,
          )}
        >
          Camera preview appears here
        </div>
      )}

      {cameraError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {cameraError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void handleFileChange(event)}
        />
        {cameraActive ? (
          <>
            <Button type="button" className="min-h-11 flex-1" onClick={() => void handleCapture()}>
              <Camera className="size-4" />
              Take photo
            </Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={stopCamera}>
              <CameraOff className="size-4" />
              Stop
            </Button>
          </>
        ) : (
          <>
            <Button type="button" className="min-h-11 flex-1" onClick={() => void handleStartCamera()}>
              <Camera className="size-4" />
              Open camera
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Upload photo
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
