'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="KasirFlex" className="mx-auto mb-3 h-16 w-16 rounded-xl object-contain" />
          <h1 className="text-xl font-bold text-slate-800">KasirFlex</h1>
          <p className="text-xs text-slate-400">by NB Projects</p>
        </div>

        <label className="mb-1 block text-sm font-medium text-slate-600">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          placeholder="nama@email.com" />

        <label className="mb-1 block text-sm font-medium text-slate-600">Password</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          placeholder="••••••••" />

        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
          {loading ? 'Masuk...' : 'Masuk'}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Belum punya akun?{' '}
          <Link href="/register" className="font-semibold text-emerald-600 hover:underline">Daftar akun</Link>
        </p>
      </form>
    </div>
  );
}
