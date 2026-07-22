import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  icon?: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-sky-400 text-white hover:bg-sky-500 active:bg-sky-600",
  secondary:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 active:bg-slate-200",
  danger: "bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200",
};

export default function Button({
  children,
  variant = "secondary",
  icon,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-100 hover:scale-99 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
