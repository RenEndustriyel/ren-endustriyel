"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, MessageSquare, Search, CircleHelp, X, Bell } from "lucide-react";
import { useContacts, useContactBalances, useRows, type Row } from "@/lib/data";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type OpenInvoice = Row<"documents"> & {
  contact?: { name: string; phone?: string | null; mobile?: string | null; email?: string | null } | null;
};

export function RemindersList() {
  const contacts = useContacts();
  const balances = useContactBalances();
  const [q, setQ] = React.useState("");
  const [helpOpen, setHelpOpen] = React.useState(false);

  // Fetch sales invoices that are open / unpaid
  const openInvoicesQuery = useRows<OpenInvoice>("documents", {
    params: ["reminders_open_invoices"],
    filter: (x) =>
      x.eq("doc_type", "sales_invoice").not("payment_status", "in", '("paid","cancelled")'),
    order: [{ column: "issue_date", ascending: true }],
  });

  // Calculate open receivables per customer
  const reminderItems = React.useMemo(() => {
    const balMap = new Map((balances.data ?? []).map((b) => [b.contact_id, Number(b.balance)]));
    const invoiceList = openInvoicesQuery.data ?? [];

    // Group invoices by contact_id
    const contactInvoices = new Map<string, OpenInvoice[]>();
    for (const inv of invoiceList) {
      if (!inv.contact_id) continue;
      const list = contactInvoices.get(inv.contact_id) ?? [];
      list.push(inv);
      contactInvoices.set(inv.contact_id, list);
    }

    // Build reminders for contacts with debit balance (> 0) or open invoices
    const allContacts = (contacts.data ?? []).filter((c) => c.kind === "customer" || c.kind === "both");
    const result: Array<{
      contact: typeof allContacts[0];
      balance: number;
      openCount: number;
      oldestDate: string | null;
      daysDiff: number;
      oldestAmount: number;
      totalOpen: number;
    }> = [];

    const now = new Date();

    for (const c of allContacts) {
      const bal = balMap.get(c.id) ?? Number(c.opening_balance ?? 0);
      const invs = contactInvoices.get(c.id) ?? [];

      if (bal > 0 || invs.length > 0) {
        const oldestInv = invs[0];
        let daysDiff = 0;
        let oldestDate: string | null = null;
        let oldestAmount = 0;

        if (oldestInv && oldestInv.issue_date) {
          oldestDate = oldestInv.issue_date;
          const diffMs = now.getTime() - new Date(oldestInv.issue_date).getTime();
          daysDiff = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
          oldestAmount = Number(oldestInv.total ?? 0);
        } else {
          oldestAmount = bal;
        }

        result.push({
          contact: c,
          balance: bal,
          openCount: invs.length > 0 ? invs.length : 1,
          oldestDate,
          daysDiff,
          oldestAmount: oldestAmount > 0 ? oldestAmount : bal,
          totalOpen: Math.max(bal, oldestAmount),
        });
      }
    }

    // Sort by largest balance or oldest days
    return result.sort((a, b) => b.daysDiff - a.daysDiff || b.totalOpen - a.totalOpen);
  }, [contacts.data, balances.data, openInvoicesQuery.data]);

  const filtered = reminderItems.filter((item) =>
    item.contact.name.toLowerCase().includes(q.toLowerCase())
  );

  const sendWhatsApp = (phone: string | null | undefined, name: string, amount: number) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? "90" + cleanPhone.slice(1) : cleanPhone.startsWith("90") ? cleanPhone : "90" + cleanPhone;
    const msg = encodeURIComponent(`Sayın ${name},\n\nRen Endüstriyel sistemimizde ${formatMoney(amount)} tutarında açık bakiyeniz bulunmaktadır. Bilgilerinize sunar, iyi çalışmalar dileriz.`);
    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, "_blank");
  };

  const sendEmail = (email: string | null | undefined, name: string, amount: number) => {
    if (!email) return;
    const subject = encodeURIComponent("Bakiye Bilgilendirme - Ren Endüstriyel");
    const body = encodeURIComponent(`Sayın ${name},\n\nRen Endüstriyel sistemimizde kayıtlı ${formatMoney(amount)} tutarındaki açık bakiyenizi bilgilerinize sunarız.\n\nİyi çalışmalar dileriz.\nRen Endüstriyel`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="flex-1">
      <div>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4 mb-5">
          <div className="min-w-0 lg:min-w-[12rem] lg:shrink-0 lg:max-w-[45%]">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Cari hatırlatmalar</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Açık satışlar, vade ve risk limiti. SMTP e-posta veya WhatsApp ile gönderin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0 lg:justify-end">
            <Link className="btn-ghost" href="/cari-kampanya">
              <Mail className="h-4 w-4" /> Kampanya
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4 max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="müşteri ara"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* Cards List */}
        <div className="space-y-2.5">
          {filtered.length === 0 ? (
            <div className="card p-8 text-center text-slate-400">
              <Bell className="mx-auto h-8 w-8 mb-2 opacity-50" />
              {q ? "Arama kriterine uygun cari bulunamadı." : "Vadesi geçmiş veya açık hatırlatması olan müşteri bulunmuyor."}
            </div>
          ) : (
            filtered.map((item) => {
              const phone = item.contact.mobile || item.contact.phone;
              const email = item.contact.email;

              return (
                <div key={item.contact.id} className="card p-4 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      className="font-semibold hover:text-slate-900 dark:hover:text-white transition-colors"
                      href={`/musteriler/detay?id=${item.contact.id}`}
                    >
                      {item.contact.name}
                    </Link>
                    <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap gap-2">
                      <span>{item.openCount} açık fatura</span>
                      {item.oldestDate && (
                        <span>
                          En eski: {formatDate(item.oldestDate)} ({item.daysDiff} gün)
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                        Hatırlatma
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold tabular-nums">
                      {formatMoney(item.oldestAmount)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Açık toplam: {formatMoney(item.totalOpen)}
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="btn-ghost !py-1.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={!email}
                      title={email ? `E-posta gönder: ${email}` : "E-posta yok"}
                      onClick={() => sendEmail(email, item.contact.name, item.totalOpen)}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      E-posta
                    </button>
                    <button
                      type="button"
                      className="btn-ghost !py-1.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={!phone}
                      title={phone ? `WhatsApp mesajı gönder: ${phone}` : "Telefon yok — atlanır"}
                      onClick={() => sendWhatsApp(phone, item.contact.name, item.totalOpen)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      WhatsApp
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Help Popover */}
      <div className="pointer-events-none fixed z-[80] right-4 sm:right-5 lg:right-6 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-6">
        <div className="pointer-events-auto relative flex flex-col items-end gap-2">
          {helpOpen && (
            <div
              role="dialog"
              aria-modal="false"
              className="w-[min(22rem,calc(100vw-1.5rem))] origin-bottom-right rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-all duration-200 ease-out shadow-xl absolute bottom-12 right-0 p-0"
            >
              <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    Cari Hatırlatmalar
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Bu sayfa hakkında · Esc</div>
                </div>
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                  aria-label="Kapat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 py-3 max-h-[min(60vh,28rem)] overflow-y-auto text-[13px] leading-relaxed">
                <p className="text-slate-600 dark:text-slate-300 mb-3">
                  Açık satışlar, vadesi geçen bakiyeler ve müşteri risk takip listesi.
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                  Özellikler
                </p>
                <ul className="space-y-1.5 mb-3">
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Açık fatura ve en eski borç hesaplama</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Tek tıkla WhatsApp bakiye hatırlatması</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>E-posta bildirimleri</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
          <button
            type="button"
            title="Hatırlatmalar yardımı"
            onClick={() => setHelpOpen(!helpOpen)}
            className="h-9 w-9 rounded-full flex items-center justify-center border transition bg-white/70 dark:bg-slate-900/70 border-slate-200/60 dark:border-slate-700/60 text-slate-400/70 hover:text-slate-500 hover:border-slate-300 dark:hover:text-slate-300 shadow-sm"
          >
            <CircleHelp className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
