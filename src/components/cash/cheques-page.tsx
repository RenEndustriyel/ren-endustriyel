"use client";

import * as React from "react";
import { Plus, ScrollText, Trash2 } from "lucide-react";
import { newId, useAccounts, useRows, useRpc, type Row } from "@/lib/data";
import { formatDate, formatMoney, isoDate } from "@/lib/format";
import { CURRENCIES } from "@/lib/doc-types";
import { addDays } from "@/lib/doc-calc";
import { rateFor, useRates } from "@/lib/rates";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { useConfirm } from "@/components/ui/confirm";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { cn } from "@/lib/utils";

type Cheque = Row<"cheques"> & { contact: { name: string } | null; events: Row<"cheque_events">[] };
type Dir = "received" | "issued";

const STATUS: Record<string, { label: string; tone: "neutral" | "primary" | "success" | "danger" | "warning" }> = {
  portfolio: { label: "Portföyde", tone: "primary" },
  deposited: { label: "Tahsile verildi", tone: "warning" },
  collected: { label: "Tahsil edildi", tone: "success" },
  paid: { label: "Ödendi", tone: "success" },
  bounced: { label: "Karşılıksız", tone: "danger" },
  returned: { label: "İade edildi", tone: "neutral" },
  cancelled: { label: "İptal", tone: "neutral" },
};

