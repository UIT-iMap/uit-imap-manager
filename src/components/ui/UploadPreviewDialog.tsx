import { useState, useEffect } from "react";
import Dialog from "./Dialog";
import Button from "./Button";
import type { UploadPreviewRow } from "../../lib/types";

interface UploadPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rows: UploadPreviewRow[];
  onConfirm: (checkedRows: UploadPreviewRow[]) => void;
  error?: string | null;
}

export default function UploadPreviewDialog({
  isOpen,
  onClose,
  rows,
  onConfirm,
  error,
}: UploadPreviewDialogProps) {
  const [localRows, setLocalRows] = useState<UploadPreviewRow[]>(rows);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const allChecked = localRows.length > 0 && localRows.every((r) => r.checked);

  const toggleAll = () => {
    setLocalRows((prev) => prev.map((r) => ({ ...r, checked: !allChecked })));
  };

  const toggleOne = (idx: number) => {
    setLocalRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, checked: !r.checked } : r))
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Preview"
      widthClass="max-w-2xl"
    >
      {(close) => (
        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error}
            </div>
          )}
          {!error && (
            <>
              <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="w-10 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={toggleAll}
                          className="cursor-pointer accent-sky-400"
                        />
                      </th>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Name / Endpoints</th>
                      <th className="px-3 py-2">Existence Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localRows.map((r, idx) => (
                      <tr key={r.id + idx} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={r.checked}
                            onChange={() => toggleOne(idx)}
                            className="cursor-pointer accent-sky-400"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">
                          {r.id}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {r.extraLabel ?? r.name}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.exists
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {r.exists ? "Will overwrite" : "New"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {localRows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                          No rows parsed.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={() => { close(); onClose(); }}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    onConfirm(localRows.filter((r) => r.checked));
                    close();
                    onClose();
                  }}
                >
                  OK
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
