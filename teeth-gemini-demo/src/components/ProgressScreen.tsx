import { useEffect, useState } from 'react';
import { ScanFace, ScanLine } from 'lucide-react';

import {
  getFaceCacheMeta,
  getTeethCacheMeta,
  type CacheEnvelope,
  type FaceCache,
  type TeethCache,
} from '@/storage/demoCache';
import { getRecommendedSet, getToothbrushSize } from '@/utils/jawMeasurements';

import { BottomNav, type MainTab } from './BottomNav';

type ProgressScreenProps = {
  onOpenHome: () => void;
  onOpenShop: () => void;
  onOpenScan: () => void;
  onOpenAccount: () => void;
  onOpenTeethResult: () => void;
  onOpenFaceResult: () => void;
};

function formatExpiry(expiresAt: number): string {
  const hoursLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / (60 * 60 * 1000)));
  if (hoursLeft <= 1) return 'Expires within 1 hour';
  return `Expires in about ${hoursLeft} hours`;
}

export function ProgressScreen({
  onOpenHome,
  onOpenShop,
  onOpenScan,
  onOpenAccount,
  onOpenTeethResult,
  onOpenFaceResult,
}: ProgressScreenProps) {
  const [teeth, setTeeth] = useState<CacheEnvelope<TeethCache> | null>(null);
  const [face, setFace] = useState<CacheEnvelope<FaceCache> | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [teethMeta, faceMeta] = await Promise.all([getTeethCacheMeta(), getFaceCacheMeta()]);
      if (cancelled) return;
      setTeeth(teethMeta);
      setFace(faceMeta);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectTab = (tab: MainTab) => {
    if (tab === 'home') onOpenHome();
    if (tab === 'shop') onOpenShop();
    if (tab === 'account') onOpenAccount();
  };

  const empty = loaded && !teeth && !face;

  return (
    <main className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#f4f7f8]">
      <div className="app-safe-top app-nav-clearance min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pt-10">
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-brand-navy">Progress</h1>
        <p className="mt-2 text-sm text-brand-sky">
          Your latest scan results are stored on this device for 24 hours.
        </p>

        {!loaded ? (
          <p className="mt-8 text-sm text-brand-sky">Loading saved results…</p>
        ) : null}

        {empty ? (
          <div className="mt-8 rounded-[22px] bg-white px-5 py-8 text-center shadow-[0_6px_20px_rgba(33,64,96,0.06)]">
            <p className="text-sm font-medium text-brand-navy">No saved results yet</p>
            <p className="mt-2 text-sm text-brand-sky">
              Complete a teeth or face scan to see it here.
            </p>
            <button
              type="button"
              onClick={onOpenScan}
              className="mt-5 min-h-12 rounded-full bg-brand-teal px-6 text-sm font-semibold text-white"
            >
              Start a scan
            </button>
          </div>
        ) : null}

        <ul className="mt-6 space-y-4">
          {teeth ? (
            <li>
              <button
                type="button"
                onClick={onOpenTeethResult}
                className="flex w-full items-center gap-4 rounded-[22px] bg-white p-4 text-left shadow-[0_6px_20px_rgba(33,64,96,0.06)]"
              >
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#e8f4fb]">
                  {teeth.payload.sourcePreviewUrl || teeth.payload.maskDataUrl ? (
                    <img
                      src={teeth.payload.sourcePreviewUrl ?? teeth.payload.maskDataUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <ScanLine className="size-7 text-brand-teal" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-brand-navy">Teeth 3D preview</p>
                  <p className="mt-1 text-xs text-brand-sky">{formatExpiry(teeth.expiresAt)}</p>
                  <p className="mt-2 text-xs font-semibold text-brand-teal">View results</p>
                </div>
              </button>
            </li>
          ) : null}

          {face ? (
            <li>
              <button
                type="button"
                onClick={onOpenFaceResult}
                className="flex w-full items-center gap-4 rounded-[22px] bg-white p-4 text-left shadow-[0_6px_20px_rgba(33,64,96,0.06)]"
              >
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#e8f4fb]">
                  <img
                    src={face.payload.photoDataUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-brand-navy">Jaw fit scan</p>
                  <p className="mt-1 text-xs text-brand-sky">{formatExpiry(face.expiresAt)}</p>
                  <p className="mt-1 text-xs text-brand-navy">
                    {(() => {
                      const set = getRecommendedSet(face.payload.result.measurements);
                      const brush = getToothbrushSize(set.measurements.mouthWidthMm);
                      return (
                        <>
                          Size {brush.size}
                          <span className="text-brand-sky">
                            {' '}
                            · jaw {set.measurements.jawWidthMm.toFixed(1)} mm
                          </span>
                        </>
                      );
                    })()}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-brand-teal">View results</p>
                </div>
              </button>
            </li>
          ) : null}
        </ul>

        {loaded && (teeth || face) ? (
          <p className="mt-4 flex items-center gap-2 text-xs text-brand-sky">
            <ScanFace className="size-3.5" />
            Only the latest scan of each type is kept.
          </p>
        ) : null}
      </div>

      <BottomNav activeTab="progress" onSelectTab={handleSelectTab} onOpenScan={onOpenScan} />
    </main>
  );
}
