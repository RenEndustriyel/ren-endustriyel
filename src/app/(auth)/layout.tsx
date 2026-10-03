import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-slate-900 p-10 text-white lg:flex border-r border-slate-800">
        <div className="absolute -right-32 -top-32 size-[28rem] rounded-full bg-[#0f9b8e]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-[#0f9b8e]/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <Image src="/icons/logo-mark.png" alt="Ren Endüstriyel" width={44} height={44} className="object-contain" unoptimized />
          <div className="leading-tight">
            <div className="text-lg font-bold tracking-tight text-white">Ren Endüstriyel</div>
            <div className="text-xs text-slate-400">Su Teknolojileri · Yönetim Portalı</div>
          </div>
        </div>
        <div className="relative flex flex-col items-center gap-6">
          <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-2xl">
            <Image src="/icons/logo-mark.png" alt="Ren Endüstriyel" width={200} height={200} className="object-contain" priority unoptimized />
          </div>
          <div className="max-w-md text-center">
            <p className="text-2xl font-bold tracking-tight text-white">Endüstriyel & Evsel Çözümler Tek Ekranda.</p>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Ürün yönetimi, sipariş, cari hesaplar, e-fatura, teklif ve stok takibi — mobil, tablet ve masaüstünde kesintisiz erişim.
            </p>
          </div>
        </div>
        <div className="relative text-xs text-slate-500">© {new Date().getFullYear()} Ren Endüstriyel · Tüm hakları saklıdır.</div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
            <Image src="/icons/logo-mark.png" alt="Ren Endüstriyel" width={72} height={72} className="object-contain" priority unoptimized />
            <div className="text-lg font-bold text-slate-900 dark:text-white">Ren Endüstriyel</div>
            <div className="text-xs text-slate-500">Yönetim ve Bayi Girişi</div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
