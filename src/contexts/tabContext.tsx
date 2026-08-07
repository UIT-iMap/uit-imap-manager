import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { ComponentType } from "react";
import type { TabId } from "../lib/types";
import { Image, Bus, Package, LayoutGrid, BookOpen } from "lucide-react";
import { useData } from "./dataContext";

export interface TabDef {
  id: TabId;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

export const TABS: TabDef[] = [
  { id: "model", label: "Map", icon: Package },
  { id: "rooms", label: "Rooms", icon: LayoutGrid },
  { id: "tourScenes", label: "Scenes", icon: Image },
  { id: "transport", label: "Transport", icon: Bus },
  { id: "guide", label: "Guide", icon: BookOpen },
];

interface TabContextValue {
  tab: TabId;
  setTab: (tab: TabId) => void;
}

const TabContext = createContext<TabContextValue | undefined>(undefined);

export function TabProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<TabId>("model");
  const { autoSave, hasUnsavedChanges } = useData();

  const setTab = useCallback(
    (nextTab: TabId) => {
      if (nextTab === tab) return;
      if (!autoSave && hasUnsavedChanges) {
        const confirmed = window.confirm(
          "Changes you made may not be saved!",
        );
        if (!confirmed) return;
      }
      setTabState(nextTab);
    },
    [tab, autoSave, hasUnsavedChanges],
  );

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
