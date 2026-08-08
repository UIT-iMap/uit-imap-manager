import { useMemo, useState, useRef, useEffect } from "react";
import Dialog from "./Dialog";
import FieldEditor from "./FieldEditor";
import Button from "./Button";
import { useData } from "../../contexts/dataContext";
import { type DataId, ON_BLUR_STATUS } from "../../lib/types";
import { isPopulated, isFixedArray } from "../../lib/utils/onBlurs";

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
  const [value, setValue] = useState<any>(
    row ? (row as any)[attribute ?? ""] : "",
  );
  const [feedback, setFeedback] = useState<{
    status: number;
    message: string;
  } | null>(null);
  const isSubmittedRef = useRef(false);

  const isOpen = attribute !== null && rowIdx !== null;

  useEffect(() => {
    if (isOpen) {
      isSubmittedRef.current = false;
    }
  }, [isOpen]);

  useMemo(() => {
    if (row && attribute) setValue((row as any)[attribute]);
    setFeedback(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attribute, rowIdx]);

  if (!isOpen || !rule || !row) return null;

  const handleDismiss = () => {
    // if (!isSubmittedRef.current) {
    //   if (!confirm("Changes may not be saved")) return;
    // }
    onClose();
  };

  const runValidation = (val: any): { status: number; message: string } => {
    if (!rule || !attribute || !row) {
      return { status: ON_BLUR_STATUS.SUCCESS, message: "" };
    }

    const currentRow = {
      ...row,
      [attribute]: val,
      _originalId: (row as any)[slice.rowIdKey],
    };

    let highestStatus: number = ON_BLUR_STATUS.SUCCESS;
    let message = "";

    if (rule.onBlurs && rule.onBlurs.length > 0) {
      for (const fn of rule.onBlurs) {
        const res = fn(currentRow, [attribute]);
        if (res.status === ON_BLUR_STATUS.FAIL) {
          highestStatus = ON_BLUR_STATUS.FAIL;
          message = res.message;
          break;
        }
        if (
          res.status === ON_BLUR_STATUS.WARNING &&
          highestStatus !== ON_BLUR_STATUS.FAIL
        ) {
          highestStatus = ON_BLUR_STATUS.WARNING;
          message = res.message;
        }
      }
      if (currentRow[attribute] !== val) {
        setValue(currentRow[attribute]);
      }
    } else {
      if (rule.isMandatory !== false && !isPopulated(val)) {
        highestStatus = ON_BLUR_STATUS.FAIL;
        message = `"${rule.label ?? rule.name}" is required.`;
      } else if (rule.type === "arr" && rule.fixedSize) {
        const isEmpty = !isPopulated(val);
        if (rule.isMandatory === false && isEmpty) {
          // Allowed empty
        } else if (!isFixedArray(val, rule.fixedSize)) {
          highestStatus = ON_BLUR_STATUS.FAIL;
          message = `"${rule.label ?? rule.name}" must have exactly ${rule.fixedSize} values.`;
        }
      }
    }

    const result = { status: highestStatus, message };
    setFeedback(highestStatus === ON_BLUR_STATUS.SUCCESS ? null : result);
    return result;
  };

  const handleOk = (close: () => void) => {
    const res = runValidation(value);
    if (res.status === ON_BLUR_STATUS.FAIL) {
      return;
    }

    isSubmittedRef.current = true;
    slice.editRow?.(attribute!, rowIdx!, value);
    close();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleDismiss}
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
            <FieldEditor
              rule={rule}
              value={value}
              onChange={setValue}
              onBlur={() => runValidation(value)}
            />
            {feedback && feedback.message && (
              <p
                className={`mt-1.5 text-xs ${
                  feedback.status === ON_BLUR_STATUS.FAIL
                    ? "text-rose-500"
                    : "text-amber-500"
                }`}
              >
                {feedback.message}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={handleDismiss}>
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
