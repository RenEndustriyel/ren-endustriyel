import Link from "next/link";
import { Hourglass } from "lucide-react";

/** Henüz geliştirilmemiş modüller için bilgi sayfası */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="card mx-auto mt-6 max-w-lg">
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="h-14 w-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 text-brand-500 flex items-center justify-center">
          <Hourglass size={26} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
        <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">Bu modül hazırlanıyor.</p>
        <Link href="/panel" className="btn-ghost mt-2">
          Panele dön
        </Link>
      </div>
    </div>
  );
}
