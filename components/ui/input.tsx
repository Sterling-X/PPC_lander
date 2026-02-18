import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={clsx(
        "h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900",
        "focus:outline-none focus:ring-2 focus:ring-slate-900",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
