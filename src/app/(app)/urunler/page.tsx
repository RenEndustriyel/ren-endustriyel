"use client";

import { useOrg } from "@/providers/org-provider";
import { ProductsList } from "@/components/products/products-list";
import { B2BProductsView } from "@/components/b2b/b2b-products-view";

export default function UrunlerPage() {
  const { isB2B } = useOrg();

  if (isB2B) {
    return <B2BProductsView />;
  }

  return <ProductsList />;
}
