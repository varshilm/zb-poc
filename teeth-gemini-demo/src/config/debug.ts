export const DEBUG_ENABLED =
  (import.meta.env.VITE_DEBUG as string | undefined)?.trim().toLowerCase() === 'true';
