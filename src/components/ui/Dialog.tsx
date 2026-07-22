import { useState, type ReactNode } from "react";
import { X } from "lucide-react";

interface DialogProps {
  /** Renders the element(s) that open the dialog. Optional when using controlled mode. */
  trigger?: (open: () => void) => ReactNode;
  title?: string;
  children: (close: () => void) => ReactNode;
  widthClass?: string;
  /** Controlled mode: parent owns open state (e.g. Table double-click). */
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Dialog({
  trigger,
  title,
  children,
  widthClass = "max-w-lg",
  isOpen: controlledOpen,
  onClose: controlledClose,
}: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const open = () => setInternalOpen(true);
  const close = () => (isControlled ? controlledClose?.() : setInternalOpen(false));

  return (
    <>
      {trigger?.(open)}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className={`w-full ${widthClass} max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-xl`}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
              <h2 className="text-base font-semibold text-slate-800">
                {title}
              </h2>
              <button
                onClick={close}
                className="cursor-pointer rounded-md p-1 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800 hover:scale-95 active:scale-90"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">{children(close)}</div>
          </div>
        </div>
      )}
    </>
  );
}
