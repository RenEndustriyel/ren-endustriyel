"use client";

export type ExcelColumn<T> = {
  header: string;
  value: (row: T) => string | number | Date | null | undefined;
  width?: number;
  /** "money" | "qty" | "date" | "text" */
  type?: "money" | "qty" | "date" | "text";
};

export type ExcelSheet<T> = { name: string; columns: ExcelColumn<T>[]; rows: T[]; title?: string };

/** Farklı satır tipindeki sayfaları tek dosyada birleştirmek için */
export const sheet = <T,>(s: ExcelSheet<T>) => s as unknown as ExcelSheet<unknown>;

/** Tek veya çok sayfalı Excel dosyası indirir */
export async function exportExcel<T>(fileName: string, sheets: ExcelSheet<T>[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ren Endüstriyel";
  wb.created = new Date();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name.slice(0, 31));
    let startRow = 1;
    if (s.title) {
      ws.addRow([s.title]).font = { bold: true, size: 13 };
      ws.addRow([]);
      startRow = 3;
    }
    const header = ws.addRow(s.columns.map((c) => c.header));
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C3036" } };
      cell.alignment = { vertical: "middle" };
    });
    for (const r of s.rows) {
      ws.addRow(
        s.columns.map((c) => {
          const v = c.value(r);
          if (c.type === "date" && typeof v === "string" && v) return new Date(`${v.slice(0, 10)}T00:00:00`);
          return v ?? "";
        }),
      );
    }
    s.columns.forEach((c, i) => {
      const col = ws.getColumn(i + 1);
      col.width = c.width ?? (c.type === "money" ? 16 : c.type === "date" ? 12 : 24);
      if (c.type === "money") col.numFmt = "#,##0.00";
      if (c.type === "qty") col.numFmt = "#,##0.###";
      if (c.type === "date") col.numFmt = "dd.mm.yyyy";
    });
    ws.views = [{ state: "frozen", ySplit: startRow }];
    ws.autoFilter = { from: { row: startRow, column: 1 }, to: { row: startRow, column: s.columns.length } };
  }
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${fileName}.xlsx`);
}

/** Excel / CSV dosyasını başlık satırına göre nesne dizisine çevirir */
export async function readSpreadsheet(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  if (file.name.toLowerCase().endsWith(".csv")) {
    const text = await file.text();
    const sep = (text.split("\n")[0].match(/;/g)?.length ?? 0) > (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const split = (l: string) => {
      const out: string[] = [];
      let cur = "";
      let q = false;
      for (const ch of l) {
        if (ch === '"') q = !q;
        else if (ch === sep && !q) {
          out.push(cur);
          cur = "";
        } else cur += ch;
      }
      out.push(cur);
      return out.map((s) => s.trim());
    };
    const headers = split(lines[0]);
    return {
      headers,
      rows: lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [headers[i] ?? `Sütun ${i + 1}`, v]))),
    };
  }
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return { headers: [], rows: [] };
  // ilk dolu satırı başlık kabul et
  let headerRow = 1;
  for (let i = 1; i <= Math.min(ws.rowCount, 10); i++) {
    const vals = (ws.getRow(i).values as unknown[]).filter((v) => v !== null && v !== undefined && v !== "");
    if (vals.length >= 2) {
      headerRow = i;
      break;
    }
  }
  const cellText = (v: unknown): unknown => {
    if (v && typeof v === "object") {
      const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
      if (o.richText) return o.richText.map((r) => r.text).join("");
      if ("result" in o) return o.result;
      if (o.text) return o.text;
      if (v instanceof Date) return v;
    }
    return v;
  };
  const headers = (ws.getRow(headerRow).values as unknown[]).slice(1).map((h, i) => String(cellText(h) ?? `Sütun ${i + 1}`).trim());
  const rows: Record<string, unknown>[] = [];
  for (let i = headerRow + 1; i <= ws.rowCount; i++) {
    const vals = (ws.getRow(i).values as unknown[]).slice(1);
    if (!vals.some((v) => v !== null && v !== undefined && v !== "")) continue;
    rows.push(Object.fromEntries(headers.map((h, j) => [h, cellText(vals[j])])));
  }
  return { headers, rows };
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Excel hücre değerini sayıya çevirir ("1.234,56" dahil) */
export function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (v === null || v === undefined) return 0;
  const s = String(v).replace(/\s/g, "").replace(/[₺$€TL]/gi, "");
  if (!s) return 0;
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return Number.isFinite(n) ? n : 0;
}

/** Excel hücre değerini YYYY-MM-DD tarihine çevirir */
export function toIsoDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
