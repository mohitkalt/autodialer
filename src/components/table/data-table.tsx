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
  /**
   * Caps table body height near the viewport so long lists scroll inside the card
   * instead of stretching the page. Sticky header inside the scroll region.
   */
  boundedScroll?: boolean;
  /** Optional classes merged into the horizontal (and vertical when `boundedScroll`) scroll wrapper. */
  scrollClassName?: string;
  /** Left accent stripe for monitoring panels. */
  accent?: "none" | "emerald" | "amber";
};

export default function DataTable<T extends { id: number | string }>({
  title,
  columns,
  rows,
  emptyText = "No rows found.",
  boundedScroll = false,
  scrollClassName,
  accent = "none",
}: DataTableProps<T>) {
  const { isDark } = useTheme();

  const shell = isDark
    ? "rounded-xl border border-zinc-800 bg-zinc-900"
    : "rounded-xl border border-zinc-200 bg-white shadow-sm";
  const titleBar = isDark
    ? "border-b border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-200"
    : "border-b border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-900";
  const theadBase = boundedScroll
    ? isDark
      ? "bg-zinc-950 text-zinc-400"
      : "bg-zinc-50 text-zinc-600"
    : isDark
      ? "bg-zinc-950/60 text-zinc-400"
      : "bg-zinc-50 text-zinc-600";
  const thead = `${theadBase} ${boundedScroll ? "sticky top-0 z-[1] shadow-[0_1px_0_0_rgba(0,0,0,0.06)]" : ""}`;
  const rowBorder = isDark ? "border-t border-zinc-800 text-zinc-200" : "border-t border-zinc-200 text-zinc-800";
  const emptyCell = isDark ? "text-zinc-400" : "text-zinc-500";

  const accentClass =
    accent === "emerald"
      ? "border-l-4 border-l-emerald-500"
      : accent === "amber"
        ? "border-l-4 border-l-amber-500"
        : "";

  const sectionClass = boundedScroll
    ? `flex min-h-0 flex-col overflow-hidden ${shell} ${accentClass}`
    : `${shell} ${accentClass}`;

  const scrollViewportClass = boundedScroll
    ? ["min-h-0 max-h-[min(62vh,520px)] overflow-x-auto overflow-y-auto overscroll-contain", scrollClassName].filter(Boolean).join(" ")
    : ["overflow-x-auto", scrollClassName].filter(Boolean).join(" ");

  return (
    <section className={sectionClass}>
      {title && <div className={`${titleBar} ${boundedScroll ? "shrink-0" : ""}`}>{title}</div>}
      <div className={scrollViewportClass}>
        <table className="min-w-full text-left text-sm">
          <thead className={thead}>
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className="whitespace-nowrap px-4 py-3 font-medium">
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
                    <td key={String(column.key)} className="whitespace-nowrap px-4 py-3 align-middle">
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
