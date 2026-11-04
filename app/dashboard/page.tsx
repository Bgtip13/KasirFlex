'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/components/AppShell';
import { Alert, EmptyState } from '@/components/ui';
import { IconBars, IconPlus, IconReceipt, IconTrendingUp, IconWallet, IconZap } from '@/components/icons';
import { compactRp, dateKey, rupiah } from '@/lib/format';

type Txn = { invoice_no: string; total_amount: number; created_at: string };
type Day = { key: string; label: string; total: number; isToday: boolean };

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const CHART_MAX_PX = 128;

export default function DashboardPage() {
  const { profile } = useProfile();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const weekAgo = new Date(start);
      weekAgo.setDate(weekAgo.getDate() - 6);

      const { data, error } = await supabase
        .from('transactions')
        .select('invoice_no, total_amount, created_at')
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (error) setError('Gagal memuat data penjualan: ' + error.message);
      else setTxns(data ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Hitung statistik ----
  // PENTING: pengelompokan per hari memakai tanggal LOKAL (bukan toISOString/UTC),
  // kalau tidak, penjualan hari ini bisa tidak muncul di grafik untuk pengguna WIB/WITA/WIT.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayKey = dateKey(todayStart);

  const today = txns.filter((t) => dateKey(new Date(t.created_at)) === todayKey);
  const todayTotal = today.reduce((s, t) => s + Number(t.total_amount), 0);
  const weekTotal = txns.reduce((s, t) => s + Number(t.total_amount), 0);
  const avg = today.length ? todayTotal / today.length : 0;

  const perDay = new Map<string, number>();
  const days: Day[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    perDay.set(key, 0);
    days.push({ key, label: DAY_NAMES[d.getDay()], total: 0, isToday: i === 0 });
  }
  txns.forEach((t) => {
    const key = dateKey(new Date(t.created_at));
    if (perDay.has(key)) perDay.set(key, perDay.get(key)! + Number(t.total_amount));
  });
  days.forEach((d) => (d.total = perDay.get(d.key) ?? 0));
  const maxDay = Math.max(...days.map((d) => d.total), 1);
  const latest = txns.slice(0, 5);

  const dash = '—';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative">
          <h1 className="text-xl font-bold sm:text-2xl">Halo, {profile.nama_toko || 'KasirFlex'} 👋</h1>
          <p className="mt-1 text-sm text-emerald-50">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/buat-nota" className="btn bg-white text-emerald-700 hover:bg-emerald-50">
              <IconPlus className="h-4 w-4" /> Buat Nota
            </Link>
            <Link href="/riwayat" className="btn border border-white/40 text-white hover:bg-white/10">
              Lihat Riwayat
            </Link>
          </div>
        </div>
      </section>

      {error && <Alert>{error}</Alert>}

      {/* KARTU STATISTIK: 2 kolom di HP, 4 kolom di layar lebar */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard title="Penjualan Hari Ini" value={loading ? dash : rupiah(todayTotal)} icon={<IconWallet className="h-5 w-5" />} color="bg-emerald-100 text-emerald-700" />
        <StatCard title="Nota Hari Ini" value={loading ? dash : today.length + ' nota'} icon={<IconReceipt className="h-5 w-5" />} color="bg-sky-100 text-sky-700" />
        <StatCard title="Penjualan 7 Hari" value={loading ? dash : rupiah(weekTotal)} icon={<IconTrendingUp className="h-5 w-5" />} color="bg-violet-100 text-violet-700" />
        <StatCard title="Rata-rata per Nota" value={loading ? dash : rupiah(Math.round(avg))} icon={<IconZap className="h-5 w-5" />} color="bg-amber-100 text-amber-700" />
      </section>

      {/* GRAFIK + NOTA TERBARU */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 sm:gap-6">
        <div className="card p-4 sm:p-5 lg:col-span-2">
          <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <IconBars className="h-4 w-4 text-emerald-600" /> Penjualan 7 Hari Terakhir
          </p>
          <div className="flex items-end gap-1.5 sm:gap-3" style={{ height: CHART_MAX_PX + 44 }}>
            {days.map((d) => {
              const h = d.total > 0 ? Math.max(Math.round((d.total / maxDay) * CHART_MAX_PX), 6) : 3;
              return (
                <div key={d.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="h-4 max-w-full truncate text-[10px] font-semibold text-slate-600 sm:text-xs">
                    {d.total > 0 ? compactRp(d.total) : ''}
                  </span>
                  <div
                    title={`${d.label}: ${rupiah(d.total)}`}
                    className={`w-full rounded-t-lg transition-all ${
                      d.total === 0
                        ? 'bg-slate-200'
                        : d.isToday
                          ? 'bg-gradient-to-t from-emerald-600 to-teal-400'
                          : 'bg-gradient-to-t from-emerald-300 to-emerald-200'
                    }`}
                    style={{ height: h }}
                  />
                  <span className={`text-[11px] sm:text-xs ${d.isToday ? 'font-bold text-emerald-700' : 'text-slate-500'}`}>{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Nota Terbaru</p>
            <Link href="/riwayat" className="text-xs font-semibold text-emerald-700 hover:underline">Semua</Link>
          </div>
          {loading ? (
            <p className="py-6 text-center text-sm text-slate-500">Memuat...</p>
          ) : latest.length === 0 ? (
            <EmptyState icon={<IconReceipt className="h-6 w-6" />} title="Belum ada nota" hint="Nota yang Anda buat akan muncul di sini." />
          ) : (
            <ul className="space-y-2">
              {latest.map((t) => (
                <li key={t.invoice_no} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{t.invoice_no}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(t.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-emerald-700">{rupiah(t.total_amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: ReactNode; color: string }) {
  return (
    <div className="card p-3.5 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs leading-snug text-slate-600 sm:text-sm">{title}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>{icon}</span>
      </div>
      <p className="mt-2 truncate text-lg font-bold text-slate-900 sm:text-2xl" title={value}>
        {value}
      </p>
    </div>
  );
}
