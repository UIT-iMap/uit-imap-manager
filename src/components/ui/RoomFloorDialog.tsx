import { useState, useMemo, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Room, CATEGORY_COLORS } from "../../lib/types";
import { useData } from "../../contexts/dataContext";
import Button from "./Button";

interface RoomFloorDialogProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RoomFloorDialog({
  room,
  isOpen,
  onClose,
}: RoomFloorDialogProps) {
  const { rooms } = useData();

  const [building, setBuilding] = useState<string>("");
  const [floor, setFloor] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [colsFrom, setColsFrom] = useState<string>("");
  const [colsTo, setColsTo] = useState<string>("");
  const [rowsFrom, setRowsFrom] = useState<string>("");
  const [rowsTo, setRowsTo] = useState<string>("");

  useEffect(() => {
    if (room) {
      const b = String(room.belongsTo ?? "").trim();
      const f = String(room.floor ?? "").trim();
      setBuilding(b);
      setFloor(f);
      setSelectedRoomId(String(room.id));
      if (room.cols) {
        setColsFrom(String(room.cols[0]));
        setColsTo(String(room.cols[1]));
      } else {
        setColsFrom("");
        setColsTo("");
      }
      if (room.rows) {
        setRowsFrom(String(room.rows[0]));
        setRowsTo(String(room.rows[1]));
      } else {
        setRowsFrom("");
        setRowsTo("");
      }
    }
  }, [room]);

  const filteredRooms = useMemo(() => {
    if (!building.trim() || !floor.trim()) return [];
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
  }, [rooms.data, building, floor]);

  const matchedRoom = useMemo(() => {
    if (!selectedRoomId.trim()) return null;
    const rId = selectedRoomId.trim();
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
  }, [rooms.data, building, floor, selectedRoomId]);

  const lastValidColsFrom = useRef<string>("");
  const lastValidColsTo = useRef<string>("");
  const lastValidRowsFrom = useRef<string>("");
  const lastValidRowsTo = useRef<string>("");

  useEffect(() => {
    if (matchedRoom) {
      if (matchedRoom.cols) {
        const cFromStr = String(matchedRoom.cols[0]);
        const cToStr = String(matchedRoom.cols[1]);
        setColsFrom(cFromStr);
        setColsTo(cToStr);
        lastValidColsFrom.current = cFromStr;
        lastValidColsTo.current = cToStr;
      }
      if (matchedRoom.rows) {
        const rFromStr = String(matchedRoom.rows[0]);
        const rToStr = String(matchedRoom.rows[1]);
        setRowsFrom(rFromStr);
        setRowsTo(rToStr);
        lastValidRowsFrom.current = rFromStr;
        lastValidRowsTo.current = rToStr;
      }
    }
  }, [matchedRoom]);

  const handleColsFromChange = (newVal: string) => {
    setColsFrom(newVal);
    if (!newVal.trim()) return;
    const cFrom = parseInt(newVal, 10);
    const cTo = parseInt(colsTo, 10);
    if (isNaN(cFrom)) {
      alert("cols: phải là số hợp lệ");
      setColsFrom(lastValidColsFrom.current);
      return;
    }
    if (cFrom <= 0) {
      alert("cols: 'from' phải > 0");
      setColsFrom(lastValidColsFrom.current);
      return;
    }
    if (!isNaN(cTo) && cFrom > cTo) {
      alert(`cols: yêu cầu 'from' (${cFrom}) <= 'to' (${cTo})`);
      setColsFrom(lastValidColsFrom.current);
      return;
    }
    lastValidColsFrom.current = newVal;
  };

  const handleColsToChange = (newVal: string) => {
    setColsTo(newVal);
    if (!newVal.trim()) return;
    const cTo = parseInt(newVal, 10);
    const cFrom = parseInt(colsFrom, 10);
    if (isNaN(cTo)) {
      alert("cols: phải là số hợp lệ");
      setColsTo(lastValidColsTo.current);
      return;
    }
    if (cTo <= 0) {
      alert("cols: 'to' phải > 0");
      setColsTo(lastValidColsTo.current);
      return;
    }
    if (!isNaN(cFrom) && cFrom > cTo) {
      alert(`cols: yêu cầu 'from' (${cFrom}) <= 'to' (${cTo})`);
      setColsTo(lastValidColsTo.current);
      return;
    }
    lastValidColsTo.current = newVal;
  };

  const handleRowsFromChange = (newVal: string) => {
    setRowsFrom(newVal);
    if (!newVal.trim()) return;
    const rFrom = parseInt(newVal, 10);
    const rTo = parseInt(rowsTo, 10);
    if (isNaN(rFrom)) {
      alert("rows: phải là số hợp lệ");
      setRowsFrom(lastValidRowsFrom.current);
      return;
    }
    if (rFrom <= 0) {
      alert("rows: 'from' phải > 0");
      setRowsFrom(lastValidRowsFrom.current);
      return;
    }
    if (!isNaN(rTo) && rFrom > rTo) {
      alert(`rows: yêu cầu 'from' (${rFrom}) <= 'to' (${rTo})`);
      setRowsFrom(lastValidRowsFrom.current);
      return;
    }
    lastValidRowsFrom.current = newVal;
  };

  const handleRowsToChange = (newVal: string) => {
    setRowsTo(newVal);
    if (!newVal.trim()) return;
    const rTo = parseInt(newVal, 10);
    const rFrom = parseInt(rowsFrom, 10);
    if (isNaN(rTo)) {
      alert("rows: phải là số hợp lệ");
      setRowsTo(lastValidRowsTo.current);
      return;
    }
    if (rTo <= 0) {
      alert("rows: 'to' phải > 0");
      setRowsTo(lastValidRowsTo.current);
      return;
    }
    if (!isNaN(rFrom) && rFrom > rTo) {
      alert(`rows: yêu cầu 'from' (${rFrom}) <= 'to' (${rTo})`);
      setRowsTo(lastValidRowsTo.current);
      return;
    }
    lastValidRowsTo.current = newVal;
  };

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

  // Auto-update matched room's cols & rows live as inputs change (online preview)
  useEffect(() => {
    if (!matchedRoom) return;

    const roomIdx = rooms.data.findIndex((r) => r.id === matchedRoom.id);
    if (roomIdx < 0) return;

    const currentCols = matchedRoom.cols ?? [0, 0];
    const currentRows = matchedRoom.rows ?? [0, 0];

    const fieldsToUpdate: Record<string, any> = {};

    if (
      previewCols &&
      (previewCols[0] !== currentCols[0] || previewCols[1] !== currentCols[1])
    ) {
      fieldsToUpdate.cols = previewCols;
    }

    if (
      previewRows &&
      (previewRows[0] !== currentRows[0] || previewRows[1] !== currentRows[1])
    ) {
      fieldsToUpdate.rows = previewRows;
    }

    if (Object.keys(fieldsToUpdate).length > 0) {
      rooms.editRowFields?.(roomIdx, fieldsToUpdate);
    }
  }, [previewCols, previewRows, matchedRoom, rooms]);

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

  const { maxRow, maxCol } = useMemo(() => {
    let maxR = 1;
    let maxC = 1;

    for (const r of filteredRooms) {
      const isTarget = matchedRoom?.id === r.id;
      const rCols = isTarget && previewCols ? previewCols : r.cols;
      const rRows = isTarget && previewRows ? previewRows : r.rows;
      if (rRows?.[1]) maxR = Math.max(maxR, rRows[1]);
      if (rCols?.[1]) maxC = Math.max(maxC, rCols[1]);
    }

    if (!matchedRoom && !previewMatchesExistingRoom) {
      if (previewRows) maxR = Math.max(maxR, previewRows[1]);
      if (previewCols) maxC = Math.max(maxC, previewCols[1]);
    }

    return { maxRow: maxR, maxCol: maxC };
  }, [
    filteredRooms,
    matchedRoom,
    previewRows,
    previewCols,
    previewMatchesExistingRoom,
  ]);

  const CELL_SIZE = useMemo(() => {
    const availableWidth = 700;
    const CONTAINER_PADDING = 16;
    const GAP = 1;
    const usableWidth = availableWidth - CONTAINER_PADDING * 2;
    const calculated = (usableWidth - (maxCol - 1) * GAP) / maxCol;
    return Math.min(60, Math.max(35, calculated));
  }, [maxCol]);

  const GAP = 1;
  const gridHeight = maxRow * CELL_SIZE + (maxRow - 1) * GAP;

  const handleSelectRoom = (r: Room) => {
    setSelectedRoomId(String(r.id));
    if (r.cols) {
      setColsFrom(String(r.cols[0]));
      setColsTo(String(r.cols[1]));
    }
    if (r.rows) {
      setRowsFrom(String(r.rows[0]));
      setRowsTo(String(r.rows[1]));
    }
  };

  const handleSave = () => {
    if (!matchedRoom) return;
    const roomIdx = rooms.data.findIndex((r) => r.id === matchedRoom.id);
    if (roomIdx >= 0) {
      const cFrom = parseInt(colsFrom, 10);
      const cTo = parseInt(colsTo, 10);
      const rFrom = parseInt(rowsFrom, 10);
      const rTo = parseInt(rowsTo, 10);

      if (
        !isNaN(cFrom) &&
        !isNaN(cTo) &&
        !isNaN(rFrom) &&
        !isNaN(rTo) &&
        cFrom <= cTo &&
        rFrom <= rTo
      ) {
        rooms.editRowFields?.(roomIdx, {
          cols: [cFrom, cTo],
          rows: [rFrom, rTo],
        });
      }
    }
    onClose();
  };

  if (!isOpen || !room) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Floor Map Preview
            </h2>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Adjust Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 text-xs font-medium text-slate-700">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">cols:</span>
              <input
                type="number"
                value={colsFrom}
                onChange={(e) => handleColsFromChange(e.target.value)}
                placeholder="from"
                className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-xs focus:border-sky-500 focus:outline-none"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                value={colsTo}
                onChange={(e) => handleColsToChange(e.target.value)}
                placeholder="to"
                className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">rows:</span>
              <input
                type="number"
                value={rowsFrom}
                onChange={(e) => handleRowsFromChange(e.target.value)}
                placeholder="from"
                className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-xs focus:border-sky-500 focus:outline-none"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                value={rowsTo}
                onChange={(e) => handleRowsToChange(e.target.value)}
                placeholder="to"
                className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={handleSave}>
              OK
            </Button>
          </div>
        </div>

        {/* Map Canvas Body */}
        <div className="flex-1 overflow-auto bg-slate-50 p-6 min-h-[350px]">
          <div className="scale-75 origin-top-left">
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
              {!matchedRoom &&
                previewCols &&
                previewRows &&
                !previewMatchesExistingRoom && (
                  <div
                    className="flex items-center justify-center rounded-md p-1 text-center font-semibold border-2 border-dashed border-sky-400 bg-sky-100/70 text-sky-700 text-[11px] animate-pulse"
                    style={{
                      gridRowStart: previewRows[0],
                      gridRowEnd: previewRows[1] + 1,
                      gridColumnStart: previewCols[0],
                      gridColumnEnd: previewCols[1] + 1,
                    }}
                  >
                    Preview Position
                  </div>
                )}
              {filteredRooms.map((r) => {
                const isTarget = matchedRoom?.id === r.id;
                const rCols = isTarget && previewCols ? previewCols : r.cols;
                const rRows = isTarget && previewRows ? previewRows : r.rows;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRoom(r)}
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
                          : r.hasEvent
                            ? "border-2 border-green-500"
                            : "border border-slate-200/50"
                      }
                      ${
                        (CATEGORY_COLORS as Record<string, string>)[
                          r.category
                        ] ?? "bg-slate-100 text-slate-700"
                      }
                    `}
                    style={{
                      gridRowStart: rRows?.[0] ?? "auto",
                      gridRowEnd: rRows ? rRows[1] + 1 : "auto",
                      gridColumnStart: rCols?.[0] ?? "auto",
                      gridColumnEnd: rCols ? rCols[1] + 1 : "auto",
                    }}
                  >
                    <span className="line-clamp-3">{r.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
