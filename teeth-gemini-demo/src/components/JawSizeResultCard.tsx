import { AlertTriangle, CheckCircle2, Info, Ruler, Star } from 'lucide-react';

import { cn } from '@/lib/utils';

import { JAW_SCAN_ACCURACY_NOTES } from '../constants/demoConfig';
import { getRecommendedSet, type FaceScanMeasurements, type JawMeasurementsMm } from '../utils/jawMeasurements';

type JawSizeResultCardProps = {
  measurements: FaceScanMeasurements;
  className?: string;
};

const MEASUREMENT_ROWS: { label: string; key: keyof JawMeasurementsMm }[] = [
  { label: 'Mouth width',        key: 'mouthWidthMm' },
  { label: 'Jaw width',          key: 'jawWidthMm' },
  { label: 'Face width',         key: 'faceWidthMm' },
  { label: 'Lower-face height',  key: 'lowerFaceHeightMm' },
];

function fmt(val: number) {
  return `${val.toFixed(1)} mm`;
}

export function JawSizeResultCard({ measurements, className }: JawSizeResultCardProps) {
  const { iris, ipd, recommended } = measurements;
  const isIrisRecommended = recommended === 'iris';
  const recommendedSet = getRecommendedSet(measurements);
  const irisAvailable = iris !== null;

  return (
    <div className={cn('space-y-4', className)}>

      {/* ── Comparison table ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
          <Ruler className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Measurements
          </span>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-slate-100 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide">
          <span className="text-slate-400" />
          {/* Iris column */}
          <span
            className={cn(
              'flex items-center justify-end gap-1 text-right',
              irisAvailable ? 'text-emerald-700' : 'text-slate-300',
            )}
          >
            {irisAvailable && isIrisRecommended && (
              <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" />
            )}
            Iris
          </span>
          {/* IPD column */}
          <span
            className={cn(
              'flex items-center justify-end gap-1 text-right',
              !isIrisRecommended ? 'text-amber-700' : 'text-slate-400',
            )}
          >
            {!isIrisRecommended && (
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            )}
            IPD
          </span>
        </div>

        {/* Data rows */}
        {MEASUREMENT_ROWS.map(({ label, key }) => {
          const irisVal = iris?.measurements[key];
          const ipdVal = ipd.measurements[key];
          return (
            <div
              key={key}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 px-4 py-2 even:bg-slate-50/60"
            >
              <span className="text-sm text-slate-600">{label}</span>
              {/* Iris value */}
              <span
                className={cn(
                  'min-w-[60px] text-right tabular-nums text-sm',
                  irisAvailable && isIrisRecommended
                    ? 'font-semibold text-emerald-700'
                    : 'text-slate-400',
                )}
              >
                {irisVal !== undefined ? fmt(irisVal) : '—'}
              </span>
              {/* IPD value */}
              <span
                className={cn(
                  'min-w-[60px] text-right tabular-nums text-sm',
                  !isIrisRecommended
                    ? 'font-semibold text-amber-700'
                    : 'text-slate-400',
                )}
              >
                {fmt(ipdVal)}
              </span>
            </div>
          );
        })}

        {/* Footer: recommended indicator */}
        <div className="border-t border-slate-100 px-4 py-2">
          <p className="text-[11px] text-slate-500">
            <Star className="mr-0.5 inline h-3 w-3 fill-current" />
            {isIrisRecommended
              ? 'Iris calibration recommended — tighter population variance (±3.4%) and same-region distortion profile.'
              : 'IPD calibration used — iris contour not detected in this photo.'}
          </p>
        </div>
      </div>

      {/* ── Calibration detail badges ── */}
      <div className="space-y-2">
        {/* Iris badge */}
        <div
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2',
            irisAvailable
              ? isIrisRecommended
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-slate-200 bg-slate-50'
              : 'border-slate-100 bg-slate-50 opacity-50',
          )}
        >
          {irisAvailable ? (
            <CheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', isIrisRecommended ? 'text-emerald-600' : 'text-slate-400')} />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
          )}
          <div className="min-w-0">
            <p className={cn('text-xs font-semibold', irisAvailable ? (isIrisRecommended ? 'text-emerald-800' : 'text-slate-600') : 'text-slate-400')}>
              Iris calibration{isIrisRecommended && irisAvailable ? ' ★ recommended' : ''}
              {!irisAvailable ? ' — not detected' : ''}
            </p>
            <p className={cn('text-xs', irisAvailable ? (isIrisRecommended ? 'text-emerald-700' : 'text-slate-500') : 'text-slate-400')}>
              {irisAvailable && iris
                ? iris.calibration.accuracyNote
                : 'Requires the 478-landmark iris model and clear eye visibility.'}
            </p>
          </div>
        </div>

        {/* IPD badge */}
        <div
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2',
            !isIrisRecommended
              ? 'border-amber-200 bg-amber-50'
              : 'border-slate-200 bg-slate-50',
          )}
        >
          {!isIrisRecommended ? (
            <Star className="mt-0.5 h-4 w-4 shrink-0 fill-amber-500 text-amber-500" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
          )}
          <div className="min-w-0">
            <p className={cn('text-xs font-semibold', !isIrisRecommended ? 'text-amber-800' : 'text-slate-500')}>
              IPD calibration{!isIrisRecommended ? ' ★ recommended' : ' — shown for reference'}
            </p>
            <p className={cn('text-xs', !isIrisRecommended ? 'text-amber-700' : 'text-slate-500')}>
              {recommendedSet.calibration.method === 'ipd' || !isIrisRecommended
                ? ipd.calibration.accuracyNote
                : ipd.calibration.accuracyNote}
            </p>
          </div>
        </div>
      </div>

      {/* ── Accuracy notes ── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <Info className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Accuracy notes
          </span>
        </div>
        <ul className="space-y-2">
          {JAW_SCAN_ACCURACY_NOTES.map((note) => (
            <li key={note.title}>
              <p className="text-xs font-medium text-slate-700">{note.title}</p>
              <p className="text-xs text-slate-500">{note.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
