export const PROVIDER_PAID = 'PROVIDER_PAID';
export const PATIENT_PAID = 'PATIENT_PAID';
export const LAB_ADMIN = 'LAB_ADMIN';
export const LAB_PROVIDER = 'LAB_PROVIDER';
export const ADMIN = 'ADMIN';

export type UserRole =
  | typeof PROVIDER_PAID
  | typeof PATIENT_PAID
  | typeof LAB_ADMIN
  | typeof LAB_PROVIDER
  | typeof ADMIN;

/** Paid clinical provider roles (formerly a single `PROVIDER` role). */
export const PAID_PROVIDER_ROLES: UserRole[] = [PROVIDER_PAID, PATIENT_PAID];

/** Lab portal roles. */
export const LAB_ROLES: UserRole[] = [LAB_PROVIDER, LAB_ADMIN];

/** All non-admin roles that can access the provider portal. */
export const PROVIDER_ROLES: UserRole[] = [...LAB_ROLES, ...PAID_PROVIDER_ROLES];

export const VALID_ROLES: UserRole[] = [...PROVIDER_ROLES, ADMIN];

export const DEFAULT_ROLE: UserRole = PROVIDER_PAID;

export function isUserRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole);
}

export function filterValidRoles(roles: string[]): UserRole[] {
  return roles.filter(isUserRole);
}

export function hasRole(roles: readonly string[], role: UserRole): boolean {
  return roles.includes(role);
}

export function hasAnyRole(roles: readonly string[], candidates: readonly UserRole[]): boolean {
  return candidates.some((role) => roles.includes(role));
}

export function isPaidProvider(roles: readonly string[]): boolean {
  return hasAnyRole(roles, PAID_PROVIDER_ROLES);
}

export function isLabUser(roles: readonly string[]): boolean {
  return hasAnyRole(roles, LAB_ROLES);
}

export function isProviderUser(roles: readonly string[]): boolean {
  return hasAnyRole(roles, PROVIDER_ROLES);
}

export function isAdmin(roles: readonly string[]): boolean {
  return hasRole(roles, ADMIN);
}

export function isLabAdmin(roles: readonly string[]): boolean {
  return hasRole(roles, LAB_ADMIN);
}

export function isLabProvider(roles: readonly string[]): boolean {
  return hasRole(roles, LAB_PROVIDER);
}

/** Whether the current user has a provider profile from GET `getProvider` (referral code, etc.). */
export function shouldFetchCurrentProviderProfile(roles: readonly string[]): boolean {
  if (isAdmin(roles) || isLabAdmin(roles)) {
    return false;
  }

  return isPaidProvider(roles) || isLabProvider(roles);
}

export function canAccessBilling(roles: readonly string[]): boolean {
  return isLabProvider(roles);
}

export function canManageLabProviderTreatmentPreference(roles: readonly string[]): boolean {
  return isLabProvider(roles);
}

/** Clinical providers: "Hello, Dr. …" greeting. */
export const DOCTOR_GREETING_ROLES: UserRole[] = [
  LAB_PROVIDER,
  PROVIDER_PAID,
  PATIENT_PAID,
];

/** Roles that show a personalized "Hello, …" title on patient summary (with or without Dr.). */
export const PERSONALIZED_GREETING_ROLES: UserRole[] = [
  ...DOCTOR_GREETING_ROLES,
  ADMIN,
  LAB_ADMIN,
];

export function usesDoctorGreeting(roles: readonly string[]): boolean {
  return hasAnyRole(roles, DOCTOR_GREETING_ROLES);
}

export function usesPersonalizedGreeting(roles: readonly string[]): boolean {
  return hasAnyRole(roles, PERSONALIZED_GREETING_ROLES);
}

/** Patient detail: treatment recommendations + dental lab products. */
export function canViewTreatmentRecommendations(roles: readonly string[]): boolean {
  return isAdmin(roles) || isLabProvider(roles);
}

/** Patient detail: airway scan measurement trend chart. */
export function canViewAirwayTrendChart(roles: readonly string[]): boolean {
  return isAdmin(roles);
}

/** Patient detail dental simulation toggle and standalone simulation page. */
export function canAccessDentalSimulation(roles: readonly string[]): boolean {
  return isAdmin(roles) || isLabProvider(roles);
}

/** Roles platform admins may assign when inviting a user. */
export const ADMIN_INVITABLE_ROLES: UserRole[] = [...LAB_ROLES,...PAID_PROVIDER_ROLES];

export const INVITE_ROLE_LABELS: Record<UserRole, string> = {
  [PROVIDER_PAID]: 'Provider (provider paid)',
  [PATIENT_PAID]: 'Provider (patient paid)',
  [LAB_ADMIN]: 'Admin',
  [LAB_PROVIDER]: 'Provider',
  [ADMIN]: 'Admin',
};

export function getInvitableRoles(roles: readonly string[]): UserRole[] {
  if (isAdmin(roles)) {
    return ADMIN_INVITABLE_ROLES;
  }
  if (isLabAdmin(roles)) {
    return [LAB_PROVIDER];
  }
  return [];
}

export function canInviteUsers(roles: readonly string[]): boolean {
  return getInvitableRoles(roles).length > 0;
}
