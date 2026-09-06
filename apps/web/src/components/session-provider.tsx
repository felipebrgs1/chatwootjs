import { createContext, useContext } from "react";

import type { Session } from "@/lib/auth";
import { useSession } from "@/lib/auth";

interface SessionContextValue {
  session: Session | null;
  loading: boolean;
  reload: () => Promise<void>;
  switchAccount: (id: number) => void;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
  reload: async () => {},
  switchAccount: () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { session, loading, reload, switchAccount } = useSession();
  return (
    <SessionContext.Provider value={{ session, loading, reload, switchAccount }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext(): SessionContextValue {
  return useContext(SessionContext);
}
