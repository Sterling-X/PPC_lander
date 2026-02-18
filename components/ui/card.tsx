import { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <section className={clsx("rounded-2xl border border-slate-200 bg-white p-4 shadow-card", className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={clsx("mb-4 border-b border-slate-100 pb-3 text-lg font-semibold", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={clsx("space-y-3", className)} {...props} />;
}
