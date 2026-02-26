import { createContext, useContext, useEffect, useState } from "react";

interface DebugContextValue {
  isDebugMode: boolean;
  /** playerId → role class name (e.g. "Vampire", "Villager") */
  roles: Record<string, string>;
}

const DebugContext = createContext<DebugContextValue>({
  isDebugMode: false,
  roles: {},
});

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const isDebugMode = new URLSearchParams(window.location.search).has("debug");
  const [roles, setRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isDebugMode) return;

    const fetchRoles = async () => {
      try {
        const res = await fetch("/api/debug/state");
        const data = await res.json();
        if (data.success && Array.isArray(data.snapshot?.players)) {
          const map: Record<string, string> = {};
          for (const p of data.snapshot.players) {
            if (p.id && p.role) map[p.id] = p.role;
          }
          setRoles(map);
        }
      } catch {
        // ignore — server may not be in debug mode
      }
    };

    fetchRoles();
    const id = setInterval(fetchRoles, 1000);
    return () => clearInterval(id);
  }, [isDebugMode]);

  return (
    <DebugContext.Provider value={{ isDebugMode, roles }}>
      {children}
    </DebugContext.Provider>
  );
}

export const useDebug = () => useContext(DebugContext);
