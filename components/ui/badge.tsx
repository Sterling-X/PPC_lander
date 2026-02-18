import type { ReactNode } from "react";

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "warning" | "error" }) {
  const color =
    tone === "warning"
      ? "bg-amber-100 text-amber-700"
      : tone === "error"
        ? "bg-rose-100 text-rose-700"
        : "bg-slate-100 text-slate-700";

  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>{children}</span>;
}
