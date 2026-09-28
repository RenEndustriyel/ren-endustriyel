"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { FullScreenLoader } from "@/components/layout/app-shell";

export default function Home() {
  const router = useRouter();
  const { session, loading } = useAuth();
  React.useEffect(() => {
    if (!loading) router.replace(session ? "/panel" : "/giris");
  }, [loading, session, router]);
  return <FullScreenLoader />;
}
