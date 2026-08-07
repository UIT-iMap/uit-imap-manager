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
import { genId } from "../../lib/utils/genId";

interface NewRowDialogProps {
  dataId: DataId;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (row: Record<string, any>) => void;
  /**
   * Optional values to seed the new row with (e.g. a dataPosition/dataNormal captured
   * from a click on the 3D model, or a first/second hotspot id for a new edge).
   * These are merged into the row even for fields that aren't shown as editable inputs.
   */
  initialValues?: Record<string, any>;
}

function emptyRow(initialValues?: Record<string, any>): Record<string, any> {
  return { ...(initialValues ?? {}) };
}

export default function NewRowDialog({
  dataId,
  isOpen,
  onClose,
  onSuccess,
  initialValues,
}: NewRowDialogProps) {
  const data = useData();
  const slice = data[dataId];
  const [row, setRow] = useState<Record<string, any>>(() =>
    emptyRow(initialValues),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      const baseRow = emptyRow(initialValues);
      if (!baseRow.id && (dataId === "hotspots" || dataId === "rooms")) {
        const existingIds = slice?.data?.map((r: any) => r[slice?.rowIdKey]) ?? [];
        baseRow.id = genId(existingIds);
      }
      setRow(baseRow);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
        const existing = slice.data.map((r) => (r as any)[slice.rowIdKey]);
        if (!isUniqueValue(val, existing)) {
          newErrors[rule.name] = `"${val}" already exists. Must be unique.`;
        }
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    slice.addRow?.(row as any);
    onSuccess?.(row as any);
    close();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Add New Row`}
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
