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
import { genId } from "../lib/utils/genId";
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
  { name: "gates", label: "Gates", type: "arr", isMandatory: true },
  {
    name: "category",
    label: "Category",
    isMandatory: true,
    values: CATEGORY_VALUES,
  },
  { name: "description", label: "Description", isMandatory: false },
  xyArrRule("cols", "Cols", false),
  xyArrRule("rows", "Rows", false),
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
  autoSave: boolean;
  setAutoSave: (v: boolean) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (v: boolean) => void;
  generateId: (id: DataId) => string;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

function useSlice<T = any>(
  id: DataId,
  autoSave: boolean,
  token: string | null,
  markUnsaved: () => void,
): DataSlice<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<T[]>([]);
  dataRef.current = data;

  const autoSaveRef = useRef(autoSave);
  autoSaveRef.current = autoSave;

  const tokenRef = useRef(token);
  tokenRef.current = token;

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

  const saveWithData = useCallback(
    async (currentData: T[], authToken?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        const activeToken =
          authToken !== undefined ? authToken : tokenRef.current;
        if (activeToken) {
          headers["Authorization"] = `Bearer ${activeToken}`;
        }

        let payload: any = currentData;
        if (id === "edges") {
          payload = currentData.map((r: any) =>
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

  const save = useCallback(
    (authToken?: string | null) => saveWithData(dataRef.current, authToken),
    [saveWithData],
  );

  const handleMutation = useCallback(
    (newData: T[]) => {
      setData(newData);
      dataRef.current = newData;
      if (autoSaveRef.current) {
        saveWithData(newData).catch((err) => {
          console.error(`Auto save failed for ${id}:`, err);
        });
      } else {
        markUnsaved();
      }
    },
    [id, saveWithData, markUnsaved],
  );

  const rowIdKey = ROW_ID_KEYS[id];

  const addRow = useCallback(
    (row: T) => {
      handleMutation([...dataRef.current, row]);
    },
    [handleMutation],
  );

  const removeRow = useCallback(
    (rowIdx: number) => {
      const target = dataRef.current[rowIdx];
      if (!target) return;
      handleMutation(dataRef.current.filter((_, i) => i !== rowIdx));
    },
    [handleMutation],
  );

  const editRow = useCallback(
    (attribute: string, rowIdx: number, newValue: any) => {
      const target = dataRef.current[rowIdx];
      if (!target) return;
      const updated: any = { ...dataRef.current[rowIdx] };
      if (newValue === undefined) {
        delete updated[attribute];
      } else {
        updated[attribute] = newValue;
      }
      const next = [...dataRef.current];
      next[rowIdx] = updated;
      handleMutation(next);
    },
    [handleMutation],
  );

  const editRowFields = useCallback(
    (rowIdx: number, fields: Record<string, any>) => {
      const target = dataRef.current[rowIdx];
      if (!target) return;
      const updated: any = { ...dataRef.current[rowIdx] };
      for (const [key, val] of Object.entries(fields)) {
        if (val === undefined) {
          delete updated[key];
        } else {
          updated[key] = val;
        }
      }
      const next = [...dataRef.current];
      next[rowIdx] = updated;
      handleMutation(next);
    },
    [handleMutation],
  );

  const setAll = useCallback(
    (rows: T[]) => {
      handleMutation(rows);
    },
    [handleMutation],
  );

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
  const { token } = useUser();
  const [autoSave, setAutoSaveState] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const markUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const hotspots = useSlice<Hotspot>("hotspots", autoSave, token, markUnsaved);
  const rooms = useSlice<Room>("rooms", autoSave, token, markUnsaved);
  const edges = useSlice<Edge>("edges", autoSave, token, markUnsaved);
  const tourScenes = useSlice<TourScene>(
    "tourScenes",
    autoSave,
    token,
    markUnsaved,
  );
  const tourspots = useSlice<Tourspot>(
    "tourspots",
    autoSave,
    token,
    markUnsaved,
  );
  const transport = useSlice<Transport>(
    "transport",
    autoSave,
    token,
    markUnsaved,
  );

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
    async (id: DataId, tokenOverride?: string | null) => {
      if (slices[id]) {
        await slices[id].save(tokenOverride);
        setHasUnsavedChanges(false);
      }
    },
    [slices],
  );

  const saveAll = useCallback(
    async (tokenOverride?: string | null) => {
      const ids: DataId[] = [
        "hotspots",
        "rooms",
        "edges",
        "tourScenes",
        "tourspots",
        "transport",
      ];
      await Promise.all(ids.map((id) => slices[id].save(tokenOverride)));
      setHasUnsavedChanges(false);
    },
    [slices],
  );

  const setAutoSave = useCallback(
    (val: boolean) => {
      setAutoSaveState(val);
      if (val && hasUnsavedChanges) {
        saveAll(token).catch((err) =>
          console.error("Auto-save sync failed:", err),
        );
      }
    },
    [hasUnsavedChanges, saveAll, token],
  );

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!autoSave && hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "Changes you made may not be saved!";
        return "Changes you made may not be saved!";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [autoSave, hasUnsavedChanges]);

  const generateId = useCallback(
    (id: DataId) => {
      const slice = slices[id];
      if (!slice) return genId([]);
      const existingIds = slice.data.map((r: any) => r[slice.rowIdKey]);
      return genId(existingIds);
    },
    [slices],
  );

  const contextValue = useMemo<DataContextValue>(
    () => ({
      ...slices,
      saveAll,
      saveSlice,
      autoSave,
      setAutoSave,
      hasUnsavedChanges,
      setHasUnsavedChanges,
      generateId,
    }),
    [
      slices,
      saveAll,
      saveSlice,
      autoSave,
      setAutoSave,
      hasUnsavedChanges,
      setHasUnsavedChanges,
      generateId,
    ],
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

