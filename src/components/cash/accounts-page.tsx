"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Landmark, Wallet, CreditCard, ArrowLeftRight, HandCoins, Send } from "lucide-react";
import { useAccounts } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { rateFor, useRates } from "@/lib/rates";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AccountForm, ACCOUNT_TYPES } from "./account-form";

const ICON = { cash: Wallet, bank: Landmark, credit_card: CreditCard } as const;

export function AccountsPage() {
  const { isAdmin, canWrite, role } = useOrg();
  const accounts = useAccounts();
  const rates = useRates();
  const [open, setOpen] = React.useState(false);
  const hideBalances = role === "staff";
  const list = (accounts.data ?? []).filter((a) => a.is_active);
  const toTry = (bal: number, cur: string) => bal * (rateFor(rates.data, cur) || (cur === "TRY" ? 1 : 0));
  const sum = (t: string) => list.filter((a) => a.type === t).reduce((s, a) => s + toTry(Number(a.balance), a.currency), 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Kasa ve Bankalar"
        actions={
          <>
            {canWrite && (
              <Button asChild size="sm" variant="outline">
                <Link href="/nakit/hareketler/yeni?tip=virman">
                  <ArrowLeftRight /> Virman
                </Link>
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus /> Yeni hesap
              </Button>
            )}
          </>
        }
      />
      {!hideBalances && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Kasalar" value={sum("cash")} />
          <Stat label="Bankalar" value={sum("bank")} />
          <Stat label="Kredi kartı borcu" value={Math.abs(Math.min(sum("credit_card"), 0))} tone={sum("credit_card") < 0 ? "danger" : undefined} />
          <Stat label="Toplam nakit (TL)" value={sum("cash") + sum("bank")} tone="primary" />
        </div>
      )}
      {canWrite && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="success">
            <Link href="/nakit/hareketler/yeni?tip=tahsilat">
              <HandCoins /> Tahsilat
            </Link>
          </Button>
          <Button asChild size="sm" variant="danger">
            <Link href="/nakit/hareketler/yeni?tip=odeme">
              <Send /> Ödeme
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/nakit/hareketler/yeni?tip=gelir">Diğer gelir</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/nakit/hareketler/yeni?tip=gider">Diğer gider</Link>
          </Button>
        </div>
      )}
      {accounts.isPending && !accounts.data ? (
        <Skeleton className="h-40 rounded-card" />
      ) : !list.length ? (
        <Card>
          <EmptyState icon={<Landmark />} title="Hesap yok" description="Kasa, banka veya kredi kartı hesabı ekleyin." />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((a) => {
            const Icon = ICON[a.type as keyof typeof ICON] ?? Wallet;
            const bal = Number(a.balance);
            return (
              <Link key={a.id} href={`/nakit/hesaplar/detay?id=${a.id}`} className="group rounded-card border border-border bg-surface p-4 transition-colors hover:border-primary">
                <div className="flex items-start gap-3">
                  <span className={cn("flex size-10 items-center justify-center rounded-xl", a.type === "cash" ? "bg-success-soft text-success" : a.type === "bank" ? "bg-primary-soft text-primary" : "bg-warning-soft text-warning")}>
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{a.name}</div>
                    <div className="text-xs text-muted">
                      {ACCOUNT_TYPES[a.type as keyof typeof ACCOUNT_TYPES]} · {a.currency}
                      {a.bank_name ? ` · ${a.bank_name}` : ""}
                    </div>
                  </div>
                </div>
                {!hideBalances && (
                  <div className={cn("num mt-4 text-2xl font-bold", bal < 0 && "text-danger")}>{formatMoney(bal, a.currency)}</div>
                )}
                {a.type === "credit_card" && a.card_limit && !hideBalances && (
                  <div className="mt-1 text-xs text-muted">Kullanılabilir: {formatMoney(Number(a.card_limit) + bal, a.currency)}</div>
                )}
                {a.iban && <div className="mt-1 truncate text-xs text-muted">{a.iban}</div>}
              </Link>
            );
          })}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Yeni hesap" className="sm:max-w-xl">
          <AccountForm onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
