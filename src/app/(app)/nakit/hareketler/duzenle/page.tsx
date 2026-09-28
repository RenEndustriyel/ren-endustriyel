"use client";

import { useParam } from "@/lib/use-param";
import { TransactionFormPage } from "@/components/cash/transaction-form";

export default function Page() {
  const id = useParam("id");
  return id ? <TransactionFormPage kind="tahsilat" editId={id} /> : null;
}
