import { Metadata } from "next";
import { CustomersWorkspace } from "@/components/contacts/customers-workspace";

export const metadata: Metadata = {
  title: "Müşteriler · Ren Endüstriyel",
  description: "Cari müşteri kartları ve bakiye yönetimi",
};

export default function CustomersPage() {
  return <CustomersWorkspace kind="customer" />;
}
