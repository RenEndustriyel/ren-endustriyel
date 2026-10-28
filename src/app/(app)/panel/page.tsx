"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useOrg } from "@/providers/org-provider";
import { useDashboard } from "@/components/dashboard/use-dashboard";
import { PusulamPanel } from "@/components/dashboard/pusulam-panel";
import { FullScreenLoader } from "@/components/layout/app-shell";

export default function PanelPage() {
  const { org, isB2B } = useOrg();
  const router = useRouter();

  React.useEffect(() => {
    if (isB2B) {
      router.replace("/urunler");
    }
  }, [isB2B, router]);

  const { data } = useDashboard(org?.id || "", !isB2B);

  if (isB2B) {
    return <FullScreenLoader />;
  }

  return <PusulamPanel data={data} />;
}
