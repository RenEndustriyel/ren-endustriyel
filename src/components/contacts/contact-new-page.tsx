"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ContactForm } from "./contact-form";

export function ContactNewPage({ kind }: { kind: "customer" | "supplier" }) {
  const router = useRouter();
  const params = useSearchParams();
  const back = params.get("geri");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back title={kind === "customer" ? "Yeni müşteri" : "Yeni tedarikçi"} />
      <Card>
        <CardBody>
          <ContactForm
            defaultKind={kind}
            defaultName={params.get("ad") ?? undefined}
            onSaved={(c) => router.replace(back ? `${back}${back.includes("?") ? "&" : "?"}cari=${c.id}` : `/cariler/detay?id=${c.id}`)}
            onCancel={() => router.back()}
          />
        </CardBody>
      </Card>
    </div>
  );
}
