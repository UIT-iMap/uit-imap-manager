import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { DataId, Log } from "../lib/types";
import { httpGet, ENDPOINTS } from "../lib/httpClient";

interface LogContextValue {
  log: Log[];
  loading: boolean;
  fetchLog: () => Promise<void>;
  updateLog: (
    source: DataId,
    attribute: string,
    rowId: string | number,
    oldValue: any,
    newValue: any,
    by: string
  ) => boolean;
  recoverTo: (id: string) => boolean;
  markAllSaved: () => void;
  registerRecoverHandler: (
    handler: (entry: Log) => boolean
  ) => void;
}

const LogContext = createContext<LogContextValue | undefined>(undefined);

export function LogProvider({ children }: { children: ReactNode }) {
  const [log, setLog] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [recoverHandler, setRecoverHandler] = useState<
    ((entry: Log) => boolean) | null
  >(null);

  const fetchLog = useCallback(async () => {
    setLoading(true);
    const data = await httpGet<Log[]>(ENDPOINTS.log, []);
    setLog(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  const updateLog = useCallback(
    (
      source: DataId,
      attribute: string,
      rowId: string | number,
      oldValue: any,
      newValue: any,
      by: string
    ): boolean => {
      try {
        const entry: Log = {
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          source,
          attribute,
          rowId,
          oldValue: oldValue ?? null,
          newValue: newValue ?? null,
          timestamp: new Date().toISOString(),
          by,
          isSaved: false,
        };
        setLog((prev) => [entry, ...prev]);
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  // The actual data-mutation logic lives in DataContext; LogContext delegates
  // the "apply the reverse change" step to whatever handler DataContext registers.
  const registerRecoverHandler = useCallback(
    (handler: (entry: Log) => boolean) => {
      setRecoverHandler(() => handler);
    },
    []
  );

  const recoverTo = useCallback(
    (id: string): boolean => {
      const entry = log.find((l) => l.id === id);
      if (!entry) return false;
      const applied = recoverHandler ? recoverHandler(entry) : true;
      if (!applied) return false;
      setLog((prev) => prev.filter((l) => l.id !== id));
      return true;
    },
    [log, recoverHandler]
  );

  const markAllSaved = useCallback(() => {
    setLog((prev) => prev.map((l) => ({ ...l, isSaved: true })));
  }, []);

  return (
    <LogContext.Provider
      value={{
        log,
        loading,
        fetchLog,
        updateLog,
        recoverTo,
        markAllSaved,
        registerRecoverHandler,
      }}
    >
      {children}
    </LogContext.Provider>
  );
}

export function useLog() {
  const ctx = useContext(LogContext);
  if (!ctx) throw new Error("useLog must be used within LogProvider");
  return ctx;
}
