'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AppShell from '@/components/AppShell';
import AutoLogoutProvider from '@/components/AutoLogoutProvider';

export default function PengaturanPage() {
  const [namaToko, setNamaToko] = useState('');
  const [noHp, setNoHp] = useState('');
  const [alamat, setAlamat] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data } = await supabase
        .from('profiles')
        .select('nama_toko, no_hp, alamat')
        .eq('id', userData.user.id)
        .single();
      if (data) {
        setNamaToko(data.nama_toko || '');
        setNoHp(data.no_hp || '');
        setAlamat(data.alamat || '');
      }
    }
    setLoading(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setError('Sesi tidak ditemukan'); setSaving(false); return; }

    const { error } = await supabase
      .from('profiles')
      .update({ nama_toko: namaToko, no_hp: noHp, alamat: alamat })
      .eq('id', userData.user.id);

    if (error) {
      setError('Gagal menyimpan: ' + error.message);
    } else {
      setSuccess('Pengaturan tersimpan ✅');
      setTimeout(() => setSuccess(''), 3000);
    }
    setSaving(false);
  }

  return (
    <AutoLogoutProvider>
      <AppShell>
        <h1 className="mb-4 text-lg font-bold text-slate-800">Pengaturan Toko</h1>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {success && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">{success}</p>}

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">Memuat...</p>
        ) : (
          <form onSubmit={save} className="max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-4 text-xs text-slate-400">
              Info ini akan tampil di <b>header struk</b> saat mencetak nota.
            </p>

            <label className="mb-1 block text-sm font-medium text-slate-600">Nama Toko</label>
            <input
              type="text" value={namaToko}
              onChange={(e) => setNamaToko(e.target.value)}
              placeholder="Contoh: Toko NB"
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />

            <label className="mb-1 block text-sm font-medium text-slate-600">No. HP / Telepon</label>
            <input
              type="text" value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
              placeholder="Contoh: 0812-3456-7890"
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />

            <label className="mb-1 block text-sm font-medium text-slate-600">Alamat</label>
            <textarea
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="Contoh: Jl. Merdeka No. 1, Jakarta"
              rows={3}
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />

            <button
              type="submit" disabled={saving}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : '💾 Simpan Pengaturan'}
            </button>
          </form>
        )}
      </AppShell>
    </AutoLogoutProvider>
  );
}
