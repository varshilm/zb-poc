export type Gender = 'Male' | 'Female' | 'Other' | "Don't want to disclose";


export type PatientData = {
  id: string;
  uid?: string;
  patId?: string;
  name: string;
  patIdentifier?: string;
  referralCode?: string;
  email?: string;
  age?: string;
  gender?: Gender;
  congestionScore?: number | null;
  mouthBreathingBiasScore?: number | null;
  measurements?: Record<string, number>;
  firstFaceScan?: string | null;
  lastFaceScan?: string | null;
};

export  type PatientsApiResponse = {
  message: string;
  data: {
    patients: PatientData[];
    page: number;
    pageSize: number;
    currentCount: number;
    totalCount: number;
    totalPages: number;
  };
};

export type PatientsPage = {
  patients: PatientData[];
  page: number;
  pageSize: number;
  currentCount: number;
  totalCount: number;
  totalPages: number;
};

export type PatientsQueryOptions = {
  filter?: {
    ages?: string[];
    genders?: string[];
    startDate?: string;
    endDate?: string;
  };
  sortBy?:
    | 'name'
    | 'patId'
    | 'age'
    | 'email'
    | 'referralCode'
    | 'firstFaceScan'
    | 'lastFaceScan'
    | 'congestionScore'
    | 'mouthBreathingBiasScore';
  sortOrder?: 'asc' | 'desc';
};

export interface PatientRow {
  id: string;
  /** Backend user id (e.g. Firebase uid) for APIs that expect `uid`. */
  uid?: string;
  /** Backend patient identifier used for detail API (patId). */
  patId?: string;
  /** Human-readable patient identifier shown in the table (can duplicate patId). */
  patIdentifier?: string;
  /** Referral / source code associated with the patient. */
  referralCode?: string;
  /** Primary contact email for the patient. */
  email?: string;
  name: string;
  /** Age value coming from backend (kept as-is for display/filtering). */
  age: string;
  /** Patient gender used for filtering (falls back to 'Other' when backend doesn't provide it). */
  gender: Gender;
  /** Display label for age (e.g. "18 to 24"); falls back to numeric age when not set. */
  ageLabel?: string;
  congestionScore?: string;
  mouthBreathingBiasScore?: string;
  // Measurement columns from patientList API (airway web app columns 1–9)
  prnPg?: string;
  riskDhr?: string;
  nasalDhr?: string;
  sdbBiasScore?: string;
  zyLGoL975Angle?: string;
  zyRGoR975Angle?: string;
  upperFaceHeightGSn?: string;
  lowerFaceHeightSnPg?: string;
  facialProfileAngleNSnPg?: string;
  intermeatalWidthMeLMeR?: string;
  faceHeightGPg?: string;
  firstScan: string;
  lastScan: string;
}


export interface PatientsQueryData {
  patients: PatientRow[];
  totalPages: number;
  totalCount: number;
}

export interface UsePatientsPageResult {
  patients: PatientRow[];
  totalPages: number;
  totalCount: number;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
}

export interface PatientsInfinitePageData {
  patients: PatientRow[];
  page: number;
  totalPages: number;
  totalCount: number;
}

export interface UsePatientsInfiniteResult {
  patients: PatientRow[];
  totalCount: number;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}