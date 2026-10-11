import type { Metadata } from "next";
import { FavoritesView } from "@/components/store/cart-view";
import { STORE_WRAP, StoreCrumbs, StorePageTitle } from "@/components/store/store-ui";

export const metadata: Metadata = { title: "Favorilerim", robots: { index: false } };

export default function StoreFavoritesPage() {
  return (
    <>
      <StoreCrumbs crumbs={[{ label: "Favorilerim" }]} />
      <div className={STORE_WRAP}>
        <StorePageTitle>Favorilerim</StorePageTitle>
        <FavoritesView />
      </div>
    </>
  );
}
