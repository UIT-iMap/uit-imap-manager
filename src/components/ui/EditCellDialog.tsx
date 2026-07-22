import { useMemo, useState } from "react";
import Dialog from "./Dialog";
import FieldEditor from "./FieldEditor";
import Button from "./Button";
import { useData } from "../../contexts/dataContext";
import type { DataId } from "../../lib/types";
import { isValidMandatory, isUniqueValue, isValidFixedArray } from "../../lib/utils/validator";

interface EditCellDialogProps {
  dataId: DataId;
  attribute: string | null;
  rowIdx: number | null;
  onClose: () => void;
}

export default function EditCellDialog({
  dataId,
  attribute,
  rowIdx,
  onClose,
}: EditCellDialogProps) {
  const data = useData();
  const slice = data[dataId];
  const rule = slice.tableRules.find((r) => r.name === attribute);
  const row = rowIdx !== null ? slice.data[rowIdx] : null;
  const [value, setValue] = useState<any>(row ? (row as any)[attribute ?? ""] : "");
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const isOpen = attribute !== null && rowIdx !== null;

  useMemo(() => {
    if (row && attribute) setValue((row as any)[attribute]);
    setError(null);
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attribute, rowIdx]);

  if (!isOpen || !rule || !row) return null;

  const handleOk = (close: () => void) => {
    if (rule.isMandatory !== false && !isValidMandatory(value)) {
      setError(`"${rule.label ?? rule.name}" is required.`);
      setTouched(true);
      return;
    }
    if (rule.type === "arr" && rule.fixedSize && !isValidFixedArray(value, rule.fixedSize)) {
      setError(`"${rule.label ?? rule.name}" must have exactly ${rule.fixedSize} values.`);
      setTouched(true);
      return;
    }
    if (rule.name === slice.rowIdKey) {
      const existing = slice.data
        .filter((_, i) => i !== rowIdx)
        .map((r) => (r as any)[slice.rowIdKey]);
      if (!isUniqueValue(value, existing)) {
        setError(`"${value}" already exists. ${rule.label ?? rule.name} must be unique.`);
        setTouched(true);
        return;
      }
    }
    slice.editRow?.(attribute!, rowIdx!, value);
    close();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit "${rule.label ?? rule.name}"`}
    >
      {(close) => (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              {rule.label ?? rule.name}
              {rule.isMandatory !== false && (
                <span className="ml-0.5 text-rose-500">*</span>
              )}
            </label>
            <FieldEditor rule={rule} value={value} onChange={setValue} />
            {touched && error && (
              <p className="mt-1.5 text-xs text-rose-500">{error}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => { close(); onClose(); }}>
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
