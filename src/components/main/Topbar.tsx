import { useState, useEffect, useRef } from "react";
import { Plus, Upload, Download, Save, FolderArchive, X } from "lucide-react";
import Button from "../ui/Button";
import NewRowDialog from "../ui/NewRowDialog";
import UploadJsonDialog from "../ui/UploadJsonDialog";
import UploadZipDialog, { downloadTilesArchive } from "../ui/UploadZipDialog";
import UploadPreviewDialog from "../ui/UploadPreviewDialog";
import { useTab } from "../../contexts/tabContext";
import { useData } from "../../contexts/dataContext";
import { useModel } from "../../contexts/modelContext";
import { useFloor } from "../../contexts/floorContext";
import { usePano } from "../../contexts/panoContext";
import { downloadJson } from "../../lib/utils/jsons";
import {
  processPanoramaFile,
  type ProcessProgress,
} from "../../lib/utils/panoProcessor";
import type { UploadPreviewRow, DataId } from "../../lib/types";
import type JSZip from "jszip";

export default function Topbar() {
  const { tab } = useTab();
  const data = useData();
  const {
    currentSceneId,
    currentScene,
    setScene,
    isAddingLinkSpot,
    startAddingLinkSpot,
    cancelAddingLinkSpot,
    relocatingIndex,
    cancelRelocating,
  } = usePano();
  const {
    pickMode,
    edgeFirstId,
    pendingRow,
    startPicking,
    cancelPicking,
    clearPendingRow,
    setMovingItem,
    setTempPosNormal,
    setShowTourspots,
    setTourspotSceneId,
  } = useModel();
  const { building, setBuilding, floor, setFloor, roomId, setRoomId } =
    useFloor();

  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<UploadPreviewRow[]>([]);
  const [pendingTilesZip, setPendingTilesZip] = useState<JSZip | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [tourspotDropdownOpen, setTourspotDropdownOpen] = useState(false);

  // Panorama processing states & refs
  const updateFileInputRef = useRef<HTMLInputElement>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const [processingProgress, setProcessingProgress] =
    useState<ProcessProgress | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpdatePanoramaClick = () => {
    if (!currentSceneId) {
      alert("Please select a current panorama scene to update.");
      return;
    }
    updateFileInputRef.current?.click();
  };

  const handleUpdatePanoramaFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = "";

    setIsProcessing(true);
    setProcessingError(null);

    try {
      const result = await processPanoramaFile(file, {
        existingSceneId: currentSceneId,
        existingSceneName: currentScene?.name,
        onProgress: setProcessingProgress,
      });

      const tourScenesSlice = data.tourScenes;
      const idx = tourScenesSlice.data.findIndex(
        (s: any) => s.id === currentSceneId,
      );

      if (idx !== -1) {
        tourScenesSlice.editRowFields?.(idx, {
          levels: result.scene.levels,
          faceSize: result.scene.faceSize,
        });
      } else {
        tourScenesSlice.addRow?.(result.scene);
      }

      await downloadTilesArchive(result.tilesZip);
      setScene(currentSceneId);
    } catch (err: any) {
      console.error("Error updating panorama:", err);
      setProcessingError(
        err.message || "An error occurred while processing the panorama image.",
      );
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setProcessingProgress(null);
      }, 1200);
    }
  };

  const handleUploadPanoramaClick = () => {
    uploadFileInputRef.current?.click();
  };

  const handleUploadPanoramaFilesChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    e.target.value = "";

    setIsProcessing(true);
    setProcessingError(null);

    const tourScenesSlice = data.tourScenes;
    let lastProcessedSceneId = "";

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setProcessingProgress({
          fileName: file.name,
          currentStep: `Preparing image (${i + 1}/${fileArray.length})...`,
          processedTiles: 0,
          totalTiles: 0,
          percent: 0,
        });

        const result = await processPanoramaFile(file, {
          onProgress: setProcessingProgress,
        });

        lastProcessedSceneId = result.scene.id;

        const existingIdx = tourScenesSlice.data.findIndex(
          (s: any) => s.id === result.scene.id,
        );

        if (existingIdx !== -1) {
          tourScenesSlice.editRowFields?.(existingIdx, result.scene);
        } else {
          tourScenesSlice.addRow?.(result.scene);
        }

        await downloadTilesArchive(result.tilesZip);
      }

      if (lastProcessedSceneId) {
        setScene(lastProcessedSceneId);
      }
    } catch (err: any) {
      console.error("Error uploading panorama:", err);
      setProcessingError(
        err.message || "An error occurred while processing the panorama image.",
      );
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setProcessingProgress(null);
      }, 1200);
    }
  };

  useEffect(() => {
    if (!tourspotDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".tourspot-dropdown-container")) {
        setTourspotDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [tourspotDropdownOpen]);

  const isModel = tab === "model";
  const isScenes = tab === "tourScenes";
  const isFloorPreview = tab === "floorPreview";
  const slice = !isModel && !isFloorPreview ? data[tab as DataId] : null;

  const hotspotIds = data.hotspots.data.map((h: any) => h.id);
  const roomBelongsToIds = data.rooms.data
    .map((r: any) => r.belongsTo)
    .filter(Boolean);
  const buildingOptions = Array.from(
    new Set([
      ...hotspotIds,
      ...roomBelongsToIds,
      "A",
      "B",
      "C",
      "cA",
      "cB",
      "cC",
    ]),
  )
    .filter(Boolean)
    .sort();

  const handleParsed = (rows: UploadPreviewRow[]) => {
    setPreviewRows(rows);
    setPreviewOpen(true);
  };

  const handleZipParsed = (
    rows: UploadPreviewRow[],
    _scenes: any,
    tilesZip: JSZip,
  ) => {
    setPendingTilesZip(tilesZip);
    setPreviewRows(rows);
    setPreviewOpen(true);
  };

  const handleConfirmUpload = (checkedRows: UploadPreviewRow[]) => {
    if (!slice) return;
    for (const r of checkedRows) {
      const idx = slice.data.findIndex(
        (row: any) => String(row[slice.rowIdKey]) === String(r.id),
      );
      if (idx >= 0) {
        slice.removeRow?.(idx);
      }
      slice.addRow?.(r.raw);
    }
    if (pendingTilesZip) {
      // downloadTilesArchive(pendingTilesZip);
      setPendingTilesZip(null);
    }
  };

  const handleSceneSelect = (sceneId: string) => {
    setTourspotDropdownOpen(false);

    // Check if it already has a tourspot
    const existing = data.tourspots.data.find(
      (t: any) => t.sceneId === sceneId,
    );

    if (existing) {
      // Editing the existing tourspot: start moving it!
      setMovingItem({ type: "tourspot", id: existing.id });
      setTempPosNormal({
        position: existing.dataPosition,
        normal: existing.dataNormal,
      });
      // Make sure tourspots are visible
      setShowTourspots(true);
    } else {
      // Adding a new tourspot: set tourspotSceneId, and start picking position
      setTourspotSceneId(sceneId);
      startPicking("tourspot");
      // Make sure tourspots are visible
      setShowTourspots(true);
    }
  };

  const handleDownload = () => {
    if (!slice) return;
    if (tab === "edges") {
      downloadJson(
        "hotspot-edges.json",
        slice.data.map((r: any) => r.endpoints),
      );
    } else {
      downloadJson(`${String(tab)}.json`, slice.data);
    }
  };

  const handleSave = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  if (isFloorPreview) {
    return (
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2 pt-2 border-b border-slate-200 pb-2">
        <h2 className="text-lg font-semibold text-slate-800">Floor Preview</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <label htmlFor="building-select">Building:</label>
            <select
              id="building-select"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm focus:border-sky-500 focus:outline-none cursor-pointer"
            >
              <option value="">-- Select Building --</option>
              {buildingOptions.map((id) => {
                const hObj = data.hotspots.data.find((h: any) => h.id === id);
                return (
                  <option key={id} value={id}>
                    {hObj?.name ? `${id} (${hObj.name})` : id}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <label htmlFor="floor-input">Floor:</label>
            <input
              id="floor-input"
              type="text"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="e.g. 1"
              className="w-20 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-sm focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <label htmlFor="room-id-input">Room ID:</label>
            <input
              id="room-id-input"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="e.g. 101"
              readOnly
              className="w-24 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-sm focus:border-sky-500 focus:outline-none cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    );
  }

  if (isScenes) {
    return (
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2 pt-2 border-b border-slate-200 pb-2">
        <input
          ref={updateFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpdatePanoramaFileChange}
        />
        <input
          ref={uploadFileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUploadPanoramaFilesChange}
        />

        <h2 className="text-lg font-semibold text-slate-800">Scenes Preview</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={isAddingLinkSpot ? "primary" : "secondary"}
            icon={isAddingLinkSpot ? <X size={14} /> : <Plus size={14} />}
            onClick={() => {
              if (isAddingLinkSpot) cancelAddingLinkSpot();
              else startAddingLinkSpot();
            }}
          >
            {isAddingLinkSpot ? "Click on panorama…" : "Add linking spot"}
          </Button>
          <Button
            variant="secondary"
            icon={<Upload size={14} />}
            disabled={isProcessing}
            onClick={handleUpdatePanoramaClick}
          >
            Update panorama
          </Button>
          <Button
            variant="secondary"
            icon={<Upload size={14} />}
            disabled={isProcessing}
            onClick={handleUploadPanoramaClick}
          >
            Upload panorama
          </Button>
          <Button
            variant="secondary"
            icon={<Download size={14} />}
            onClick={handleDownload}
          >
            Download JSON
          </Button>
          {(isAddingLinkSpot || relocatingIndex !== null) && (
            <Button
              variant="ghost"
              onClick={() => {
                cancelAddingLinkSpot();
                cancelRelocating();
              }}
              icon={<X size={14} />}
              className="text-red-400!"
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Progress & Error Modal */}
        {(isProcessing || processingProgress || processingError) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
              <h3 className="text-base font-bold text-slate-800 mb-3">
                {processingError
                  ? "Panorama Processing Error"
                  : "Slicing Panorama Tiles..."}
              </h3>

              {processingProgress && !processingError && (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-slate-600 font-medium">
                    <span className="truncate max-w-[240px] font-semibold text-sky-700">
                      {processingProgress.fileName}
                    </span>
                    <span>{processingProgress.percent}%</span>
                  </div>

                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-sky-500 transition-all duration-200 rounded-full"
                      style={{ width: `${processingProgress.percent}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-500">
                    {processingProgress.currentStep}
                  </p>
                </div>
              )}

              {processingError && (
                <div className="space-y-4">
                  <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">
                    {processingError}
                  </p>
                  <div className="flex justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setProcessingError(null);
                        setProcessingProgress(null);
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isModel) {
    return (
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2 pt-2">
        <h2 className="text-lg font-semibold text-slate-800">Model preview</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={pickMode === "hotspot" ? "primary" : "secondary"}
            icon={<Plus size={14} />}
            onClick={() => startPicking("hotspot")}
          >
            {pickMode === "hotspot" ? "Click on the model…" : "Add Hotspot"}
          </Button>
          <div className="relative tourspot-dropdown-container">
            <Button
              variant={pickMode === "tourspot" ? "primary" : "secondary"}
              icon={<Plus size={14} />}
              onClick={() => {
                if (pickMode === "tourspot") {
                  cancelPicking();
                } else {
                  setTourspotDropdownOpen((prev) => !prev);
                }
              }}
            >
              {pickMode === "tourspot" ? "Click on the model…" : "Add Tourspot"}
            </Button>
            {tourspotDropdownOpen && (
              <div className="absolute left-0 mt-1.5 z-50 w-56 rounded-lg bg-white shadow-xl ring-1 ring-black/5 focus:outline-none max-h-60 overflow-y-auto border border-slate-200 py-1 transition-all">
                {data.tourScenes.data.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-400">
                    No scenes found
                  </div>
                ) : (
                  data.tourScenes.data.map((scene: any) => {
                    const hasTour = data.tourspots.data.some(
                      (t: any) => t.sceneId === scene.id,
                    );
                    return (
                      <button
                        key={scene.id}
                        type="button"
                        onClick={() => handleSceneSelect(scene.id)}
                        className={`flex flex-col w-full text-left px-3 py-1.5 text-xs transition-colors duration-150 border-b border-slate-50 last:border-0 ${
                          hasTour
                            ? "bg-green-100 hover:bg-green-200 text-green-800"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="font-semibold">{scene.id}</span>
                        {scene.name && (
                          <span
                            className={`text-[10px] truncate opacity-70 ${
                              hasTour ? "text-green-700" : "text-slate-500"
                            }`}
                          >
                            {scene.name}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <Button
            variant={pickMode === "edge" ? "primary" : "secondary"}
            icon={<Plus size={14} />}
            onClick={() => startPicking("edge")}
          >
            {pickMode === "edge"
              ? edgeFirstId
                ? "Click second hotspot…"
                : "Click first hotspot…"
              : "Add Edge"}
          </Button>
          {pickMode && (
            <Button
              variant="ghost"
              onClick={cancelPicking}
              icon={<X size={14} />}
              className="text-red-400!"
            >
              Cancel
            </Button>
          )}
        </div>

        {pendingRow && (
          <NewRowDialog
            key={pendingRow.key}
            dataId={pendingRow.dataId}
            isOpen
            onClose={clearPendingRow}
            initialValues={pendingRow.initialValues}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-2">
      <h2 className="text-lg font-semibold capitalize text-slate-800">
        {String(tab).replace(/([A-Z])/g, " $1")}
      </h2>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          icon={<Plus size={14} />}
          onClick={() => setAddOpen(true)}
        >
          Add Row
        </Button>
        <Button
          variant="secondary"
          icon={isScenes ? <FolderArchive size={14} /> : <Upload size={14} />}
          onClick={() => setUploadOpen(true)}
        >
          {isScenes ? "Upload zip/folder" : "Upload JSON"}
        </Button>
        <Button
          variant="secondary"
          icon={<Download size={14} />}
          onClick={handleDownload}
        >
          Download JSON
        </Button>
        <Button
          variant="primary"
          icon={<Save size={14} />}
          onClick={handleSave}
        >
          {savedFlash ? "Saved!" : "Save"}
        </Button>
      </div>

      <NewRowDialog
        dataId={tab as DataId}
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
      />

      {isScenes ? (
        <UploadZipDialog
          isOpen={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onParsed={handleZipParsed}
        />
      ) : (
        <UploadJsonDialog
          dataId={tab as DataId}
          isOpen={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onParsed={handleParsed}
        />
      )}

      <UploadPreviewDialog
        isOpen={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPendingTilesZip(null);
        }}
        rows={previewRows}
        onConfirm={handleConfirmUpload}
      />
    </div>
  );
}
