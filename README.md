# KasirFlex by NB Projects

Aplikasi kasir berbasis web: buat nota, cetak struk, riwayat penjualan, dan panel admin
untuk kode aktivasi pelanggan. Dibuat dengan **Next.js (App Router)**, **Tailwind CSS 4**, dan **Supabase**.

Tampilan responsif untuk **HP** (navigasi bawah), **tablet**, dan **PC** (sidebar).

## Menjalankan di komputer

```bash
npm install
cp .env.example .env.local   # lalu isi URL & anon key Supabase
npm run dev                  # buka http://localhost:3000
```

## Menyiapkan database (Supabase)

- **Proyek baru:** jalankan `supabase/schema.sql` di *SQL Editor*
  (buat dulu user `admin@nbprojects.com` di *Authentication → Add user*).
- **Database yang sudah berjalan:** jalankan `supabase/patch-2026-11.sql`
  (perbaikan keamanan + fungsi Panel Admin). **Baca komentar di dalam file sebelum menjalankan.**

## Struktur singkat

```
app/
  login, register          halaman publik
  (app)/                   halaman setelah login, berbagi satu AppShell
    dashboard, buat-nota, riwayat, riwayat/[id]/edit, pengaturan, admin
components/                AppShell, Modal, Struk, ReceiptModal, CartItemRow, ...
lib/                       supabase client, format (Rupiah/tanggal), useCart
supabase/                  schema.sql dan patch SQL
```

## Mencetak struk

Tombol **Cetak** memakai dialog cetak browser (`window.print()`); hanya struk yang tercetak.
Di HP, pilih printer/“Simpan sebagai PDF” dari dialog cetak. Untuk printer thermal,
pilih ukuran kertas 58/80 mm di pengaturan printer.

## Deploy

Deploy ke Vercel dan isi dua environment variable di atas pada pengaturan proyek.
