'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AutoLogoutProvider from './AutoLogoutProvider';
import { LoadingBlock } from './ui';
import {
  IconChevronDown,
  IconHistory,
  IconHome,
  IconLogout,
  IconReceipt,
  IconShield,
  IconSliders,
} from './icons';

export type Profile = {
  id: string;
  nama_toko: string;
  no_hp: string;
  alamat: string;
  role: string;
};

type ProfileCtx = { profile: Profile; refresh: () => Promise<void> };
const ProfileContext = createContext<ProfileCtx | null>(null);

/** Ambil profil toko yang sedang login (hanya bisa dipakai di dalam halaman yang dibungkus AppShell). */
export function useProfile(): ProfileCtx {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile harus dipakai di dalam AppShell');
  return ctx;
}

const MENU = [
  { href: '/dashboard', label: 'Beranda', icon: IconHome },
  { href: '/buat-nota', label: 'Buat Nota', icon: IconReceipt },
  { href: '/riwayat', label: 'Riwayat', icon: IconHistory },
  { href: '/pengaturan', label: 'Pengaturan', icon: IconSliders },
];
const ADMIN_MENU = { href: '/admin', label: 'Admin', icon: IconShield };

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      router.replace('/login');
      return;
    }
    const { data: p } = await supabase
      .from('profiles')
      .select('nama_toko, no_hp, alamat, role')
      .eq('id', user.id)
      .maybeSingle();
    setProfile({
      id: user.id,
      nama_toko: p?.nama_toko ?? '',
      no_hp: p?.no_hp ?? '',
      alamat: p?.alamat ?? '',
      role: p?.role ?? 'kasir',
    });
  }, [router]);

  useEffect(() => {
    load();
    // Jika sesi berakhir / logout dari tab lain, langsung arahkan ke login
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login');
    });
    return () => sub.subscription.unsubscribe();
  }, [load, router]);

  // Tutup menu akun saat klik di luar / tekan Esc
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (!profile) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100">
        <LoadingBlock label="Memuat KasirFlex..." />
      </div>
    );
  }

  const nav = profile.role === 'admin' ? [...MENU, ADMIN_MENU] : MENU;
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const initial = (profile.nama_toko || 'K').charAt(0).toUpperCase();

  return (
    <AutoLogoutProvider>
      <ProfileContext.Provider value={{ profile, refresh: load }}>
        <div className="min-h-dvh bg-slate-100">
          {/* SIDEBAR: tablet landscape & PC (≥1024px) */}
          <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-900 lg:flex print:hidden">
            <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
              <Image src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl object-contain" />
              <div>
                <p className="text-base font-bold text-white">KasirFlex</p>
                <p className="text-[11px] text-slate-400">by NB Projects</p>
              </div>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {nav.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  aria-current={isActive(m.href) ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition ${
                    isActive(m.href) ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <m.icon className="h-5 w-5" />
                  {m.label === 'Admin' ? 'Panel Admin' : m.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-slate-800 p-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <IconLogout className="h-5 w-5" />
                Keluar
              </button>
            </div>
          </aside>

          <div className="lg:pl-64 print:pl-0">
            {/* HEADER */}
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
              <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
                <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 lg:invisible">
                  <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-contain" />
                  <span className="truncate text-sm font-bold text-slate-900">
                    KasirFlex <span className="hidden font-normal text-slate-500 sm:inline">by NB Projects</span>
                  </span>
                </Link>

                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5 transition hover:bg-slate-50 sm:pr-3"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                      {initial}
                    </span>
                    <span className="hidden max-w-[10rem] truncate text-sm font-medium text-slate-700 sm:block">
                      {profile.nama_toko || 'Akun'}
                    </span>
                    <IconChevronDown className="h-4 w-4 text-slate-500" />
                  </button>

                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-12 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
                    >
                      <div className="border-b border-slate-100 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-slate-900">{profile.nama_toko || 'Toko Saya'}</p>
                        <p className="text-xs capitalize text-slate-500">{profile.role}</p>
                      </div>
                      <Link
                        href="/pengaturan"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <IconSliders className="h-4 w-4" /> Pengaturan Toko
                      </Link>
                      <button
                        role="menuitem"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        <IconLogout className="h-4 w-4" /> Keluar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* ISI HALAMAN — ruang bawah ekstra di HP agar tidak tertutup navigasi bawah */}
            <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:pb-10 print:p-0">{children}</main>
          </div>

          {/* NAVIGASI BAWAH: HP & tablet portrait (<1024px) */}
          <nav
            aria-label="Menu utama"
            className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden print:hidden"
          >
            <ul className="mx-auto flex max-w-xl items-stretch">
              {nav.map((m) => {
                const active = isActive(m.href);
                return (
                  <li key={m.href} className="flex-1">
                    <Link
                      href={m.href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                        active ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span
                        className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                          active ? 'bg-emerald-100' : ''
                        }`}
                      >
                        <m.icon className="h-5 w-5" />
                      </span>
                      {m.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </ProfileContext.Provider>
    </AutoLogoutProvider>
  );
}
