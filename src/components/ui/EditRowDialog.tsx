import { useEffect, useState } from "react";
import Dialog from "./Dialog";
import FieldEditor from "./FieldEditor";
import Button from "./Button";
import { useData } from "../../contexts/dataContext";
import type { DataId } from "../../lib/types";
import {
  isValidMandatory,
  isUniqueValue,
  isValidFixedArray,
} from "../../lib/utils/validator";

interface EditRowDialogProps {
  dataId: DataId;
  rowIdx: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (row: Record<string, any>) => void;
}

export default function EditRowDialog({
  dataId,
  rowIdx,
  isOpen,
  onClose,
  onSuccess,
}: EditRowDialogProps) {
  const data = useData();
  const slice = data[dataId];

  const targetRow = rowIdx !== null && slice?.data ? slice.data[rowIdx] : null;

  const [row, setRow] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && targetRow) {
      setRow({ ...targetRow });
      setErrors({});
    }
  }, [isOpen, targetRow]);

  if (!isOpen || rowIdx === null || !targetRow) return null;

  const visibleRules = slice.tableRules.filter((r) => r.isShow !== false);

  const setField = (name: string, value: any) => {
    setRow((prev) => ({ ...prev, [name]: value }));
  };

  const handleOk = (close: () => void) => {
    const newErrors: Record<string, string> = {};
    for (const rule of visibleRules) {
      const val = row[rule.name];
      if (rule.isMandatory !== false && !isValidMandatory(val)) {
        newErrors[rule.name] = `"${rule.label ?? rule.name}" is required.`;
        continue;
      }
      if (rule.type === "arr" && rule.fixedSize && val !== undefined) {
        if (!isValidFixedArray(val, rule.fixedSize)) {
          newErrors[rule.name] =
            `"${rule.label ?? rule.name}" must have exactly ${rule.fixedSize} values.`;
        }
      }
      if (rule.name === slice.rowIdKey) {
        const existing = slice.data
          .filter((_, idx) => idx !== rowIdx)
          .map((r) => (r as any)[slice.rowIdKey]);
        if (!isUniqueValue(val, existing)) {
          newErrors[rule.name] = `"${val}" already exists. Must be unique.`;
        }
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    slice.editRowFields?.(rowIdx, row);
    onSuccess?.(row);
    close();
    onClose();
  };

  const dialogTitle =
    dataId === "hotspots"
      ? "Edit Hotspot Details"
      : dataId === "tourspots"
        ? "Edit Tourspot Details"
        : `Edit ${dataId} Details`;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={dialogTitle}
      widthClass="max-w-xl"
    >
      {(close) => (
        <div className="space-y-4">
          {visibleRules.map((rule) => (
            <div key={rule.name}>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                {rule.label ?? rule.name}
                {rule.isMandatory !== false && (
                  <span className="ml-0.5 text-rose-500">*</span>
                )}
              </label>
              <FieldEditor
                rule={rule}
                value={row[rule.name]}
                onChange={(v) => setField(rule.name, v)}
              />
              {errors[rule.name] && (
                <p className="mt-1.5 text-xs text-rose-500">
                  {errors[rule.name]}
                </p>
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={() => {
                close();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={() => handleOk(close)}>
              OK
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
