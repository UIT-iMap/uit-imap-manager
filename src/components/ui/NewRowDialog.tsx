import { useEffect, useState, useRef } from "react";
import Dialog from "./Dialog";
import FieldEditor from "./FieldEditor";
import Button from "./Button";
import { useData } from "../../contexts/dataContext";
import { type DataId, ON_BLUR_STATUS } from "../../lib/types";
import { isPopulated, isFixedArray, isArrayEmpty } from "../../lib/utils/onBlurs";
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
  const [fieldFeedbacks, setFieldFeedbacks] = useState<
    Record<string, { status: number; message: string }>
  >({});
  const isSubmittedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      isSubmittedRef.current = false;
      const baseRow = emptyRow(initialValues);
      if (!baseRow.id && (dataId === "hotspots" || dataId === "rooms")) {
        const existingIds = slice?.data?.map((r: any) => r[slice?.rowIdKey]) ?? [];
        baseRow.id = genId(existingIds);
      }
      setRow(baseRow);
      setFieldFeedbacks({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

    const targetRowObj = { ...currentRowState };

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
    slice.addRow?.(row as any);
    onSuccess?.(row as any);
    close();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleDismiss}
      title={`Add New Row`}
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
