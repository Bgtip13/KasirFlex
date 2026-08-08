'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AppShell from '@/components/AppShell';
import AutoLogoutProvider from '@/components/AutoLogoutProvider';
import Struk from '@/components/Struk';
import printStruk from '@/components/printStruk';

type Txn = { id: string; invoice_no: string; total_amount: number; created_at: string };
type StrukData = { invoiceNo: string; tanggal: string; items: { nama: string; qty: number; harga: number }[]; total: number };

export default function RiwayatPage() {
  const router = useRouter();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [list, setList] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(false);
  const [struk, setStruk] = useState<StrukData | null>(null);
  const [toko, setToko] = useState({ nama_toko: '', no_hp: '', alamat: '' });

  useEffect(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setFrom(`${y}-${m}-${d}`);
    setTo(`${y}-${m}-${d}`);
    loadToko();
  }, []);

  useEffect(() => {
    if (from && to) search();
  }, [from, to]);

  async function loadToko() {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data } = await supabase
        .from('profiles').select('nama_toko, no_hp, alamat').eq('id', userData.user.id).single();
      if (data) setToko(data);
    }
  }

  async function search() {
    setLoading(true);
    const fromDate = new Date(from + 'T00:00:00');
    const toDate = new Date(to + 'T23:59:59.999');
    const { data, error } = await supabase
      .from('transactions')
      .select('id, invoice_no, total_amount, created_at')
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString())
      .order('created_at', { ascending: false });
    if (!error && data) setList(data);
    setLoading(false);
  }

  async function openPrint(txn: Txn) {
    const { data: items } = await supabase
      .from('transaction_items')
      .select('item_name, quantity, price')
      .eq('transaction_id', txn.id);
    const tanggal = new Date(txn.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    setStruk({
      invoiceNo: txn.invoice_no,
      tanggal,
      items: (items || []).map((it) => ({ nama: it.item_name, qty: it.quantity, harga: Number(it.price) })),
      total: Number(txn.total_amount),
    });
  }

  return (
    <AutoLogoutProvider>
      <AppShell>
        <h1 className="mb-4 text-lg font-bold text-slate-800">Riwayat Nota</h1>

        {/* FILTER TANGGAL */}
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Dari Tanggal</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Sampai Tanggal</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          </div>
          <button onClick={search}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            {loading ? 'Mencari...' : '🔍 Cari'}
          </button>
        </div>

        {/* DAFTAR NOTA */}
        {list.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            Tidak ada nota pada rentang tanggal ini.
          </p>
        ) : (
          <div className="space-y-2">
            {list.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{t.invoice_no}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(t.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                  </p>
                </div>
                <p className="font-bold text-emerald-600">Rp {Number(t.total_amount).toLocaleString('id-ID')}</p>
                <div className="flex gap-2">
                  <button onClick={() => openPrint(t)}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                    🖨️ Cetak
                  </button>
                  <button onClick={() => router.push(`/riwayat/${t.id}/edit`)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    ✏️ Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL CETAK ULANG */}
        {struk && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-4">
              <Struk {...struk} toko={toko} />
              <div className="mt-4 flex gap-2">
                <button onClick={() => printStruk({ ...struk, toko })}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
                  🖨️ Cetak
                </button>
                <button onClick={() => setStruk(null)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </AutoLogoutProvider>
  );
}
