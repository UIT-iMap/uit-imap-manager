import { Plus, Trash2 } from "lucide-react";
import type { TableRule } from "../../lib/types";

interface FieldEditorProps {
  rule: TableRule;
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
}

export default function FieldEditor({
  rule,
  value,
  onChange,
  onBlur,
}: FieldEditorProps) {
  const type = rule.type ?? "text";

  if (rule.values && rule.values.length > 0) {
    return (
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400"
      >
        <option value="">-- select --</option>
        {rule.values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  }

  if (type === "arr") {
    const arr: any[] = Array.isArray(value) ? value : [];
    const canAdd = !rule.fixedSize || arr.length < rule.fixedSize;
    const canRemove = !rule.fixedSize || rule.isMandatory === false;

    const updateItem = (idx: number, v: string) => {
      const next = [...arr];
      next[idx] = v;
      onChange(next);
    };
    const removeItem = (idx: number) => {
      const next = arr.filter((_, i) => i !== idx);
      onChange(next);
      onBlur?.();
    };
    const addItem = () => onChange([...arr, ""]);

    return (
      <div className="space-y-2">
        {arr.length === 0 && (
          <p className="text-xs text-slate-400">No items yet.</p>
        )}
        {arr.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              value={item ?? ""}
              onChange={(e) => updateItem(idx, e.target.value)}
              onBlur={onBlur}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-sky-400"
              placeholder={`Item ${idx + 1}`}
            />
            {canRemove && (
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="cursor-pointer rounded-md p-1.5 text-rose-500 transition-all hover:bg-rose-50 hover:scale-95 active:scale-90"
                title="Remove item"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
        {canAdd && (
          <button
            type="button"
            onClick={addItem}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition-all hover:bg-slate-50 hover:scale-95 active:scale-90"
          >
            <Plus size={14} /> Add item
          </button>
        )}
      </div>
    );
  }

  return (
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      rows={3}
      className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400"
    />
  );
}
