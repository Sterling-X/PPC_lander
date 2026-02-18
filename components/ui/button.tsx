import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
};

export function Button({ variant = "primary", className, ...props }: ButtonProps): JSX.Element {
  const base = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition shadow-sm";
  const style =
    variant === "outline"
      ? "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
      : variant === "ghost"
        ? "bg-transparent text-slate-700 hover:bg-slate-100"
        : "bg-slate-900 text-white hover:bg-slate-800";

  return <button className={clsx(base, style, className)} {...props} />;
}
