'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { friendlyAuthError } from '@/lib/format';
import AuthLayout from '@/components/AuthLayout';
import { Alert, Spinner } from '@/components/ui';
import { IconEye, IconEyeOff } from '@/components/icons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      setError(friendlyAuthError(error.message));
      setLoading(false);
      return;
    }

    router.replace('/dashboard');
  }

  return (
    <AuthLayout title="Masuk ke KasirFlex" subtitle="Kelola nota & penjualan toko Anda">
      <form onSubmit={handleLogin} className="space-y-4">
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-12"
              placeholder="••••••••"
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

        {error && <Alert>{error}</Alert>}

        <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
          {loading && <Spinner className="h-4 w-4" />}
          {loading ? 'Masuk...' : 'Masuk'}
        </button>

        <p className="text-center text-sm text-slate-600">
          Belum punya akun?{' '}
          <Link href="/register" className="font-semibold text-emerald-700 hover:underline">
            Daftar akun
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
