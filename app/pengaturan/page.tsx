'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/components/AppShell';
import Struk from '@/components/Struk';
import { Alert, PageHeader, Spinner } from '@/components/ui';

export default function PengaturanPage() {
  const { profile, refresh } = useProfile();
  // Profil sudah dimuat oleh AppShell, jadi form langsung terisi tanpa loading ulang
  const [namaToko, setNamaToko] = useState(profile.nama_toko);
  const [noHp, setNoHp] = useState(profile.no_hp);
  const [alamat, setAlamat] = useState(profile.alamat);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!namaToko.trim()) {
      setError('Nama toko tidak boleh kosong.');
      return;
    }
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ nama_toko: namaToko.trim(), no_hp: noHp.trim(), alamat: alamat.trim() })
      .eq('id', profile.id);

    if (error) {
      setError('Gagal menyimpan: ' + error.message);
    } else {
      await refresh();
      setSuccess('Pengaturan tersimpan');
      setTimeout(() => setSuccess(''), 3000);
    }
    setSaving(false);
  }

  return (
    <div className="print:hidden">
      <PageHeader title="Pengaturan Toko" subtitle="Informasi ini tampil di bagian atas struk saat mencetak nota." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
        <form onSubmit={save} className="card space-y-4 p-4 sm:p-6 lg:col-span-3">
          {error && <Alert>{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}

          <div>
            <label htmlFor="nama" className="label">Nama Toko</label>
            <input id="nama" type="text" value={namaToko} onChange={(e) => setNamaToko(e.target.value)} placeholder="Contoh: Toko Maju Jaya" autoComplete="organization" className="input" />
          </div>

          <div>
            <label htmlFor="hp" className="label">No. HP / Telepon</label>
            <input id="hp" type="tel" inputMode="tel" value={noHp} onChange={(e) => setNoHp(e.target.value)} placeholder="Contoh: 0812-3456-7890" autoComplete="tel" className="input" />
          </div>

          <div>
            <label htmlFor="alamat" className="label">Alamat</label>
            <textarea id="alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Contoh: Jl. Merdeka No. 1, Semarang" rows={3} className="input resize-none" />
          </div>

          <button type="submit" disabled={saving} className="btn btn-primary w-full py-3 sm:w-auto sm:px-8">
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </form>

        {/* PRATINJAU STRUK LANGSUNG */}
        <aside className="lg:col-span-2">
          <div className="card p-4 sm:p-5 lg:sticky lg:top-24">
            <p className="mb-3 text-sm font-semibold text-slate-800">Pratinjau struk</p>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
              <Struk
                toko={{ nama_toko: namaToko.trim(), no_hp: noHp.trim(), alamat: alamat.trim() }}
                invoiceNo="KF-000000001"
                tanggal="Contoh tampilan"
                items={[
                  { nama: 'Contoh Produk A', qty: 2, harga: 15000 },
                  { nama: 'Contoh Produk B', qty: 1, harga: 8500 },
                ]}
                total={38500}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
