import { TextareaHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={clsx("w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900", "focus:outline-none focus:ring-2 focus:ring-slate-900", className)}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