export function ChequesPage() {
  const { canWrite } = useOrg();
  const [dir, setDir] = React.useState<Dir>("received");
  const [status, setStatus] = React.useState("open");
  const [newOpen, setNewOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Cheque | null>(null);
  const cheques = useRows<Cheque>("cheques", {
    select: "*, contact:contacts(name), events:cheque_events(*)",
    order: [{ column: "due_date", ascending: true }],
  });
  const today = isoDate();
  const all = (cheques.data ?? []).filter((c) => c.direction === dir);
  const isOpen = (c: Cheque) => c.status === "portfolio" || c.status === "deposited";
  const rows = all.filter((c) => (status === "open" ? isOpen(c) : status === "all" ? true : c.status === status));
  const openTotal = all.filter(isOpen).reduce((s, c) => s + Number(c.amount) * Number(c.exchange_rate), 0);
  const overdue = all.filter((c) => isOpen(c) && c.due_date < today).reduce((s, c) => s + Number(c.amount) * Number(c.exchange_rate), 0);
  const next30 = all.filter((c) => isOpen(c) && c.due_date >= today && c.due_date <= addDays(today, 30)).reduce((s, c) => s + Number(c.amount) * Number(c.exchange_rate), 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Çek & Senet"
        actions={
          canWrite && (
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus /> {dir === "received" ? "Çek/senet al" : "Çek/senet ver"}
            </Button>
          )
        }
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Segmented value={dir} onChange={setDir} options={[{ value: "received", label: "Alınan (müşteri)" }, { value: "issued", label: "Verilen (tedarikçi)" }]} />
        <Segmented
          value={status}
          onChange={setStatus}
          className="sm:ml-auto"
          options={[
            { value: "open", label: "Açık" },
            { value: dir === "received" ? "collected" : "paid", label: dir === "received" ? "Tahsil edilen" : "Ödenen" },
            { value: "bounced", label: "Karşılıksız" },
            { value: "all", label: "Tümü" },
          ]}
        />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label={dir === "received" ? "Portföydeki toplam" : "Ödenecek toplam"} value={openTotal} tone="primary" />
        <Stat label="30 gün içinde vadesi gelen" value={next30} />
        <Stat label="Vadesi geçen" value={overdue} tone={overdue ? "danger" : undefined} className="col-span-2 lg:col-span-1" />
      </div>
      <DataTable
        rows={rows}
        loading={cheques.isPending}
        rowKey={(c) => c.id}
        onRowClick={setSelected}
        columns={[
          { key: "due", header: "Vade", sortValue: (c) => c.due_date, cell: (c) => <span className={cn("whitespace-nowrap", isOpen(c) && c.due_date < today && "font-semibold text-danger")}>{formatDate(c.due_date)}</span> },
          {
            key: "who",
            header: dir === "received" ? "Müşteri / keşideci" : "Tedarikçi",
            cell: (c) => (
              <div>
                <div className="font-medium">{c.contact?.name ?? c.drawer ?? "—"}</div>
                <div className="text-xs text-muted">{[c.kind === "note" ? "Senet" : "Çek", c.serial_number, c.bank_name].filter(Boolean).join(" · ")}</div>
              </div>
            ),
          },
          { key: "st", header: "Durum", hideBelow: "md", cell: (c) => <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge> },
          { key: "amt", header: "Tutar", align: "right", sortValue: (c) => Number(c.amount), cell: (c) => <span className="num font-semibold">{formatMoney(c.amount, c.currency)}</span> },
        ]}
        mobileRow={(c) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-medium">{c.contact?.name ?? c.drawer}</div>
              <div className="text-xs text-muted">
                Vade {formatDate(c.due_date)} · {STATUS[c.status].label}
              </div>
            </div>
            <span className="num font-semibold">{formatMoney(c.amount, c.currency)}</span>
          </div>
        )}
        empty={<EmptyState icon={<ScrollText />} title="Kayıt yok" />}
      />
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent title={dir === "received" ? "Alınan çek / senet" : "Verilen çek / senet"} className="sm:max-w-xl">
          {newOpen && <ChequeForm direction={dir} onDone={() => setNewOpen(false)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent title={selected ? `${selected.kind === "note" ? "Senet" : "Çek"} ${selected.serial_number ?? ""}` : ""} className="sm:max-w-xl">
          {selected && <ChequeDetail cheque={selected} onClose={() => setSelected(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChequeForm({ direction, onDone, cheque }: { direction: Dir; onDone: () => void; cheque?: Cheque }) {
  const { org } = useOrg();
  const rates = useRates();
  const save = useRpc("save_cheque");
  const [v, setV] = React.useState({
    kind: cheque?.kind ?? "cheque",
    contact_id: cheque?.contact_id ?? null,
    serial_number: cheque?.serial_number ?? "",
    bank_name: cheque?.bank_name ?? "",
    branch: cheque?.branch ?? "",
    account_number: cheque?.account_number ?? "",
    drawer: cheque?.drawer ?? "",
    amount: Number(cheque?.amount ?? 0),
    currency: cheque?.currency ?? "TRY",
    issue_date: cheque?.issue_date ?? isoDate(),
    due_date: cheque?.due_date ?? "",
    notes: cheque?.notes ?? "",
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));
  const [err, setErr] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.amount || !v.due_date) return setErr("Tutar ve vade tarihi gerekli.");
    if (!v.contact_id) return setErr("Cari seçin.");
    await save.call(
      {
        p_cheque: {
          ...v,
          id: cheque?.id ?? newId(),
          org_id: org!.id,
          direction,
          exchange_rate: v.currency === "TRY" ? 1 : rateFor(rates.data, v.currency) || 1,
        },
      },
      "Kaydedildi",
    );
    onDone();
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Segmented value={v.kind} onChange={(k) => set("kind", k)} options={[{ value: "cheque", label: "Çek" }, { value: "note", label: "Senet" }]} />
      </div>
      <Field label={direction === "received" ? "Alınan cari *" : "Verilen cari *"} className="sm:col-span-2">
        <ContactPicker value={v.contact_id} onChange={(id) => set("contact_id", id)} kind={direction === "received" ? "customer" : "supplier"} />
      </Field>
      <Field label="Tutar *">
        <NumberInput value={v.amount} onChange={(n) => set("amount", n)} />
      </Field>
      <Field label="Para birimi">
        <NativeSelect value={v.currency} onChange={(e) => set("currency", e.target.value)}>
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Düzenleme tarihi">
        <Input type="date" value={v.issue_date} onChange={(e) => set("issue_date", e.target.value)} />
      </Field>
      <Field label="Vade tarihi *">
        <Input type="date" value={v.due_date} onChange={(e) => set("due_date", e.target.value)} />
      </Field>
      <Field label={v.kind === "note" ? "Senet no" : "Çek no"}>
        <Input value={v.serial_number} onChange={(e) => set("serial_number", e.target.value)} />
      </Field>
      <Field label={v.kind === "note" ? "Borçlu" : "Keşideci"}>
        <Input value={v.drawer} onChange={(e) => set("drawer", e.target.value)} />
      </Field>
      {v.kind === "cheque" && (
        <>
          <Field label="Banka">
            <Input value={v.bank_name} onChange={(e) => set("bank_name", e.target.value)} />
          </Field>
          <Field label="Şube">
            <Input value={v.branch} onChange={(e) => set("branch", e.target.value)} />
          </Field>
        </>
      )}
      <Field label="Not" className="sm:col-span-2">
        <Textarea rows={2} value={v.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
      <p className="text-xs text-muted sm:col-span-2">
        {direction === "received" ? "Kayıtla birlikte müşterinin bakiyesinden düşülür; tahsil edildiğinde seçilen hesaba girer." : "Kayıtla birlikte tedarikçiye olan borçtan düşülür; ödendiğinde seçilen hesaptan çıkar."}
      </p>
      {err && <p className="text-sm text-danger sm:col-span-2">{err}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Vazgeç
        </Button>
        <Button type="submit" loading={save.isPending}>
          Kaydet
        </Button>
      </div>
    </form>
  );
}

function ChequeDetail({ cheque: c, onClose }: { cheque: Cheque; onClose: () => void }) {
  const { canWrite } = useOrg();
  const confirm = useConfirm();
  const accounts = useAccounts();
  const setStatus = useRpc("set_cheque_status");
  const del = useRpc("delete_cheque");
  const [action, setAction] = React.useState<string | null>(null);
  const [acc, setAcc] = React.useState("");
  const [date, setDate] = React.useState(isoDate());
  const [note, setNote] = React.useState("");
  const [edit, setEdit] = React.useState(false);
  const active = (accounts.data ?? []).filter((a) => a.is_active && a.type !== "credit_card");
  const actions =
    c.direction === "received"
      ? [
          { value: "deposited", label: "Bankaya tahsile ver", needsAcc: true },
          { value: "collected", label: "Tahsil edildi", needsAcc: true },
          { value: "bounced", label: "Karşılıksız" },
          { value: "returned", label: "Müşteriye iade" },
          { value: "portfolio", label: "Portföye geri al" },
        ]
      : [
          { value: "paid", label: "Ödendi", needsAcc: true },
          { value: "returned", label: "Geri alındı" },
          { value: "bounced", label: "Karşılıksız çıktı" },
          { value: "portfolio", label: "Ödenecek durumuna al" },
        ];
  const current = actions.find((a) => a.value === action);

  if (edit) return <ChequeForm direction={c.direction as Dir} cheque={c} onDone={onClose} />;

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <Info label="Tutar" value={<b className="num text-lg">{formatMoney(c.amount, c.currency)}</b>} />
        <Info label="Durum" value={<Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>} />
        <Info label="Cari" value={c.contact?.name ?? "—"} />
        <Info label="Vade" value={formatDate(c.due_date)} />
        {c.drawer && <Info label="Keşideci / borçlu" value={c.drawer} />}
        {c.bank_name && <Info label="Banka" value={[c.bank_name, c.branch].filter(Boolean).join(" / ")} />}
      </div>
      {!!c.events?.length && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Geçmiş</div>
          <ol className="flex flex-col gap-1 border-l-2 border-border pl-3">
            {[...c.events]
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((e) => (
                <li key={e.id}>
                  <span className="text-muted">{formatDate(e.event_date)}</span> · {STATUS[e.status]?.label ?? e.status}
                  {e.note ? ` · ${e.note}` : ""}
                </li>
              ))}
          </ol>
        </div>
      )}
      {canWrite && (
        <>
          <div className="flex flex-wrap gap-2">
            {actions
              .filter((a) => a.value !== c.status)
              .map((a) => (
                <Button key={a.value} size="sm" variant={action === a.value ? "primary" : "outline"} onClick={() => setAction(a.value)}>
                  {a.label}
                </Button>
              ))}
          </div>
          {action && (
            <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2">
              {current?.needsAcc && (
                <Field label="Hesap" className="sm:col-span-2">
                  <NativeSelect value={acc || active[0]?.id || ""} onChange={(e) => setAcc(e.target.value)}>
                    {active.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              )}
              <Field label="Tarih">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Not">
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <Button
                className="sm:col-span-2"
                loading={setStatus.isPending}
                onClick={async () => {
                  await setStatus.call({ p_cheque: c.id, p_status: action, p_date: date, p_account: current?.needsAcc ? acc || active[0]?.id : null, p_note: note || null }, "Durum güncellendi");
                  onClose();
                }}
              >
                {current?.label} olarak işle
              </Button>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-3">
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              onClick={async () => {
                if (await confirm({ title: "Kayıt silinsin mi?", description: "Bağlı cari ve hesap hareketleri de geri alınır.", danger: true, confirmText: "Sil" })) {
                  await del.call({ p_cheque: c.id }, "Silindi");
                  onClose();
                }
              }}
            >
              <Trash2 /> Sil
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEdit(true)}>
              Düzenle
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div>{value}</div>
    </div>
  );
}
