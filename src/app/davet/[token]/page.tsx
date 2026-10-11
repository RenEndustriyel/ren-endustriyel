"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";
import { useAuth } from "@/providers/auth-provider";
import { useOrg } from "@/providers/org-provider";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand";
import { FullScreenLoader } from "@/components/layout/app-shell";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { session, loading } = useAuth();
  const { refresh, switchOrg } = useOrg();
  const [busy, setBusy] = React.useState(false);

  if (loading) return <FullScreenLoader />;

  const accept = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    switchOrg(data);
    await refresh();
    toast.success("Firmaya katıldınız");
    router.replace("/panel");
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center">
        <BrandMark size={72} className="mx-auto" />
        <h1 className="mt-4 text-xl font-bold">Firma daveti</h1>
        {session ? (
          <>
            <p className="mt-2 text-sm text-muted">
              <b>{session.user.email}</b> hesabıyla daveti kabul edin.
            </p>
            <Button className="mt-5 w-full" size="lg" loading={busy} onClick={accept}>
              Daveti kabul et
            </Button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">Daveti kabul etmek için davet edilen e-posta adresiyle giriş yapın veya kayıt olun.</p>
            <div className="mt-5 flex flex-col gap-2">
              <Button asChild size="lg">
                <Link href={`/giris?next=/davet/${token}`}>Giriş yap</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/kayit">Kayıt ol</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
