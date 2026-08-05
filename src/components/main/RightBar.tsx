import { useState } from "react";
import { Save } from "lucide-react";
import Button from "../ui/Button";
import { useTab, TAB_GROUPS } from "../../contexts/tabContext";
import { useData } from "../../contexts/dataContext";
import { useUser } from "../../contexts/userContext";
import type { DataId } from "../../lib/types";

export default function RightBar() {
  const { tab, setTab } = useTab();
  const data = useData();
  const { token } = useUser();

  const [savedFlash, setSavedFlash] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isModel = tab === "model";
  const isFloorPreview = tab === "floorPreview";
  const slice = !isModel && !isFloorPreview ? data[tab as DataId] : null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (slice) {
        await slice.save(token);
      } else {
        await data.saveAll(token);
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
    } catch (err: any) {
      console.error("Save error:", err);
      alert(err.message || "Failed to save data to server");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <aside className="flex h-full w-48 shrink-0 flex-col gap-1 border-l border-slate-200 bg-white p-3">
      <Button
        variant="primary"
        icon={<Save size={14} />}
        onClick={handleSave}
        disabled={isSaving}
        className="w-full justify-center mb-1"
      >
        {isSaving ? "Saving..." : savedFlash ? "Saved!" : "Save"}
      </Button>
      {TAB_GROUPS.map((group, index) => (
        <div key={group.name} className="flex flex-col gap-1">
          {index > 0 && <div className="my-1 border-t border-slate-200" />}
          <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {group.name}
          </div>
          {group.tabs.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all hover:scale-95 active:scale-90 ${
                  active
                    ? "bg-sky-400 text-white hover:bg-sky-500"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                {label.toUpperCase()}
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
