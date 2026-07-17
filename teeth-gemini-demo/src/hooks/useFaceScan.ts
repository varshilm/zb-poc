import { useCallback, useRef, useState } from 'react';

import { getFaceLandmarker } from '@/pages/DentalSimulation/faceLandmarker';

import {
  computeFaceScanMeasurements,
  type FaceScanMeasurements,
  type NormalizedLandmark,
} from '../utils/jawMeasurements';

export type FaceScanResult = {
  landmarks: NormalizedLandmark[];
  imageWidth: number;
  imageHeight: number;
  measurements: FaceScanMeasurements;
};

type FaceScanState =
  | { status: 'idle' }
  | { status: 'loading-model' }
  | { status: 'scanning' }
  | { status: 'done'; result: FaceScanResult }
  | { status: 'error'; message: string };

export type UseFaceScanReturn = {
  state: FaceScanState;
  scan: (photoDataUrl: string) => void;
  reset: () => void;
  preload: () => void;
};

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to load photo for face scan.'));
    img.src = dataUrl;
  });
}

export function useFaceScan(): UseFaceScanReturn {
  const [state, setState] = useState<FaceScanState>({ status: 'idle' });
  const runIdRef = useRef(0);

  const preload = useCallback(() => {
    setState((current) => {
      if (current.status !== 'idle') return current;
      return { status: 'loading-model' };
    });
    void getFaceLandmarker().then(() => {
      setState((current) =>
        current.status === 'loading-model' ? { status: 'idle' } : current,
      );
    }).catch(() => {
      setState((current) =>
        current.status === 'loading-model' ? { status: 'idle' } : current,
      );
    });
  }, []);

  const scan = useCallback((photoDataUrl: string) => {
    const runId = ++runIdRef.current;

    setState({ status: 'loading-model' });

    void (async () => {
      try {
        const [landmarker, image] = await Promise.all([
          getFaceLandmarker(),
          loadImageFromDataUrl(photoDataUrl),
        ]);

        if (runIdRef.current !== runId) return;

        setState({ status: 'scanning' });

        const { width, height } = image;
        const result = landmarker.detect(image);
        const rawLandmarks = result.faceLandmarks[0] ?? [];

        if (rawLandmarks.length < 400) {
          setState({
            status: 'error',
            message: 'No face detected. Make sure your face is fully visible and well-lit.',
          });
          return;
        }

        // Normalize: MediaPipe returns 0–1 coordinates; cast to our type.
        const landmarks = rawLandmarks as NormalizedLandmark[];
        const measurements = computeFaceScanMeasurements(landmarks, width, height);

        if (runIdRef.current !== runId) return;

        setState({
          status: 'done',
          result: { landmarks, imageWidth: width, imageHeight: height, measurements },
        });
      } catch (caught) {
        if (runIdRef.current !== runId) return;
        setState({
          status: 'error',
          message: caught instanceof Error ? caught.message : 'Face scan failed unexpectedly.',
        });
      }
    })();
  }, []);

  const reset = useCallback(() => {
    runIdRef.current += 1;
    setState({ status: 'idle' });
  }, []);

  return { state, scan, reset, preload };
}
