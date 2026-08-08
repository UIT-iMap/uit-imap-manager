import "@google/model-viewer";
import {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Move, FileText, Trash2 } from "lucide-react";
import { useData } from "../../../contexts/dataContext";
import { useModel } from "../../../contexts/modelContext";
import HoverMenu from "../../ui/HoverMenu";
import EditRowDialog from "../../ui/EditRowDialog";
import type { Hotspot } from "../../../lib/types";
import { API_BASE_URL } from "../../../lib/apiConfig";
import { genId } from "../../../lib/utils/genId";

type Vec3 = { x: number; y: number; z: number };

type CustomModelViewer = HTMLElement & {
  cameraOrbit: string;
  fieldOfView: string;
  cameraTarget: string;

  resetTurntableRotation: (deg?: number) => void;
  jumpCameraToGoal: () => void;

  queryHotspot: (name: string) => {
    canvasPosition: { x: number; y: number };
    worldPosition: { x: number; y: number; z: number };
  } | null;

  updateHotspot: (options: {
    name: string;
    position?: string;
    normal?: string;
  }) => void;

  // Provided by @google/model-viewer's scene-graph API: converts a pixel
  // coordinate on the viewer into a world-space position + surface normal.
  positionAndNormalFromPoint: (
    pixelX: number,
    pixelY: number,
  ) => { position: Vec3; normal: Vec3 } | null;
};

