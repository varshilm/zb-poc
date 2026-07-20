import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { DemoSessionProvider } from '@/session/DemoSessionContext';

import { paths } from '../paths';
import {
  AccountRoute,
  AppLayout,
  HomeRoute,
  LoginRoute,
  OnboardingRoute,
  ProgressRoute,
  ScanLandingRoute,
  ShopRoute,
  SplashRoute,
} from '../routeElements';

function renderAt(initialEntry: string) {
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [
          { path: paths.splash, element: <SplashRoute /> },
          { path: paths.onboarding, element: <OnboardingRoute /> },
          { path: paths.login, element: <LoginRoute /> },
          { path: paths.home, element: <HomeRoute /> },
          { path: paths.shop, element: <ShopRoute /> },
          { path: paths.progress, element: <ProgressRoute /> },
          { path: paths.account, element: <AccountRoute /> },
          { path: paths.scan, element: <ScanLandingRoute /> },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  );

  render(
    <DemoSessionProvider>
      <RouterProvider router={router} />
    </DemoSessionProvider>,
  );

  return router;
}

describe('app routes', () => {
  afterEach(() => {
    jest.useRealTimers();
    sessionStorage.clear();
  });

  it('moves splash to onboarding', () => {
    jest.useFakeTimers();
    const router = renderAt(paths.splash);

    act(() => jest.advanceTimersByTime(1500));
    expect(router.state.location.pathname).toBe(paths.onboarding);
  });

  it('moves onboarding to login', () => {
    const router = renderAt(paths.onboarding);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: "Let's go" }));

    expect(router.state.location.pathname).toBe(paths.login);
  });

  it('logs in to home and opens shop and scan routes', async () => {
    const router = renderAt(paths.login);

    fireEvent.change(await screen.findByLabelText(/Email address/i), {
      target: { value: 'demo@zerobrush.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(router.state.location.pathname).toBe(paths.home);
    expect(
      await screen.findByRole('heading', { name: /Your smile looks great today/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Shop' }));
    expect(router.state.location.pathname).toBe(paths.shop);
    expect(await screen.findByRole('heading', { name: 'Shop' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    expect(router.state.location.pathname).toBe(paths.progress);
    expect(await screen.findByRole('heading', { name: 'Progress' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Account' }));
    expect(router.state.location.pathname).toBe(paths.account);
    expect(await screen.findByRole('heading', { name: 'Account' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open scan' }));
    expect(router.state.location.pathname).toBe(paths.scan);
    expect(await screen.findByRole('heading', { name: /Let's Scan/i })).toBeInTheDocument();
  });
});
