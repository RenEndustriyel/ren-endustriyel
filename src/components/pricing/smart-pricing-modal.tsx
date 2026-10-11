"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X, Sparkles } from "lucide-react";
import { SmartPricingCard } from "./smart-pricing-card";

interface SmartPricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPurchasePrice?: number;
  initialBarcode?: string;
  initialProductName?: string;
  initialVatRate?: number;
  productId?: string;
  onApplyPrice?: (recommendedPrice: number, isVatIncluded: boolean) => void;
}

export function SmartPricingModal({
  open,
  onOpenChange,
  initialPurchasePrice = 120,
  initialBarcode = "",
  initialProductName = "",
  initialVatRate = 20,
  productId,
  onApplyPrice,
}: SmartPricingModalProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs animate-in fade-in" />
        <D.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-4xl max-h-[95vh] overflow-y-auto thin-scroll p-2 sm:p-4 outline-none animate-in zoom-in-95 fade-in duration-150"
          aria-describedby={undefined}
        >
          <D.Title className="sr-only">Akıllı Satış Fiyatlandırma ve Dinamik Piyasa Motoru</D.Title>
          <div className="relative">
            <SmartPricingCard
              initialPurchasePrice={initialPurchasePrice}
              initialBarcode={initialBarcode}
              initialProductName={initialProductName}
              initialVatRate={initialVatRate}
              productId={productId}
              onApplyPrice={(price, vatInc) => {
                onApplyPrice?.(price, vatInc);
                onOpenChange(false);
              }}
            />

            {/* Kapat butonu */}
            <D.Close
              className="absolute top-3 right-3 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white bg-white/80 dark:bg-[#101e26]/80 hover:bg-slate-100 dark:hover:bg-[#1a303e] border border-slate-200 dark:border-[#1e3544] transition z-10"
              aria-label="Kapat"
            >
              <X size={16} />
            </D.Close>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
