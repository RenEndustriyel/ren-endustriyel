"use client";

import { useParam } from "@/lib/use-param";
import { TransactionDetail } from "@/components/cash/transaction-detail";

export default function Page() {
  const id = useParam("id");
  return id ? <TransactionDetail id={id} /> : null;
}
