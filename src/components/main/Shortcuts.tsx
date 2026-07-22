import { useEffect } from "react";
import { useLog } from "../../contexts/logContext";

export default function Shortcuts() {
  const { log, recoverTo, markAllSaved } = useLog();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        markAllSaved();
      } else if (key === "z") {
        e.preventDefault();
        const latest = log.find((l) => !l.isSaved);
        if (latest) recoverTo(latest.id);
      } else if (key === "y") {
        e.preventDefault();
        // Redo is reserved: would require a persisted redo stack of recovered entries.
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [log, recoverTo, markAllSaved]);

  return null;
}
