import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface FloorContextValue {
  building: string;
  setBuilding: (val: string) => void;
  floor: string;
  setFloor: (val: string) => void;
  roomId: string;
  setRoomId: (val: string) => void;
  colsFrom: string;
  setColsFrom: (val: string) => void;
  colsTo: string;
  setColsTo: (val: string) => void;
  rowsFrom: string;
  setRowsFrom: (val: string) => void;
  rowsTo: string;
  setRowsTo: (val: string) => void;
}

const FloorContext = createContext<FloorContextValue | undefined>(undefined);

export function FloorProvider({ children }: { children: ReactNode }) {
  const [building, setBuilding] = useState<string>("");
  const [floor, setFloor] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [colsFrom, setColsFrom] = useState<string>("");
  const [colsTo, setColsTo] = useState<string>("");
  const [rowsFrom, setRowsFrom] = useState<string>("");
  const [rowsTo, setRowsTo] = useState<string>("");

  return (
    <FloorContext.Provider
      value={{
        building,
        setBuilding,
        floor,
        setFloor,
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
      }}
    >
      {children}
    </FloorContext.Provider>
  );
}

export function useFloor() {
  const ctx = useContext(FloorContext);
  if (!ctx) throw new Error("useFloor must be used within FloorProvider");
  return ctx;
}
