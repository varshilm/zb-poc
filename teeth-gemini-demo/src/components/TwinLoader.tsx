import loaderEnd from '@/assets/loaderend.svg';
import loaderStart from '@/assets/loaderstart.svg';

type TwinLoaderProps = {
  status?: string;
  onCancel?: () => void;
  compact?: boolean;
};

export function TwinLoader({
  status = 'Measuring jaw geometry',
  onCancel,
  compact = false,
}: TwinLoaderProps) {
  return (
    <section
      className={
        compact
          ? 'flex min-h-[520px] flex-col rounded-[28px] bg-brand-teal px-5 py-7 text-white'
          : 'flex h-full min-h-0 flex-col bg-brand-teal px-5 pb-5 pt-8 text-white'
      }
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-sm text-white/65">This usually takes about 30 seconds</p>
      <h1 className="mt-2 max-w-[310px] text-[32px] font-bold leading-[1.08] tracking-[-0.035em]">
        Your twin is taking shape...
      </h1>

      <div className="relative my-auto flex min-h-[320px] items-center justify-center">
        <div className="loader-glow absolute size-56 rounded-full bg-[#51c9f3]/40 blur-3xl" />
        <div className="relative h-[330px] w-[245px]">
          <img
            src={loaderStart}
            alt=""
            className="loader-frame-start absolute inset-0 h-full w-full object-contain"
          />
          <img
            src={loaderEnd}
            alt=""
            className="loader-frame-end absolute inset-0 h-full w-full object-contain"
          />
        </div>
      </div>

      <p className="text-center text-sm font-medium text-white/70">{status}</p>

      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="app-safe-bottom mt-7 min-h-14 rounded-full bg-[#00565d] px-6 font-semibold text-white transition hover:bg-brand-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98]"
        >
          Stop and Re-capture
        </button>
      ) : null}
    </section>
  );
}
