import type { Metadata } from "next";
import { CartView } from "@/components/store/cart-view";
import { STORE_WRAP, StoreCrumbs, StorePageTitle } from "@/components/store/store-ui";

export const metadata: Metadata = { title: "Sepetim", robots: { index: false } };

export default function StoreCartPage() {
  return (
    <>
      <StoreCrumbs crumbs={[{ label: "Sepetim" }]} />
      <div className={STORE_WRAP}>
        <StorePageTitle>Sepetim</StorePageTitle>
        <CartView />
      </div>
    </>
  );
}
