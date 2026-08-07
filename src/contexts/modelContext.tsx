import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DataId } from "../lib/types";

/**
 * What kind of thing the user is currently placing/picking on the 3D model.
 * - "hotspot"  -> next left-click on the model becomes a new Hotspot's dataPosition/dataNormal
 * - "tourspot" -> next left-click on the model becomes a new Tourspot's dataPosition/dataNormal
 * - "edge"     -> next two clicks on existing hotspot buttons become an Edge's first/second
 */
export type PickMode = "hotspot" | "tourspot" | "edge" | "remove_edge" | null;

export interface PendingRow {
  /** unique-per-pick key, used to force NewRowDialog to remount with fresh state */
  key: string;
  dataId: DataId;
  initialValues: Record<string, any>;
}

interface ModelContextValue {
  pickMode: PickMode;
  /** id of the hotspot selected as the edge's first endpoint, while pickMode === "edge" */
  edgeFirstId: string | null;
  /** row waiting to be created; when set, the NewRowDialog should be opened with it */
  pendingRow: PendingRow | null;

  // Shared states for editing and placing items on the model
  movingItem: { type: "hotspot" | "tourspot"; id: string } | null;
  setMovingItem: (item: { type: "hotspot" | "tourspot"; id: string } | null) => void;
  tempPosNormal: { position: [number, number, number]; normal: [number, number, number] } | null;
  setTempPosNormal: (val: { position: [number, number, number]; normal: [number, number, number] } | null) => void;
  showTourspots: boolean;
  setShowTourspots: (show: boolean) => void;
  tourspotSceneId: string | null;
  setTourspotSceneId: (id: string | null) => void;

  startPicking: (mode: Exclude<PickMode, null>) => void;
  cancelPicking: () => void;

  /** called by ModelViewer once the user clicks a point on the model while picking a hotspot */
  submitHotspotPick: (
    dataPosition: [number, number, number],
    dataNormal: [number, number, number],
  ) => void;
  /** called by ModelViewer once the user clicks a point on the model while picking a tourspot */
  submitTourspotPick: (
    dataPosition: [number, number, number],
    dataNormal: [number, number, number],
  ) => void;
  /** called by ModelViewer when the user clicks a hotspot button while picking an edge */
  submitEdgeHotspotClick: (hotspotId: string) => void;

  /** called by Topbar once the NewRowDialog created from a pick is closed/submitted */
  clearPendingRow: () => void;
}

const ModelContext = createContext<ModelContextValue | undefined>(undefined);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [pickMode, setPickMode] = useState<PickMode>(null);
  const [edgeFirstId, setEdgeFirstId] = useState<string | null>(null);
  const [pendingRow, setPendingRow] = useState<PendingRow | null>(null);

  // Promoted states
  const [movingItem, setMovingItem] = useState<{
    type: "hotspot" | "tourspot";
    id: string;
  } | null>(null);
  const [tempPosNormal, setTempPosNormal] = useState<{
    position: [number, number, number];
    normal: [number, number, number];
  } | null>(null);
  const [showTourspots, setShowTourspots] = useState(false);
  const [tourspotSceneId, setTourspotSceneId] = useState<string | null>(null);

  const startPicking = useCallback((mode: Exclude<PickMode, null>) => {
    setPickMode(mode);
    setEdgeFirstId(null);
  }, []);

  const cancelPicking = useCallback(() => {
    setPickMode(null);
    setEdgeFirstId(null);
    setTourspotSceneId(null);
  }, []);

  const submitHotspotPick = useCallback(
    (
      dataPosition: [number, number, number],
      dataNormal: [number, number, number],
    ) => {
      setPendingRow({
        key: `hotspots-${Date.now()}`,
        dataId: "hotspots",
        initialValues: { dataPosition, dataNormal },
      });
      setPickMode(null);
    },
    [],
  );

  const submitTourspotPick = useCallback(
    (
      dataPosition: [number, number, number],
      dataNormal: [number, number, number],
    ) => {
      setPendingRow({
        key: `tourspots-${Date.now()}`,
        dataId: "tourspots",
        initialValues: {
          dataPosition,
          dataNormal,
          sceneId: tourspotSceneId ?? "",
        },
      });
      setPickMode(null);
      setTourspotSceneId(null);
    },
    [tourspotSceneId],
  );

  const submitEdgeHotspotClick = useCallback(
    (hotspotId: string) => {
      if (!edgeFirstId) {
        setEdgeFirstId(hotspotId);
        return;
      }
      if (edgeFirstId === hotspotId) {
        // clicked the same hotspot twice, ignore
        return;
      }
      if (pickMode === "edge") {
        setPendingRow({
          key: `edges-${Date.now()}`,
          dataId: "edges",
          initialValues: { first: edgeFirstId, second: hotspotId },
        });
        setPickMode(null);
        setEdgeFirstId(null);
      }
    },
    [edgeFirstId, pickMode],
  );

  const clearPendingRow = useCallback(() => setPendingRow(null), []);

  const value = useMemo<ModelContextValue>(
    () => ({
      pickMode,
      edgeFirstId,
      pendingRow,
      movingItem,
      setMovingItem,
      tempPosNormal,
      setTempPosNormal,
      showTourspots,
      setShowTourspots,
      tourspotSceneId,
      setTourspotSceneId,
      startPicking,
      cancelPicking,
      submitHotspotPick,
      submitTourspotPick,
      submitEdgeHotspotClick,
      clearPendingRow,
    }),
    [
      pickMode,
      edgeFirstId,
      pendingRow,
      movingItem,
      tempPosNormal,
      showTourspots,
      tourspotSceneId,
      startPicking,
      cancelPicking,
      submitHotspotPick,
      submitTourspotPick,
      submitEdgeHotspotClick,
      clearPendingRow,
    ],
  );

  return (
    <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
  );
}

export function useModel() {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error("useModel must be used within ModelProvider");
  return ctx;
}
