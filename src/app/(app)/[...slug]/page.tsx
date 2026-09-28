import Link from "next/link";
import { Compass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFoundInApp() {
  return (
    <Card className="mx-auto mt-6 max-w-lg">
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="rounded-2xl bg-primary-soft p-4 text-primary">
          <Compass className="size-8" />
        </div>
        <h2 className="text-lg font-semibold">Sayfa bulunamadı</h2>
        <p className="max-w-sm text-sm text-muted">Aradığınız sayfa taşınmış veya kaldırılmış olabilir.</p>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/panel">Panele dön</Link>
        </Button>
      </div>
    </Card>
  );
}
