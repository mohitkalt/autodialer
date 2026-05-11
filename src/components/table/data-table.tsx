"use client";

/** Generic typed table with optional title row — styling follows dashboard theme (dark/light). */
import { useTheme } from "@/components/theme-provider";

type ColumnDef<T> = {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
};

type DataTableProps<T extends { id: number | string }> = {
  title?: string;
  columns: ColumnDef<T>[];
  rows: T[];
  emptyText?: string;
};

export default function DataTable<T extends { id: number | string }>({
  title,
  columns,
  rows,
  emptyText = "No rows found.",
}: DataTableProps<T>) {
  const { isDark } = useTheme();

  const shell = isDark
    ? "rounded-xl border border-zinc-800 bg-zinc-900"
    : "rounded-xl border border-zinc-200 bg-white shadow-sm";
  const titleBar = isDark
    ? "border-b border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-200"
    : "border-b border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-900";
  const thead = isDark ? "bg-zinc-950/60 text-zinc-400" : "bg-zinc-50 text-zinc-600";
  const rowBorder = isDark ? "border-t border-zinc-800 text-zinc-200" : "border-t border-zinc-200 text-zinc-800";
  const emptyCell = isDark ? "text-zinc-400" : "text-zinc-500";

  return (
    <section className={shell}>
      {title && <div className={titleBar}>{title}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className={thead}>
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className="px-4 py-3 font-medium">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className={`px-4 py-4 ${emptyCell}`} colSpan={columns.length}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className={rowBorder}>
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-4 py-3 align-top">
                      {column.render ? column.render(row[column.key], row) : String(row[column.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
