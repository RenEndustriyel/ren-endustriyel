import type { Metadata } from "next";
import { CheckoutView } from "@/components/store/checkout-view";
import { STORE_WRAP, StoreCrumbs, StorePageTitle } from "@/components/store/store-ui";

export const metadata: Metadata = { title: "Sipariş ve Ödeme", robots: { index: false } };

export default function StoreCheckoutPage() {
  return (
    <>
      <StoreCrumbs crumbs={[{ label: "Sepetim", href: "/magaza/sepet" }, { label: "Sipariş ve Ödeme" }]} />
      <div className={STORE_WRAP}>
        <StorePageTitle>Sipariş ve Ödeme</StorePageTitle>
        <CheckoutView />
      </div>
    </>
  );
}
