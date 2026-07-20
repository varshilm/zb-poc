import type { NavigateFunction } from 'react-router-dom';

import type { MainTab } from '@/components/BottomNav';

import { paths } from './paths';

/** Shared BottomNav tab routing for main app screens. */
export function navigateMainTab(navigate: NavigateFunction, tab: MainTab) {
  if (tab === 'home') navigate(paths.home);
  if (tab === 'shop') navigate(paths.shop);
  if (tab === 'scan') navigate(paths.scan);
  if (tab === 'progress') navigate(paths.progress);
  if (tab === 'account') navigate(paths.account);
}
