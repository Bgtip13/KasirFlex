'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LoadingBlock } from '@/components/ui';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      router.replace(data.session ? '/dashboard' : '/login');
    });
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100">
      <LoadingBlock label="Memuat KasirFlex..." />
    </div>
  );
}