export interface ModelViewerHandle {
  zoomTo: (hotspot: Hotspot) => void;
  reset: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ModelViewerProps {}

const INITIAL_ORBIT = "-131deg 68.84deg 19.4m";
const INITIAL_FOV = "13.71deg";

interface EdgeLine {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const ModelViewer = forwardRef<ModelViewerHandle, ModelViewerProps>(
  (_props, ref) => {
    const {
      hotspots: {
        data: hotspots,
        editRowFields: editHotspotRowFields,
        removeRow: removeHotspotRow,
      },
      tourspots: {
        data: tourspots,
        editRowFields: editTourspotRowFields,
        addRow: addTourspotRow,
        removeRow: removeTourspotRow,
      },
      edges: { data: edges, removeRow: removeEdgeRow, setAll: setEdgesAll },
    } = useData();

    const {
      pickMode,
      edgeFirstId,
      submitHotspotPick,
      submitTourspotPick,
      submitEdgeHotspotClick,
      cancelPicking,
      movingItem,
      setMovingItem,
      tempPosNormal,
      setTempPosNormal,
      showHotspots,
      setShowHotspots,
      showTourspots,
      setShowTourspots,
      showEdges,
      setShowEdges,
      tourspotSceneId,
    } = useModel();

    const mvRef = useRef<CustomModelViewer | null>(null);

    const [lines, setLines] = useState<EdgeLine[]>([]);
    const [editingSpot, setEditingSpot] = useState<{
      dataId: "hotspots" | "tourspots";
      rowIdx: number;
    } | null>(null);

    const isPickingPosition = pickMode === "hotspot" || pickMode === "tourspot";
    const isPickingEdge = pickMode === "edge" || pickMode === "remove_edge";
    // Force hotspot buttons and edge lines to render/be clickable while picking edge endpoints,
    // even if the "Hotspots" or "Edges" checkboxes are off.
    const effectiveShowHotspots = showHotspots || isPickingEdge;
    const effectiveShowEdges = showEdges || isPickingEdge;

    // Automatically enable showHotspots and showEdges when picking mode is activated
    useEffect(() => {
      if (isPickingEdge) {
        setShowHotspots(true);
        setShowEdges(true);
      } else if (pickMode === "hotspot") {
        setShowHotspots(true);
      } else if (pickMode === "tourspot") {
        setShowTourspots(true);
      }
    }, [isPickingEdge, pickMode, setShowHotspots, setShowEdges, setShowTourspots]);

    const handleEdgeHotspotClick = useCallback(
      (clickedId: string) => {
        if (pickMode === "edge") {
          submitEdgeHotspotClick(clickedId);
        } else if (pickMode === "remove_edge") {
          if (!edgeFirstId) {
            submitEdgeHotspotClick(clickedId);
          } else {
            if (edgeFirstId === clickedId) return;

            const firstId = edgeFirstId;
            const secondId = clickedId;

            const idx = edges.findIndex(
              (e: any) =>
                (e.first === firstId && e.second === secondId) ||
                (e.first === secondId && e.second === firstId),
            );

            if (idx === -1) {
              alert("There is no edge between these 2 hotspots!");
            } else {
              removeEdgeRow?.(idx);
            }

            cancelPicking();
          }
        }
      },
      [
        pickMode,
        edgeFirstId,
        submitEdgeHotspotClick,
        edges,
        removeEdgeRow,
        cancelPicking,
      ],
    );

    const handleRemoveHotspot = useCallback(
      (hId: string, idx: number) => {
        if (
          window.confirm(`Are you sure you want to remove hotspot "${hId}"?`)
        ) {
          removeHotspotRow?.(idx);

          const hasEdgesToRemove = edges.some(
            (e: any) => e.first === hId || e.second === hId,
          );
          if (hasEdgesToRemove && setEdgesAll) {
            const remainingEdges = edges.filter(
              (e: any) => e.first !== hId && e.second !== hId,
            );
            setEdgesAll(remainingEdges);
          }
        }
      },
      [edges, removeHotspotRow, setEdgesAll],
    );

    const handleRemoveTourspot = useCallback(
      (tId: string, idx: number) => {
        if (
          window.confirm(`Are you sure you want to remove tourspot "${tId}"?`)
        ) {
          removeTourspotRow?.(idx);
        }
      },
      [removeTourspotRow],
    );

    useImperativeHandle(ref, () => ({
      zoomTo: (hotspot: Hotspot) => {
        const mv = mvRef.current;
        if (!mv) return;
        const [x, y, z] = hotspot.dataPosition;
        mv.cameraTarget = `${x}m ${y}m ${z}m`;
        mv.cameraOrbit = `-131deg 68.84deg 8m`;
        mv.fieldOfView = "8deg";
      },
      reset: () => {
        const mv = mvRef.current;
        if (!mv) return;
        mv.cameraOrbit = INITIAL_ORBIT;
        mv.fieldOfView = INITIAL_FOV;
        mv.cameraTarget = "0m 0m 0m";
      },
    }));

    // Recompute the on-screen positions of edge endpoints whenever the camera moves
    const updateEdgeLines = useCallback(() => {
      const mv = mvRef.current;
      if (!mv || !edges || edges.length === 0) {
        setLines([]);
        return;
      }
      const next: EdgeLine[] = [];
      edges.forEach(({ first, second }, idx) => {
        const from = mv.queryHotspot(`hotspot-${first}`);
        const to = mv.queryHotspot(`hotspot-${second}`);

        if (from && to) {
          next.push({
            key: `${first}-${second}-${idx}`,
            x1: from.canvasPosition.x,
            y1: from.canvasPosition.y,
            x2: to.canvasPosition.x,
            y2: to.canvasPosition.y,
          });
        }
      });
      setLines(next);
    }, [edges]);

    useEffect(() => {
      const mv = mvRef.current;
      if (!mv || !effectiveShowEdges) {
        setLines([]);
        return;
      }
      // Give the newly-mounted hotspot slots a tick to register before querying
      const raf = requestAnimationFrame(updateEdgeLines);
      mv.addEventListener("camera-change", updateEdgeLines);
      window.addEventListener("resize", updateEdgeLines);
      return () => {
        cancelAnimationFrame(raf);
        mv.removeEventListener("camera-change", updateEdgeLines);
        window.removeEventListener("resize", updateEdgeLines);
      };
    }, [effectiveShowEdges, updateEdgeLines]);

    // Keep model-viewer internal 3D hotspot positions synchronized automatically whenever position data changes
    useEffect(() => {
      const mv = mvRef.current;
      if (!mv || !hotspots || !tourspots) return;

      hotspots.forEach((h) => {
        const isMoving =
          movingItem?.type === "hotspot" && movingItem?.id === h.id;
        const [x, y, z] =
          isMoving && tempPosNormal ? tempPosNormal.position : h.dataPosition;
        const [nx, ny, nz] =
          isMoving && tempPosNormal ? tempPosNormal.normal : h.dataNormal;
        try {
          mv.updateHotspot({
            name: `hotspot-${h.id}`,
            position: `${x}m ${y}m ${z}m`,
            normal: `${nx}m ${ny}m ${nz}m`,
          });
        } catch {
          // ignore if slot not ready yet
        }
      });

      tourspots.forEach((t) => {
        const isMoving =
          movingItem?.type === "tourspot" && movingItem?.id === t.id;
        const [x, y, z] =
          isMoving && tempPosNormal ? tempPosNormal.position : t.dataPosition;
        const [nx, ny, nz] =
          isMoving && tempPosNormal ? tempPosNormal.normal : t.dataNormal;
        try {
          mv.updateHotspot({
            name: `hotspot-tourspot-${t.id}`,
            position: `${x}m ${y}m ${z}m`,
            normal: `${nx}m ${ny}m ${nz}m`,
          });
        } catch {
          // ignore if slot not ready yet
        }
      });

      if (isPickingPosition && tempPosNormal) {
        try {
          mv.updateHotspot({
            name: "hotspot-placeholder",
            position: `${tempPosNormal.position[0]}m ${tempPosNormal.position[1]}m ${tempPosNormal.position[2]}m`,
            normal: `${tempPosNormal.normal[0]}m ${tempPosNormal.normal[1]}m ${tempPosNormal.normal[2]}m`,
          });
        } catch {
          // ignore if slot not ready yet
        }
      }

      if (effectiveShowEdges) {
        updateEdgeLines();
      }
    }, [
      hotspots,
      tourspots,
      movingItem,
      tempPosNormal,
      effectiveShowEdges,
      updateEdgeLines,
      isPickingPosition,
    ]);

    // Place the currently moving item at mouse click location
    const placeMovingItem = useCallback(
      (e: MouseEvent) => {
        if (!movingItem) return;
        const mv = mvRef.current;
        if (!mv) return;

        const rect = mv.getBoundingClientRect();
        const pixelX = e.clientX - rect.left;
        const pixelY = e.clientY - rect.top;

        const hit = mv.positionAndNormalFromPoint(pixelX, pixelY);
        // Only place/save if the user clicked on a valid location on the model surface
        if (!hit) return;

        if (!window.confirm("Place this spot here?")) return;

        const finalPos: [number, number, number] = [
          hit.position.x,
          hit.position.y,
          hit.position.z,
        ];
        const finalNorm: [number, number, number] = [
          hit.normal.x,
          hit.normal.y,
          hit.normal.z,
        ];

        if (movingItem.type === "hotspot") {
          const idx = hotspots.findIndex((h) => h.id === movingItem.id);
          if (idx !== -1 && editHotspotRowFields) {
            editHotspotRowFields(idx, {
              dataPosition: finalPos,
              dataNormal: finalNorm,
            });
          }
        } else if (movingItem.type === "tourspot") {
          const idx = tourspots.findIndex((t) => t.id === movingItem.id);
          if (idx !== -1 && editTourspotRowFields) {
            editTourspotRowFields(idx, {
              dataPosition: finalPos,
              dataNormal: finalNorm,
            });
          }
        }

        setMovingItem(null);
        setTempPosNormal(null);
      },
      [
        movingItem,
        hotspots,
        editHotspotRowFields,
        tourspots,
        editTourspotRowFields,
      ],
    );

    // Track mouse move to update the position of the item sticking to cursor
    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!movingItem && !isPickingPosition) return;
        const mv = mvRef.current;
        if (!mv) return;

        const rect = mv.getBoundingClientRect();
        const pixelX = e.clientX - rect.left;
        const pixelY = e.clientY - rect.top;

        const hit = mv.positionAndNormalFromPoint(pixelX, pixelY);
        if (hit) {
          setTempPosNormal({
            position: [hit.position.x, hit.position.y, hit.position.z],
            normal: [hit.normal.x, hit.normal.y, hit.normal.z],
          });
        }
      },
      [movingItem, isPickingPosition],
    );

    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          if (movingItem || pickMode) {
            cancelPicking();
          }
        }
      };

      window.addEventListener("keydown", onKeyDown);
      return () => {
        window.removeEventListener("keydown", onKeyDown);
      };
    }, [movingItem, pickMode, cancelPicking]);

    useEffect(() => {
      const mv = mvRef.current;
      if (!mv || (!movingItem && !isPickingPosition)) return;

      mv.addEventListener("mousemove", handleMouseMove);
      return () => {
        mv.removeEventListener("mousemove", handleMouseMove);
      };
    }, [movingItem, isPickingPosition, handleMouseMove]);

    useEffect(() => {
      if (movingItem && effectiveShowEdges) {
        updateEdgeLines();
      }
    }, [movingItem, tempPosNormal, effectiveShowEdges, updateEdgeLines]);

    // While picking a hotspot/tourspot position, capture the user's left-click
    // on the model and convert it into a dataPosition + dataNormal pair.
    const handleModelClick = useCallback(
      (e: MouseEvent) => {
        if (movingItem) {
          placeMovingItem(e);
          return;
        }

        if (pickMode !== "hotspot" && pickMode !== "tourspot") return;
        const mv = mvRef.current;
        if (!mv) return;

        const rect = mv.getBoundingClientRect();
        const pixelX = e.clientX - rect.left;
        const pixelY = e.clientY - rect.top;

        const hit = mv.positionAndNormalFromPoint(pixelX, pixelY);
        if (!hit) return;

        const dataPosition: [number, number, number] = [
          hit.position.x,
          hit.position.y,
          hit.position.z,
        ];
        const dataNormal: [number, number, number] = [
          hit.normal.x,
          hit.normal.y,
          hit.normal.z,
        ];

        if (pickMode === "hotspot") {
          const defaultId = genId(hotspots.map((h) => h.id));
          submitHotspotPick(dataPosition, dataNormal, defaultId);
        } else {
          if (tourspotSceneId) {
            addTourspotRow?.({
              id: tourspotSceneId,
              sceneId: tourspotSceneId,
              dataPosition,
              dataNormal,
            });
            cancelPicking();
          } else {
            submitTourspotPick(dataPosition, dataNormal);
          }
        }
      },
      [
        movingItem,
        placeMovingItem,
        pickMode,
        submitHotspotPick,
        submitTourspotPick,
        tourspotSceneId,
        addTourspotRow,
        cancelPicking,
      ],
    );

    useEffect(() => {
      const mv = mvRef.current;
      if (!mv) return;
      mv.addEventListener("click", handleModelClick as EventListener);
      return () =>
        mv.removeEventListener("click", handleModelClick as EventListener);
    }, [handleModelClick]);

    if (!hotspots || !tourspots || !edges) return <></>;

    const edgeHotspotIds = new Set(
      edges.flatMap(({ first, second }) => [first, second]),
    );

    return (
      <div className="relative w-full h-full overflow-hidden">
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 rounded-md bg-white/90 p-3 text-sm shadow-md backdrop-blur-sm">
          <label className="flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={showHotspots}
              onChange={(e) => setShowHotspots(e.target.checked)}
            />
            Hotspots
          </label>
          <label className="flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={showTourspots}
              onChange={(e) => setShowTourspots(e.target.checked)}
            />
            Tourspots
          </label>
          <label className="flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={showEdges}
              onChange={(e) => setShowEdges(e.target.checked)}
            />
            Edges
          </label>
        </div>

        {movingItem && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-md bg-amber-600/90 px-3 py-1.5 text-xs font-medium text-white shadow-md backdrop-blur-sm">
            <span>
              Moving {movingItem.type} <strong>{movingItem.id}</strong>. Click
              anywhere on the model to update position.
            </span>
            <button
              onClick={cancelPicking}
              className="ml-1 rounded bg-black/20 px-1.5 py-0.5 text-[10px] hover:bg-black/40"
            >
              Cancel (Esc)
            </button>
          </div>
        )}
        {isPickingPosition && !movingItem && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-md bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white shadow-md backdrop-blur-sm">
            <span>
              Click anywhere on the model to place the {pickMode}.
            </span>
            <button
              onClick={cancelPicking}
              className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] hover:bg-white/30"
            >
              Cancel (Esc)
            </button>
          </div>
        )}
        {isPickingEdge && !movingItem && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-md bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white shadow-md backdrop-blur-sm">
            <span>
              {pickMode === "remove_edge"
                ? edgeFirstId
                  ? "Click the second hotspot to remove the edge."
                  : "Click the first hotspot to select edge to remove."
                : edgeFirstId
                  ? "Click the second hotspot to finish the edge."
                  : "Click the first hotspot to start the edge."}
            </span>
            <button
              onClick={cancelPicking}
              className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] hover:bg-white/30"
            >
              Cancel (Esc)
            </button>
          </div>
        )}

        <model-viewer
          ref={mvRef}
          src={`${API_BASE_URL.replace(/\/$/, "")}/map.glb`}
          camera-controls
          tone-mapping="neutral"
          shadow-intensity="0"
          exposure="1"
          min-camera-orbit="auto 0deg 7m"
          max-camera-orbit="auto 88deg auto"
          camera-orbit={INITIAL_ORBIT}
          field-of-view={INITIAL_FOV}
          interaction-prompt="none"
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            overflow: "hidden",
            cursor: isPickingPosition || movingItem ? "crosshair" : undefined,
          }}
        >
          {/* Layer 3: Edge lines (SVG) - rendered behind hotspots/tourspots and hover menu */}
          {effectiveShowEdges && lines.length > 0 && (
            <svg
              className="pointer-events-none absolute inset-0 z-0 h-full w-full"
              width="100%"
              height="100%"
            >
              {lines.map((l) => (
                <line
                  key={l.key}
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  stroke="#22c55e"
                  strokeWidth={2}
                />
              ))}
            </svg>
          )}

          {/* Layer 2: Hotspots (with Layer 1: HoverMenu) */}
          {hotspots.map((h, idx) => {
            // Keep edge endpoints mounted (invisibly) so queryHotspot can find them
            const neededForEdges =
              effectiveShowEdges && edgeHotspotIds.has(h.id);
            if (!effectiveShowHotspots && !neededForEdges) return null;
            const isMoving =
              movingItem?.type === "hotspot" && movingItem?.id === h.id;
            const [x, y, z] =
              isMoving && tempPosNormal
                ? tempPosNormal.position
                : h.dataPosition;
            const [nx, ny, nz] =
              isMoving && tempPosNormal ? tempPosNormal.normal : h.dataNormal;
            const isSelectedFirst = isPickingEdge && edgeFirstId === h.id;
            return (
              <div
                key={`hotspot-${h.id}`}
                slot={`hotspot-${h.id}`}
                data-position={`${x}m ${y}m ${z}m`}
                data-normal={`${nx}m ${ny}m ${nz}m`}
                className="group relative z-20 flex items-center justify-center pointer-events-auto hover:z-50 focus-within:z-50"
              >
                <button
                  type="button"
                  aria-label={h.name ?? h.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (movingItem) {
                      placeMovingItem(e.nativeEvent);
                      return;
                    }
                    if (isPickingEdge) {
                      handleEdgeHotspotClick(h.id);
                    }
                  }}
                  className={`
                    relative z-20 flex items-center justify-center w-2.5 h-2.5 rounded-full
                    ${
                      isPickingEdge ||
                      (!isPickingPosition && effectiveShowHotspots)
                        ? "pointer-events-auto cursor-pointer"
                        : "pointer-events-none"
                    }
                    ${
                      effectiveShowHotspots
                        ? isMoving
                          ? "bg-amber-300 border-2 border-amber-600 scale-150 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse"
                          : isSelectedFirst
                            ? "bg-yellow-400 border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.5)]"
                            : "bg-red-500 border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.5)]"
                        : "bg-transparent border-0 shadow-none"
                    }
                  `}
                >
                  {effectiveShowHotspots && (
                    <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1 py-0.5 text-[9px] leading-none text-white">
                      {h.id} {h.name && `- ${h.name}`}
                    </span>
                  )}
                </button>

                {effectiveShowHotspots &&
                  !isMoving &&
                  !isPickingEdge &&
                  !isPickingPosition && (
                    <HoverMenu
                      items={[
                        {
                          label: "Relocate",
                          icon: <Move size={12} />,
                          onClick: () => {
                            setMovingItem({ type: "hotspot", id: h.id });
                            setTempPosNormal({
                              position: h.dataPosition,
                              normal: h.dataNormal,
                            });
                          },
                          title: "Relocate position",
                        },
                        {
                          label: "Detail",
                          icon: <FileText size={12} />,
                          onClick: () =>
                            setEditingSpot({ dataId: "hotspots", rowIdx: idx }),
                          title: "Edit details",
                        },
                        {
                          label: "Remove",
                          icon: <Trash2 size={12} />,
                          variant: "danger",
                          onClick: () => handleRemoveHotspot(h.id, idx),
                          title: "Remove hotspot",
                        },
                      ]}
                    />
                  )}
              </div>
            );
          })}

          {/* Layer 2: Tourspots (with Layer 1: HoverMenu) */}
          {showTourspots &&
            tourspots.map((t, idx) => {
              const isMoving =
                movingItem?.type === "tourspot" && movingItem?.id === t.id;
              const [x, y, z] =
                isMoving && tempPosNormal
                  ? tempPosNormal.position
                  : t.dataPosition;
              const [nx, ny, nz] =
                isMoving && tempPosNormal ? tempPosNormal.normal : t.dataNormal;
              return (
                <div
                  key={`tourspot-${t.id}`}
                  slot={`hotspot-tourspot-${t.id}`}
                  data-position={`${x}m ${y}m ${z}m`}
                  data-normal={`${nx}m ${ny}m ${nz}m`}
                  className="group relative z-20 flex items-center justify-center pointer-events-auto hover:z-50 focus-within:z-50"
                >
                  <button
                    type="button"
                    aria-label={t.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (movingItem) {
                        placeMovingItem(e.nativeEvent);
                        return;
                      }
                    }}
                    className={`
                      relative z-20 flex items-center justify-center w-3 h-3 rounded-[3px]
                      ${
                        !isPickingPosition && !isPickingEdge && showTourspots
                          ? "pointer-events-auto cursor-pointer"
                          : "pointer-events-none"
                      }
                      ${
                        isMoving
                          ? "bg-amber-300 border-2 border-amber-600 scale-150 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse"
                          : "bg-blue-500 border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.5)]"
                      }
                    `}
                  >
                    <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1 py-0.5 text-[9px] leading-none text-white">
                      {t.id}
                    </span>
                  </button>

                  {showTourspots &&
                    !isMoving &&
                    !isPickingEdge &&
                    !isPickingPosition && (
                      <HoverMenu
                        items={[
                          {
                            label: "Relocate",
                            icon: <Move size={12} />,
                            onClick: () => {
                              setMovingItem({ type: "tourspot", id: t.id });
                              setTempPosNormal({
                                position: t.dataPosition,
                                normal: t.dataNormal,
                              });
                            },
                            title: "Relocate position",
                          },
                          // {
                          //   label: "Detail",
                          //   icon: <FileText size={12} />,
                          //   onClick: () =>
                          //     setEditingSpot({ dataId: "tourspots", rowIdx: idx }),
                          //   title: "Edit details",
                          // },
                          {
                            label: "Remove",
                            icon: <Trash2 size={12} />,
                            variant: "danger",
                            onClick: () => handleRemoveTourspot(t.id, idx),
                            title: "Remove tourspot",
                          },
                        ]}
                      />
                    )}
                </div>
              );
            })}

          {isPickingPosition && tempPosNormal && (
            <button
              key="hotspot-placeholder"
              slot="hotspot-placeholder"
              data-position={`${tempPosNormal.position[0]}m ${tempPosNormal.position[1]}m ${tempPosNormal.position[2]}m`}
              data-normal={`${tempPosNormal.normal[0]}m ${tempPosNormal.normal[1]}m ${tempPosNormal.normal[2]}m`}
              className={`
                pointer-events-none relative z-20 flex items-center justify-center opacity-75 animate-pulse scale-110
                ${
                  pickMode === "hotspot"
                    ? "w-2.5 h-2.5 rounded-full bg-red-400 border-2 border-white shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                    : "w-3 h-3 rounded-[3px] bg-blue-400 border-2 border-white shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                }
              `}
            >
              <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1 py-0.5 text-[9px] leading-none text-white">
                New {pickMode}
              </span>
            </button>
          )}
        </model-viewer>

        <EditRowDialog
          dataId={editingSpot?.dataId ?? "hotspots"}
          rowIdx={editingSpot?.rowIdx ?? null}
          isOpen={editingSpot !== null}
          onClose={() => setEditingSpot(null)}
        />
      </div>
    );
  },
);

ModelViewer.displayName = "ModelViewer";
export default ModelViewer;
