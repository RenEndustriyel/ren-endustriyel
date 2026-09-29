"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./card";
import { EmptyState } from "./empty-state";
import { Skeleton } from "./skeleton";
import { Button } from "./button";

export type Column<T> = {
  key?: string;
  id?: string;
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
  rows: rowsProp,
  data: dataProp,
  columns,
  rowKey: rowKeyProp,
  idKey,
  onRowClick,
  mobileRow,
  loading,
  empty,
  emptyMessage,
  pageSize = 50,
  footer,
  initialSort,
}: {
  rows?: T[];
  data?: T[];
  columns: Column<T>[];
  rowKey?: (row: T) => string;
  idKey?: keyof T | ((row: T) => string);
  onRowClick?: (row: T) => void;
  mobileRow?: (row: T) => React.ReactNode;
  loading?: boolean;
  empty?: React.ReactNode;
  emptyMessage?: string;
  pageSize?: number;
  footer?: React.ReactNode;
  initialSort?: { key: string; dir: "asc" | "desc" };
}) {
  const rows = rowsProp ?? dataProp;
  const rowKey: (row: T) => string =
    rowKeyProp ??
    ((row: T) => {
      if (typeof idKey === "function") return idKey(row);
      if (idKey && (row as Record<string, unknown>)[idKey as string] !== undefined) {
        return String((row as Record<string, unknown>)[idKey as string]);
      }
      if ((row as Record<string, unknown>)?.id !== undefined) {
        return String((row as Record<string, unknown>).id);
      }
      return String(Math.random());
    });
  const emptyContent = empty ?? (emptyMessage ? <div className="p-8 text-center text-sm text-muted">{emptyMessage}</div> : null);
  const [limit, setLimit] = React.useState(pageSize);
  const [sort, setSort] = React.useState(initialSort);

  const getSortVal = React.useCallback((col: Column<T>, row: T) => {
    if (col.sortValue) return col.sortValue(row);
    const r = row as any;
    const k = col.key ?? col.id ?? "";
    const val = k ? r?.[k] : undefined;
    if (val !== undefined && val !== null) return val;
    if (k === "party" || k === "p" || k === "name" || k === "n") {
      return r?.contact?.name ?? r?.name ?? r?.party ?? r?.description ?? "";
    }
    if (k === "date" || k === "d") {
      return r?.issue_date ?? r?.txn_date ?? r?.movement_date ?? r?.date ?? r?.entry_date ?? "";
    }
    if (k === "total" || k === "amt") {
      return Number(r?.total_try ?? r?.total ?? r?.amount_try ?? r?.amount ?? 0);
    }
    if (k === "balance" || k === "b") {
      return Number(r?.balance ?? 0);
    }
    if (k === "in" || k === "debit") {
      return Number(r?.amount_in ?? r?.debit ?? 0);
    }
    if (k === "out" || k === "credit") {
      return Number(r?.amount_out ?? r?.credit ?? 0);
    }
    return undefined;
  }, []);

  const sorted = React.useMemo(() => {
    if (!rows || !sort) return rows ?? [];
    const col = columns.find((c, ci) => (c.key ?? c.id ?? String(ci)) === sort.key);
    if (!col) return rows;
    return [...rows].sort((a, b) => {
      const va = getSortVal(col, a) ?? "";
      const vb = getSortVal(col, b) ?? "";
      if (typeof va === "number" && typeof vb === "number") {
        return sort.dir === "asc" ? va - vb : vb - va;
      }
      const numA = Number(va);
      const numB = Number(vb);
      if (!isNaN(numA) && !isNaN(numB) && typeof va !== "string") {
        return sort.dir === "asc" ? numA - numB : numB - numA;
      }
      const r = String(va).localeCompare(String(vb), "tr", { numeric: true, sensitivity: "base" });
      return sort.dir === "asc" ? r : -r;
    });
  }, [rows, sort, columns, getSortVal]);

  if (loading && !rows) {
    return (
      <Card className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </Card>
    );
  }
  if (!sorted.length) return <Card>{emptyContent ?? <EmptyState title="Kayıt bulunamadı" />}</Card>;

  const visible = sorted.slice(0, limit);
  const hide = (c: Column<T>) =>
    c.hideBelow === "md" ? "hidden md:table-cell" : c.hideBelow === "lg" ? "hidden lg:table-cell" : c.hideBelow === "xl" ? "hidden xl:table-cell" : "";
  const align = (c: Column<T>) => (c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left");

  return (
    <Card className="overflow-hidden">
      {/* masaüstü / tablet */}
      <div className={cn("thin-scroll overflow-x-auto", mobileRow && "hidden sm:block")}>
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-muted border-b border-border">
            <tr>
              {columns.map((c, ci) => {
                const k = c.key ?? c.id ?? String(ci);
                const isSortable = c.sortValue !== undefined || (k !== "actions" && k !== "action");
                const isCurrentSort = sort?.key === k;
                return (
                  <th key={k} className={cn("whitespace-nowrap px-4 py-2.5 font-semibold select-none", align(c), hide(c), c.className)}>
                    {isSortable ? (
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-1.5 transition-colors hover:text-text",
                          isCurrentSort ? "font-bold text-primary" : "hover:text-text",
                          c.align === "right" && "ml-auto"
                        )}
                        onClick={() =>
                          setSort((s) => (s?.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "asc" }))
                        }
                      >
                        <span>{c.header}</span>
                        {isCurrentSort ? (
                          sort?.dir === "asc" ? (
                            <ChevronUp className="size-3.5 stroke-[2.5]" />
                          ) : (
                            <ChevronDown className="size-3.5 stroke-[2.5]" />
                          )
                        ) : (
                          <span className="opacity-0 hover:opacity-50 text-[10px]">↕</span>
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && "cursor-pointer hover:bg-surface-2")}
              >
                {columns.map((c, ci) => (
                  <td key={c.key ?? c.id ?? String(ci)} className={cn("px-4 py-2.5", align(c), hide(c), c.className)}>
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
