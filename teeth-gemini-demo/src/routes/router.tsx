import { createBrowserRouter } from 'react-router-dom';

import { paths } from './paths';
import {
  AccountRoute,
  AppLayout,
  FaceScanRoute,
  HomeRoute,
  LoginRoute,
  NotFoundRoute,
  OnboardingRoute,
  ProgressRoute,
  ScanLandingRoute,
  ShopRoute,
  SplashRoute,
  TeethScanRoute,
} from './routeElements';

/**
 * Scalable route table for the demo.
 *
 * Entry:      / → /onboarding → /login
 * App shell:  /home | /shop | /progress | /account
 * Scan:       /scan → /scan/teeth | /scan/face → back to /home
 */
export const appRouter = createBrowserRouter([
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
      { path: paths.scanTeeth, element: <TeethScanRoute /> },
      { path: paths.scanFace, element: <FaceScanRoute /> },
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
]);
