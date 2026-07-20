import { render, screen, waitFor } from '@testing-library/react';

import { GeminiTeethDemoPage } from '../../pages/GeminiTeethDemoPage';

const getTeethCache = jest.fn();
const useDemoAutoSegment = jest.fn();
const processMaskUrl = jest.fn();

jest.mock('@/storage/demoCache', () => ({
  getTeethCache: (...args: unknown[]) => getTeethCache(...args),
  setTeethCache: jest.fn(),
}));

jest.mock('@/config/debug', () => ({
  DEBUG_ENABLED: false,
}));

jest.mock('../../hooks/useDemoAutoSegment', () => ({
  useDemoAutoSegment: (...args: unknown[]) => useDemoAutoSegment(...args),
}));

jest.mock('@/features/geminiTeeth/useTeethMaskPipeline', () => ({
  useTeethMaskPipeline: () => ({
    processMaskUrl,
    maskResult: { masks: [] },
    isProcessing: false,
    statusMessage: null,
    error: null,
  }),
}));

jest.mock('@/features/geminiTeeth/TeethGeminiResultsView', () => ({
  TeethGeminiResultsView: () => <div data-testid="teeth-results-view" />,
}));

describe('GeminiTeethDemoPage cache restore', () => {
  beforeEach(() => {
    getTeethCache.mockReset();
    useDemoAutoSegment.mockReset();
    processMaskUrl.mockReset();
    processMaskUrl.mockResolvedValue(undefined);
    useDemoAutoSegment.mockReturnValue({
      maskDataUrl: null,
      isSegmenting: false,
      segmentError: null,
      statusMessage: null,
    });
  });

  it('jumps to Results and skips AI segment when a valid mask cache exists', async () => {
    getTeethCache.mockResolvedValue({
      maskDataUrl: 'data:image/png;base64,cached-mask',
      sourcePreviewUrl: 'data:image/png;base64,cached-source',
    });

    render(<GeminiTeethDemoPage preferCachedMask embedded />);

    expect(await screen.findByTestId('teeth-results-view')).toBeInTheDocument();
    expect(useDemoAutoSegment).toHaveBeenCalled();
    const lastCall = useDemoAutoSegment.mock.calls.at(-1);
    expect(lastCall?.[1]).toBe(false);
    expect(processMaskUrl).toHaveBeenCalledWith('data:image/png;base64,cached-mask');
  });

  it('stays on Capture when cache is empty', async () => {
    getTeethCache.mockResolvedValue(null);

    render(<GeminiTeethDemoPage preferCachedMask embedded />);

    await waitFor(() => {
      expect(getTeethCache).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('teeth-results-view')).not.toBeInTheDocument();
    expect(useDemoAutoSegment).not.toHaveBeenCalled();
  });
});
