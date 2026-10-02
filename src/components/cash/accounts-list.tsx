"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wallet,
  Landmark,
  CreditCard,
  ArrowLeftRight,
  Pencil,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Plus,
  CircleHelp,
  X,
} from "lucide-react";
import { useAccounts, useSave, useUpdate, useRpc, newId, type Row } from "@/lib/data";
import { formatMoney, isoDate } from "@/lib/format";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AccountForm } from "./account-form";
import { useOrg } from "@/providers/org-provider";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function AccountsList() {
  const qc = useQueryClient();
  const accountsQuery = useAccounts();
  const updateAccount = useUpdate("accounts");
  const saveTxn = useRpc("save_transaction");
  const { org } = useOrg();

  const [helpOpen, setHelpOpen] = React.useState(false);
  const [newModalOpen, setNewModalOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<Row<"accounts"> | null>(null);

  // Quick transaction modal (para girişi, para çıkışı, transfer)
  const [quickTxn, setQuickTxn] = React.useState<{
    type: "in" | "out" | "transfer";
    account: Row<"accounts"> | null;
  } | null>(null);
  const [txnAmount, setTxnAmount] = React.useState("");
  const [txnDesc, setTxnDesc] = React.useState("");
  const [targetAccountId, setTargetAccountId] = React.useState("");

  const accounts = accountsQuery.data ?? [];

  // Group accounts
  const cashAccounts = accounts.filter((a) => a.type === "cash" && a.is_active);
  const bankAccounts = accounts.filter((a) => a.type === "bank" && a.is_active);
  const posAccounts = accounts.filter((a) => (a.type as string) === "pos" || a.name.toLowerCase().includes("pos"));
  const creditCardAccounts = accounts.filter((a) => a.type === "credit_card" && a.is_active && !a.name.toLowerCase().includes("pos"));

  // Calculate total TL assets
  const totalTl = accounts
    .filter((a) => a.is_active)
    .reduce((sum, a) => sum + Number(a.balance ?? 0), 0);

  const handleDelete = async (acc: Row<"accounts">) => {
    if (!confirm(`"${acc.name}" hesabını silmek istediğinize emin misiniz?`)) return;
    try {
      await updateAccount.remove(acc.id, "Hesap silindi");
    } catch (err: any) {
      toast.error(err.message || "Hesap silinemedi");
    }
  };

  const handleQuickTxnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTxn || !quickTxn.account || !org) return;
    const amountNum = parseFloat(txnAmount.replace(",", "."));
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Geçerli bir tutar girin");
      return;
    }

    try {
      if (quickTxn.type === "transfer") {
        if (!targetAccountId) {
          toast.error("Hedef hesap seçin");
          return;
        }
        if (targetAccountId === quickTxn.account.id) {
          toast.error("Farklı bir hedef hesap seçin");
          return;
        }
        const targetAcc = accounts.find((a) => a.id === targetAccountId);
        const sourceCur = quickTxn.account.currency || "TRY";
        const targetCur = targetAcc?.currency || "TRY";

        await saveTxn.call({
          p_txn: {
            id: newId(),
            org_id: org.id,
            type: "transfer",
            direction: "transfer",
            txn_date: isoDate(),
            account_id: quickTxn.account.id,
            to_account_id: targetAccountId,
            amount: amountNum,
            to_amount: amountNum,
            currency: sourceCur,
            exchange_rate: 1,
            description: txnDesc || `Virman (${quickTxn.account.name} → ${targetAcc?.name ?? "Hedef Hesap"})`,
          },
          p_allocations: null,
        });
        toast.success("Transfer tamamlandı");
      } else {
        await saveTxn.call({
          p_txn: {
            id: newId(),
            org_id: org.id,
            type: quickTxn.type === "in" ? "other_income" : "other_expense",
            direction: quickTxn.type,
            txn_date: isoDate(),
            account_id: quickTxn.account.id,
            amount: amountNum,
            currency: quickTxn.account.currency || "TRY",
            exchange_rate: 1,
            description: txnDesc || (quickTxn.type === "in" ? "Nakit Girişi" : "Nakit Çıkışı"),
          },
          p_allocations: null,
        });
        toast.success(quickTxn.type === "in" ? "Para girişi kaydedildi" : "Para çıkışı kaydedildi");
      }

      qc.invalidateQueries({ queryKey: ["rows", "accounts"] });
      qc.invalidateQueries({ queryKey: ["rows", "transactions"] });
      qc.invalidateQueries({ queryKey: ["account_statement"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      await accountsQuery.refetch();

      setQuickTxn(null);
      setTxnAmount("");
      setTxnDesc("");
      setTargetAccountId("");
    } catch (err: any) {
      toast.error(err.message || "İşlem kaydedilemedi");
    }
  };

  const renderAccountItem = (acc: Row<"accounts">) => {
    const bal = Number(acc.balance ?? 0);
    const isNegative = bal < 0;

    return (
      <div key={acc.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
          {acc.type === "bank" ? (
            <Landmark className="h-[18px] w-[18px]" />
          ) : acc.type === "credit_card" ? (
            <CreditCard className="h-[18px] w-[18px]" />
          ) : (
            <Wallet className="h-[18px] w-[18px]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/nakit/hesaplar/detay?id=${acc.id}`}
            className="font-semibold text-slate-900 dark:text-white hover:underline truncate block"
          >
            {acc.name}
          </Link>
          <div className="text-[11px] text-slate-400">{acc.currency || "TRY"}</div>
        </div>
        <div className={`font-bold tabular-nums ${isNegative ? "text-rose-500" : ""}`}>
          {formatMoney(bal)}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 text-sky-600 flex items-center justify-center hover:bg-sky-100 dark:hover:bg-sky-900/50 transition"
            title="Transfer yap"
            onClick={() => setQuickTxn({ type: "transfer", account: acc })}
          >
            <ArrowLeftRight className="h-[15px] w-[15px]" />
          </button>
          <button
            type="button"
            className="h-8 w-8 rounded-lg text-slate-300 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition"
            title="Düzenle"
            onClick={() => setEditingAccount(acc)}
          >
            <Pencil className="h-[15px] w-[15px]" />
          </button>
          <button
            type="button"
            className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition"
            title="Para girişi"
            onClick={() => setQuickTxn({ type: "in", account: acc })}
          >
            <ArrowDownLeft className="h-[15px] w-[15px]" />
          </button>
          <button
            type="button"
            className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/50 transition"
            title="Para çıkışı"
            onClick={() => setQuickTxn({ type: "out", account: acc })}
          >
            <ArrowUpRight className="h-[15px] w-[15px]" />
          </button>
          <button
            type="button"
            className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-500 flex items-center justify-center transition"
            title="Sil"
            onClick={() => handleDelete(acc)}
          >
            <Trash2 className="h-[15px] w-[15px]" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1">
      <div>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4 mb-5">
          <div className="min-w-0 lg:min-w-[12rem] lg:shrink-0 lg:max-w-[45%]">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Hesaplar</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Toplam TL varlık: {formatMoney(totalTl)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0 lg:justify-end">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  if (accounts.length > 0) {
                    setQuickTxn({ type: "transfer", account: accounts[0] });
                  } else {
                    toast.error("Önce en az iki hesap ekleyin");
                  }
                }}
              >
                <ArrowLeftRight className="h-4 w-4" /> Transfer
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setNewModalOpen(true)}
              >
                + Yeni Hesap
              </button>
            </div>
          </div>
        </div>

        {/* Account Groups */}
        <div className="space-y-5">
          {/* 1. Kasa Hesapları */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 px-1">
              Kasa Hesapları
            </div>
            <div className="card divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {cashAccounts.length > 0 ? (
                cashAccounts.map(renderAccountItem)
              ) : (
                <div className="p-4 text-xs text-slate-400">Kayıtlı kasa hesabı bulunmuyor.</div>
              )}
            </div>
          </div>

          {/* 2. Banka Hesapları */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 px-1">
              Banka Hesapları
            </div>
            <div className="card divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {bankAccounts.length > 0 ? (
                bankAccounts.map(renderAccountItem)
              ) : (
                <div className="p-4 text-xs text-slate-400">Kayıtlı banka hesabı bulunmuyor.</div>
              )}
            </div>
          </div>

          {/* 3. POS Hesapları */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 px-1">
              POS Hesapları
            </div>
            <div className="card divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {posAccounts.length > 0 ? (
                posAccounts.map(renderAccountItem)
              ) : (
                <div className="p-4 text-xs text-slate-400">Kayıtlı POS hesabı bulunmuyor.</div>
              )}
            </div>
          </div>

          {/* 4. Kredi Kartları */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 px-1">
              Kredi Kartları
            </div>
            <div className="card divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {creditCardAccounts.length > 0 ? (
                creditCardAccounts.map(renderAccountItem)
              ) : (
                <div className="p-4 text-xs text-slate-400">Kayıtlı kredi kartı hesabı bulunmuyor.</div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile FAB */}
        <button
          type="button"
          onClick={() => setNewModalOpen(true)}
          className="lg:hidden fixed z-30 h-14 w-14 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg hover:opacity-90 flex items-center justify-center transition active:scale-95 right-4 sm:right-5 lg:right-6 bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-[4.5rem]"
          title="Ekle"
          aria-label="Ekle"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>
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
                    Hesaplar (Kasa / Banka)
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
                  Nakit kasa ve banka hesaplarınız; virman ve bakiye.
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                  Özellikler
                </p>
                <ul className="space-y-1.5 mb-3">
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Hesap ekleme (kasa / banka)</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Bakiye takibi</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Hesaplar arası virman</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>POS nakit/kart hesap bağlantısı</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
          <button
            type="button"
            title="Hesaplar (Kasa / Banka) yardımı"
            onClick={() => setHelpOpen(!helpOpen)}
            className="h-9 w-9 rounded-full flex items-center justify-center border transition bg-white/70 dark:bg-slate-900/70 border-slate-200/60 dark:border-slate-700/60 text-slate-400/70 hover:text-slate-500 hover:border-slate-300 dark:hover:text-slate-300 shadow-sm"
          >
            <CircleHelp className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* New / Edit Account Modal */}
      <Dialog
        open={newModalOpen || !!editingAccount}
        onOpenChange={(val) => {
          if (!val) {
            setNewModalOpen(false);
            setEditingAccount(null);
          }
        }}
      >
        <DialogContent
          title={editingAccount ? "Hesabı Düzenle" : "Yeni Hesap Tanımla"}
          className="max-w-lg"
        >
          <AccountForm
            account={editingAccount}
            onDone={() => {
              setNewModalOpen(false);
              setEditingAccount(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Quick Txn Modal (Transfer / In / Out) */}
      <Dialog open={!!quickTxn} onOpenChange={(val) => !val && setQuickTxn(null)}>
        <DialogContent
          title={
            quickTxn?.type === "transfer"
              ? "Hesaplar Arası Transfer (Virman)"
              : quickTxn?.type === "in"
              ? "Nakit / Para Girişi"
              : "Nakit / Para Çıkışı"
          }
          className="max-w-md"
        >
          {quickTxn && quickTxn.account && (
            <form onSubmit={handleQuickTxnSubmit} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  {quickTxn.type === "transfer" ? "Kaynak Hesap" : "Hesap"}
                </label>
                <div className="font-semibold text-sm px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                  {quickTxn.account.name} ({quickTxn.account.currency})
                </div>
              </div>

              {quickTxn.type === "transfer" && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">
                    Hedef Hesap
                  </label>
                  <select
                    className="input w-full"
                    required
                    value={targetAccountId}
                    onChange={(e) => setTargetAccountId(e.target.value)}
                  >
                    <option value="">Hedef hesap seçin...</option>
                    {accounts
                      .filter((a) => a.id !== quickTxn.account?.id && a.is_active)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.currency})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Tutar</label>
                <input
                  type="text"
                  className="input w-full text-base font-semibold"
                  placeholder="0,00"
                  required
                  value={txnAmount}
                  onChange={(e) => setTxnAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Açıklama</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="İşlem açıklaması (opsiyonel)"
                  value={txnDesc}
                  onChange={(e) => setTxnDesc(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setQuickTxn(null)}
                >
                  Vazgeç
                </button>
                <button type="submit" className="btn-primary">
                  Kaydet
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
