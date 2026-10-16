// Tekrarlayan masraflar: kural "reminders" tablosunda tutulur (related_type = recurring_expense,
// related_id = şablon masraf belgesi, starts_at = sıradaki tarih, ends_at = isteğe bağlı bitiş).
// Zamanı gelen masraf şablondan "ödenecek" olarak oluşturulur; belge kimliği kural + tarihten
// türetildiği için iki cihaz aynı anda çalışsa da çift kayıt oluşmaz.
import { supabase } from "@/lib/supabase/client";
import { isoDate } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const RECURRING_EXPENSE = "recurring_expense";

export type RecurringRule = "weekly" | "monthly" | "yearly";

export const RECURRING_RULES: { value: RecurringRule; label: string }[] = [
  { value: "weekly", label: "Haftalık" },
  { value: "monthly", label: "Aylık" },
  { value: "yearly", label: "Yıllık" },
];

export const ruleLabel = (r: string | null | undefined) => RECURRING_RULES.find((x) => x.value === r)?.label ?? r ?? "";

const parseDay = (day: string) => {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Bir sonraki tarih. Ay sonu taşmasında ayın son gününe sabitlenir (31 Ocak → 28/29 Şubat → 31 Mart) */
export function nextRecurringDate(day: string, rule: string, anchorDay?: number): string {
  const d = parseDay(day);
  if (rule === "weekly") {
    d.setDate(d.getDate() + 7);
    return isoDate(d);
  }
  const anchor = anchorDay ?? d.getDate();
  const months = rule === "yearly" ? 12 : 1;
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(anchor, last));
  return isoDate(target);
}

/** Kuralın tarih alanı için (gün ortası; saat dilimi farkında gün kaymaz) */
export const dayToTs = (day: string) => `${day}T09:00:00`;
export const tsToDay = (ts: string) => isoDate(new Date(ts));

async function occurrenceId(ruleId: string, day: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(`ren-tekrarlayan-masraf:${ruleId}:${day}`));
  const b = Array.from(new Uint8Array(buf).slice(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

type RuleRow = { id: string; starts_at: string; ends_at: string | null; repeat_rule: string | null; related_id: string | null };
type TemplateDoc = {
  id: string;
  issue_date: string;
  contact_id: string | null;
  category_id: string | null;
  description: string | null;
  currency: string | null;
  exchange_rate: number | null;
  prices_include_vat: boolean | null;
  lines: { description: string | null; quantity: number; unit_price: number; vat_rate: number; discount_rate: number | null; sort_order: number | null }[];
};

/** Zamanı gelen tekrarlayan masrafları oluşturur; oluşturulan masraf sayısını döndürür */
export async function runRecurringExpenses(orgId: string): Promise<number> {
  const today = isoDate();
  const { data: rules, error } = await db
    .from("reminders")
    .select("id, starts_at, ends_at, repeat_rule, related_id")
    .eq("org_id", orgId)
    .eq("related_type", RECURRING_EXPENSE)
    .eq("is_done", false)
    .is("deleted_at", null)
    .lte("starts_at", `${today}T23:59:59`);
  if (error) throw error;

  let created = 0;
  for (const r of (rules ?? []) as RuleRow[]) {
    if (!r.related_id || !r.repeat_rule) continue;
    const { data: tpl } = await db
      .from("documents")
      .select("id, issue_date, contact_id, category_id, description, currency, exchange_rate, prices_include_vat, lines:document_lines(description, quantity, unit_price, vat_rate, discount_rate, sort_order)")
      .eq("id", r.related_id)
      .maybeSingle();
    const t = tpl as TemplateDoc | null;
    if (!t || !t.lines?.length) continue;

    const anchor = parseDay(t.issue_date).getDate();
    const end = r.ends_at ? tsToDay(r.ends_at) : null;
    let day = tsToDay(r.starts_at);
    let guard = 0;
    while (day <= today && (!end || day <= end) && guard++ < 60) {
      const id = await occurrenceId(r.id, day);
      const { data: exists } = await db.from("documents").select("id").eq("id", id).maybeSingle();
      if (!exists) {
        const lines = [...t.lines]
          .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
          .map((l) => ({ description: l.description, quantity: l.quantity, unit_price: l.unit_price, vat_rate: l.vat_rate, discount_rate: l.discount_rate ?? 0 }));
        const { error: e } = await db.rpc("save_document", {
          p_doc: {
            id,
            org_id: orgId,
            doc_type: "expense",
            status: "approved",
            number: null,
            issue_date: day,
            due_date: day,
            contact_id: t.contact_id,
            category_id: t.category_id,
            currency: t.currency || "TRY",
            exchange_rate: t.exchange_rate || 1,
            prices_include_vat: t.prices_include_vat ?? true,
            description: t.description || "Masraf",
          },
          p_lines: lines,
          p_payment: null,
        });
        if (e) throw e;
        created++;
      }
      day = nextRecurringDate(day, r.repeat_rule, anchor);
    }
    const finished = !!end && day > end;
    const { error: ue } = await db.from("reminders").update({ starts_at: dayToTs(day), is_done: finished }).eq("id", r.id);
    if (ue) throw ue;
  }
  return created;
}
