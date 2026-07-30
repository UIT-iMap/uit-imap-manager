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
import { httpGet, ENDPOINTS } from "../lib/httpClient";
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
  hotspots: ENDPOINTS.hotspots,
  rooms: ENDPOINTS.rooms,
  edges: ENDPOINTS.edges,
  tourScenes: ENDPOINTS.tourScenes,
  tourspots: ENDPOINTS.tourspots,
  transport: ENDPOINTS.transport,
};

export type DataContextValue = Record<DataId, DataSlice>;

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
      const raw = await httpGet<any>(URLS[id], []);
      setData(Array.isArray(raw) ? raw : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  const slices = useMemo<DataContextValue>(
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

  useEffect(() => {
    hotspots.fetch();
    rooms.fetch();
    edges.fetch();
    tourScenes.fetch();
    tourspots.fetch();
    transport.fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <DataContext.Provider value={slices}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
