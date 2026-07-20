import { act, fireEvent, render, screen } from '@testing-library/react';

import { HomeScreen } from '../HomeScreen';
import { LoginScreen } from '../LoginScreen';
import { OnboardingFlow } from '../OnboardingFlow';
import { DemoPhotoCapture } from '../DemoPhotoCapture';
import { ScanLandingScreen } from '../ScanLandingScreen';
import { SplashScreen } from '../SplashScreen';

describe('entry flow', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('advances from the splash after its configured duration', () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();

    render(<SplashScreen durationMs={500} onComplete={onComplete} />);

    expect(onComplete).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(500));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('moves through every onboarding screen before completing', () => {
    const onComplete = jest.fn();
    render(<OnboardingFlow onComplete={onComplete} />);

    expect(screen.getByRole('heading', { name: /Smile Bright/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: /See Beyond/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: /Care That Grows/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Let's go" }));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('requires a non-empty email before login continues', () => {
    const onLogin = jest.fn();
    render(<LoginScreen onLogin={onLogin} />);

    expect(screen.getByRole('button', { name: 'Login' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: 'demo@zerobrush.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(onLogin).toHaveBeenCalledWith('demo@zerobrush.com');
  });

  it('opens scan landing from the home Scan tab', () => {
    const onOpenScan = jest.fn();
    render(
      <HomeScreen
        onOpenShop={jest.fn()}
        onOpenScan={onOpenScan}
        onOpenProgress={jest.fn()}
        onOpenAccount={jest.fn()}
        displayName="demo@zerobrush.com"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open scan' }));
    expect(onOpenScan).toHaveBeenCalledTimes(1);
  });

  it('opens the scan type selected by the user', () => {
    const onSelectScan = jest.fn();
    render(<ScanLandingScreen onSelectScan={onSelectScan} />);

    fireEvent.click(screen.getByRole('radio', { name: /Face scan/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Scan Now' }));

    expect(onSelectScan).toHaveBeenCalledWith('face');
  });

  it('returns to home from scan landing when back is available', () => {
    const onBack = jest.fn();
    render(<ScanLandingScreen onSelectScan={jest.fn()} onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows direct color-mask upload on teeth capture only in debug mode', () => {
    const { rerender } = render(
      <DemoPhotoCapture scanKind="teeth" onCaptured={jest.fn()} onDebugMaskUpload={jest.fn()} />,
    );

    expect(screen.queryByRole('button', { name: /Debug color mask/i })).not.toBeInTheDocument();

    rerender(
      <DemoPhotoCapture
        scanKind="teeth"
        debugEnabled
        onCaptured={jest.fn()}
        onDebugMaskUpload={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Debug color mask/i })).toBeInTheDocument();
  });
});
