import { createContext, useContext, useState, type ReactNode } from "react";
import type { ComponentType } from "react";
import type { TabId } from "../lib/types";
import {
  MapPin,
  DoorOpen,
  Waypoints,
  Compass,
  Image,
  Bus,
  Package,
  LayoutGrid,
} from "lucide-react";

export interface TabDef {
  id: TabId;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

export interface TabGroup {
  name: string;
  tabs: TabDef[];
}

export const TAB_GROUPS: TabGroup[] = [
  {
    name: "Location",
    tabs: [
      { id: "model", label: "Model Preview", icon: Package },
      { id: "floorPreview", label: "Floor Preview", icon: LayoutGrid },
      { id: "tourScenes", label: "Scenes Preview", icon: Image },
    ],
  },
  {
    name: "Details",
    tabs: [
      { id: "hotspots", label: "Hotspots", icon: MapPin },
      { id: "edges", label: "Edges", icon: Waypoints },
      { id: "rooms", label: "Rooms", icon: DoorOpen },
      { id: "tourspots", label: "Tourspots", icon: Compass },
      { id: "transport", label: "Transport", icon: Bus },
    ],
  },
];

export const TABS: TabDef[] = TAB_GROUPS.flatMap((g) => g.tabs);

interface TabContextValue {
  tab: TabId;
  setTab: (tab: TabId) => void;
}

const TabContext = createContext<TabContextValue | undefined>(undefined);

export function TabProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<TabId>("hotspots");
  return (
    <TabContext.Provider value={{ tab, setTab }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTab() {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error("useTab must be used within TabProvider");
  return ctx;
}
