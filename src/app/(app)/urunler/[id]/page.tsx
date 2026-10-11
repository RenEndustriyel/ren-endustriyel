"use client";

import { use } from "react";
import { ProductDetail } from "@/components/products/product-detail";

export default function ProductDynamicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  return resolvedParams?.id ? <ProductDetail id={resolvedParams.id} /> : null;
}
