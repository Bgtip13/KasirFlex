'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/components/AppShell';
import { fmtDate, fmtDateTime, rupiah } from '@/lib/format';
import Modal from '@/components/Modal';
import { Alert, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { IconCheck, IconCopy, IconEye, IconSearch, IconShield, IconTrash, IconZap } from '@/components/icons';

type Code = { code: string; is_used: boolean; created_at: string };

type Customer = {
  code: string;
  email: string;
  nama_toko: string | null;
  no_hp: string | null;
  alamat: string | null;
  activated_at: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  total_nota: number;
  total_penjualan: number;
};

type Filter = 'semua' | 'tersedia' | 'dipakai';

/** Kode acak yang kuat (crypto), format KF-XXXX-XXXX tanpa karakter membingungkan (0/O, 1/I). */
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 karakter → tanpa bias saat modulo dari byte
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const s = Array.from(bytes, (b) => chars[b % chars.length]).join('');
  return 'KF-' + s.slice(0, 4) + '-' + s.slice(4);
}

export default function AdminPage() {
  const { profile } = useProfile();
  const isAdmin = profile.role === 'admin';

  const [codes, setCodes] = useState<Code[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingData, setLoadingData] = useState(isAdmin);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState('');
  const [detail, setDetail] = useState<Customer | null>(null);
  const [filter, setFilter] = useState<Filter>('semua');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadCodes() {
    const { data, error } = await supabase
      .from('activation_codes')
      .select('code, is_used, created_at')
      .order('created_at', { ascending: false });
    if (error) setError('Gagal memuat kode aktivasi: ' + error.message);
    else setCodes(data ?? []);
  }

  async function loadCustomers() {
    const { data, error } = await supabase.rpc('get_admin_customers');
    if (error) setError('Daftar pelanggan gagal dimuat: ' + error.message + ' (pastikan fungsi get_admin_customers sudah dibuat — lihat supabase/patch-2026-11.sql)');
    else setCustomers(data ?? []);
  }

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      await Promise.all([loadCodes(), loadCustomers()]);
      if (!cancelled) setLoadingData(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3500);
  }

  async function handleGenerate() {
    setGenerating(true);
    setError('');

    // Ulangi bila (sangat jarang) kode bentrok dengan yang sudah ada
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = generateCode();
      const { error } = await supabase.from('activation_codes').insert({ code, generated_by: profile.id });
      if (!error) {
        flash('Kode berhasil dibuat: ' + code);
        await loadCodes();
        setGenerating(false);
        return;
      }
      if (error.code !== '23505') {
        setError('Gagal generate: ' + error.message);
        setGenerating(false);
        return;
      }
    }
    setError('Gagal membuat kode unik, coba lagi.');
    setGenerating(false);
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setError('Gagal menyalin kode. Salin manual dengan menekan lama pada kode.');
    }
  }

  async function handleDelete(code: string) {
    if (!confirm('Hapus kode ' + code + '?')) return;
    setError('');
    // .select() agar kita tahu apakah baris benar-benar terhapus (RLS bisa menolak tanpa error)
    const { data, error } = await supabase.from('activation_codes').delete().eq('code', code).select();
    if (error) {
      setError('Gagal hapus: ' + error.message);
    } else if (!data || data.length === 0) {
      setError('Kode tidak terhapus. Kemungkinan database belum punya izin DELETE — jalankan supabase/patch-2026-11.sql.');
    } else {
      flash('Kode ' + code + ' dihapus');
      loadCodes();
    }
  }

  const shownCodes = useMemo(
    () => codes.filter((c) => (filter === 'semua' ? true : filter === 'tersedia' ? !c.is_used : c.is_used)),
    [codes, filter]
  );
  const shownCustomers = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter((c) => (c.nama_toko || '').toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || c.code.toLowerCase().includes(s));
  }, [customers, q]);

  if (!isAdmin) {
    return (
      <div className="card">
        <EmptyState icon={<IconShield className="h-6 w-6" />} title="Akses ditolak" hint="Halaman ini khusus admin." />
        <div className="pb-6 text-center">
          <Link href="/dashboard" className="btn btn-outline">Kembali ke Beranda</Link>
        </div>
      </div>
    );
  }

  const available = codes.filter((c) => !c.is_used).length;

  return (
    <div>
      <PageHeader title="Panel Admin" subtitle="Kelola kode aktivasi dan pelanggan KasirFlex." />

      <div className="mb-4 space-y-2 empty:hidden">
        {error && <Alert>{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}
      </div>

      {/* GENERATE KODE */}
      <section className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div>
          <p className="text-sm font-semibold text-slate-800">Generate Kode Aktivasi</p>
          <p className="mt-0.5 text-xs text-slate-500">Kode sekali pakai untuk mendaftarkan 1 akun toko baru. Tersedia: {available} kode.</p>
        </div>
        <button onClick={handleGenerate} disabled={generating} className="btn btn-primary w-full sm:w-auto">
          {generating ? <Spinner className="h-4 w-4" /> : <IconZap className="h-4 w-4" />}
          {generating ? 'Membuat...' : 'Generate Kode'}
        </button>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
        {/* DAFTAR KODE */}
        <section className="card p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">Daftar Kode ({shownCodes.length})</p>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {(['semua', 'tersedia', 'dipakai'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loadingData ? (
            <p className="py-8 text-center text-sm text-slate-500">Memuat...</p>
          ) : shownCodes.length === 0 ? (
            <EmptyState title="Belum ada kode" hint={'Klik "Generate Kode" untuk membuat.'} />
          ) : (
            <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-0.5">
              {shownCodes.map((c) => (
                <li key={c.code} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.is_used ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
                    {c.is_used ? 'DIPAKAI' : 'TERSEDIA'}
                  </span>
                  <span className={`font-mono text-sm font-semibold ${c.is_used ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{c.code}</span>
                  <span className="text-xs text-slate-500 sm:ml-auto">{fmtDate(c.created_at)}</span>
                  {!c.is_used && (
                    <div className="flex w-full gap-2 sm:w-auto">
                      <button onClick={() => copyCode(c.code)} className="btn btn-outline btn-sm flex-1 sm:flex-none">
                        {copied === c.code ? <IconCheck className="h-3.5 w-3.5 text-emerald-600" /> : <IconCopy className="h-3.5 w-3.5" />}
                        {copied === c.code ? 'Tersalin' : 'Salin'}
                      </button>
                      <button onClick={() => handleDelete(c.code)} className="btn btn-danger btn-sm flex-1 sm:flex-none">
                        <IconTrash className="h-3.5 w-3.5" /> Hapus
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* PELANGGAN */}
        <section className="card p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">Pelanggan Aktif ({shownCustomers.length})</p>
            <div className="relative w-full sm:w-56">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari toko / email..." aria-label="Cari pelanggan" className="input py-2 pl-9" />
            </div>
          </div>

          {loadingData ? (
            <p className="py-8 text-center text-sm text-slate-500">Memuat...</p>
          ) : shownCustomers.length === 0 ? (
            <EmptyState title="Belum ada pelanggan" hint="Pelanggan muncul setelah mendaftar memakai kode aktivasi." />
          ) : (
            <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-0.5">
              {shownCustomers.map((c) => (
                <li key={c.code} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 px-3 py-2.5">
                  <div className="min-w-0 flex-1 basis-44">
                    <p className="truncate text-sm font-semibold text-slate-900">{c.nama_toko || 'Tanpa Nama'}</p>
                    <p className="truncate text-xs text-slate-500">{c.email}</p>
                  </div>
                  <span className="font-mono text-xs text-slate-600">{c.code}</span>
                  <button onClick={() => setDetail(c)} className="btn btn-outline btn-sm">
                    <IconEye className="h-3.5 w-3.5" /> Detail
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* DETAIL PELANGGAN */}
      {detail && (
        <Modal title="Detail Pelanggan" onClose={() => setDetail(null)}>
          <dl className="space-y-2.5 text-sm">
            <Row label="Nama Toko" value={detail.nama_toko || '-'} />
            <Row label="Email" value={detail.email} />
            <Row label="No. HP" value={detail.no_hp || '-'} />
            <Row label="Alamat" value={detail.alamat || '-'} />
            <Row label="Kode Aktivasi" value={detail.code} mono />
            <Row label="Tanggal Aktivasi" value={fmtDateTime(detail.activated_at)} />
            <Row label="Tanggal Daftar" value={fmtDateTime(detail.created_at)} />
            <Row label="Terakhir Login" value={fmtDateTime(detail.last_sign_in_at)} />
          </dl>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-center">
              <p className="text-xs text-emerald-800">Total Nota</p>
              <p className="text-lg font-bold text-emerald-800">{detail.total_nota}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-center">
              <p className="text-xs text-emerald-800">Total Penjualan</p>
              <p className="truncate text-lg font-bold text-emerald-800">{rupiah(detail.total_penjualan)}</p>
            </div>
          </div>

          <button onClick={() => setDetail(null)} className="btn btn-outline mt-5 w-full">
            Tutup
          </button>
        </Modal>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-slate-600">{label}</dt>
      <dd className={`min-w-0 break-words text-right font-medium text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
