'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const IDLE_LIMIT = 60 * 60 * 1000; // 1 jam

export default function AutoLogoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    async function logout() {
      await supabase.auth.signOut();
      router.replace('/login');
    }

    function reset() {
      clearTimeout(timer);
      timer = setTimeout(logout, IDLE_LIMIT);
    }

    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, reset));
    reset();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, reset));
      clearTimeout(timer);
    };
  }, [router]);

  return <>{children}</>;
}
