import { HTMLAttributes } from "react";

export function DataTable({ children, className }: HTMLAttributes<HTMLTableElement>): JSX.Element {
  return <table className={`min-w-full divide-y divide-slate-200 text-sm ${className ?? ""}`}>{children}</table>;
}

export function Th({ children, className }: HTMLAttributes<HTMLElement>): JSX.Element {
  return <th className={`px-3 py-2 text-left font-semibold text-slate-700 ${className ?? ""}`}>{children}</th>;
}

export function Td({ children, className }: HTMLAttributes<HTMLElement>): JSX.Element {
  return <td className={`px-3 py-2 align-top ${className ?? ""}`}>{children}</td>;
}

export function Tr({ children, className }: HTMLAttributes<HTMLTableRowElement>): JSX.Element {
  return <tr className={className}>{children}</tr>;
}
