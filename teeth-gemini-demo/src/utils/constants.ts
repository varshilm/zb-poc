import type { Gender } from '@/types/patient';

// ── Auth ──

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ROUTES = {
  PATIENT_SUMMARY: '/patient-summary',
  PATIENT_DETAILS: '/patients',
  PROVIDERS: '/providers',
  LAB_PRODUCTS: '/lab-products',
  BILLING: '/billing',
  BILLING_PLANS: '/billing/plans',
  BILLING_CHECKOUT: '/billing/checkout',
  SIGNUP: '/signup',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  MAGNET: '/magnet',
  SETTINGS: '/settings',
  DENTAL_SIMULATION: '/dental-simulation',
  TEETH_MODELING: '/teeth-modeling',
  SMILE_PREVIEW: '/smile-preview',
};
// ── Patient & metrics ──

export const PATIENT_AGE_MIN = 0;
export const PATIENT_AGE_MAX = 80;

export const METRIC_MIN = 0;
export const METRIC_MAX = 80;

export const GENDER_OPTIONS: Gender[] = ['Male', 'Female', 'Other', "Don't want to disclose"];


// ── Patient detail page constants ──

export type CongestionLevel = 'Low' | 'Medium' | 'High';

export const CONGESTION_LEVELS: readonly CongestionLevel[] = ['Low', 'Medium', 'High'];

export const CONGESTION_LEVEL_STYLES: Record<CongestionLevel, string> = {
  Low: 'bg-sky-100 text-sky-800 border-sky-200',
  Medium: 'bg-amber-100 text-amber-900 border-amber-200',
  High: 'bg-rose-100 text-rose-900 border-rose-200',
};

/**
 * Backend `patientRecords` column keys accepted by `getAirwayScanTrend`.
 *
 * Used by `AirwayTrendChartCard` (trend chart Y-axis metric dropdown).
 */
export const MEASUREMENT_KEYS = [
  'prn-pg',
  'Facial profile angle | n-sn-pg (°)',
  'Upper face height | g-sn',
  'Lower face height | sn-pg',
  'ZyL-GoL-975 Angle',
  'ZyR-GoR-975 Angle',
  'Face height | g-pg',
  'Intermeatal width | meL-meR',
] as const;

export type MeasurementKey = (typeof MEASUREMENT_KEYS)[number];

export type DetailScoreMetricKey =
  | 'lowerAirway'
  | 'upperAirway'
  | 'voiceNasalFlowErect'
  | 'voiceNasalFlowSupine'
  | 'voiceOsaScore';


export const DATE_FORMAT = {
  yyyyMMdd: 'yyyy-MM-dd',
  yyyyMM: 'yyyy-MM',
  ddMMMyyyy: 'dd MMM yyyy',
  MMMyyyy: 'MMM yyyy',
};
export interface DetailScoreMetricConfig {
  key: DetailScoreMetricKey;
  label: string;
  unit?: string;
}



export type TrendMetricKey = DetailScoreMetricKey;

export interface TrendMetricOption {
  key: TrendMetricKey;
  label: string;
}

export type TimeRangeKey = 'last6Months' | 'last12Months';

export interface TimeRangeOption {
  key: TimeRangeKey;
  label: string;
}

export const TIME_RANGE_OPTIONS: readonly TimeRangeOption[] = [
  {
    key: 'last6Months',
    label: 'Last 6 months',
  },
  {
    key: 'last12Months',
    label: 'Last 12 months',
  },
];

export interface ScanRecordingsColumn {
  key:
    | 'date'
    | 'time'
    | 'supineCongestionScore'
    | 'standingCongestionScore'
    | 'osaScore'
    | 'audioPaths';
  label: string;
}

export const SCAN_RECORDINGS_COLUMNS: readonly ScanRecordingsColumn[] = [
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
  { key: 'supineCongestionScore', label: 'Supine Congestion Score' },
  { key: 'standingCongestionScore', label: 'Standing Congestion Score' },
  { key: 'osaScore', label: 'OSA Score' },
  { key: 'audioPaths', label: 'Audio Paths' },
];

/** Maximum calendar-day span between start and end for a custom trend range (strictly before end, max 365 days). */
export const MAX_TREND_DATE_RANGE_DAYS = 365;

export const REFETCH_INTERVAL_MS = 1000 * 60 * 5;