'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AppShell from '@/components/AppShell';
import AutoLogoutProvider from '@/components/AutoLogoutProvider';

type Txn = { invoice_no: string; total_amount: number; created_at: string };

export default function DashboardPage() {
  const [namaToko, setNamaToko] = useState('');
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [avg, setAvg] = useState(0);
  const [days, setDays] = useState<{ label: string; total: number }[]>([]);
  const [latest, setLatest] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: profile } = await supabase
        .from('profiles').select('nama_toko').eq('id', userData.user.id).single();
      if (profile) setNamaToko(profile.nama_toko || '');
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const weekAgo = new Date(start);
    weekAgo.setDate(weekAgo.getDate() - 6);

    const { data } = await supabase
      .from('transactions')
      .select('invoice_no, total_amount, created_at')
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      const today = data.filter((t) => new Date(t.created_at) >= start);
      const todaySum = today.reduce((s, t) => s + Number(t.total_amount), 0);
      setTodayTotal(todaySum);
      setTodayCount(today.length);
      setWeekTotal(data.reduce((s, t) => s + Number(t.total_amount), 0));
      setAvg(today.length ? todaySum / today.length : 0);
      setLatest(data.slice(0, 5));

      const map = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(start);
        d.setDate(d.getDate() - i);
        map.set(d.toISOString().slice(0, 10), 0);
      }
      data.forEach((t) => {
        const key = new Date(t.created_at).toISOString().slice(0, 10);
        if (map.has(key)) map.set(key, map.get(key)! + Number(t.total_amount));
      });
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      setDays([...map.entries()].map(([key, total]) => {
        const d = new Date(key + 'T00:00:00');
        return { label: dayNames[d.getDay()], total };
      }));
    }
    setLoading(false);
  }

  const maxDay = Math.max(...days.map((d) => d.total), 1);

  return (
    <AutoLogoutProvider>
      <AppShell>
        {/* BANNER SELAMAT DATANG */}
        <div className="mb-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white shadow-lg">
          <h1 className="text-xl font-bold">Selamat datang, {namaToko || 'KasirFlex'} 👋</h1>
          <p className="mt-1 text-sm text-emerald-100">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/buat-nota" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50">
              + Buat Nota
            </Link>
            <Link href="/riwayat" className="rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
              Lihat Riwayat
            </Link>
          </div>
        </div>

        {/* KARTU STATISTIK */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Penjualan Hari Ini" value={loading ? '...' : 'Rp ' + todayTotal.toLocaleString('id-ID')} icon="💰" color="bg-emerald-100 text-emerald-600" />
          <StatCard title="Jumlah Nota Hari Ini" value={loading ? '...' : todayCount + ' nota'} icon="🧾" color="bg-sky-100 text-sky-600" />
          <StatCard title="Penjualan 7 Hari" value={loading ? '...' : 'Rp ' + weekTotal.toLocaleString('id-ID')} icon="📈" color="bg-violet-100 text-violet-600" />
          <StatCard title="Rata-rata per Nota" value={loading ? '...' : 'Rp ' + Math.round(avg).toLocaleString('id-ID')} icon="⚡" color="bg-amber-100 text-amber-600" />
        </div>

        {/* GRAFIK + NOTA TERBARU */}
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <p className="mb-4 text-sm font-semibold text-slate-700">Penjualan 7 Hari Terakhir</p>
            <div className="flex h-44 items-end gap-2 sm:gap-3">
              {days.map((d) => (
                <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-slate-500">
                    {d.total > 0 ? compactRp(d.total) : ''}
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-teal-400"
                    style={{ height: `${Math.max((d.total / maxDay) * 120, d.total > 0 ? 6 : 2)}px` }}
                  />
                  <span className="text-[10px] text-slate-400">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-700">Nota Terbaru</p>
            {latest.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Belum ada nota.</p>
            ) : (
              <div className="space-y-2">
                {latest.map((t) => (
                  <div key={t.invoice_no} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{t.invoice_no}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">Rp {Number(t.total_amount).toLocaleString('id-ID')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </AutoLogoutProvider>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${color}`}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

function compactRp(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'jt';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'rb';
  return String(n);
}
