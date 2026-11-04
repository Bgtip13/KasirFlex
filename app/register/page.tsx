'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { friendlyAuthError } from '@/lib/format';
import AuthLayout from '@/components/AuthLayout';
import { Alert, Spinner } from '@/components/ui';
import { IconEye, IconEyeOff } from '@/components/icons';

export default function RegisterPage() {
  const router = useRouter();
  const [namaToko, setNamaToko] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [kode, setKode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const nama = namaToko.trim();

    // Kode aktivasi selalu huruf besar; nama toko ikut dikirim agar bisa disimpan
    // oleh database saat akun dibuat (tetap bekerja walau konfirmasi email aktif).
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { activation_code: kode.trim().toUpperCase(), nama_toko: nama } },
    });

    if (error) {
      setError(friendlyAuthError(error.message));
      setLoading(false);
      return;
    }

    // Supabase mengembalikan user "palsu" tanpa identities bila email sudah terdaftar
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError('Email ini sudah terdaftar. Silakan masuk.');
      setLoading(false);
      return;
    }

    if (data.session && data.user) {
      // Cadangan untuk database lama yang belum membaca nama_toko dari metadata
      await supabase.from('profiles').update({ nama_toko: nama }).eq('id', data.user.id);
      router.replace('/dashboard');
      return;
    }

    setSuccess('Akun berhasil dibuat! Silakan masuk (cek email bila diminta konfirmasi).');
    setTimeout(() => router.push('/login'), 2000);
  }

  return (
    <AuthLayout title="Daftar Akun" subtitle="Aktifkan KasirFlex dengan kode aktivasi">
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label htmlFor="nama" className="label">Nama Toko</label>
          <input
            id="nama"
            type="text"
            required
            autoComplete="organization"
            value={namaToko}
            onChange={(e) => setNamaToko(e.target.value)}
            className="input"
            placeholder="Contoh: Toko Maju Jaya"
          />
        </div>

        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="nama@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-12"
              placeholder="Minimal 6 karakter"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 hover:text-slate-700"
            >
              {showPw ? <IconEyeOff className="h-5 w-5" /> : <IconEye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="kode" className="label">Kode Aktivasi</label>
          <input
            id="kode"
            type="text"
            required
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            value={kode}
            onChange={(e) => setKode(e.target.value.toUpperCase())}
            className="input font-mono tracking-wider"
            placeholder="KF-ABCD-1234"
          />
        </div>

        {error && <Alert>{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <button type="submit" disabled={loading || !!success} className="btn btn-primary w-full py-3">
          {loading && <Spinner className="h-4 w-4" />}
          {loading ? 'Mendaftar...' : 'Daftar'}
        </button>

        <p className="text-center text-sm text-slate-600">
          Sudah punya akun?{' '}
          <Link href="/login" className="font-semibold text-emerald-700 hover:underline">
            Masuk
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
