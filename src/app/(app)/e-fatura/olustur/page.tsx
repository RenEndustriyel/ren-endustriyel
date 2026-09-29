"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FilePlus,
  Send,
  Eye,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Building2,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRows, useProducts } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { ProductPicker } from "@/components/stock/product-picker";
import { MultiDiscountInput } from "@/components/documents/multi-discount-input";
import { GibPreviewModal } from "@/components/e-invoice/gib-preview-modal";
import {
  EInvoice,
  EInvoiceType,
  EInvoiceProfile,
  EInvoiceItem,
  saveEInvoice,
} from "@/lib/e-invoice";
import { newId } from "@/lib/data";

const VAT_RATES = [0, 1, 10, 20];

export default function EFaturaOlusturPage() {
  const router = useRouter();
  const contactsQ = useRows("contacts");
  const contacts = (contactsQ.data ?? []) as any[];
  const productsQ = useProducts();
  const products = productsQ.data ?? [];

  // Fatura türü: e-Fatura vs e-Arşiv
  const [invoiceType, setInvoiceType] = React.useState<EInvoiceType>("e-fatura");
  const [profile, setProfile] = React.useState<EInvoiceProfile>("TICARIFATURA");

  // Cari ve Alıcı Bilgileri
  const [selectedContactId, setSelectedContactId] = React.useState<string>("");
  const [partyName, setPartyName] = React.useState<string>("");
  const [partyVkn, setPartyVkn] = React.useState<string>("");
  const [partyTaxOffice, setPartyTaxOffice] = React.useState<string>("");
  const [partyAddress, setPartyAddress] = React.useState<string>("");
  const [partyCity, setPartyCity] = React.useState<string>("İstanbul");

  // Belge Tarihi
  const [issueDate, setIssueDate] = React.useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = React.useState<string>("");

  // Kalemler
  const [lines, setLines] = React.useState<EInvoiceItem[]>([
    {
      id: "line-1",
      name: "",
      quantity: 1,
      unit: "Adet",
      unit_price: 0,
      discount_rate: 0,
      vat_rate: 20,
      total: 0,
    },
  ]);

  // Yeni açılan satırın otomatik ürün aramasını açması için
  const [focusLineId, setFocusLineId] = React.useState<string | null>(null);

  // Önizleme modalı
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewInvoice, setPreviewInvoice] = React.useState<EInvoice | null>(null);

  // Cari seçilince alanları doldur
  const handleSelectContact = (cId: string) => {
    setSelectedContactId(cId);
    const c = contacts.find((item) => item.id === cId);
    if (c) {
      const name = String(c.name ?? "");
      setPartyName(name);
      const taxNo = String(c.tax_number ?? "");
      setPartyVkn(taxNo);
      setPartyTaxOffice(String(c.tax_office ?? ""));
      setPartyAddress(String(c.address ?? ""));
      setPartyCity(String(c.city ?? "İstanbul"));

      // VKN 10 hane ise genelde e-fatura, 11 hane (TCKN) ise e-arşiv
      if (taxNo.length === 11) {
        setInvoiceType("e-arsiv");
        setProfile("EARSIVFATURA");
      } else if (taxNo.length === 10) {
        setInvoiceType("e-fatura");
        setProfile("TICARIFATURA");
      }
    }
  };

  // Kalem güncelleme
  const updateLine = (idx: number, patch: Partial<EInvoiceItem>) => {
    setLines((prev) => {
      const next = [...prev];
      const cur = { ...next[idx], ...patch };
      // hesapla
      const base = (cur.quantity || 0) * (cur.unit_price || 0);
      const discount = (base * (cur.discount_rate || 0)) / 100;
      cur.total = Math.max(0, base - discount);
      next[idx] = cur;
      return next;
    });
  };

  // KDV yukarı/aşağı döngüsü
  const cycleVat = (idx: number, direction: "up" | "down") => {
    const curVat = lines[idx]?.vat_rate ?? 20;
    const curIdx = VAT_RATES.indexOf(curVat);
    let nextIdx = curIdx === -1 ? 3 : curIdx;
    if (direction === "up") {
      nextIdx = (nextIdx + 1) % VAT_RATES.length;
    } else {
      nextIdx = (nextIdx - 1 + VAT_RATES.length) % VAT_RATES.length;
    }
    updateLine(idx, { vat_rate: VAT_RATES[nextIdx] });
  };

  // Yeni satır ekle ve ürün aramasını odakla
  const handleAddLine = () => {
    const nextId = newId();
    setLines((prev) => [
      ...prev,
      {
        id: nextId,
        name: "",
        quantity: 1,
        unit: "Adet",
        unit_price: 0,
        discount_rate: 0,
        vat_rate: 20,
        total: 0,
      },
    ]);
    setFocusLineId(nextId);
  };

  // Enter ile alt satıra geçiş
  const handleAdvanceToNextLine = (idx: number) => {
    if (idx === lines.length - 1) {
      handleAddLine();
    } else {
      const nextId = lines[idx + 1].id;
      setFocusLineId(nextId);
    }
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 1) {
      setLines([
        {
          id: newId(),
          name: "",
          quantity: 1,
          unit: "Adet",
          unit_price: 0,
          discount_rate: 0,
          vat_rate: 20,
          total: 0,
        },
      ]);
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  // Toplamlar
  const subtotal = lines.reduce((s, l) => s + (l.quantity * l.unit_price), 0);
  const discountTotal = lines.reduce((s, l) => s + ((l.quantity * l.unit_price * (l.discount_rate || 0)) / 100), 0);
  const vatTotal = lines.reduce((s, l) => s + ((l.total * (l.vat_rate || 0)) / 100), 0);
  const grandTotal = lines.reduce((s, l) => s + l.total, 0) + vatTotal;

  // Geçici fatura nesnesi oluştur (önizleme veya kaydetme için)
  const buildCurrentInvoice = (): Partial<EInvoice> => {
    return {
      type: invoiceType,
      profile: invoiceType === "e-arsiv" ? "EARSIVFATURA" : profile,
      issue_date: issueDate,
      issue_time: new Date().toTimeString().slice(0, 8),
      party_name: partyName || "Müşteri",
      party_vkn_tckn: partyVkn || "1111111111",
      party_tax_office: partyTaxOffice,
      party_address: partyAddress,
      party_city: partyCity,
      currency: "TRY",
      subtotal,
      discount_total: discountTotal,
      vat_total: vatTotal,
      grand_total: grandTotal,
      lines: lines.filter((l) => l.name.trim() !== ""),
      notes,
    };
  };

  // Önizlemeyi Aç
  const handleOpenPreview = () => {
    const invData = buildCurrentInvoice();
    const inv: EInvoice = {
      id: "preview-temp",
      invoice_no: invoiceType === "e-arsiv" ? "EAR2026999999999" : "GIB2026999999999",
      ettn: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      direction: "outgoing",
      type: invoiceType,
      profile: invoiceType === "e-arsiv" ? "EARSIVFATURA" : profile,
      issue_date: issueDate,
      issue_time: new Date().toTimeString().slice(0, 8),
      party_name: partyName || "Örnek Müşteri A.Ş.",
      party_vkn_tckn: partyVkn || "1234567890",
      party_tax_office: partyTaxOffice || "Kadıköy",
      party_address: partyAddress || "İstanbul",
      party_city: partyCity || "İstanbul",
      currency: "TRY",
      subtotal,
      discount_total: discountTotal,
      vat_total: vatTotal,
      grand_total: grandTotal,
      status: "draft",
      status_description: "Önizleme Modu",
      lines: lines.filter((l) => l.name.trim() !== ""),
      notes,
      created_at: new Date().toISOString(),
    };
    setPreviewInvoice(inv);
    setPreviewOpen(true);
  };

  // Faturayı GİB'e Gönder ve Kaydet
  const handleSendGib = (status: "approved" | "queued" = "approved") => {
    if (!partyName.trim()) {
      toast.error("Lütfen alıcı müşteri unvanını giriniz.");
      return;
    }
    const validLines = lines.filter((l) => l.name.trim() !== "");
    if (!validLines.length) {
      toast.error("Lütfen en az bir ürün veya hizmet satırı ekleyiniz.");
      return;
    }

    const payload = buildCurrentInvoice();
    payload.status = status;
    payload.status_description =
      invoiceType === "e-arsiv"
        ? "GİB 5000/30000 E-Arşiv Portalı İmzalandı"
        : "1300: Başarıyla Tamamlandı (GİB Onaylı)";

    const saved = saveEInvoice(payload);
    toast.success(
      `${invoiceType === "e-arsiv" ? "e-Arşiv Fatura" : "e-Fatura"} başarıyla oluşturuldu (${saved.invoice_no})`
    );
    router.push("/e-fatura/giden");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-16">
      <PageHeader
        title="Fatura Oluştur"
        description="Gelir İdaresi Başkanlığı standartlarında e-Fatura ve e-Arşiv Fatura kesme"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenPreview}>
              <Eye className="size-4" /> GİB Önizleme
            </Button>
            <Button variant="primary" size="sm" onClick={() => handleSendGib("approved")}>
              <Send className="size-4" /> GİB&apos;e İlet & Onayla
            </Button>
          </div>
        }
      />

      {/* 1. FATURA TÜRÜ SEÇİMİ: e-Fatura vs e-Arşiv */}
      <Card className="p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-text">Fatura Türü ve Senaryo</div>
            <div className="text-xs text-muted">
              Alıcının mükellefiyet durumuna göre e-Fatura veya e-Arşiv seçiniz
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-surface-2 p-1 border border-border">
            <button
              type="button"
              onClick={() => {
                setInvoiceType("e-fatura");
                if (profile === "EARSIVFATURA") setProfile("TICARIFATURA");
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                invoiceType === "e-fatura"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:text-text"
              }`}
            >
              <Building2 className="size-4" />
              <span>e-Fatura (Kurumsal)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setInvoiceType("e-arsiv");
                setProfile("EARSIVFATURA");
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                invoiceType === "e-arsiv"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted hover:text-text"
              }`}
            >
              <UserCheck className="size-4" />
              <span>e-Arşiv Fatura</span>
            </button>
          </div>
        </div>

        {/* Senaryo ve Ek Bilgiler */}
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-muted">Fatura Senaryosu</label>
            {invoiceType === "e-fatura" ? (
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value as EInvoiceProfile)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium focus:border-primary focus:outline-none"
              >
                <option value="TICARIFATURA">TICARIFATURA (Kabul/Ret Seçenekli)</option>
                <option value="TEMELFATURA">TEMELFATURA (Doğrudan Kabul)</option>
                <option value="IHRACAT">IHRACAT (Gümrük Çıkışlı)</option>
                <option value="KAMU">KAMU FATURASI</option>
              </select>
            ) : (
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-4" /> EARSIVFATURA (Standart)
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Fatura Tarihi</label>
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Para Birimi</label>
            <div className="mt-1 flex items-center rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text">
              TRY - Türk Lirası
            </div>
          </div>
        </div>
      </Card>

      {/* 2. ALICI BİLGİLERİ */}
      <Card className="p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
          <div className="text-sm font-semibold text-text">Alıcı / Müşteri Bilgileri</div>
          {contacts.length > 0 && (
            <div className="w-56">
              <select
                value={selectedContactId}
                onChange={(e) => handleSelectContact(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
              >
                <option value="">Kayıtlı Carilerden Seç...</option>
                {contacts.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {String(c.name ?? "")} {c.tax_number ? `(${c.tax_number})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted">Firma / Kişi Unvanı *</label>
            <Input
              placeholder="Örn: Aselsan Elektronik Sanayi A.Ş. veya Ahmet Yılmaz"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted">VKN / TCKN *</label>
            <div className="relative mt-1">
              <Input
                placeholder="10 veya 11 haneli numara"
                value={partyVkn}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                  setPartyVkn(val);
                  if (val.length === 11) {
                    setInvoiceType("e-arsiv");
                    setProfile("EARSIVFATURA");
                  } else if (val.length === 10) {
                    setInvoiceType("e-fatura");
                  }
                }}
                className="text-xs font-mono"
              />
              {partyVkn.length === 10 && (
                <span className="absolute right-2 top-2 text-[10px] font-semibold text-primary">
                  10 Hane (VKN)
                </span>
              )}
              {partyVkn.length === 11 && (
                <span className="absolute right-2 top-2 text-[10px] font-semibold text-emerald-600">
                  11 Hane (TCKN)
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Vergi Dairesi</label>
            <Input
              placeholder="Örn: Kadıköy"
              value={partyTaxOffice}
              onChange={(e) => setPartyTaxOffice(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted">Adres</label>
            <Input
              placeholder="Mahalle, Cadde, No, İlçe"
              value={partyAddress}
              onChange={(e) => setPartyAddress(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>
        </div>
      </Card>

      {/* 3. MAL / HİZMET SATIRLARI (KALEMLER) */}
      <Card className="p-4 shadow-sm overflow-hidden">
        <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
          <div className="text-sm font-semibold text-text">Fatura Kalemleri (Mal & Hizmetler)</div>
          <div className="text-xs text-muted">
            Fiyat girdikten sonra <kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] border border-border">Enter</kbd> ile anında alt satıra geçebilirsiniz
          </div>
        </div>

        <div className="overflow-x-auto thin-scroll">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="py-2 pl-1 w-8">#</th>
                <th className="py-2 px-2 min-w-[240px]">Ürün / Hizmet Açıklaması</th>
                <th className="py-2 px-2 w-20 text-right">Miktar</th>
                <th className="py-2 px-2 w-20">Birim</th>
                <th className="py-2 px-2 w-28 text-right">Birim Fiyat</th>
                <th className="py-2 px-2 w-24 text-right">İskonto %</th>
                <th className="py-2 px-2 w-28 text-right">KDV %</th>
                <th className="py-2 px-2 w-28 text-right">Toplam</th>
                <th className="py-2 pr-1 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {lines.map((line, idx) => (
                <tr key={line.id} className="group hover:bg-surface-2/40">
                  <td className="py-2 pl-1 text-muted text-center">{idx + 1}</td>

                  {/* Ürün Seçici / İsmi */}
                  <td className="py-2 px-2">
                    <ProductPicker
                      value={line.product_id ?? null}
                      autoOpen={focusLineId === line.id}
                      onChange={(id) => {
                        if (!id) return;
                        const p = products.find((prod) => prod.id === id);
                        if (p) {
                          updateLine(idx, {
                            product_id: p.id,
                            name: p.name,
                            unit_price: Number(p.sale_price || 0),
                            vat_rate: Number(p.vat_rate ?? 20),
                            unit: (p as any).unit || "Adet",
                          });
                        }
                      }}
                      onCreate={(name) => updateLine(idx, { name, unit_price: 0, vat_rate: 20 })}
                      placeholder="Ürün seçin veya yeni ürün yazın..."
                    />
                  </td>

                  {/* Miktar */}
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      min="0.01"
                      step="any"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-right text-xs"
                    />
                  </td>

                  {/* Birim */}
                  <td className="py-2 px-2">
                    <select
                      value={line.unit}
                      onChange={(e) => updateLine(idx, { unit: e.target.value })}
                      className="h-8 w-full rounded-md border border-border bg-surface px-1.5 text-xs focus:border-primary focus:outline-none"
                    >
                      <option value="Adet">Adet</option>
                      <option value="Metre">Metre</option>
                      <option value="Kg">Kg</option>
                      <option value="Takım">Takım</option>
                      <option value="Hizmet">Hizmet</option>
                      <option value="Paket">Paket</option>
                    </select>
                  </td>

                  {/* Birim Fiyat (Enter ile alta geçer) */}
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={line.unit_price || ""}
                      placeholder="0.00"
                      onChange={(e) => updateLine(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAdvanceToNextLine(idx);
                        }
                      }}
                      className="h-8 text-right font-mono text-xs"
                    />
                  </td>

                  {/* İskonto */}
                  <td className="py-2 px-2">
                    <MultiDiscountInput
                      value={line.discount_rate || 0}
                      onChange={(v) => updateLine(idx, { discount_rate: v })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAdvanceToNextLine(idx);
                        }
                      }}
                      className="h-8 text-right text-xs"
                    />
                  </td>

                  {/* KDV Girişi (Doğrudan Yazılabilir 0, 1, 10, 20) */}
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={line.vat_rate}
                      placeholder="20"
                      onChange={(e) => updateLine(idx, { vat_rate: Number(e.target.value) || 0 })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAdvanceToNextLine(idx);
                        }
                      }}
                      className="h-8 text-right font-mono text-xs font-semibold"
                    />
                  </td>

                  {/* Satır Toplamı */}
                  <td className="py-2 px-2 text-right font-mono font-semibold">
                    {formatMoney(line.total)}
                  </td>

                  {/* Sil */}
                  <td className="py-2 pr-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="rounded p-1 text-muted hover:bg-danger-soft hover:text-danger transition-colors"
                      title="Satırı Sil"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <Button type="button" size="sm" variant="outline" onClick={handleAddLine}>
            <Plus className="size-4" /> Satır Ekle
          </Button>

          <span className="text-xs text-muted">
            Toplam {lines.length} satır
          </span>
        </div>
      </Card>

      {/* 4. NOTLAR VE GENEL TOPLAMLAR */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-4 shadow-sm flex flex-col justify-between">
          <div>
            <label className="text-xs font-medium text-muted">Fatura Notları & Banka Bilgisi</label>
            <textarea
              rows={4}
              placeholder="Fatura altı açıklaması, sipariş / irsaliye numarası veya banka IBAN bilgileri..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface p-2.5 text-xs text-text focus:border-primary focus:outline-none"
            />
          </div>
          <div className="mt-3 text-[11px] text-muted flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-500" />
            <span>GİB elektronik mühür ve ETTN karekodu fatura onaylandığında otomatik oluşturulur.</span>
          </div>
        </Card>

        {/* Toplam Özeti */}
        <Card className="p-4 shadow-sm space-y-2 text-xs">
          <div className="flex justify-between text-muted">
            <span>Mal / Hizmet Ara Toplamı:</span>
            <span className="font-mono font-semibold text-text">{formatMoney(subtotal)} TRY</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between text-danger">
              <span>Toplam İskonto:</span>
              <span className="font-mono font-semibold">-{formatMoney(discountTotal)} TRY</span>
            </div>
          )}
          <div className="flex justify-between text-muted border-t border-border/70 pt-2">
            <span>Hesaplanan Toplam KDV:</span>
            <span className="font-mono font-semibold text-text">{formatMoney(vatTotal)} TRY</span>
          </div>
          <div className="flex justify-between border-t-2 border-border pt-2 text-base font-bold text-text">
            <span>Ödenecek Tutar:</span>
            <span className="font-mono text-lg text-primary">{formatMoney(grandTotal)} TRY</span>
          </div>

          <div className="pt-3">
            <Button
              className="w-full h-11 text-sm font-semibold shadow-md"
              variant="primary"
              onClick={() => handleSendGib("approved")}
            >
              <Send className="size-4" /> {invoiceType === "e-arsiv" ? "e-Arşiv Faturayı Kes & Gönder" : "e-Faturayı Kes & GİB'e İlet"}
            </Button>
          </div>
        </Card>
      </div>

      {/* GİB Standart Önizleme Modalı */}
      <GibPreviewModal
        invoice={previewInvoice}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
