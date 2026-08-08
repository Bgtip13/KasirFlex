'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Profile = { nama_toko: string | null; role: string };

const menu = [
  { href: '/buat-nota', label: 'Buat Nota', icon: '🧾' },
  { href: '/riwayat', label: 'Riwayat', icon: '📁' },
  { href: '/pengaturan', label: 'Pengaturan', icon: '⚙️' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) { router.replace('/login'); return; }
      const { data: p } = await supabase
        .from('profiles')
        .select('nama_toko, role')
        .eq('id', user.id)
        .single();
      setProfile(p);
    });
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const nav = profile?.role === 'admin'
    ? [...menu, { href: '/admin', label: 'Panel Admin', icon: '🛡️' }]
    : menu;

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-900 transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 border-b border-slate-700 px-5 py-4">
          <img src="/logo.png" alt="KasirFlex" className="h-9 w-9 rounded-lg object-contain" />
          <div>
            <p className="text-sm font-bold text-white">KasirFlex</p>
            <p className="text-[10px] text-slate-400">by NB Projects</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === m.href ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <span>{m.icon}</span> {m.label}
            </Link>
          ))}
        </nav>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button className="text-xl text-slate-600 lg:hidden" onClick={() => setSidebarOpen(true)}>☰</button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <img src="/logo.png" alt="KasirFlex" className="h-8 w-8 rounded-lg object-contain" />
              <span className="text-sm font-bold text-slate-800">
                KasirFlex <span className="font-normal text-slate-400">by NB Projects</span>
              </span>
            </Link>
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenMenu(!openMenu)}
              className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 hover:bg-slate-50"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                {profile?.nama_toko?.charAt(0) || '?'}
              </div>
              <span className="text-sm font-medium text-slate-700">{profile?.nama_toko || 'Akun'}</span>
            </button>

            {openMenu && (
              <div className="absolute right-0 top-12 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Logout / Keluar
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
