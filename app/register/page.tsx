'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const [namaToko, setNamaToko] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kode, setKode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { activation_code: kode.trim() } },
    });

    if (error) {
      setError(error.message); // pesan error asli dari Supabase
      setLoading(false);
      return;
    }

    // Simpan nama toko ke profil
    if (data.user) {
      await supabase.from('profiles').update({ nama_toko: namaToko }).eq('id', data.user.id);
    }

    if (data.session) {
      router.push('/dashboard');
    } else {
      setSuccess('Akun berhasil dibuat! Silakan masuk.');
      setTimeout(() => router.push('/login'), 1500);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <form onSubmit={handleRegister} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="KasirFlex" className="mx-auto mb-3 h-16 w-16 rounded-xl object-contain" />
          <h1 className="text-xl font-bold text-slate-800">Daftar Akun</h1>
          <p className="text-xs text-slate-400">KasirFlex by NB Projects</p>
        </div>

        <label className="mb-1 block text-sm font-medium text-slate-600">Nama Toko</label>
        <input type="text" required value={namaToko} onChange={(e) => setNamaToko(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" />

        <label className="mb-1 block text-sm font-medium text-slate-600">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" />

        <label className="mb-1 block text-sm font-medium text-slate-600">Password</label>
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" />

        <label className="mb-1 block text-sm font-medium text-slate-600">Kode Aktivasi</label>
        <input type="text" required value={kode} onChange={(e) => setKode(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          placeholder="Contoh: KF-ABCD-1234" />

        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {success && <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">{success}</p>}

        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
          {loading ? 'Mendaftar...' : 'Daftar'}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Sudah punya akun?{' '}
          <Link href="/login" className="font-semibold text-emerald-600 hover:underline">Masuk</Link>
        </p>
      </form>
    </div>
  );
}
