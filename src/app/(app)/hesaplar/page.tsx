import { Metadata } from "next";
import { AccountsList } from "@/components/cash/accounts-list";

export const metadata: Metadata = {
  title: "Hesaplar · Ren Endüstriyel",
  description: "Kasa, banka, POS ve kredi kartı hesap yönetimi",
};

export default function AccountsPage() {
  return <AccountsList />;
}
