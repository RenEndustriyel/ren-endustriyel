import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-sidebar p-10 text-white lg:flex">
        <div className="absolute -right-32 -top-32 size-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-success/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <Image src="/icons/logo-mark.png" alt="" width={44} height={44} unoptimized />
          <div className="leading-tight">
            <div className="text-lg font-bold">Ren Endüstriyel</div>
            <div className="text-xs text-sidebar-muted">Ön Muhasebe</div>
          </div>
        </div>
        <div className="relative flex flex-col items-center gap-8">
          <Image src="/icons/logo-mark.png" alt="Ren" width={260} height={260} priority unoptimized />
          <div className="max-w-md text-center">
            <p className="text-2xl font-semibold">İşletmenizin nakdi, stoğu ve carileri tek ekranda.</p>
            <p className="mt-3 text-sm text-sidebar-muted">
              Fatura, tahsilat, ödeme, çek-senet ve stok takibi — telefonda, tablette ve bilgisayarda.
            </p>
          </div>
        </div>
        <div className="relative text-xs text-sidebar-muted">© {new Date().getFullYear()} Ren Endüstriyel</div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-bg px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
            <Image src="/icons/logo-mark.png" alt="Ren" width={96} height={96} priority unoptimized />
            <div className="text-lg font-bold">Ren Endüstriyel</div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
