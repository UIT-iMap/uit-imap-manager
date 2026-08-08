import { useEffect, useState, useRef } from "react";
import Dialog from "./Dialog";
import FieldEditor from "./FieldEditor";
import Button from "./Button";
import { useData } from "../../contexts/dataContext";
import { type DataId, ON_BLUR_STATUS } from "../../lib/types";
import { isPopulated, isFixedArray, isArrayEmpty } from "../../lib/utils/onBlurs";

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
  const [fieldFeedbacks, setFieldFeedbacks] = useState<
    Record<string, { status: number; message: string }>
  >({});
  const isSubmittedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      isSubmittedRef.current = false;
      if (targetRow) {
        setRow({ ...targetRow });
        setFieldFeedbacks({});
      }
    }
  }, [isOpen, targetRow]);

  if (!isOpen || rowIdx === null || !targetRow) return null;

  const visibleRules = slice.tableRules.filter((r) => r.isShow !== false);

  const setField = (name: string, value: any) => {
    setRow((prev) => ({ ...prev, [name]: value }));
  };

  const handleDismiss = () => {
    if (!isSubmittedRef.current) {
      if (!confirm("Changes may not be saved")) return;
    }
    onClose();
  };

  const validateField = (
    name: string,
    currentRowState: Record<string, any>,
  ): { status: number; message: string } => {
    const rule = visibleRules.find((r) => r.name === name);
    if (!rule) return { status: ON_BLUR_STATUS.SUCCESS, message: "" };

    const targetRowObj: Record<string, any> = {
      ...currentRowState,
      _originalId: targetRow ? (targetRow as any)[slice.rowIdKey] : undefined,
    };

    let highestStatus: number = ON_BLUR_STATUS.SUCCESS;
    let message = "";

    if (rule.onBlurs && rule.onBlurs.length > 0) {
      for (const fn of rule.onBlurs) {
        const res = fn(targetRowObj, [name]);
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
      if (targetRowObj[name] !== currentRowState[name]) {
        setRow((prev) => ({ ...prev, [name]: targetRowObj[name] }));
      }
    } else {
      const val = currentRowState[name];
      if (rule.isMandatory !== false && !isPopulated(val)) {
        highestStatus = ON_BLUR_STATUS.FAIL;
        message = `"${rule.label ?? rule.name}" is required.`;
      } else if (rule.type === "arr" && rule.fixedSize) {
        const isEmpty = isArrayEmpty(val);
        if (rule.isMandatory === false && isEmpty) {
          // Allowed empty
        } else if (!isFixedArray(val, rule.fixedSize)) {
          highestStatus = ON_BLUR_STATUS.FAIL;
          message = `"${rule.label ?? rule.name}" must have exactly ${rule.fixedSize} values.`;
        }
      }
    }

    const result = { status: highestStatus, message };
    setFieldFeedbacks((prev) => ({
      ...prev,
      [name]: result,
    }));
    return result;
  };

  const handleOk = (close: () => void) => {
    let hasFail = false;
    const newFeedbacks: Record<string, { status: number; message: string }> = {};

    for (const rule of visibleRules) {
      const res = validateField(rule.name, row);
      newFeedbacks[rule.name] = res;
      if (res.status === ON_BLUR_STATUS.FAIL) {
        hasFail = true;
      }
    }

    setFieldFeedbacks(newFeedbacks);
    if (hasFail) {
      return;
    }

    isSubmittedRef.current = true;
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
      onClose={handleDismiss}
      title={dialogTitle}
      widthClass="max-w-xl"
    >
      {(close) => (
        <div className="space-y-4">
          {visibleRules.map((rule) => {
            const feedback = fieldFeedbacks[rule.name];
            return (
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
                  onBlur={() => validateField(rule.name, row)}
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
            );
          })}
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
