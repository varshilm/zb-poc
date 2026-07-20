import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const EMAIL_STORAGE_KEY = 'zb-demo-email';

type DemoSessionContextValue = {
  email: string;
  setEmail: (email: string) => void;
  clearSession: () => void;
};

const DemoSessionContext = createContext<DemoSessionContextValue | null>(null);

function readStoredEmail(): string {
  try {
    return sessionStorage.getItem(EMAIL_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [email, setEmailState] = useState(readStoredEmail);

  const setEmail = useCallback((next: string) => {
    setEmailState(next);
    try {
      sessionStorage.setItem(EMAIL_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures in private / restricted contexts.
    }
  }, []);

  const clearSession = useCallback(() => {
    setEmailState('');
    try {
      sessionStorage.removeItem(EMAIL_STORAGE_KEY);
    } catch {
      // Ignore storage failures in private / restricted contexts.
    }
  }, []);

  const value = useMemo(
    () => ({ email, setEmail, clearSession }),
    [email, setEmail, clearSession],
  );

  return <DemoSessionContext.Provider value={value}>{children}</DemoSessionContext.Provider>;
}

export function useDemoSession(): DemoSessionContextValue {
  const context = useContext(DemoSessionContext);
  if (!context) {
    throw new Error('useDemoSession must be used within DemoSessionProvider');
  }
  return context;
}
