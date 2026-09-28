import { supabase } from "@/lib/supabase/client";

export const BACKUP_TABLES = [
  "organizations",
  "memberships",
  "profiles",
  "number_series",
  "categories",
  "tags",
  "units",
  "warehouses",
  "price_lists",
  "price_list_items",
  "contacts",
  "contact_addresses",
  "products",
  "product_units",
  "product_stocks",
  "stock_movements",
  "stock_transfers",
  "stock_counts",
  "documents",
  "document_lines",
  "payment_allocations",
  "accounts",
  "transactions",
  "cheques",
  "cheque_events",
  "bank_statement_imports",
  "bank_statement_lines",
  "employees",
  "payroll_items",
  "reminders",
  "calendar_events",
] as const;

export interface BackupData {
  version: string;
  exportedAt: string;
  app: string;
  orgId: string;
  orgName?: string;
  counts: Record<string, number>;
  totalRecords: number;
  tables: Record<string, unknown[]>;
}

/**
 * Aktif oturum ve firma kapsamında tüm tabloların verilerini çeker
 */
export async function createFullBackup(
  orgId: string,
  orgName?: string,
  onProgress?: (currentTable: string, step: number, total: number) => void,
): Promise<BackupData> {
  const result: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  let totalRecords = 0;

  const total = BACKUP_TABLES.length;

  for (let i = 0; i < total; i++) {
    const table = BACKUP_TABLES[i];
    onProgress?.(table, i + 1, total);

    try {
      const client = supabase as any;
      let query = client.from(table).select("*");

      // org_id sütununa sahip tablolarda sadece mevcut firmayı filtrele
      // profiles hariç (profiles tablosunda id user id'dir)
      if (table !== "profiles" && table !== "organizations") {
        query = query.eq("org_id", orgId);
      } else if (table === "organizations") {
        query = query.eq("id", orgId);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        result[table] = data;
        counts[table] = data.length;
        totalRecords += data.length;
      } else {
        result[table] = [];
        counts[table] = 0;
      }
    } catch {
      result[table] = [];
      counts[table] = 0;
    }
  }

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    app: "Ren Endüstriyel Ön Muhasebe",
    orgId,
    orgName,
    counts,
    totalRecords,
    tables: result,
  };
}

/**
 * Oluşturulan yedeği istemcide dosya olarak indirir
 */
export function downloadBackupJson(backup: BackupData, filename?: string) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const name = filename || `Ren_Yedek_${backup.orgName ? backup.orgName.replace(/\s+/g, "_") : "Firma"}_${dateStr}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
