import { useState, type FormEvent } from 'react';

import facebookIcon from '@/assets/facebook.svg';
import googleIcon from '@/assets/google.svg';
import linkedinIcon from '@/assets/linkedin.svg';
import logo from '@/assets/zerobrush-logo.svg';

type LoginScreenProps = {
  onLogin: (email: string) => void;
};

const SOCIAL_PROVIDERS = [
  { label: 'Google', icon: googleIcon },
  { label: 'LinkedIn', icon: linkedinIcon },
  { label: 'Facebook', icon: facebookIcon },
] as const;

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');

  const trimmedEmail = email.trim();
  const canSubmit = trimmedEmail.length > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    onLogin(trimmedEmail);
  };

  return (
    <main className="flex h-full min-h-0 flex-col overflow-y-auto bg-brand-canvas px-6 pb-5 pt-10">
      <div className="mx-auto flex w-full max-w-[340px] flex-1 flex-col">
        <div className="flex justify-center pt-4">
          <img src={logo} alt="ZeroBrush" className="h-auto w-[72px]" />
        </div>

        <h1 className="mt-8 text-center text-[28px] font-bold leading-tight tracking-[-0.03em] text-brand-navy">
          Welcome to ZeroBrush
        </h1>
        <p className="mt-3 text-center text-[15px] leading-6 text-brand-sky">
          Create your account and start staging smarter in minutes. Sign up with:
        </p>

        <form className="mt-8 flex flex-1 flex-col" onSubmit={handleSubmit}>
          <label className="text-sm font-medium text-brand-ink" htmlFor="login-email">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@xyz.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-2xl border border-[#d5dee1] bg-white px-4 text-[15px] text-brand-ink outline-none transition placeholder:text-[#9aa8b0] focus:border-brand-teal focus-visible:ring-2 focus-visible:ring-brand-teal/25"
          />

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-5 min-h-14 w-full rounded-full bg-brand-teal text-base font-semibold text-white shadow-[0_8px_22px_rgba(0,102,110,0.2)] transition hover:bg-[#00565d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Login
          </button>

          <div className="mt-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#dbe3e6]" />
            <span className="text-sm font-medium text-brand-sky">Or Login with</span>
            <div className="h-px flex-1 bg-[#dbe3e6]" />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {SOCIAL_PROVIDERS.map((provider) => (
              <button
                key={provider.label}
                type="button"
                aria-label={`${provider.label} login (demo)`}
                className="flex min-h-12 items-center justify-center rounded-2xl border border-[#e1e8ea] bg-[#f4f7f8]"
              >
                <img src={provider.icon} alt="" className="size-[17px]" aria-hidden />
              </button>
            ))}
          </div>

          <p className="app-safe-bottom mt-auto pt-10 text-center text-xs leading-5 text-brand-sky">
            By signing in or creating a member account, you agree to the{' '}
            <span className="underline">Terms of Use</span> and the{' '}
            <span className="underline">Privacy Policy</span>.
          </p>
        </form>
      </div>
    </main>
  );
}
