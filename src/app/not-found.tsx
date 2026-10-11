import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <p className="text-muted">Aradığınız sayfa bulunamadı.</p>
      <Link href="/panel" className="text-sm font-medium text-primary hover:underline">
        Panele dön
      </Link>
    </div>
  );
}
