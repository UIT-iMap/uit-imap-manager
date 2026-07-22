import { useRef, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Upload } from "lucide-react";
import Dialog from "./Dialog";
import Button from "./Button";
import { useData } from "../../contexts/dataContext";
import type { TourScene, UploadPreviewRow } from "../../lib/types";

interface UploadZipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onParsed: (rows: UploadPreviewRow[], scenes: TourScene[], tilesZip: JSZip) => void;
}

function extractAppData(code: string): { scenes: TourScene[]; name?: string } {
  // data.js declares `var APP_DATA = {...}`; evaluate it in an isolated function scope.
  const fn = new Function(`${code}\nreturn typeof APP_DATA !== "undefined" ? APP_DATA : null;`);
  const result = fn();
  if (!result || !Array.isArray(result.scenes)) {
    throw new Error("data.js did not contain a valid APP_DATA.scenes array.");
  }
  return result;
}

export default function UploadZipDialog({ isOpen, onClose, onParsed }: UploadZipDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const data = useData();
  const slice = data.tourScenes;

  const processZipFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const zip = await JSZip.loadAsync(file);
      const dataJsEntry = Object.values(zip.files).find(
        (f) => !f.dir && f.name.toLowerCase().endsWith("data.js")
      );
      if (!dataJsEntry) {
        throw new Error(`No data.js found inside "${file.name}".`);
      }
      const code = await dataJsEntry.async("text");
      const appData = extractAppData(code);
      const scenes = appData.scenes;

      const tilesZip = new JSZip();

      // collect any /tiles/ directories into the archive
      const tileEntries = Object.values(zip.files).filter(
        (f) => !f.dir && /(^|\/)tiles\//i.test(f.name)
      );
      for (const entry of tileEntries) {
        const content = await entry.async("uint8array");
        const match = entry.name.match(/(^|\/)tiles\/(.*)$/i);
        if (match) {
          const relativePath = "tiles/" + match[2];
          tilesZip.file(relativePath, content);
        }
      }

      const existingIds = new Set(slice.data.map((r) => String((r as any).id)));
      const rows: UploadPreviewRow[] = scenes.map((s) => ({
        id: s.id,
        name: s.name,
        exists: existingIds.has(String(s.id)),
        raw: s,
        checked: true,
      }));

      onParsed(rows, scenes, tilesZip);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const processFolder = async (files: FileList) => {
    setBusy(true);
    setError(null);
    try {
      const fileArray = Array.from(files);
      const dataJsFile = fileArray.find((f) => {
        const path = (f.webkitRelativePath || f.name).toLowerCase();
        return path.endsWith("data.js");
      });
      if (!dataJsFile) {
        throw new Error("No data.js found inside the folder.");
      }
      const code = await dataJsFile.text();
      const appData = extractAppData(code);
      const scenes = appData.scenes;

      const tilesZip = new JSZip();

      // collect any /tiles/ directories into the archive
      const tileFiles = fileArray.filter((f) =>
        /(^|\/)tiles\//i.test(f.webkitRelativePath || f.name)
      );
      for (const file of tileFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const content = new Uint8Array(arrayBuffer);
        const path = file.webkitRelativePath || file.name;
        const match = path.match(/(^|\/)tiles\/(.*)$/i);
        if (match) {
          const relativePath = "tiles/" + match[2];
          tilesZip.file(relativePath, content);
        }
      }

      const existingIds = new Set(slice.data.map((r) => String((r as any).id)));
      const rows: UploadPreviewRow[] = scenes.map((s) => ({
        id: s.id,
        name: s.name,
        exists: existingIds.has(String(s.id)),
        raw: s,
        checked: true,
      }));

      onParsed(rows, scenes, tilesZip);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Upload zip/folder" widthClass="max-w-lg">
      {(close) => (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Select a single zipped tour-scene export or the unzipped folder. It should contain a{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">data.js</code> file and a{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">/tiles</code> folder.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                processZipFile(e.target.files[0]);
              }
              e.target.value = "";
            }}
          />
          <input
            ref={folderRef}
            type="file"
            {...{ webkitdirectory: "", directory: "" }}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                processFolder(e.target.files);
              }
              e.target.value = "";
            }}
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<Upload size={14} />}
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {busy ? "Processing..." : "Choose zip file"}
            </Button>
            <Button
              variant="secondary"
              icon={<Upload size={14} />}
              disabled={busy}
              onClick={() => folderRef.current?.click()}
            >
              {busy ? "Processing..." : "Choose folder"}
            </Button>
          </div>
          {error && (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => { close(); onClose(); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

export async function downloadTilesArchive(tilesZip: JSZip) {
  const blob = await tilesZip.generateAsync({ type: "blob" });
  saveAs(blob, `tour-scene-tiles-${Date.now()}.zip`);
}
