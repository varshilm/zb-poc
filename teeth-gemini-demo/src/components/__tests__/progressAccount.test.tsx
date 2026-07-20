import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AccountScreen } from '../AccountScreen';
import { ProgressScreen } from '../ProgressScreen';

const getTeethCacheMeta = jest.fn();
const getFaceCacheMeta = jest.fn();
const clearDemoCache = jest.fn();
const clearSession = jest.fn();

jest.mock('@/storage/demoCache', () => ({
  getTeethCacheMeta: (...args: unknown[]) => getTeethCacheMeta(...args),
  getFaceCacheMeta: (...args: unknown[]) => getFaceCacheMeta(...args),
  clearDemoCache: (...args: unknown[]) => clearDemoCache(...args),
}));

jest.mock('@/session/DemoSessionContext', () => ({
  useDemoSession: () => ({
    email: 'demo@zerobrush.com',
    clearSession,
  }),
}));

describe('ProgressScreen', () => {
  beforeEach(() => {
    getTeethCacheMeta.mockReset();
    getFaceCacheMeta.mockReset();
  });

  it('shows an empty state when nothing is cached', async () => {
    getTeethCacheMeta.mockResolvedValue(null);
    getFaceCacheMeta.mockResolvedValue(null);

    render(
      <ProgressScreen
        onOpenHome={jest.fn()}
        onOpenShop={jest.fn()}
        onOpenScan={jest.fn()}
        onOpenAccount={jest.fn()}
        onOpenTeethResult={jest.fn()}
        onOpenFaceResult={jest.fn()}
      />,
    );

    expect(await screen.findByText(/No saved results yet/i)).toBeInTheDocument();
  });

  it('lists cached teeth and face results', async () => {
    const now = Date.now();
    getTeethCacheMeta.mockResolvedValue({
      savedAt: now,
      expiresAt: now + 60 * 60 * 1000,
      payload: { maskDataUrl: 'data:image/png;base64,mask', sourcePreviewUrl: 'data:image/png;base64,src' },
    });
    getFaceCacheMeta.mockResolvedValue({
      savedAt: now,
      expiresAt: now + 60 * 60 * 1000,
      payload: {
        photoDataUrl: 'data:image/png;base64,face',
        result: {
          landmarks: [],
          imageWidth: 100,
          imageHeight: 100,
          measurements: {
            recommended: 'ipd',
            iris: null,
            ipd: {
              calibration: {
                method: 'ipd',
                referenceDistanceMm: 63,
                referenceDistancePx: 100,
                pixelsPerMm: 1.5,
                accuracyNote: 'test',
                expectedErrorPct: 11,
              },
              measurements: {
                jawWidthMm: 120,
                mouthWidthMm: 48,
                faceWidthMm: 140,
                lowerFaceHeightMm: 70,
              },
            },
          },
        },
      },
    });

    const onOpenTeethResult = jest.fn();
    const onOpenFaceResult = jest.fn();

    render(
      <ProgressScreen
        onOpenHome={jest.fn()}
        onOpenShop={jest.fn()}
        onOpenScan={jest.fn()}
        onOpenAccount={jest.fn()}
        onOpenTeethResult={onOpenTeethResult}
        onOpenFaceResult={onOpenFaceResult}
      />,
    );

    expect(await screen.findByText(/Teeth 3D preview/i)).toBeInTheDocument();
    expect(screen.getByText(/Jaw fit scan/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Teeth 3D preview/i }));
    expect(onOpenTeethResult).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Jaw fit scan/i }));
    expect(onOpenFaceResult).toHaveBeenCalledTimes(1);
  });
});

describe('AccountScreen', () => {
  beforeEach(() => {
    clearDemoCache.mockReset();
    clearSession.mockReset();
    clearDemoCache.mockResolvedValue(undefined);
    window.confirm = jest.fn(() => true);
  });

  it('clears demo data after confirmation', async () => {
    render(
      <AccountScreen
        onOpenHome={jest.fn()}
        onOpenShop={jest.fn()}
        onOpenScan={jest.fn()}
        onOpenProgress={jest.fn()}
        onLogout={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Clear demo data/i }));

    await waitFor(() => expect(clearDemoCache).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Saved demo data cleared/i)).toBeInTheDocument();
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('logs out by clearing cache and session', async () => {
    const onLogout = jest.fn();
    render(
      <AccountScreen
        onOpenHome={jest.fn()}
        onOpenShop={jest.fn()}
        onOpenScan={jest.fn()}
        onOpenProgress={jest.fn()}
        onLogout={onLogout}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Log out/i }));

    await waitFor(() => {
      expect(clearDemoCache).toHaveBeenCalledTimes(1);
      expect(clearSession).toHaveBeenCalledTimes(1);
      expect(onLogout).toHaveBeenCalledTimes(1);
    });
  });
});
