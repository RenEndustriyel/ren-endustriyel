"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./card";
import { EmptyState } from "./empty-state";
import { Skeleton } from "./skeleton";
import { Button } from "./button";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  /** sıralama için değer */
  sortValue?: (row: T) => string | number | null | undefined;
  /** tablet altında gizle */
  hideBelow?: "md" | "lg" | "xl";
};

/**
 * Masaüstünde tablo, telefonda kart listesi.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  mobileRow,
  loading,
  empty,
  pageSize = 50,
  footer,
  initialSort,
}: {
  rows: T[] | undefined;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  mobileRow?: (row: T) => React.ReactNode;
  loading?: boolean;
  empty?: React.ReactNode;
  pageSize?: number;
  footer?: React.ReactNode;
  initialSort?: { key: string; dir: "asc" | "desc" };
}) {
  const [limit, setLimit] = React.useState(pageSize);
  const [sort, setSort] = React.useState(initialSort);

  const sorted = React.useMemo(() => {
    if (!rows || !sort) return rows ?? [];
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const va = get(a) ?? "";
      const vb = get(b) ?? "";
      const r = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "tr");
      return sort.dir === "asc" ? r : -r;
    });
  }, [rows, sort, columns]);

  if (loading && !rows) {
    return (
      <Card className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </Card>
    );
  }
  if (!sorted.length) return <Card>{empty ?? <EmptyState title="Kayıt bulunamadı" />}</Card>;

  const visible = sorted.slice(0, limit);
  const hide = (c: Column<T>) =>
    c.hideBelow === "md" ? "hidden md:table-cell" : c.hideBelow === "lg" ? "hidden lg:table-cell" : c.hideBelow === "xl" ? "hidden xl:table-cell" : "";
  const align = (c: Column<T>) => (c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left");

  return (
    <Card className="overflow-hidden">
      {/* masaüstü / tablet */}
      <div className={cn("thin-scroll overflow-x-auto", mobileRow && "hidden sm:block")}>
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cn("whitespace-nowrap px-4 py-2.5 font-semibold", align(c), hide(c), c.className)}>
                  {c.sortValue ? (
                    <button
                      className="inline-flex items-center gap-1 hover:text-text"
                      onClick={() =>
                        setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "asc" }))
                      }
                    >
                      {c.header}
                      {sort?.key === c.key && (sort.dir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && "cursor-pointer hover:bg-surface-2")}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-2.5", align(c), hide(c), c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && <tfoot className="border-t border-border bg-surface-2 font-semibold">{footer}</tfoot>}
        </table>
      </div>

      {/* telefon */}
      {mobileRow && (
        <ul className="divide-y divide-border sm:hidden">
          {visible.map((row) => (
            <li key={rowKey(row)}>
              <button
                type="button"
                disabled={!onRowClick}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className="block w-full px-4 py-3 text-left active:bg-surface-2"
              >
                {mobileRow(row)}
              </button>
            </li>
          ))}
        </ul>
      )}

      {sorted.length > limit && (
        <div className="border-t border-border p-3 text-center">
          <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + pageSize)}>
            Daha fazla göster ({sorted.length - limit})
          </Button>
        </div>
      )}
    </Card>
  );
}
