"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ProductForm } from "@/components/products/product-form";

export default function Page() {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <div className="mx-auto w-full max-w-6xl xl:max-w-7xl pb-10">
      <PageHeader
        back
        title="Yeni Ürün / Hizmet"
        description="Alış maliyeti ve kâr marjınızı belirleyin, satış fiyatınız otomatik hesaplansın."
      />
      <Card className="border border-border/80 shadow-xs">
        <CardBody className="p-4 sm:p-6">
          <ProductForm
            defaultName={params.get("ad") ?? undefined}
            onSaved={(p) => router.replace(`/stok/urunler/detay?id=${p.id}`)}
            onCancel={() => router.back()}
          />
        </CardBody>
      </Card>
    </div>
  );
}
