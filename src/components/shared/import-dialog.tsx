"use client";

import * as React from "react";
import { FileSpreadsheet, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { exportExcel, readSpreadsheet } from "@/lib/excel";
import { cn } from "@/lib/utils";

export type ImportField = {
  key: string;
  label: string;
  required?: boolean;
  /** otomatik eşleştirme için başlık alternatifleri */
  aliases?: string[];
  example?: string | number;
};

const norm = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]/g, "");

/**
 * Excel/CSV içe aktarma: dosya seç → sütun eşleştir → önizle → aktar
 */
export function ImportDialog({
  open,
  onOpenChange,
  title,
  fields,
  templateName,
  onImport,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  fields: ImportField[];
  templateName: string;
  onImport: (rows: Record<string, unknown>[]) => Promise<number>;
}) {
  const [data, setData] = React.useState<{ headers: string[]; rows: Record<string, unknown>[] } | null>(null);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const reset = () => {
    setData(null);
    setMapping({});
  };

  const load = async (file: File) => {
    try {
      const d = await readSpreadsheet(file);
      if (!d.rows.length) return toast.error("Dosyada satır bulunamadı");
      const m: Record<string, string> = {};
      for (const f of fields) {
        const candidates = [f.label, f.key, ...(f.aliases ?? [])].map(norm);
        const hit = d.headers.find((h) => candidates.includes(norm(h))) ?? d.headers.find((h) => candidates.some((c) => norm(h).includes(c) && c.length > 3));
        if (hit) m[f.key] = hit;
      }
      setData(d);
      setMapping(m);
    } catch (e) {
      toast.error("Dosya okunamadı: " + (e as Error).message);
    }
  };

  const mapped = React.useMemo(
    () =>
      data?.rows.map((r) => Object.fromEntries(fields.map((f) => [f.key, mapping[f.key] ? r[mapping[f.key]] : undefined]))) ?? [],
    [data, mapping, fields],
  );
  const missingRequired = fields.filter((f) => f.required && !mapping[f.key]);

  const run = async () => {
    setBusy(true);
    try {
      const valid = mapped.filter((r) => fields.every((f) => !f.required || (r[f.key] !== undefined && r[f.key] !== null && String(r[f.key]).trim() !== "")));
      const n = await onImport(valid);
      toast.success(`${n} kayıt aktarıldı`);
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error("Aktarım hatası: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const template = () =>
    exportExcel(templateName, [
      {
        name: "Şablon",
        columns: fields.map((f) => ({ header: f.label, value: (r: Record<string, unknown>) => r[f.key] as string })),
        rows: [Object.fromEntries(fields.map((f) => [f.key, f.example ?? ""]))],
      },
    ]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent title={title} description="Excel (.xlsx) veya CSV dosyası yükleyin" className="sm:max-w-3xl">
        {!data ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="rounded-2xl bg-success-soft p-4 text-success">
              <FileSpreadsheet className="size-8" />
            </div>
            <p className="max-w-md text-sm text-muted">
              İlk satır başlık olmalı. Sütunları bir sonraki adımda eşleştireceksiniz. Hazır şablonu indirip doldurabilirsiniz.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={template}>
                <Download /> Şablon indir
              </Button>
              <Button onClick={() => fileRef.current?.click()}>
                <Upload /> Dosya seç
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) load(f);
                e.target.value = "";
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-2 text-sm font-semibold">Sütun eşleştirme</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {fields.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 text-sm">
                    <span className={cn("w-36 shrink-0 truncate", f.required && "font-medium")}>
                      {f.label}
                      {f.required && " *"}
                    </span>
                    <NativeSelect
                      value={mapping[f.key] ?? ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                      className="h-9"
                    >
                      <option value="">— yok —</option>
                      {data.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </NativeSelect>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold">Önizleme ({data.rows.length} satır)</div>
              <div className="thin-scroll max-h-64 overflow-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-surface-2">
                    <tr>
                      {fields.filter((f) => mapping[f.key]).map((f) => (
                        <th key={f.key} className="whitespace-nowrap px-2 py-1.5 text-left font-semibold">
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mapped.slice(0, 20).map((r, i) => (
                      <tr key={i}>
                        {fields.filter((f) => mapping[f.key]).map((f) => (
                          <td key={f.key} className="whitespace-nowrap px-2 py-1.5">
                            {r[f.key] instanceof Date ? (r[f.key] as Date).toLocaleDateString("tr-TR") : String(r[f.key] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {missingRequired.length > 0 && (
              <p className="text-sm text-danger">Zorunlu alan eşleştirilmedi: {missingRequired.map((f) => f.label).join(", ")}</p>
            )}
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={reset}>
                Başka dosya
              </Button>
              <Button onClick={run} loading={busy} disabled={missingRequired.length > 0}>
                {data.rows.length} satırı aktar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
