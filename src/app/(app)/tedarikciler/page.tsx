import { Metadata } from "next";
import { CustomersWorkspace } from "@/components/contacts/customers-workspace";

export const metadata: Metadata = {
  title: "Tedarikçiler · Ren Endüstriyel",
  description: "Cari tedarikçi kartları ve bakiye yönetimi",
};

export default function SuppliersPage() {
  return <CustomersWorkspace kind="supplier" />;
}
