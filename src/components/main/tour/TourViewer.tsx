import Marzipano from "marzipano";
import type { LinkHotspot, MarzipanoScene } from "@/lib/types/pano";
import type { TourScene } from "@/lib/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePano } from "@/contexts/panoContext";
import { useData } from "@/contexts/dataContext";
import { API_BASE_URL } from "@/lib/apiConfig";
import { cn, getSceneShareUrl } from "@/lib/utils";
import { getTileBlobUrl } from "@/lib/utils/tileRegistry";
import {
  ArrowDown,
  ArrowUp,
  ChevronUp,
  Move,
  RefreshCw,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";

const stopTouchAndScrollEvents = (element: HTMLElement) => {
  ["touchstart", "touchmove", "touchend", "touchcancel", "wheel"].forEach(
    (eventName) => {
      element.addEventListener(eventName, (event) => event.stopPropagation());
    },
  );
};

const ROTATION_ANGLES = [
  { deg: 0, icon: "🕛" },
  { deg: 45, icon: "🕐" },
  { deg: 90, icon: "🕒" },
  { deg: 135, icon: "🕕" },
  { deg: 180, icon: "🕗" },
  { deg: 225, icon: "🕘" },
  { deg: 270, icon: "🕙" },
];

interface TourViewerProps {
  sceneId?: string;
  isOpen: boolean;
  onExit: () => void;
  onSceneChange: (sceneId: string) => void;
}

export default function TourViewer({
  sceneId,
  isOpen,
  onExit,
  onSceneChange,
}: TourViewerProps) {
  const panoRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any | null>(null);
  const currentMarzipanoSceneRef = useRef<any | null>(null);
  const hotspotRootsRef = useRef<Root[]>([]);
  const selectedSceneRef = useRef<HTMLDivElement | null>(null);
  const hasShownMissingSceneToast = useRef<string | null>(null);

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");

  const { tourScenes: tourScenesSlice } = useData();

  const {
    currentSceneId,
    currentScene,
    tourScenes,
    registerScenes,
    clearScenes,
    setScene,
    getScene,

    isAddingLinkSpot,
    cancelAddingLinkSpot,
    pendingLinkSpot,
    setPendingLinkSpot,
    relocatingIndex,
    startRelocating,
    cancelRelocating,
    changingSceneIndex,
    startChangingScene,
    cancelChangingScene,
  } = usePano();

  const tourScenesRef = useRef(tourScenes);
  const sceneByIdRef = useRef<Map<string, TourScene>>(new Map());
  tourScenesRef.current = tourScenes;

  const currentSceneData = useMemo(
    () => tourScenes.find((s) => s.id === sceneId),
    [tourScenes, sceneId],
  );

  const geometrySignature = useMemo(() => {
    if (!currentSceneData) return null;
    return JSON.stringify({
      id: currentSceneData.id,
      levels: currentSceneData.levels,
      faceSize: currentSceneData.faceSize,
      initialViewParameters: currentSceneData.initialViewParameters,
    });
  }, [currentSceneData]);

  const hotspotsSignature = useMemo(() => {
    if (!currentSceneData) return null;
    return JSON.stringify({
      sceneId,
      linkHotspots: currentSceneData.linkHotspots ?? [],
    });
  }, [sceneId, currentSceneData]);

  const clearHotspots = useCallback(() => {
    const scene = currentMarzipanoSceneRef.current;
    if (scene) {
      scene
        .hotspotContainer()
        .listHotspots()
        .slice()
        .forEach((h: any) => scene.hotspotContainer().destroyHotspot(h));
    }
    hotspotRootsRef.current.forEach((root) =>
      window.setTimeout(() => root.unmount(), 0),
    );
    hotspotRootsRef.current = [];
  }, []);

  const createLinkHotspot = useCallback(
    (hotspot: LinkHotspot, index: number) => {
      const element = document.createElement("div");
      const hotspotName =
        sceneByIdRef.current.get(hotspot.target)?.name ?? hotspot.target;
      const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        handlersRef.current.onSceneChange(hotspot.target);
      };
      const root = createRoot(element);

      root.render(
        <div className="group relative flex items-center justify-center pointer-events-auto">
          {/* Main Hotspot Button */}
          <button
            type="button"
            onClick={handleClick}
            className={cn(
              "group relative grid size-9 place-items-center rounded-full bg-sky-500/95 text-white shadow-lg transition hover:scale-110 hover:bg-sky-600 focus-visible:outline-none cursor-pointer",
            )}
            style={{ transform: `rotate(${hotspot.rotation}rad)` }}
            aria-label={`Navigate to ${hotspotName}`}
            title={`Navigate to ${hotspotName}`}
          >
            <ChevronUp size={22} />
          </button>

          {/* Hover Menu with Relocate, Change Scene, Rotate (0-270deg), Remove */}
          <div className="absolute bottom-full pb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-auto">
            <div className="flex items-center gap-1 rounded-xl bg-white/95 p-1.5 shadow-xl backdrop-blur-md text-xs text-slate-800 whitespace-nowrap flex-nowrap">
              {/* Relocate */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlersRef.current.startRelocating(index);
                }}
                className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
                title="Relocate position"
              >
                <Move size={12} />
                <span className="whitespace-nowrap">Relocate</span>
              </button>

              {/* Change Scene */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlersRef.current.startChangingScene(index);
                }}
                className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
                title="Change target scene"
              >
                <RefreshCw size={12} />
                <span className="whitespace-nowrap">Change Scene</span>
              </button>

              {/* Rotate Submenu */}
              <div className="relative group/rotate flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
                  title="Rotate direction"
                >
                  <RotateCw size={12} />
                  <span className="whitespace-nowrap">Rotate</span>
                </button>

                <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 hidden group-hover/rotate:flex flex-col z-40">
                  <div className="flex flex-col rounded-xl bg-white/95 p-1 shadow-xl whitespace-nowrap min-w-[75px]">
                    {ROTATION_ANGLES.map(({ deg, icon }) => {
                      const rad = (deg * Math.PI) / 180;
                      const isCurrent =
                        Math.round((hotspot.rotation * 180) / Math.PI) === deg;
                      return (
                        <button
                          key={deg}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlersRef.current.handleRotate(index, rad);
                          }}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 text-left text-xs text-slate-700 hover:bg-sky-500 hover:text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap",
                            isCurrent && "bg-sky-600 font-bold text-white",
                          )}
                        >
                          <span>{icon}</span>
                          <span>{deg}°</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlersRef.current.handleRemoveLinkHotspot(index);
                }}
                className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
                title="Remove link hotspot"
              >
                <Trash2 size={12} />
                <span className="whitespace-nowrap">Remove</span>
              </button>
            </div>
          </div>
        </div>,
      );

      hotspotRootsRef.current.push(root);
      stopTouchAndScrollEvents(element);
      return element;
    },
    [],
  );

  const handlersRef = useRef({
    onSceneChange,
    onExit,
    registerScenes,
    setScene,
    clearScenes,
    startRelocating,
    startChangingScene,
    handleRotate: (index: number, rotationRad: number) => {},
    handleRemoveLinkHotspot: (index: number) => {},
  });

  const sceneById = useMemo(
    () => new Map(tourScenes.map((scene) => [scene.id, scene])),
    [tourScenes],
  );
  sceneByIdRef.current = sceneById;

  const handleAddLinkHotspot = (
    pos: { yaw: number; pitch: number },
    targetSceneId: string,
  ) => {
    if (!sceneId) return;
    const currentSceneObj = tourScenesSlice.data.find((s) => s.id === sceneId);
    if (!currentSceneObj) return;

    const existing = currentSceneObj.linkHotspots || [];
    const newLink: LinkHotspot = {
      yaw: pos.yaw,
      pitch: pos.pitch,
      rotation: 0,
      target: targetSceneId,
    };

    const updatedLinks = [...existing, newLink];
    const idx = tourScenesSlice.data.findIndex((s) => s.id === sceneId);
    if (idx !== -1) {
      tourScenesSlice.editRow?.("linkHotspots", idx, updatedLinks);
    }
  };

  const handleChangeSceneTarget = (index: number, targetSceneId: string) => {
    if (!sceneId) return;
    const currentSceneObj = tourScenesSlice.data.find((s) => s.id === sceneId);
    if (!currentSceneObj) return;

    const existing = currentSceneObj.linkHotspots || [];
    const updatedLinks = existing.map((link: LinkHotspot, i: number) =>
      i === index ? { ...link, target: targetSceneId } : link,
    );

    const idx = tourScenesSlice.data.findIndex((s) => s.id === sceneId);
    if (idx !== -1) {
      tourScenesSlice.editRow?.("linkHotspots", idx, updatedLinks);
    }
  };

  const handleRelocateSave = useCallback(
    (index: number, pos: { yaw: number; pitch: number }) => {
      if (!sceneId) return;
      const currentSceneObj = tourScenesSlice.data.find(
        (s) => s.id === sceneId,
      );
      if (!currentSceneObj) return;

      const existing = currentSceneObj.linkHotspots || [];
      const updatedLinks = existing.map((link: LinkHotspot, i: number) =>
        i === index ? { ...link, yaw: pos.yaw, pitch: pos.pitch } : link,
      );

      const idx = tourScenesSlice.data.findIndex((s) => s.id === sceneId);
      if (idx !== -1) {
        tourScenesSlice.editRow?.("linkHotspots", idx, updatedLinks);
      }
    },
    [sceneId, tourScenesSlice],
  );

  const handleRotate = useCallback(
    (index: number, rotationRad: number) => {
      if (!sceneId) return;
      const currentSceneObj = tourScenesSlice.data.find(
        (s) => s.id === sceneId,
      );
      if (!currentSceneObj) return;

      const existing = currentSceneObj.linkHotspots || [];
      const updatedLinks = existing.map((link: LinkHotspot, i: number) =>
        i === index ? { ...link, rotation: rotationRad } : link,
      );

      const idx = tourScenesSlice.data.findIndex((s) => s.id === sceneId);
      if (idx !== -1) {
        tourScenesSlice.editRow?.("linkHotspots", idx, updatedLinks);
      }
    },
    [sceneId, tourScenesSlice],
  );

  const handleRemoveLinkHotspot = useCallback(
    (index: number) => {
      if (!sceneId) return;
      const currentSceneObj = tourScenesSlice.data.find(
        (s) => s.id === sceneId,
      );
      if (!currentSceneObj) return;

      const existing = currentSceneObj.linkHotspots || [];
      const updatedLinks = existing.filter(
        (_: LinkHotspot, i: number) => i !== index,
      );

      const idx = tourScenesSlice.data.findIndex((s) => s.id === sceneId);
      if (idx !== -1) {
        tourScenesSlice.editRow?.("linkHotspots", idx, updatedLinks);
      }
    },
    [sceneId, tourScenesSlice],
  );

  useEffect(() => {
    handlersRef.current = {
      onSceneChange,
      onExit,
      registerScenes,
      setScene,
      clearScenes,
      startRelocating,
      startChangingScene,
      handleRotate,
      handleRemoveLinkHotspot,
    };
  });

  const handleMoveScene = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tourScenesSlice.data.length) return;

    const newScenes = [...tourScenesSlice.data];
    const [movedScene] = newScenes.splice(index, 1);
    newScenes.splice(targetIndex, 0, movedScene);

    tourScenesSlice.setAll?.(newScenes);
  };

  const handleStartRename = (scene: TourScene) => {
    setEditingSceneId(scene.id);
    setEditingName(scene.name || scene.id);
  };

  const handleSaveRename = (sceneIdToSave: string) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      const idx = tourScenesSlice.data.findIndex((s) => s.id === sceneIdToSave);
      if (idx !== -1) {
        tourScenesSlice.editRow?.("name", idx, trimmed);
      }
    }
    setEditingSceneId(null);
  };

  const handleDeleteScene = (targetSceneId: string) => {
    const sceneToDelete = sceneById.get(targetSceneId);
    const sceneName = sceneToDelete?.name || targetSceneId;
    const confirmed = window.confirm(
      `Are you sure you want to delete scene "${sceneName}"?`,
    );
    if (!confirmed) return;

    const updatedScenes = tourScenesSlice.data
      .filter((s) => s.id !== targetSceneId)
      .map((s) => {
        if (s.linkHotspots && s.linkHotspots.length > 0) {
          const cleanedLinks = s.linkHotspots.filter(
            (link: LinkHotspot) => link.target !== targetSceneId,
          );
          if (cleanedLinks.length !== s.linkHotspots.length) {
            return { ...s, linkHotspots: cleanedLinks };
          }
        }
        return s;
      });

    tourScenesSlice.setAll?.(updatedScenes);

    if (targetSceneId === currentSceneId) {
      if (updatedScenes.length > 0) {
        onSceneChange(updatedScenes[0].id);
      } else {
        onExit();
      }
    }
  };

  // Track mouse position on screen for cursor-attached spot preview
  useEffect(() => {
    if (!isAddingLinkSpot && relocatingIndex === null) {
      setMousePos(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isAddingLinkSpot, relocatingIndex]);

  // Click/Pointer release on Marzipano panorama to place/relocate spot
  useEffect(() => {
    if (!isAddingLinkSpot && relocatingIndex === null) return;
    const container = panoRef.current;
    if (!container) return;

    let pressPos: { x: number; y: number } | null = null;

    const handlePointerDown = (e: PointerEvent) => {
      pressPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!viewerRef.current || !pressPos) return;

      const target = e.target as HTMLElement;
      if (
        target.closest("button, nav, header, input, select, .modal-content")
      ) {
        pressPos = null;
        return;
      }

      const dist = Math.hypot(e.clientX - pressPos.x, e.clientY - pressPos.y);
      pressPos = null;

      // If user moved cursor more than 10px, they were panning/dragging the panorama
      if (dist > 10) return;

      const rect = container.getBoundingClientRect();
      const coords = viewerRef.current.view().screenToCoordinates({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });

      if (coords) {
        if (isAddingLinkSpot) {
          setPendingLinkSpot(coords);
          cancelAddingLinkSpot();
        } else if (relocatingIndex !== null) {
          handleRelocateSave(relocatingIndex, coords);
          cancelRelocating();
        }
      }
    };

    container.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });
    container.addEventListener("pointerup", handlePointerUp, {
      capture: true,
    });

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
      container.removeEventListener("pointerup", handlePointerUp, {
        capture: true,
      });
    };
  }, [
    isAddingLinkSpot,
    relocatingIndex,
    cancelAddingLinkSpot,
    cancelRelocating,
    setPendingLinkSpot,
    handleRelocateSave,
  ]);

  useEffect(() => {
    if (!sceneId) {
      hasShownMissingSceneToast.current = null;
      handlersRef.current.clearScenes();
      return;
    }

    const sceneData = tourScenesRef.current.find((s) => s.id === sceneId);
    if (tourScenesRef.current.length === 0) return;

    if (!sceneData) {
      if (hasShownMissingSceneToast.current !== sceneId) {
        hasShownMissingSceneToast.current = sceneId;
      }
      handlersRef.current.onExit();
      return;
    }

    if (!panoRef.current) return;

    hasShownMissingSceneToast.current = null;

    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
    }
    clearHotspots();

    const viewer = new Marzipano.Viewer(panoRef.current, {
      controls: { mouseViewMode: "drag" },
    });
    viewerRef.current = viewer;

    const apiBase = API_BASE_URL.replace(/\/$/, "");
    const localPreview = getTileBlobUrl(`${sceneData.id}/preview.jpg`);
    const previewUrl =
      localPreview || `${apiBase}/tiles/${sceneData.id}/preview.jpg`;

    const hasLegacy256Level = sceneData.levels.some(
      (l) => l.size === 256 || l.tileSize === 256,
    );
    const validLevels = hasLegacy256Level
      ? sceneData.levels
          .filter((l) => l.size > 256 && l.tileSize !== 256)
          .map((level, idx) =>
            idx === 0 ? { ...level, fallbackOnly: true } : level,
          )
      : sceneData.levels;

    const tileUrlFunc = (tile: any) => {
      const face = tile.face ?? tile.f ?? "";
      const serverLevelFolder = hasLegacy256Level ? tile.z + 1 : tile.z;

      const gridKey = `${sceneData.id}/l${tile.z}/${tile.x}-${tile.y}.jpg`;
      const cubeKeyLegacy = `${sceneData.id}/${tile.z + 1}/${face}/${tile.y}/${tile.x}.jpg`;
      const cubeKey = `${sceneData.id}/${tile.z}/${face}/${tile.y}/${tile.x}.jpg`;

      const blobUrl =
        getTileBlobUrl(gridKey) ||
        getTileBlobUrl(cubeKey) ||
        getTileBlobUrl(cubeKeyLegacy);

      if (blobUrl) {
        return { url: blobUrl };
      }
      return {
        url: `${apiBase}/tiles/${sceneData.id}/${serverLevelFolder}/${face}/${tile.y}/${tile.x}.jpg`,
      };
    };

    const source = new Marzipano.ImageUrlSource(tileUrlFunc, {
      cubeMapPreviewUrl: previewUrl,
    });
    const geometry = new Marzipano.CubeGeometry(validLevels);
    const limiter = Marzipano.RectilinearView.limit.traditional(
      sceneData.faceSize * 2,
      Math.PI / 2,
      (Math.PI * 160) / 180,
    );
    const view = new Marzipano.RectilinearView(
      sceneData.initialViewParameters,
      limiter,
    );
    const scene = viewer.createScene({
      source,
      geometry,
      view,
      pinFirstLevel: true,
    });

    currentMarzipanoSceneRef.current = scene;

    const sceneMap = new Map<string, MarzipanoScene>();
    sceneMap.set(sceneData.id, { data: sceneData, scene, view });
    handlersRef.current.registerScenes(sceneMap);
    handlersRef.current.setScene(sceneId);

    return () => {
      clearHotspots();
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
      currentMarzipanoSceneRef.current = null;
      handlersRef.current.clearScenes();
    };
  }, [sceneId, geometrySignature, clearHotspots]);

  useEffect(() => {
    const scene = currentMarzipanoSceneRef.current;
    if (!scene || !currentSceneData) return;

    clearHotspots();

    currentSceneData.linkHotspots?.forEach((hotspot, index) => {
      scene
        .hotspotContainer()
        .createHotspot(createLinkHotspot(hotspot, index), {
          yaw: hotspot.yaw,
          pitch: hotspot.pitch,
        });
    });
  }, [hotspotsSignature, currentSceneData, createLinkHotspot, clearHotspots]);

  useEffect(() => {
    const targetScene = getScene(currentSceneId);
    if (!targetScene) {
      return;
    }

    targetScene.view.setParameters(targetScene.data.initialViewParameters);
    targetScene.scene.switchTo();
  }, [currentSceneId, getScene]);

  // Handle Escape key press to cancel picking/relocating
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isAddingLinkSpot || relocatingIndex !== null) {
          cancelAddingLinkSpot();
          cancelRelocating();
        }
        if (pendingLinkSpot !== null) {
          setPendingLinkSpot(null);
        }
        if (changingSceneIndex !== null) {
          cancelChangingScene();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isAddingLinkSpot,
    relocatingIndex,
    pendingLinkSpot,
    changingSceneIndex,
    cancelAddingLinkSpot,
    cancelRelocating,
    setPendingLinkSpot,
    cancelChangingScene,
  ]);

  return (
    <div
      className={cn(
        "relative w-full h-full overflow-hidden bg-slate-100 text-slate-900 transition-opacity duration-300",
        isOpen
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
      )}
      aria-hidden={!isOpen}
    >
      <div
        ref={panoRef}
        className={cn(
          "absolute inset-0 bg-slate-100",
          (isAddingLinkSpot || relocatingIndex !== null) && "cursor-crosshair",
        )}
        aria-label="UIT 360 panorama"
      />

      {/* Picking status banner */}
      {(isAddingLinkSpot || relocatingIndex !== null) && (
        <div className="absolute top-3 left-3 z-10 rounded-md bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white shadow-md">
          {isAddingLinkSpot
            ? "Click anywhere on the panorama to place a new link hotspot."
            : "Click anywhere on the panorama to update position."}
        </div>
      )}

      {/* Floating preview icon attached to cursor */}
      {(isAddingLinkSpot || relocatingIndex !== null) && mousePos && (
        <div
          className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center size-9 rounded-full bg-sky-500/90 text-white shadow-xl animate-pulse"
          style={{ left: mousePos.x, top: mousePos.y }}
        >
          <ChevronUp size={22} />
        </div>
      )}

      {/* Target Scene Selection Modal */}
      {(pendingLinkSpot !== null || changingSceneIndex !== null) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm p-4">
          <div className="modal-content w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur-xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 mb-4">
              <h3 className="text-base font-bold text-sky-400 flex items-center gap-2">
                <span>
                  {pendingLinkSpot !== null
                    ? "Select Link Scene"
                    : "Change Link Scene"}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setPendingLinkSpot(null);
                  cancelChangingScene();
                }}
                className="rounded-full p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Select the target scene to navigate to when clicking this hotspot:
            </p>

            <div className="max-h-64 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {tourScenes.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => {
                    if (pendingLinkSpot !== null) {
                      handleAddLinkHotspot(pendingLinkSpot, scene.id);
                      setPendingLinkSpot(null);
                    } else if (changingSceneIndex !== null) {
                      handleChangeSceneTarget(changingSceneIndex, scene.id);
                      cancelChangingScene();
                    }
                  }}
                  className="flex flex-col w-full items-start justify-start px-4 py-3 text-xs font-medium text-slate-800 transition-all hover:bg-sky-600 hover:text-white cursor-pointer active:scale-98"
                >
                  <span className="font-semibold text-sm">
                    {scene.name || scene.id}
                  </span>
                  <span className="text-[10px] text-sky-400 font-monopx-2 py-0.5">
                    {scene.id}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setPendingLinkSpot(null);
                  cancelChangingScene();
                }}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header bar floating islands */}
      <header className="absolute top-0 left-0 right-0 z-10 w-full flex min-h-16 items-stretch justify-end sm:justify-between gap-3 p-3 pointer-events-none">
        <h1 className="truncate font-bold leading-tight text-slate-900 text-lg"></h1>
      </header>

      {/* Navigation sidebar floating island */}
      <nav
        className={cn(
          "absolute left-0 top-1/2 z-10 w-full sm:w-80 -translate-y-1/2 max-h-[60vh] flex flex-col overflow-hidden rounded-r-2xl bg-white/70 p-3 shadow-2xl backdrop-blur-xl transition-[transform,opacity] duration-300 ease-out will-change-transform",
          "translate-x-0 opacity-100",
        )}
        aria-label="Scenes"
      >
        <div className="px-2">{currentScene?.name || currentSceneId}</div>
        <div className="mb-2.5 px-2 pb-2 border-b border-slate-200/80 text-xs font-semibold text-slate-900 flex justify-between items-center">
          <span>Scenes List ({tourScenes.length})</span>
          <span className="text-[10px] text-slate-500 font-normal">
            Double-click to rename
          </span>
        </div>
        <div className="overflow-y-auto pr-0.5 space-y-1 custom-scrollbar flex-1">
          {tourScenes.map((scene, index) => {
            const isSelected = scene.id === currentSceneId;
            return (
              <div
                key={scene.id}
                ref={isSelected ? selectedSceneRef : null}
                className={cn(
                  "group flex h-9 w-full items-center justify-between gap-1 rounded-lg px-2 text-xs font-medium text-slate-800 transition-all",
                  isSelected &&
                    "bg-sky-600 text-white font-semibold hover:bg-sky-600 shadow-sm",
                )}
              >
                <div className="flex flex-col shrink-0 gap-0.5 mr-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveScene(index, "up");
                    }}
                    className="p-0.5 rounded text-white hover:bg-slate-200/60 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Move up"
                  >
                    <ArrowUp size={11} />
                  </button>
                  <button
                    type="button"
                    disabled={index === tourScenes.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveScene(index, "down");
                    }}
                    className="p-0.5 rounded text-white hover:bg-slate-200/60 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Move down"
                  >
                    <ArrowDown size={11} />
                  </button>
                </div>

                {editingSceneId === scene.id ? (
                  <input
                    type="text"
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveRename(scene.id);
                      if (e.key === "Escape") setEditingSceneId(null);
                    }}
                    onBlur={() => handleSaveRename(scene.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 rounded bg-white border border-sky-500 px-2 py-0.5 text-xs text-slate-900 focus:outline-none"
                  />
                ) : (
                  <span
                    className="truncate flex-1 cursor-pointer select-none py-1"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(scene);
                    }}
                    onClick={() => onSceneChange(scene.id)}
                    title="Double-click to rename"
                  >
                    {scene.name || scene.id}
                  </span>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteScene(scene.id);
                  }}
                  className="shrink-0 p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 transition-colors ml-1 cursor-pointer"
                  title="Delete scene"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
