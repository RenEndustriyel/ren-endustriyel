"use client";

import * as React from "react";
import { useOrg } from "@/providers/org-provider";
import { GrowthHealthBoard } from "@/components/reports/growth-health-board";
import { PageHeader } from "@/components/ui/page-header";

export default function GrowthHealthPage() {
  const { org } = useOrg();

  if (!org) return null;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <PageHeader
        title="Büyüme & Sağlık Skorbordu"
        description="Ciro artışı, brüt kârlılık marjı ve fiziksel hacim trendlerinin hibrit analizi"
        back="/raporlar/gelir-gider"
      />
      <GrowthHealthBoard orgId={org.id} variant="full" />
    </div>
  );
}
