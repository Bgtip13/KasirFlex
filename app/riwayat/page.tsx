'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/components/AppShell';
import { dateKey, fmtDateTime, rupiah, todayKey } from '@/lib/format';
import ReceiptModal from '@/components/ReceiptModal';
import { Alert, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { IconHistory, IconPencil, IconPrinter } from '@/components/icons';
import type { StrukProps } from '@/components/Struk';

type Txn = { id: string; invoice_no: string; total_amount: number; created_at: string };
type StrukData = Omit<StrukProps, 'toko'>;

export default function RiwayatPage() {
  const { profile } = useProfile();
  const [from, setFrom] = useState(todayKey);
  const [to, setTo] = useState(todayKey);
  const [list, setList] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [struk, setStruk] = useState<StrukData | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const invalidRange = !!from && !!to && from > to;

  // Muat otomatis setiap rentang tanggal berubah (dengan pembatalan agar hasil lama tidak menimpa yang baru)
  useEffect(() => {
    if (!from || !to || from > to) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const { data, error } = await supabase
        .from('transactions')
        .select('id, invoice_no, total_amount, created_at')
        .gte('created_at', new Date(from + 'T00:00:00').toISOString())
        .lte('created_at', new Date(to + 'T23:59:59.999').toISOString())
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        setError('Gagal memuat riwayat: ' + error.message);
        setList([]);
      } else {
        setList(data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  function setRange(days: number | 'month') {
    const end = new Date();
    const start = new Date();
    if (days === 'month') start.setDate(1);
    else start.setDate(start.getDate() - (days - 1));
    setFrom(dateKey(start));
    setTo(dateKey(end));
  }

  async function openPrint(txn: Txn) {
    setOpening(txn.id);
    setError('');
    const { data: items, error } = await supabase
      .from('transaction_items')
      .select('item_name, quantity, price')
      .eq('transaction_id', txn.id);
    setOpening(null);
    if (error) {
      setError('Gagal memuat item nota: ' + error.message);
      return;
    }
    setStruk({
      invoiceNo: txn.invoice_no,
      tanggal: fmtDateTime(txn.created_at),
      items: (items ?? []).map((it) => ({ nama: it.item_name, qty: it.quantity, harga: Number(it.price) })),
      total: Number(txn.total_amount),
    });
  }

  const sum = list.reduce((s, t) => s + Number(t.total_amount), 0);
  const todayStr = todayKey();
  const isToday = from === todayStr && to === todayStr;

  return (
    <>
      <div className="print:hidden">
        <PageHeader title="Riwayat Nota" subtitle="Lihat, cetak ulang, atau edit nota yang sudah dibuat." />

        {/* FILTER TANGGAL */}
        <section className="card mb-4 p-4">
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <div>
              <label htmlFor="from" className="label">Dari tanggal</label>
              <input id="from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="to" className="label">Sampai tanggal</label>
              <input id="to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="input" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => setRange(1)} className={`btn btn-sm ${isToday ? 'btn-primary' : 'btn-outline'}`}>Hari ini</button>
            <button onClick={() => setRange(7)} className="btn btn-sm btn-outline">7 hari</button>
            <button onClick={() => setRange(30)} className="btn btn-sm btn-outline">30 hari</button>
            <button onClick={() => setRange('month')} className="btn btn-sm btn-outline">Bulan ini</button>
          </div>
          {invalidRange && <div className="mt-3"><Alert>Tanggal “dari” tidak boleh lebih besar dari tanggal “sampai”.</Alert></div>}
        </section>

        {error && <div className="mb-4"><Alert>{error}</Alert></div>}

        {/* RINGKASAN */}
        {!invalidRange && !loading && list.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="card p-3.5">
              <p className="text-xs text-slate-600">Jumlah nota</p>
              <p className="text-lg font-bold text-slate-900 sm:text-xl">{list.length}</p>
            </div>
            <div className="card p-3.5">
              <p className="text-xs text-slate-600">Total penjualan</p>
              <p className="truncate text-lg font-bold text-emerald-700 sm:text-xl">{rupiah(sum)}</p>
            </div>
          </div>
        )}

        {/* DAFTAR NOTA */}
        {loading ? (
          <div className="card flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <Spinner className="h-4 w-4 text-emerald-600" /> Memuat nota...
          </div>
        ) : list.length === 0 ? (
          <div className="card">
            <EmptyState icon={<IconHistory className="h-6 w-6" />} title="Tidak ada nota" hint="Tidak ada nota pada rentang tanggal ini." />
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((t) => (
              <li key={t.id} className="card flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm font-bold text-slate-900">{t.invoice_no}</p>
                  <p className="text-xs text-slate-500">{fmtDateTime(t.created_at)}</p>
                </div>
                <p className="text-base font-bold text-emerald-700">{rupiah(t.total_amount)}</p>
                <div className="flex w-full gap-2 sm:w-auto">
                  <button onClick={() => openPrint(t)} disabled={opening === t.id} className="btn btn-dark btn-sm flex-1 sm:flex-none">
                    {opening === t.id ? <Spinner className="h-3.5 w-3.5" /> : <IconPrinter className="h-3.5 w-3.5" />} Cetak
                  </button>
                  <Link href={`/riwayat/${t.id}/edit`} className="btn btn-outline btn-sm flex-1 sm:flex-none">
                    <IconPencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {struk && <ReceiptModal data={struk} toko={profile} onClose={() => setStruk(null)} />}
    </>
  );
}
