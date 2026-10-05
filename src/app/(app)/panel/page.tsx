"use client";

import { useOrg } from "@/providers/org-provider";
import { useDashboard } from "@/components/dashboard/use-dashboard";
import { PusulamPanel } from "@/components/dashboard/pusulam-panel";

export default function PanelPage() {
  const { org } = useOrg();
  const { data } = useDashboard(org?.id || "");
  return <PusulamPanel data={data} />;
}
