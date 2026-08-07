import React, { type ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface HoverMenuItem {
  label: string;
  icon?: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  variant?: "default" | "danger" | "warning";
  title?: string;
  subMenu?: ReactNode;
}

interface HoverMenuProps {
  items?: HoverMenuItem[];
  children?: ReactNode;
  className?: string;
}

export default function HoverMenu({ items, children, className }: HoverMenuProps) {
  return (
    <div
      className={cn(
        "absolute bottom-full pb-2 hidden group-hover:flex flex-col items-center z-50 pointer-events-auto",
        className,
      )}
    >
      <div className="flex items-center gap-1 rounded-xl bg-white/95 p-1.5 shadow-xl backdrop-blur-md text-xs text-slate-800 whitespace-nowrap flex-nowrap">
        {items?.map((item, idx) => {
          const isDanger = item.variant === "danger";
          return (
            <React.Fragment key={idx}>
              {item.subMenu ? (
                item.subMenu
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onClick?.(e);
                  }}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0",
                    isDanger
                      ? "hover:bg-rose-50 text-rose-600 hover:text-rose-700"
                      : "hover:bg-slate-100 text-slate-700 hover:text-slate-900",
                  )}
                  title={item.title ?? item.label}
                >
                  {item.icon}
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              )}
            </React.Fragment>
          );
        })}
        {children}
      </div>
    </div>
  );
}
