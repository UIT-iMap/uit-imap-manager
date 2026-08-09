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
import { genId } from "../lib/utils/genId";
import { idRule, xyArrRule } from "../lib/utils/prototypes";
import { useUser } from "./userContext";
import {
  isValidPrimaryKey,
  isValidForeignKey,
  uppercase,
  hasGates,
  hasBelongsTo,
  hasPosition,
  hasBelongsHotpotName,
  hasCategory,
  isValidMandatory,
  isValidFixedArray,
} from "../lib/utils/onBlurs";

// ==================== Table rule definitions ====================

export function buildHotspotRules(
  hotspots: Hotspot[] = [],
  rooms: Room[] = [],
): TableRule[] {
  return [
    idRule("ID", [
      isValidPrimaryKey(() => hotspots.map((h) => h.id)),
      uppercase,
      isValidMandatory,
    ]),
    { name: "name", label: "Name", isMandatory: false },
    { name: "description", label: "Description", isMandatory: false },
    {
      name: "showInDefault",
      label: "Show In Default?",
      isMandatory: false,
      values: ["true", "false"],
    },
    {
      name: "canBeSearch",
      label: "Searchable",
      isMandatory: false,
      values: ["true", "false"],
    },
    {
      name: "gates",
      label: "Gates",
      type: "arr",
      isMandatory: false,
      onBlurs: [isValidForeignKey(() => hotspots.map((h) => h.id))],
    },
    // xyzArrRule("dataPosition", "Position"),
    // xyzArrRule("dataNormal", "Normal"),
  ];
}

export function buildRoomRules(
  rooms: Room[] = [],
  hotspots: Hotspot[] = [],
): TableRule[] {
  return [
    idRule("ID", [
      isValidPrimaryKey(() => rooms.map((r) => r.id)),
      uppercase,
      isValidMandatory,
    ]),
    {
      name: "name",
      label: "Name",
      isMandatory: true,
      onBlurs: [isValidMandatory],
    },
    {
      name: "floor",
      label: "Floor",
      isMandatory: false,
      onBlurs: [hasPosition],
    },
    {
      name: "belongsTo",
      label: "Belongs To",
      isMandatory: false,
      onBlurs: [
        isValidForeignKey(() => hotspots.map((h) => h.id)),
        hasBelongsTo,
        hasBelongsHotpotName(() => hotspots),
      ],
    },
    {
      name: "gates",
      label: "Gates",
      type: "arr",
      isMandatory: false,
      onBlurs: [isValidForeignKey(() => hotspots.map((h) => h.id)), hasGates],
    },
    {
      name: "category",
      label: "Category",
      isMandatory: false,
      values: CATEGORY_VALUES,
      onBlurs: [hasCategory],
    },
    { name: "description", label: "Description", isMandatory: false },
    xyArrRule("cols", "Cols", false, [hasPosition, isValidFixedArray(2)]),
    xyArrRule("rows", "Rows", false, [hasPosition, isValidFixedArray(2)]),
  ];
}

export function buildEdgeRules(
  _edges: Edge[] = [],
  hotspots: Hotspot[] = [],
): TableRule[] {
  return [
    {
      name: "first",
      label: "First hotspot ID",
      isMandatory: true,
      onBlurs: [
        isValidMandatory,
        isValidForeignKey(() => hotspots.map((h) => h.id)),
      ],
    },
    {
      name: "second",
      label: "Second hotspot ID",
      isMandatory: true,
      onBlurs: [
        isValidMandatory,
        isValidForeignKey(() => hotspots.map((h) => h.id)),
      ],
    },
  ];
}

export function buildTourSceneRules(tourScenes: TourScene[] = []): TableRule[] {
  return [
    {
      name: "id",
      label: "ID",
      editable: false,
      onBlurs: [
        isValidPrimaryKey(() => tourScenes.map((s) => s.id)),
        uppercase,
        isValidMandatory,
      ],
    },
    {
      name: "name",
      label: "Name",
      isMandatory: true,
      editable: false,
      onBlurs: [isValidMandatory],
    },
  ];
}

export function buildTourspotRules(
  tourspots: Tourspot[] = [],
  tourScenes: TourScene[] = [],
): TableRule[] {
  return [
    idRule("ID", [
      isValidPrimaryKey(() => tourspots.map((t) => t.id)),
      uppercase,
      isValidMandatory,
    ]),
    {
      name: "sceneId",
      label: "Scene ID",
      isMandatory: true,
      onBlurs: [
        isValidMandatory,
        isValidForeignKey(() => tourScenes.map((s) => s.id)),
      ],
    },
    // xyzArrRule("dataPosition", "Position"),
    // xyzArrRule("dataNormal", "Normal"),
  ];
}

export function buildTransportRules(_transport: Transport[] = []): TableRule[] {
  return [
    {
      name: "spot",
      label: "Hotspot ID",
      values: ["cA", "cB"],
      isMandatory: true,
      onBlurs: [isValidMandatory, isValidForeignKey(["cA", "cB"])],
    },
    {
      name: "name",
      label: "Station name",
      isMandatory: true,
      onBlurs: [isValidMandatory],
    },
    {
      name: "type",
      label: "Type",
      values: ["bus", "metro"],
      isMandatory: true,
      onBlurs: [isValidMandatory],
    },
    {
      name: "providers",
      label: "Provider URLs",
      type: "arr",
      isMandatory: false,
    },
  ];
}

const hotspotRules: TableRule[] = buildHotspotRules([], []);
const roomRules: TableRule[] = buildRoomRules([], []);
const edgeRules: TableRule[] = buildEdgeRules([], []);
const tourSceneRules: TableRule[] = buildTourSceneRules([]);
const tourspotRules: TableRule[] = buildTourspotRules([], []);
const transportRules: TableRule[] = buildTransportRules([]);

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

  const hotspotRules = useMemo(
    () => buildHotspotRules(hotspots.data, rooms.data),
    [hotspots.data, rooms.data],
  );
  const roomRules = useMemo(
    () => buildRoomRules(rooms.data, hotspots.data),
    [rooms.data, hotspots.data],
  );
  const edgeRules = useMemo(
    () => buildEdgeRules(edges.data, hotspots.data),
    [edges.data, hotspots.data],
  );
  const tourSceneRules = useMemo(
    () => buildTourSceneRules(tourScenes.data),
    [tourScenes.data],
  );
  const tourspotRules = useMemo(
    () => buildTourspotRules(tourspots.data, tourScenes.data),
    [tourspots.data, tourScenes.data],
  );
  const transportRules = useMemo(
    () => buildTransportRules(transport.data),
    [transport.data],
  );

  const slices = useMemo(
    () => ({
      hotspots: { ...hotspots, tableRules: hotspotRules },
      rooms: { ...rooms, tableRules: roomRules },
      edges: { ...edges, tableRules: edgeRules },
      tourScenes: { ...tourScenes, tableRules: tourSceneRules },
      tourspots: { ...tourspots, tableRules: tourspotRules },
      transport: { ...transport, tableRules: transportRules },
    }),
    [
      hotspots,
      rooms,
      edges,
      tourScenes,
      tourspots,
      transport,
      hotspotRules,
      roomRules,
      edgeRules,
      tourSceneRules,
      tourspotRules,
      transportRules,
    ],
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
