import { useEffect, useMemo, useState } from "react";
import { Room, CATEGORY_COLORS, CATEGORY_LABELS } from "../../lib/types";
import { useData } from "../../contexts/dataContext";
import { useFloor } from "../../contexts/floorContext";
import Button from "../ui/Button";
import NewRowDialog from "../ui/NewRowDialog";

export default function FloorPreview() {
  const { rooms } = useData();
  const {
    building,
    floor,
    roomId,
    setRoomId,
    colsFrom,
    setColsFrom,
    colsTo,
    setColsTo,
    rowsFrom,
    setRowsFrom,
    rowsTo,
    setRowsTo,
  } = useFloor();

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const isFullySelected = Boolean(building.trim() && floor.trim());

  // Filter rooms for current building and floor
  const filteredRooms = useMemo(() => {
    if (!isFullySelected) return [];
    const b = building.trim().toLowerCase();
    const f = floor.trim();
    return rooms.data.filter((r) => {
      const matchBuilding =
        String(r.belongsTo ?? "")
          .trim()
          .toLowerCase() === b;
      const matchFloor = String(r.floor ?? "").trim() === f;
      return matchBuilding && matchFloor;
    });
  }, [rooms.data, isFullySelected, building, floor]);

  // Check if Room ID, Building and Floor match a valid existing room
  const matchedRoom = useMemo(() => {
    if (!isFullySelected || !roomId.trim()) return null;
    const rId = roomId.trim();
    const b = building.trim().toLowerCase();
    const f = floor.trim();

    return (
      rooms.data.find(
        (r) =>
          (String(r.id) === rId || r.id === parseInt(rId, 10)) &&
          String(r.belongsTo ?? "")
            .trim()
            .toLowerCase() === b &&
          String(r.floor ?? "").trim() === f,
      ) || null
    );
  }, [rooms.data, isFullySelected, building, floor, roomId]);

  // When a valid room is found or selected, auto-fill cols/rows inputs
  useEffect(() => {
    if (matchedRoom) {
      if (matchedRoom.cols) {
        setColsFrom(String(matchedRoom.cols[0]));
        setColsTo(String(matchedRoom.cols[1]));
      }
      if (matchedRoom.rows) {
        setRowsFrom(String(matchedRoom.rows[0]));
        setRowsTo(String(matchedRoom.rows[1]));
      }
    }
  }, [matchedRoom, setColsFrom, setColsTo, setRowsFrom, setRowsTo]);

  // Auto-update selected room's cols & rows when inputs change (online preview)
  useEffect(() => {
    if (!matchedRoom) return;

    const cFrom = parseInt(colsFrom, 10);
    const cTo = parseInt(colsTo, 10);
    const rFrom = parseInt(rowsFrom, 10);
    const rTo = parseInt(rowsTo, 10);

    const roomIdx = rooms.data.findIndex((r) => r.id === matchedRoom.id);
    if (roomIdx < 0) return;

    const currentCols = matchedRoom.cols ?? [0, 0];
    const currentRows = matchedRoom.rows ?? [0, 0];

    if (
      !isNaN(cFrom) &&
      !isNaN(cTo) &&
      (cFrom !== currentCols[0] || cTo !== currentCols[1])
    ) {
      rooms.editRow?.("cols", roomIdx, [cFrom, cTo]);
    }
    if (
      !isNaN(rFrom) &&
      !isNaN(rTo) &&
      (rFrom !== currentRows[0] || rTo !== currentRows[1])
    ) {
      rooms.editRow?.("rows", roomIdx, [rFrom, rTo]);
    }
  }, [colsFrom, colsTo, rowsFrom, rowsTo, matchedRoom, rooms]);

  const handleModify = () => {
    if (!matchedRoom) return;
    const roomIdx = rooms.data.findIndex((r) => r.id === matchedRoom.id);
    if (roomIdx < 0) return;

    const cFrom = parseInt(colsFrom, 10);
    const cTo = parseInt(colsTo, 10);
    const rFrom = parseInt(rowsFrom, 10);
    const rTo = parseInt(rowsTo, 10);

    if (!isNaN(cFrom) && !isNaN(cTo)) {
      rooms.editRow?.("cols", roomIdx, [cFrom, cTo]);
    }
    if (!isNaN(rFrom) && !isNaN(rTo)) {
      rooms.editRow?.("rows", roomIdx, [rFrom, rTo]);
    }
  };

  const initialValuesForAdd = useMemo(() => {
    const cFrom = parseInt(colsFrom, 10);
    const cTo = parseInt(colsTo, 10);
    const rFrom = parseInt(rowsFrom, 10);
    const rTo = parseInt(rowsTo, 10);
    const pId = parseInt(roomId, 10);
    const pFloor = parseInt(floor, 10);

    return {
      belongsTo: building,
      floor: isNaN(pFloor) ? floor : pFloor,
      ...(roomId ? { id: isNaN(pId) ? roomId : pId } : {}),
      ...(!isNaN(cFrom) && !isNaN(cTo) ? { cols: [cFrom, cTo] } : {}),
      ...(!isNaN(rFrom) && !isNaN(rTo) ? { rows: [rFrom, rTo] } : {}),
    };
  }, [building, floor, roomId, colsFrom, colsTo, rowsFrom, rowsTo]);

  // Preview position calculations for new room creation
  const previewCols = useMemo(() => {
    const cFrom = parseInt(colsFrom, 10);
    const cTo = parseInt(colsTo, 10);
    if (!isNaN(cFrom) && !isNaN(cTo) && cFrom > 0 && cTo >= cFrom) {
      return [cFrom, cTo] as [number, number];
    }
    return null;
  }, [colsFrom, colsTo]);

  const previewRows = useMemo(() => {
    const rFrom = parseInt(rowsFrom, 10);
    const rTo = parseInt(rowsTo, 10);
    if (!isNaN(rFrom) && !isNaN(rTo) && rFrom > 0 && rTo >= rFrom) {
      return [rFrom, rTo] as [number, number];
    }
    return null;
  }, [rowsFrom, rowsTo]);

  // Check if preview dimensions match an existing room in filteredRooms
  const previewMatchesExistingRoom = useMemo(() => {
    if (!previewCols || !previewRows) return false;
    return filteredRooms.some(
      (r) =>
        r.cols?.[0] === previewCols[0] &&
        r.cols?.[1] === previewCols[1] &&
        r.rows?.[0] === previewRows[0] &&
        r.rows?.[1] === previewRows[1],
    );
  }, [filteredRooms, previewCols, previewRows]);

  // Layout calculation for FloorMap
  const { maxRow, maxCol } = useMemo(() => {
    let maxR = Math.max(...filteredRooms.map((r) => r.rows?.[1] ?? 1), 1);
    let maxC = Math.max(...filteredRooms.map((r) => r.cols?.[1] ?? 1), 1);

    if (!matchedRoom && !previewMatchesExistingRoom) {
      if (previewRows) maxR = Math.max(maxR, previewRows[1]);
      if (previewCols) maxC = Math.max(maxC, previewCols[1]);
    }

    return { maxRow: maxR, maxCol: maxC };
  }, [filteredRooms, matchedRoom, previewRows, previewCols, previewMatchesExistingRoom]);

  const CELL_SIZE = useMemo(() => {
    const availableWidth = 900;
    const CONTAINER_PADDING = 16;
    const GAP = 1;
    const usableWidth = availableWidth - CONTAINER_PADDING * 2;
    const calculated = (usableWidth - (maxCol - 1) * GAP) / maxCol;
    return Math.min(70, Math.max(40, calculated));
  }, [maxCol]);

  const GAP = 1;
  const gridHeight = maxRow * CELL_SIZE + (maxRow - 1) * GAP;

  const handleSelectRoom = (room: Room) => {
    // If clicking the already selected room, deselect it
    if (matchedRoom && matchedRoom.id === room.id) {
      setRoomId("");
      setColsFrom("");
      setColsTo("");
      setRowsFrom("");
      setRowsTo("");
      return;
    }

    setRoomId(String(room.id));
    if (room.cols) {
      setColsFrom(String(room.cols[0]));
      setColsTo(String(room.cols[1]));
    }
    if (room.rows) {
      setRowsFrom(String(room.rows[0]));
      setRowsTo(String(room.rows[1]));
    }
  };

  const handleAddSuccess = (newRow: Record<string, any>) => {
    if (newRow.id !== undefined) {
      setRoomId(String(newRow.id));
    } else {
      setRoomId("");
    }
    setColsFrom("");
    setColsTo("");
    setRowsFrom("");
    setRowsTo("");
  };

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-50">
      {/* Fixed Header Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto rounded-md bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white shadow-md backdrop-blur-sm">
          Click on a room to edit it, or enter values into cols and rows to
          create a new one.
        </div>

        {isFullySelected && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-md text-xs font-medium text-slate-700">
            <div className="flex items-center gap-1">
              <span className="text-slate-500">cols:</span>
              <input
                type="number"
                value={colsFrom}
                onChange={(e) => setColsFrom(e.target.value)}
                placeholder="from"
                className="w-14 rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-xs focus:border-sky-500 focus:outline-none"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                value={colsTo}
                onChange={(e) => setColsTo(e.target.value)}
                placeholder="to"
                className="w-14 rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500">rows:</span>
              <input
                type="number"
                value={rowsFrom}
                onChange={(e) => setRowsFrom(e.target.value)}
                placeholder="from"
                className="w-14 rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-xs focus:border-sky-500 focus:outline-none"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                value={rowsTo}
                onChange={(e) => setRowsTo(e.target.value)}
                placeholder="to"
                className="w-14 rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>

            {matchedRoom ? (
              <Button variant="primary" onClick={handleModify}>
                Edit
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setAddDialogOpen(true)}>
                Add
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Main Content / Scrollable Map Container */}
      <div className="w-full h-full overflow-auto p-4 pt-20">
        {!isFullySelected ? (
          <div className="flex h-full w-full items-center justify-center text-slate-500 text-sm font-medium">
            Please select a Building and enter a Floor in the top bar to preview
            the floor map.
          </div>
        ) : (
          /* Live Floor Map Preview */
          <div>
            {filteredRooms.length === 0 && (!previewCols || !previewRows) ? (
              <div className="flex h-64 w-full items-center justify-center text-slate-400 text-sm">
                No rooms found for Building "{building}" Floor "{floor}". Click
                "Add" to create a room.
              </div>
            ) : (
              <div
                className="grid gap-px"
                style={{
                  gridTemplateColumns: `repeat(${maxCol}, minmax(0, ${CELL_SIZE}px))`,
                  gridAutoRows: `${CELL_SIZE}px`,
                  width: "fit-content",
                  minWidth: "100%",
                  height: gridHeight,
                  alignContent: "start",
                  justifyContent: "start",
                }}
              >
                {!matchedRoom && previewCols && previewRows && !previewMatchesExistingRoom && (
                  <div
                    className="flex items-center justify-center rounded-md p-1 text-center font-semibold border-2 border-dashed border-sky-400 bg-sky-100/70 text-sky-700 text-[11px] animate-pulse"
                    style={{
                      gridRowStart: previewRows[0],
                      gridRowEnd: previewRows[1] + 1,
                      gridColumnStart: previewCols[0],
                      gridColumnEnd: previewCols[1] + 1,
                    }}
                  >
                    Preview New Room
                  </div>
                )}
                {filteredRooms.map((room) => {
                  const isTarget = matchedRoom?.id === room.id;
                  return (
                    <button
                      key={room.id}
                      id={`room-cell-${room.id}`}
                      type="button"
                      onClick={() => handleSelectRoom(room)}
                      className={`
                        flex items-center justify-center
                        rounded-md
                        p-1
                        text-center
                        font-medium
                        transition-all
                        hover:opacity-80
                        active:scale-95
                        overflow-hidden
                        break-words
                        leading-tight
                        text-[11px]
                        cursor-pointer
                        ${
                          isTarget
                            ? "border-2 border-sky-600 ring-2 ring-sky-300"
                            : room.hasEvent
                              ? "border-2 border-green-500"
                              : "border border-slate-200/50"
                        }
                        ${
                          (CATEGORY_COLORS as Record<string, string>)[
                            room.category
                          ] ?? "bg-slate-100 text-slate-700"
                        }
                      `}
                      style={{
                        gridRowStart: room.rows?.[0] ?? "auto",
                        gridRowEnd: room.rows ? room.rows[1] + 1 : "auto",
                        gridColumnStart: room.cols?.[0] ?? "auto",
                        gridColumnEnd: room.cols ? room.cols[1] + 1 : "auto",
                      }}
                    >
                      <span className="line-clamp-3">{room.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Row Dialog when clicking Add */}
      {addDialogOpen && (
        <NewRowDialog
          dataId="rooms"
          isOpen={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          onSuccess={handleAddSuccess}
          initialValues={initialValuesForAdd}
        />
      )}
    </div>
  );
}
