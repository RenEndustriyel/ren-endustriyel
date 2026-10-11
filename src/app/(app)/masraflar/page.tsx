import { Metadata } from "next";
import { ExpensesList } from "@/components/expenses/expenses-list";

export const metadata: Metadata = {
  title: "Masraflar · Ren Endüstriyel",
  description: "İşletme masrafları ve gider takibi",
};

export default function ExpensesPage() {
  return <ExpensesList />;
}
