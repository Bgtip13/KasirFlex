'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const IDLE_LIMIT = 60 * 60 * 1000; // 1 jam tanpa aktivitas
const THROTTLE_MS = 1000; // aktivitas dihitung maksimal 1x per detik (mousemove sangat sering)

export default function AutoLogoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let last = 0;

    async function logout() {
      await supabase.auth.signOut();
      router.replace('/login');
    }

    function arm() {
      clearTimeout(timer);
      timer = setTimeout(logout, IDLE_LIMIT);
    }

    function onActivity() {
      const now = Date.now();
      if (now - last < THROTTLE_MS) return;
      last = now;
      arm();
    }

    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    arm();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      clearTimeout(timer);
    };
  }, [router]);

  return <>{children}</>;
}
