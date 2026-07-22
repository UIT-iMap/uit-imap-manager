import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import Dialog from "./Dialog";
import Button from "./Button";
import { tryJsonToObject } from "../../lib/utils/jsons";
import { useData } from "../../contexts/dataContext";
import type { DataId, UploadPreviewRow } from "../../lib/types";

interface UploadJsonDialogProps {
  dataId: DataId;
  isOpen: boolean;
  onClose: () => void;
  onParsed: (rows: UploadPreviewRow[], rawRows: any[]) => void;
}

export function buildPreviewRows(
  dataId: DataId,
  parsed: any[],
  existing: any[],
  rowIdKey: string
): UploadPreviewRow[] {
  const existingIds = new Set(existing.map((r) => String(r[rowIdKey])));

  if (dataId === "edges") {
    return parsed.map((e: [string, string], i: number) => {
      const id = `edge_${i}_${e?.[0]}_${e?.[1]}`;
      return {
        id,
        name: "",
        extraLabel: `${e?.[0] ?? "?"}  ⇄  ${e?.[1] ?? "?"}`,
        exists: false,
        raw: { id, endpoints: e },
        checked: true,
      };
    });
  }

  return parsed.map((row: any) => {
    const id = String(row[rowIdKey]);
    return {
      id,
      name: row.name ?? "",
      exists: existingIds.has(id),
      raw: row,
      checked: true,
    };
  });
}

export default function UploadJsonDialog({
  dataId,
  isOpen,
  onClose,
  onParsed,
}: UploadJsonDialogProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const data = useData();
  const slice = data[dataId];

  const handleFile = async (file: File) => {
    const content = await file.text();
    setText(content);
    setError(null);
  };

  const handleAnalyze = (close: () => void) => {
    if (!text.trim()) {
      setError("Please paste JSON or upload a file first.");
      return;
    }
    const result = tryJsonToObject<any>(text);
    if (!result.ok) {
      setError(`Invalid JSON: ${result.error}`);
      return;
    }
    const parsed = Array.isArray(result.value) ? result.value : [result.value];
    const rows = buildPreviewRows(dataId, parsed, slice.data, slice.rowIdKey);
    onParsed(rows, parsed);
    setText("");
    setError(null);
    close();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        setText("");
        setError(null);
        onClose();
      }}
      title="Upload JSON"
      widthClass="max-w-xl"
    >
      {(close) => (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Paste JSON content
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="[ { &quot;id&quot;: &quot;...&quot;, ... } ]"
              className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-sky-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              icon={<Upload size={14} />}
              onClick={() => fileRef.current?.click()}
            >
              Upload file
            </Button>
            <span className="text-xs text-slate-400">Plain text .json file</span>
          </div>
          {error && (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => { close(); onClose(); }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => handleAnalyze(close)}>
              Analyze
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
