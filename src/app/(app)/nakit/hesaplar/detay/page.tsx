"use client";

import { useParam } from "@/lib/use-param";
import { AccountDetail } from "@/components/cash/account-detail";

export default function Page() {
  const id = useParam("id");
  return id ? <AccountDetail id={id} /> : null;
}
