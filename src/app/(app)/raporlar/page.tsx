import { Metadata } from "next";
import { ReportsWorkspace } from "@/components/reports/reports-workspace";

export const metadata: Metadata = {
  title: "Raporlar · Ren Endüstriyel",
  description: "İşletmenizin finansal analizi",
};

export default function ReportsPage() {
  return <ReportsWorkspace />;
}
