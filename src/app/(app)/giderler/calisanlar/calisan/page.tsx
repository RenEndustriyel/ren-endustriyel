"use client";

import { useParam } from "@/lib/use-param";
import { EmployeeDetail } from "@/components/expenses/employees";

export default function Page() {
  const id = useParam("id");
  return id ? <EmployeeDetail id={id} /> : null;
}
