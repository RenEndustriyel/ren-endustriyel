"use client";

import { useParam } from "@/lib/use-param";
import { ExpenseFormPage } from "@/components/expenses/expense-form";

export default function Page() {
  const id = useParam("id");
  return id ? <ExpenseFormPage editId={id} /> : null;
}
