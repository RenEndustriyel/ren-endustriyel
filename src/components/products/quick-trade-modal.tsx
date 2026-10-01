"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingBag, Truck, RotateCcw, ExternalLink } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/money-input";
import { useAccounts, useContacts, useRpc, useWarehouses, newId, type Row } from "@/lib/data";
import { useOrg } from "@/providers/org-provider";
import { formatMoney, formatQty, isoDate } from "@/lib/format";

type TradeMode = "sale" | "purchase" | "return";

interface QuickTradeModalProps {
  open: boolean;
  onClose: () => void;
  mode: TradeMode;
  product: Row<"products">;
  unitName?: string;
  onSuccess?: () => void;
}

export function QuickTradeModal({
  open,
  onClose,
  mode,
  product,
  unitName = "ad",
  onSuccess,
}: QuickTradeModalProps) {
  const router = useRouter();
  const { org } = useOrg();
  const contacts = useContacts();
  const warehouses = useWarehouses();
  const accounts = useAccounts();
  const saveDoc = useRpc<Row<"documents">>("save_document");

  const [contactId, setContactId] = React.useState<string>("");
  const [warehouseId, setWarehouseId] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState<number>(1);
  const [unitPrice, setUnitPrice] = React.useState<number>(
    mode === "purchase" ? Number(product.purchase_price || 0) : Number(product.sale_price || 0)
  );
  const [vatRate, setVatRate] = React.useState<number>(Number(product.vat_rate ?? 20));
  const [paymentType, setPaymentType] = React.useState<"cash" | "card" | "transfer" | "credit">("cash");
  const [accountId, setAccountId] = React.useState<string>("");
  const [issueDate, setIssueDate] = React.useState<string>(isoDate());
  const [notes, setNotes] = React.useState<string>("");

  // Update default price when mode or product changes
  React.useEffect(() => {
    if (open) {
      setUnitPrice(
        mode === "purchase" ? Number(product.purchase_price || 0) : Number(product.sale_price || 0)
      );
      setQuantity(1);
      setVatRate(Number(product.vat_rate ?? 20));
      setIssueDate(isoDate());
      setNotes("");
      if (warehouses.data?.length) {
        const def = warehouses.data.find((w) => w.is_default) || warehouses.data[0];
        setWarehouseId(def.id);
      }
      if (accounts.data?.length) {
        setAccountId(accounts.data[0].id);
      }
    }
  }, [open, mode, product, warehouses.data, accounts.data]);

  const filteredContacts = React.useMemo(() => {
    const list = contacts.data ?? [];
    if (mode === "purchase") {
      return list.filter((c) => c.kind === "supplier" || c.kind === "both");
    }
    return list.filter((c) => c.kind === "customer" || c.kind === "both");
  }, [contacts.data, mode]);

  // Calculations
  const gross = quantity * unitPrice;
  const vatAmount = (gross * vatRate) / 100;
  const total = gross + vatAmount;

  const title =
    mode === "sale"
      ? "Hızlı Satış Yap"
      : mode === "purchase"
      ? "Hızlı Alış Yap"
      : "Hızlı İade Al";

  const modeIcon =
    mode === "sale" ? (
      <ShoppingBag className="size-5 text-emerald-600" />
    ) : mode === "purchase" ? (
      <Truck className="size-5 text-amber-600" />
    ) : (
      <RotateCcw className="size-5 text-rose-600" />
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;

    if (quantity <= 0) {
      toast.error("Miktar 0'dan büyük olmalıdır.");
      return;
    }

    if (paymentType === "credit" && !contactId) {
      toast.error("Açık hesap (veresiye) işlem için cari seçilmelidir.");
      return;
    }

    if (paymentType !== "credit" && !accountId) {
      toast.error("Lütfen ödemenin yapılacağı kasa veya banka hesabını seçin.");
      return;
    }

    try {
      const docType =
        mode === "sale"
          ? "pos_sale"
          : mode === "purchase"
          ? "purchase_invoice"
          : "sales_return";

      const docId = newId();

      await saveDoc.call({
        p_doc: {
          id: docId,
          org_id: org.id,
          doc_type: docType,
          status: "approved",
          issue_date: issueDate,
          due_date: issueDate,
          contact_id: contactId || null,
          currency: "TRY",
          exchange_rate: 1,
          prices_include_vat: false,
          discount_type: "rate",
          discount_value: 0,
          notes: notes || `${product.name} hızlı ${mode === "sale" ? "satış" : mode === "purchase" ? "alış" : "iade"} işlemi`,
        },
        p_lines: [
          {
            product_id: product.id,
            description: product.name,
            quantity: quantity,
            unit_id: product.unit_id,
            unit_factor: 1,
            unit_price: unitPrice,
            discount_rate: 0,
            vat_rate: vatRate,
          },
        ],
        p_payment:
          paymentType === "credit"
            ? null
            : {
                id: newId(),
                account_id: accountId,
                method: paymentType,
              },
      });

      toast.success(
        mode === "sale"
          ? "Satış başarıyla kaydedildi"
          : mode === "purchase"
          ? "Alış başarıyla kaydedildi"
          : "İade başarıyla kaydedildi"
      );
      onClose();
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message || "İşlem kaydedilirken bir hata oluştu.");
    }
  };

  const openFullInvoice = () => {
    onClose();
    if (mode === "sale") {
      router.push(`/satislar/faturalar/yeni?cari=${contactId || ""}&product_id=${product.id}&qty=${quantity}&price=${unitPrice}`);
    } else if (mode === "purchase") {
      router.push(`/giderler/alis-faturalari/yeni?cari=${contactId || ""}&product_id=${product.id}&qty=${quantity}&price=${unitPrice}`);
    } else {
      router.push(`/satislar/iadeler/yeni?cari=${contactId || ""}&product_id=${product.id}&qty=${quantity}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={title} description={product.name} className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Header Product Info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="size-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
              {modeIcon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200">
                {product.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Mevcut Stok: <span className="font-semibold">{formatQty(product.stock_qty)} {unitName}</span>
                {product.barcode ? ` · Barkod: ${product.barcode}` : ""}
              </div>
            </div>
          </div>

          {/* Cari Seçimi */}
          <Field label={mode === "purchase" ? "Tedarikçi" : "Müşteri / Cari"}>
            <NativeSelect
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
            >
              <option value="">
                {mode === "sale" ? "— Perakende / Belgesiz Satış —" : "— Cari Seçin —"}
              </option>
              {filteredContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.tax_number ? `(${c.tax_number})` : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>

          {/* Miktar ve Birim Fiyat */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Miktar (${unitName})`}>
              <NumberInput
                value={quantity}
                onChange={(val) => setQuantity(val)}
                className="h-9"
                min={0.01}
                step={1}
              />
            </Field>
            <Field label="Birim Fiyat (TL)">
              <NumberInput
                value={unitPrice}
                onChange={(val) => setUnitPrice(val)}
                className="h-9"
                min={0}
              />
            </Field>
          </div>

          {/* KDV ve Depo */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="KDV Oranı">
              <NativeSelect
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value))}
              >
                <option value={0}>%0</option>
                <option value={1}>%1</option>
                <option value={10}>%10</option>
                <option value={20}>%20</option>
              </NativeSelect>
            </Field>
            <Field label="Depo">
              <NativeSelect
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                {(warehouses.data ?? []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          {/* Ödeme Türü & Hesap */}
          <div className="space-y-2">
            <Field label="Ödeme Şekli">
              <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
                {[
                  { id: "cash", label: "Nakit" },
                  { id: "card", label: "Kart" },
                  { id: "transfer", label: "Havale" },
                  { id: "credit", label: "Veresiye" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPaymentType(item.id as any)}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                      paymentType === item.id
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </Field>

            {paymentType !== "credit" && (
              <Field label="Kasa / Banka Hesabı">
                <NativeSelect
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  {(accounts.data ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency || "TL"})
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
          </div>

          {/* Tarih ve Not */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="İşlem Tarihi">
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="h-9"
              />
            </Field>
            <Field label="Açıklama / Not">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="İsteğe bağlı not..."
                className="h-9"
              />
            </Field>
          </div>

          {/* Toplam Özeti */}
          <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1 text-xs">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Ara Toplam:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatMoney(gross)}</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>KDV (%{vatRate}):</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatMoney(vatAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-700">
              <span>Genel Toplam:</span>
              <span className="text-brand-600 dark:text-brand-400">{formatMoney(total)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={openFullInvoice}
              className="text-xs font-semibold text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 inline-flex items-center gap-1.5 transition"
            >
              <ExternalLink size={14} /> Tam Fatura Ekranında Aç
            </button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                İptal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="btn-primary"
                loading={saveDoc.isPending}
              >
                Kaydet
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
