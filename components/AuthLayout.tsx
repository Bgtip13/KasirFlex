import Image from 'next/image';
import type { ReactNode } from 'react';

/** Kerangka halaman Login & Daftar: kartu di tengah dengan latar gradien. */
export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-900 p-4 py-8">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <Image
            src="/logo.png"
            alt="KasirFlex"
            width={72}
            height={72}
            priority
            className="mx-auto mb-3 h-[72px] w-[72px] rounded-2xl object-contain"
          />
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle ?? 'KasirFlex by NB Projects'}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
