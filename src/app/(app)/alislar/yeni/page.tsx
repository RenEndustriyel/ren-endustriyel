"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PurchaseInvoiceModal } from "@/components/purchases/purchase-invoice-modal";
import { SupplierSelectModal, type SupplierItem } from "@/components/purchases/supplier-select-modal";

export default function Page() {
  const router = useRouter();
  const [supplierModalOpen, setSupplierModalOpen] = React.useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = React.useState(true);
  const [selectedSupplier, setSelectedSupplier] = React.useState<SupplierItem | null>(null);

  return (
    <div className="min-h-screen">
      <SupplierSelectModal
        open={supplierModalOpen}
        onOpenChange={(v) => {
          setSupplierModalOpen(v);
          if (!v && !selectedSupplier) {
            setInvoiceModalOpen(true);
          }
        }}
        onSelect={(sup) => {
          setSelectedSupplier(sup);
          setSupplierModalOpen(false);
          setInvoiceModalOpen(true);
        }}
      />

      <PurchaseInvoiceModal
        open={invoiceModalOpen}
        onOpenChange={(v) => {
          setInvoiceModalOpen(v);
          if (!v) router.push("/alislar");
        }}
        supplier={selectedSupplier}
        onChangeSupplierRequest={() => {
          setInvoiceModalOpen(false);
          setSupplierModalOpen(true);
        }}
        onSaved={() => router.push("/alislar")}
        initialDocType="Fatura"
      />
    </div>
  );
}
