import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MarzipanoScene, TourScene } from "@/lib/types/pano";
import { httpClient } from "@/lib/httpClient";
import { useData } from "@/contexts/dataContext";

interface PanoContextValue {
  currentSceneId: string;
  currentScene?: TourScene;
  tourScenes: TourScene[];
  isReady: boolean;
  setScene: (sceneId: string) => void;
  nextScene: () => void;
  prevScene: () => void;
  registerScenes: (scenes: Map<string, MarzipanoScene>) => void;
  clearScenes: () => void;
  getScene: (id: string) => MarzipanoScene | undefined;

  isAddingLinkSpot: boolean;
  startAddingLinkSpot: () => void;
  cancelAddingLinkSpot: () => void;
  pendingLinkSpot: { yaw: number; pitch: number } | null;
  setPendingLinkSpot: (pos: { yaw: number; pitch: number } | null) => void;
  relocatingIndex: number | null;
  startRelocating: (index: number) => void;
  cancelRelocating: () => void;
  changingSceneIndex: number | null;
  startChangingScene: (index: number) => void;
  cancelChangingScene: () => void;
}

const PanoContext = createContext<PanoContextValue | null>(null);

export function PanoProvider({ children }: { children: React.ReactNode }) {
  const sceneRefs = useRef<Map<string, MarzipanoScene>>(new Map());

  const [tourScenes, setTourScenes] = useState<TourScene[]>([]);
  const [currentSceneId, setCurrentSceneId] = useState("");
  const [isReady, setIsReady] = useState(false);

  const [isAddingLinkSpot, setIsAddingLinkSpot] = useState(false);
  const [pendingLinkSpot, setPendingLinkSpot] = useState<{
    yaw: number;
    pitch: number;
  } | null>(null);
  const [relocatingIndex, setRelocatingIndex] = useState<number | null>(null);
  const [changingSceneIndex, setChangingSceneIndex] = useState<number | null>(
    null,
  );

  const { tourScenes: dataContextScenes } = useData();

  useEffect(() => {
    if (dataContextScenes.data && dataContextScenes.data.length > 0) {
      setTourScenes(dataContextScenes.data);
      if (!currentSceneId) {
        setCurrentSceneId(dataContextScenes.data[0].id);
      }
    } else {
      httpClient
        .get<TourScene[]>("/tourScenes")
        .then((data: TourScene[]) => {
          setTourScenes(data);
          if (data.length > 0) {
            setCurrentSceneId((prev) => prev || data[0].id);
          }
        })
        .catch((err: unknown) => {
          console.error("Error loading tour scenes data:", err);
        });
    }
  }, [dataContextScenes.data, currentSceneId]);

  const sceneById = useMemo(
    () => new Map(tourScenes.map((scene) => [scene.id, scene])),
    [tourScenes],
  );

  const registerScenes = useCallback((scenes: Map<string, MarzipanoScene>) => {
    sceneRefs.current = scenes;
    setIsReady(scenes.size > 0);
  }, []);

  const clearScenes = useCallback(() => {
    sceneRefs.current.clear();
    setIsReady(false);
  }, []);

  const getScene = useCallback((id: string) => sceneRefs.current.get(id), []);

  const setScene = useCallback((sceneId: string) => {
    const target = sceneRefs.current.get(sceneId);

    if (!target) return;

    target.view.setParameters(target.data.initialViewParameters);
    target.scene.switchTo();

    setCurrentSceneId(sceneId);
  }, []);

  const nextScene = useCallback(() => {
    if (tourScenes.length === 0) return;
    const index = tourScenes.findIndex((s) => s.id === currentSceneId);

    const next = tourScenes[(index + 1) % tourScenes.length];

    setScene(next.id);
  }, [currentSceneId, setScene, tourScenes]);

  const prevScene = useCallback(() => {
    if (tourScenes.length === 0) return;
    const index = tourScenes.findIndex((s) => s.id === currentSceneId);

    const prev =
      tourScenes[(index - 1 + tourScenes.length) % tourScenes.length];

    setScene(prev.id);
  }, [currentSceneId, setScene, tourScenes]);

  const startAddingLinkSpot = useCallback(() => {
    setIsAddingLinkSpot(true);
    setRelocatingIndex(null);
    setChangingSceneIndex(null);
    setPendingLinkSpot(null);
  }, []);

  const cancelAddingLinkSpot = useCallback(() => {
    setIsAddingLinkSpot(false);
  }, []);

  const startRelocating = useCallback((index: number) => {
    setRelocatingIndex(index);
    setIsAddingLinkSpot(false);
    setChangingSceneIndex(null);
    setPendingLinkSpot(null);
  }, []);

  const cancelRelocating = useCallback(() => {
    setRelocatingIndex(null);
  }, []);

  const startChangingScene = useCallback((index: number) => {
    setChangingSceneIndex(index);
    setIsAddingLinkSpot(false);
    setRelocatingIndex(null);
    setPendingLinkSpot(null);
  }, []);

  const cancelChangingScene = useCallback(() => {
    setChangingSceneIndex(null);
  }, []);

  const value = {
    currentSceneId,
    currentScene: sceneById.get(currentSceneId),
    tourScenes,
    isReady,
    setScene,
    nextScene,
    prevScene,
    registerScenes,
    clearScenes,
    getScene,

    isAddingLinkSpot,
    startAddingLinkSpot,
    cancelAddingLinkSpot,
    pendingLinkSpot,
    setPendingLinkSpot,
    relocatingIndex,
    startRelocating,
    cancelRelocating,
    changingSceneIndex,
    startChangingScene,
    cancelChangingScene,
  };

  return <PanoContext.Provider value={value}>{children}</PanoContext.Provider>;
}

export function usePano() {
  const context = useContext(PanoContext);

  if (!context) {
    throw new Error("usePano must be used inside PanoProvider");
  }

  return context;
}
