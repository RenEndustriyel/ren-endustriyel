"use client";

import { useSearchParams } from "next/navigation";
import { TransactionFormPage, type TxnKind } from "@/components/cash/transaction-form";

const KINDS: TxnKind[] = ["tahsilat", "odeme", "virman", "gelir", "gider"];

export default function Page() {
  const p = useSearchParams();
  const tip = p.get("tip") as TxnKind | null;
  return <TransactionFormPage kind={tip && KINDS.includes(tip) ? tip : "tahsilat"} contactId={p.get("cari")} accountId={p.get("hesap")} />;
}
