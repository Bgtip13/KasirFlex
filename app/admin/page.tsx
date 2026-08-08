'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AppShell from '@/components/AppShell';
import AutoLogoutProvider from '@/components/AutoLogoutProvider';

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

export default function AdminPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState('');
  const [detail, setDetail] = useState<Customer | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin === true) {
      loadCodes();
      loadCustomers();
    }
  }, [isAdmin]);

  async function checkAdmin() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data } = await supabase
      .from('profiles').select('role').eq('id', userData.user.id).single();
    setIsAdmin(data?.role === 'admin');
  }

  async function loadCodes() {
    const { data } = await supabase
      .from('activation_codes')
      .select('code, is_used, created_at')
      .order('created_at', { ascending: false });
    if (data) setCodes(data);
  }

  async function loadCustomers() {
    const { data, error } = await supabase.rpc('get_admin_customers');
    if (!error && data) setCustomers(data);
  }

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return 'KF-' + s.slice(0, 4) + '-' + s.slice(4);
  }

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setError('Sesi tidak ditemukan'); setGenerating(false); return; }

    const code = generateCode();
    const { error } = await supabase
      .from('activation_codes')
      .insert({ code, generated_by: userData.user.id });

    if (error) {
      setError('Gagal generate: ' + error.message);
    } else {
      setSuccess('Kode berhasil dibuat: ' + code);
      setTimeout(() => setSuccess(''), 3000);
      loadCodes();
    }
    setGenerating(false);
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setError('Gagal menyalin kode');
    }
  }

  async function handleDelete(code: string) {
    if (!confirm('Hapus kode ' + code + '?')) return;
    const { error } = await supabase
      .from('activation_codes').delete().eq('code', code);
    if (error) {
      setError('Gagal hapus: ' + error.message);
    } else {
      setSuccess('Kode ' + code + ' dihapus ✅');
      setTimeout(() => setSuccess(''), 3000);
      loadCodes();
    }
  }

  if (isAdmin === null) {
    return (
      <AutoLogoutProvider><AppShell>
        <p className="py-10 text-center text-sm text-slate-400">Memuat...</p>
      </AppShell></AutoLogoutProvider>
    );
  }

  if (isAdmin === false) {
    return (
      <AutoLogoutProvider><AppShell>
        <p className="py-10 text-center text-sm text-red-500">Akses ditolak. Halaman ini khusus admin.</p>
      </AppShell></AutoLogoutProvider>
    );
  }

  return (
    <AutoLogoutProvider>
      <AppShell>
        <h1 className="mb-4 text-lg font-bold text-slate-800">Panel Admin</h1>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {success && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">{success}</p>}

        {/* GENERATE KODE */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-700">Generate Kode Aktivasi</p>
          <button onClick={handleGenerate} disabled={generating}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
            {generating ? 'Membuat...' : '⚡ Generate Kode'}
          </button>
          <p className="mt-2 text-xs text-slate-400">Kode sekali pakai untuk mendaftarkan 1 akun toko baru.</p>
        </div>

        {/* DAFTAR KODE */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-700">Daftar Kode ({codes.length})</p>

          {codes.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Belum ada kode. Klik "Generate Kode" untuk membuat.</p>
          ) : (
            <div className="space-y-2">
              {codes.map((c) => (
                <div key={c.code} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.is_used ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-700'}`}>
                    {c.is_used ? 'DIPAKAI' : 'TERSEDIA'}
                  </span>
                  <span className={`font-mono text-sm font-semibold ${c.is_used ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {c.code}
                  </span>
                  <span className="ml-auto text-xs text-slate-400">
                    {new Date(c.created_at).toLocaleDateString('id-ID')}
                  </span>
                  {!c.is_used && (
                    <>
                      <button onClick={() => copyCode(c.code)}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                        {copied === c.code ? '✅ Tersalin' : '📋 Copy'}
                      </button>
                      <button onClick={() => handleDelete(c.code)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                        🗑️ Hapus
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PELANGGAN AKTIF */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-700">Pelanggan Aktif ({customers.length})</p>

          {customers.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Belum ada pelanggan yang mengaktifkan kode.</p>
          ) : (
            <div className="space-y-2">
              {customers.map((c) => (
                <div key={c.code} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 px-3 py-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">{c.nama_toko || 'Tanpa Nama'}</p>
                    <p className="text-xs text-slate-400">{c.email}</p>
                  </div>
                  <span className="font-mono text-xs text-slate-500">{c.code}</span>
                  <span className="text-xs text-slate-400">
                    {c.activated_at ? new Date(c.activated_at).toLocaleDateString('id-ID') : '-'}
                  </span>
                  <button onClick={() => setDetail(c)}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    👁️ Detail
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL DETAIL PELANGGAN */}
        {detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Detail Pelanggan</h2>
                <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <div className="space-y-2 text-sm">
                <Row label="Nama Toko" value={detail.nama_toko || '-'} />
                <Row label="Email" value={detail.email} />
                <Row label="No. HP" value={detail.no_hp || '-'} />
                <Row label="Alamat" value={detail.alamat || '-'} />
                <Row label="Kode Aktivasi" value={detail.code} mono />
                <Row label="Tanggal Aktivasi" value={fmt(detail.activated_at)} />
                <Row label="Tanggal Daftar" value={fmt(detail.created_at)} />
                <Row label="Terakhir Login" value={fmt(detail.last_sign_in_at)} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-emerald-50 p-3 text-center">
                  <p className="text-xs text-emerald-700">Total Nota</p>
                  <p className="text-lg font-bold text-emerald-700">{detail.total_nota}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-center">
                  <p className="text-xs text-emerald-700">Total Penjualan</p>
                  <p className="text-lg font-bold text-emerald-700">Rp {Number(detail.total_penjualan).toLocaleString('id-ID')}</p>
                </div>
              </div>

              <button onClick={() => setDetail(null)}
                className="mt-4 w-full rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Tutup
              </button>
            </div>
          </div>
        )}
      </AppShell>
    </AutoLogoutProvider>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={`text-right font-medium text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function fmt(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
}
