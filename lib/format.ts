/** Format angka ke Rupiah, contoh: 15000 -> "Rp 15.000" */
export function rupiah(n: number | string | null | undefined): string {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

/** Format ringkas untuk label grafik: 1500000 -> "1.5jt", 25000 -> "25rb" */
export function compactRp(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return Math.round(n / 1_000) + 'rb';
  return String(n);
}

/** Kunci tanggal LOKAL (YYYY-MM-DD). Jangan pakai toISOString() — itu UTC dan membuat tanggal bergeser di WIB. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Ambil angka saja dari teks input: "Rp 15.000" -> 15000 (kosong -> 0) */
export function digitsToNumber(s: string): number {
  const clean = s.replace(/\D/g, '');
  return clean ? Math.min(Number(clean), 999_999_999_999) : 0;
}

/** Terjemahkan pesan error Supabase Auth ke bahasa Indonesia yang ramah */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email atau password salah.';
  if (m.includes('email not confirmed')) return 'Email belum dikonfirmasi. Cek kotak masuk email Anda.';
  if (m.includes('user already registered')) return 'Email ini sudah terdaftar. Silakan masuk.';
  if (m.includes('database error saving new user') || m.includes('kode aktivasi'))
    return 'Kode aktivasi tidak valid atau sudah digunakan.';
  if (m.includes('password should be at least')) return 'Password minimal 6 karakter.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Tidak ada koneksi internet. Periksa jaringan Anda.';
  return message;
}
