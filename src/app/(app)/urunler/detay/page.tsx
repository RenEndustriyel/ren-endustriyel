"use client";

import { useParam } from "@/lib/use-param";
import { ProductDetail } from "@/components/products/product-detail";

export default function Page() {
  const id = useParam("id");
  return id ? <ProductDetail id={id} /> : null;
}
