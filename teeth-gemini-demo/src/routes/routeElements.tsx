import { lazy, Suspense } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { AppShell } from '@/components/AppShell';
import { SplashScreen } from '@/components/SplashScreen';
import { getFaceCache } from '@/storage/demoCache';
import { useDemoSession } from '@/session/DemoSessionContext';

import {
  paths,
  type ScanFaceLocationState,
  type ScanTeethLocationState,
} from './paths';
import { navigateMainTab } from './navigateMainTab';

const OnboardingFlow = lazy(() =>
  import('@/components/OnboardingFlow').then((module) => ({ default: module.OnboardingFlow })),
);
const LoginScreen = lazy(() =>
  import('@/components/LoginScreen').then((module) => ({ default: module.LoginScreen })),
);
const HomeScreen = lazy(() =>
  import('@/components/HomeScreen').then((module) => ({ default: module.HomeScreen })),
);
const ShopScreen = lazy(() =>
  import('@/components/ShopScreen').then((module) => ({ default: module.ShopScreen })),
);
const ProgressScreen = lazy(() =>
  import('@/components/ProgressScreen').then((module) => ({ default: module.ProgressScreen })),
);
const AccountScreen = lazy(() =>
  import('@/components/AccountScreen').then((module) => ({ default: module.AccountScreen })),
);
const ScanLandingScreen = lazy(() =>
  import('@/components/ScanLandingScreen').then((module) => ({
    default: module.ScanLandingScreen,
  })),
);
const GeminiTeethDemoPage = lazy(() =>
  import('@/pages/GeminiTeethDemoPage').then((module) => ({
    default: module.GeminiTeethDemoPage,
  })),
);
const JawFitScanPage = lazy(() =>
  import('@/pages/JawFitScanPage').then((module) => ({ default: module.JawFitScanPage })),
);

function RouteFallback() {
  return <div className="h-full min-h-0 bg-brand-canvas" />;
}

export function AppLayout() {
  return (
    <AppShell fullBleed>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

export function SplashRoute() {
  const navigate = useNavigate();
  return (
    <SplashScreen onComplete={() => navigate(paths.onboarding, { replace: true })} />
  );
}

export function OnboardingRoute() {
  const navigate = useNavigate();
  return <OnboardingFlow onComplete={() => navigate(paths.login)} />;
}

export function LoginRoute() {
  const navigate = useNavigate();
  const { setEmail } = useDemoSession();

  return (
    <LoginScreen
      onLogin={(email) => {
        setEmail(email);
        navigate(paths.home, { replace: true });
      }}
    />
  );
}

export function HomeRoute() {
  const navigate = useNavigate();
  const { email } = useDemoSession();

  return (
    <HomeScreen
      displayName={email}
      onOpenShop={() => navigate(paths.shop)}
      onOpenScan={() => navigate(paths.scan)}
      onOpenProgress={() => navigate(paths.progress)}
      onOpenAccount={() => navigate(paths.account)}
    />
  );
}

export function ShopRoute() {
  const navigate = useNavigate();

  return (
    <ShopScreen
      onBack={() => navigate(paths.home)}
      onOpenHome={() => navigate(paths.home)}
      onOpenScan={() => navigate(paths.scan)}
      onOpenProgress={() => navigate(paths.progress)}
      onOpenAccount={() => navigate(paths.account)}
    />
  );
}

export function ProgressRoute() {
  const navigate = useNavigate();

  return (
    <ProgressScreen
      onOpenHome={() => navigate(paths.home)}
      onOpenShop={() => navigate(paths.shop)}
      onOpenScan={() => navigate(paths.scan)}
      onOpenAccount={() => navigate(paths.account)}
      onOpenTeethResult={() => navigate(paths.scanTeeth)}
      onOpenFaceResult={() => {
        void (async () => {
          const cached = await getFaceCache();
          if (!cached) {
            navigate(paths.scanFace);
            return;
          }
          navigate(paths.scanFace, {
            state: {
              photoDataUrl: cached.photoDataUrl,
              result: cached.result,
            } satisfies ScanFaceLocationState,
          });
        })();
      }}
    />
  );
}

export function AccountRoute() {
  const navigate = useNavigate();

  return (
    <AccountScreen
      onOpenHome={() => navigate(paths.home)}
      onOpenShop={() => navigate(paths.shop)}
      onOpenScan={() => navigate(paths.scan)}
      onOpenProgress={() => navigate(paths.progress)}
      onLogout={() => navigate(paths.login, { replace: true })}
    />
  );
}

export function ScanLandingRoute() {
  const navigate = useNavigate();

  return (
    <ScanLandingScreen
      onBack={() => navigate(paths.home)}
      onSelectScan={(kind) =>
        navigate(kind === 'teeth' ? paths.scanTeeth : paths.scanFace)
      }
      onSelectTab={(tab) => navigateMainTab(navigate, tab)}
      onOpenScan={() => navigate(paths.scan)}
    />
  );
}

export function TeethScanRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as ScanTeethLocationState | null) ?? null;

  return (
    <GeminiTeethDemoPage
      embedded
      initialDebugMaskUrl={state?.debugMaskUrl ?? null}
      onExit={() => navigate(paths.home)}
      onSelectTab={(tab) => navigateMainTab(navigate, tab)}
      onOpenScan={() => navigate(paths.scan)}
    />
  );
}

export function FaceScanRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as ScanFaceLocationState | null) ?? null;

  return (
    <JawFitScanPage
      initialPhotoDataUrl={state?.photoDataUrl ?? null}
      initialResult={state?.result ?? null}
      onExit={() => navigate(paths.home)}
      onSelectTab={(tab) => navigateMainTab(navigate, tab)}
      onOpenScan={() => navigate(paths.scan)}
    />
  );
}

export function NotFoundRoute() {
  return <Navigate to={paths.home} replace />;
}
