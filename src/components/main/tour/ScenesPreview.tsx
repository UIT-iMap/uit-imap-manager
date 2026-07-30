import { useState, useEffect, useCallback } from "react";
import { usePano } from "@/contexts/panoContext";
import TourViewer from "./TourViewer";
import { useTab } from "@/contexts/tabContext";

export default function ScenesPreview() {
  const { currentSceneId, setScene, tourScenes } = usePano();
  const { setTab } = useTab();

  const [activeSceneId, setActiveSceneId] = useState<string>(currentSceneId);

  useEffect(() => {
    if (currentSceneId) {
      setActiveSceneId(currentSceneId);
    } else if (tourScenes.length > 0) {
      setActiveSceneId(tourScenes[0].id);
    }
  }, [currentSceneId, tourScenes]);

  const handleSceneChange = useCallback(
    (id: string) => {
      setActiveSceneId(id);
      setScene(id);
    },
    [setScene],
  );

  const handleExit = useCallback(() => {
    setTab("hotspots");
  }, [setTab]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-900 flex-1">
      <TourViewer
        isOpen={true}
        sceneId={activeSceneId}
        onSceneChange={handleSceneChange}
        onExit={handleExit}
      />
    </div>
  );
}
