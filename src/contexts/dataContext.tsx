import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  DataId,
  DataSlice,
  Edge,
  Hotspot,
  Room,
  TableRule,
  TourScene,
  Tourspot,
  Transport,
} from "../lib/types";
import { CATEGORY_VALUES } from "../lib/types";
import { httpClient } from "../lib/httpClient";
import { xyzArrRule, idRule, xyArrRule } from "../lib/utils/prototypes";
import { useUser } from "./userContext";

// ==================== Table rule definitions ====================

const hotspotRules: TableRule[] = [
  idRule(),
  { name: "name", label: "Name", isMandatory: false },
  { name: "description", label: "Description", isMandatory: false },
  {
    name: "showInDefault",
    label: "Show In Default?",
    isMandatory: false,
    values: ["true", "false"],
  },
  // xyzArrRule("dataPosition", "Position"),
  // xyzArrRule("dataNormal", "Normal"),
];

const roomRules: TableRule[] = [
  idRule(),
  { name: "name", label: "Name", isMandatory: true },
  { name: "floor", label: "Floor", isMandatory: false },
  { name: "belongsTo", label: "Belongs To", isMandatory: true },
  {
    name: "category",
    label: "Category",
    isMandatory: true,
    values: CATEGORY_VALUES,
  },
  { name: "description", label: "Description", isMandatory: false },
  // xyArrRule("rows", "Rows"),
  // xyArrRule("cols", "Cols"),
];

const edgeRules: TableRule[] = [
  {
    name: "first",
    label: "First hotspot ID",
  },
  {
    name: "second",
    label: "Second hotspot ID",
  },
];

const tourSceneRules: TableRule[] = [
  { name: "id", label: "ID", editable: false },
  { name: "name", label: "Name", isMandatory: true, editable: false },
];

const tourspotRules: TableRule[] = [
  idRule(),
  { name: "sceneId", label: "Scene ID", isMandatory: true },
  // xyzArrRule("dataPosition", "Position"),
  // xyzArrRule("dataNormal", "Normal"),
];

const transportRules: TableRule[] = [
  { name: "spot", label: "Hotspot ID", values: ["cA", "cB"] },
  { name: "name", label: "Station name" },
  { name: "type", label: "Type", values: ["bus", "metro"] },
  { name: "providers", label: "Provider URLs", type: "arr" },
];

const ROW_ID_KEYS: Record<DataId, string> = {
  hotspots: "id",
  rooms: "id",
  edges: "id",
  tourScenes: "id",
  tourspots: "id",
  transport: "id",
};

const RULES: Record<DataId, TableRule[]> = {
  hotspots: hotspotRules,
  rooms: roomRules,
  edges: edgeRules,
  tourScenes: tourSceneRules,
  tourspots: tourspotRules,
  transport: transportRules,
};

const URLS: Record<DataId, string> = {
  hotspots: "/hotspots",
  rooms: "/rooms",
  edges: "/hotspot-edges",
  tourScenes: "/tourScenes",
  tourspots: "/tourspots",
  transport: "/transport",
};

export interface DataContextValue extends Record<DataId, DataSlice> {
  saveAll: (token?: string | null) => Promise<void>;
  saveSlice: (id: DataId, token?: string | null) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

function useSlice<T = any>(id: DataId): DataSlice<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<T[]>([]);
  dataRef.current = data;

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await httpClient.get<any>(URLS[id]);
      setData(Array.isArray(raw) ? raw : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const save = useCallback(
    async (token?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        let payload: any = dataRef.current;
        if (id === "edges") {
          payload = dataRef.current.map((r: any) =>
            r.endpoints ? r.endpoints : r,
          );
        }

        await httpClient.put(URLS[id], {
          headers,
          body: payload,
        });
      } catch (e: any) {
        const msg = e.message || `Failed to save ${id}`;
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  const rowIdKey = ROW_ID_KEYS[id];

  const addRow = useCallback((row: T) => {
    setData((prev) => [...prev, row]);
  }, []);

  const removeRow = useCallback((rowIdx: number) => {
    const target = dataRef.current[rowIdx];
    if (!target) return;
    setData((prev) => prev.filter((_, i) => i !== rowIdx));
  }, []);

  const editRow = useCallback(
    (attribute: string, rowIdx: number, newValue: any) => {
      const target = dataRef.current[rowIdx];
      if (!target) return;
      setData((prev) => {
        const updated = { ...prev[rowIdx], [attribute]: newValue };
        const next = [...prev];
        next[rowIdx] = updated;
        return next;
      });
    },
    [],
  );

  const editRowFields = useCallback(
    (rowIdx: number, fields: Record<string, any>) => {
      const target = dataRef.current[rowIdx];
      if (!target) return;
      setData((prev) => {
        const updated = { ...prev[rowIdx], ...fields };
        const next = [...prev];
        next[rowIdx] = updated;
        return next;
      });
    },
    [],
  );

  const setAll = useCallback((rows: T[]) => {
    setData(rows);
  }, []);

  return useMemo(
    () => ({
      id,
      fetchUrl: URLS[id],
      data,
      loading,
      error,
      tableRules: RULES[id],
      rowIdKey,
      fetch,
      save,
      addRow,
      removeRow,
      editRow,
      editRowFields,
      setAll,
    }),
    [
      id,
      data,
      loading,
      error,
      rowIdKey,
      fetch,
      save,
      addRow,
      removeRow,
      editRow,
      editRowFields,
      setAll,
    ],
  );
}

export function DataProvider({ children }: { children: ReactNode }) {
  const hotspots = useSlice<Hotspot>("hotspots");
  const rooms = useSlice<Room>("rooms");
  const edges = useSlice<Edge>("edges");
  const tourScenes = useSlice<TourScene>("tourScenes");
  const tourspots = useSlice<Tourspot>("tourspots");
  const transport = useSlice<Transport>("transport");

  const slices = useMemo(
    () => ({
      hotspots,
      rooms,
      edges,
      tourScenes,
      tourspots,
      transport,
    }),
    [hotspots, rooms, edges, tourScenes, tourspots, transport],
  );

  const saveSlice = useCallback(
    async (id: DataId, token?: string | null) => {
      if (slices[id]) {
        await slices[id].save(token);
      }
    },
    [slices],
  );

  const saveAll = useCallback(
    async (token?: string | null) => {
      const ids: DataId[] = [
        "hotspots",
        "rooms",
        "edges",
        "tourScenes",
        "tourspots",
        "transport",
      ];
      await Promise.all(ids.map((id) => slices[id].save(token)));
    },
    [slices],
  );

  const contextValue = useMemo<DataContextValue>(
    () => ({
      ...slices,
      saveAll,
      saveSlice,
    }),
    [slices, saveAll, saveSlice],
  );

  useEffect(() => {
    hotspots.fetch();
    rooms.fetch();
    edges.fetch();
    tourScenes.fetch();
    tourspots.fetch();
    transport.fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

