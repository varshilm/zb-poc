import { render, screen } from '@testing-library/react';
import { useCallback, useState } from 'react';

import type { FaceScanResult } from '../../hooks/useFaceScan';
import { JawFitScanPage } from '../../pages/JawFitScanPage';

const getFaceCache = jest.fn();

jest.mock('@/storage/demoCache', () => ({
  getFaceCache: (...args: unknown[]) => getFaceCache(...args),
  setFaceCache: jest.fn(),
}));

jest.mock('../../components/DemoPhotoCapture', () => ({
  DemoPhotoCapture: () => <div data-testid="face-capture" />,
}));

jest.mock('../../components/JawSizeResultCard', () => ({
  JawSizeResultCard: () => <div data-testid="jaw-result-card" />,
}));

jest.mock('../../components/FaceLandmarkOverlay', () => ({
  FaceLandmarkOverlay: () => <div data-testid="face-overlay" />,
}));

jest.mock('../../components/FaceMesh3DView', () => ({
  FaceMesh3DView: () => <div data-testid="face-mesh" />,
}));

const mockScan = jest.fn();

jest.mock('../../hooks/useFaceScan', () => ({
  useFaceScan: () => {
    const [state, setState] = useState<
      | { status: 'idle' }
      | { status: 'done'; result: FaceScanResult }
    >({ status: 'idle' });

    const seedResult = useCallback((result: FaceScanResult) => {
      setState({ status: 'done', result });
    }, []);

    return {
      state,
      scan: mockScan,
      reset: jest.fn(),
      preload: jest.fn(),
      seedResult,
    };
  },
}));

describe('JawFitScanPage cache restore', () => {
  beforeEach(() => {
    getFaceCache.mockReset();
    mockScan.mockReset();
  });

  it('jumps to Results when a valid face cache exists', async () => {
    const cachedResult: FaceScanResult = {
      landmarks: [],
      imageWidth: 640,
      imageHeight: 480,
      measurements: {
        jawWidthMm: 110,
        mouthWidthMm: 50,
        interPupillaryMm: 62,
        faceHeightMm: 180,
      },
    };

    getFaceCache.mockResolvedValue({
      photoDataUrl: 'data:image/jpeg;base64,cached-face',
      result: cachedResult,
    });

    render(<JawFitScanPage preferCachedResult />);

    expect(await screen.findByTestId('jaw-result-card')).toBeInTheDocument();
    expect(mockScan).not.toHaveBeenCalled();
  });

  it('stays on Capture when cache is empty', async () => {
    getFaceCache.mockResolvedValue(null);

    render(<JawFitScanPage preferCachedResult />);

    expect(await screen.findByTestId('face-capture')).toBeInTheDocument();
    expect(screen.queryByTestId('jaw-result-card')).not.toBeInTheDocument();
  });
});
