-- =====================================================================
-- KasirFlex — PATCH untuk database YANG SUDAH BERJALAN
-- Jalankan di Supabase → SQL Editor. Aman dijalankan berulang (idempotent).
-- BACA KOMENTAR sebelum menjalankan, terutama bagian "A".
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Kolom tambahan: kapan kode aktivasi dipakai
-- ---------------------------------------------------------------------
ALTER TABLE public.activation_codes ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

-- isi data lama dari tanggal daftar akun
UPDATE public.activation_codes ac
SET used_at = u.created_at
FROM auth.users u
WHERE ac.used_by = u.id AND ac.used_at IS NULL;

-- ---------------------------------------------------------------------
-- 1. Fungsi bantu: apakah pengguna saat ini admin?
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- ---------------------------------------------------------------------
-- 2. KEAMANAN: kode aktivasi tidak boleh dibaca publik
--    Sebelumnya policy "baca kode aktivasi" USING (true) membuat SIAPA PUN
--    (bahkan tanpa login) bisa membaca semua kode lalu mendaftar gratis.
--    Pendaftaran tidak butuh policy ini (dicek oleh trigger SECURITY DEFINER).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "baca kode aktivasi" ON public.activation_codes;
DROP POLICY IF EXISTS "admin baca kode" ON public.activation_codes;
CREATE POLICY "admin baca kode" ON public.activation_codes
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin generate kode" ON public.activation_codes;
CREATE POLICY "admin generate kode" ON public.activation_codes
  FOR INSERT WITH CHECK (public.is_admin());

-- Sebelumnya TIDAK ADA policy DELETE → tombol "Hapus" tampak sukses padahal tidak menghapus apa pun.
DROP POLICY IF EXISTS "admin hapus kode" ON public.activation_codes;
CREATE POLICY "admin hapus kode" ON public.activation_codes
  FOR DELETE USING (public.is_admin() AND is_used = false);

-- ---------------------------------------------------------------------
-- 3. KEAMANAN: pengguna tidak boleh mengubah kolom "role" miliknya sendiri
--    Sebelumnya policy UPDATE profil tidak membatasi kolom, sehingga lewat
--    konsol browser siapa pun bisa menjalankan: update profiles set role='admin'.
--    Sekarang hanya 3 kolom ini yang boleh diubah dari aplikasi.
-- ---------------------------------------------------------------------
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (nama_toko, no_hp, alamat) ON public.profiles TO authenticated;

-- ---------------------------------------------------------------------
-- 4. KEAMANAN: tabel nomor urut nota ikut dilindungi RLS
--    (fungsi generate_invoice_no tetap jalan karena SECURITY DEFINER)
-- ---------------------------------------------------------------------
ALTER TABLE public.daily_invoice_seq ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 5. Nomor nota memakai tanggal WIB (bukan UTC)
--    Catatan: pada HARI PERTAMA patch ini dijalankan, nomor urut bisa mulai
--    dari 001 lagi dan sekali-sekali bertabrakan dengan nomor sebelumnya di hari yang sama.
--    Jalankan patch setelah toko tutup / di luar jam ramai.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_invoice_no()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_date DATE := (now() AT TIME ZONE 'Asia/Jakarta')::date;
  v_seq  INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Belum login';
  END IF;

  INSERT INTO public.daily_invoice_seq (user_id, seq_date, seq_value)
  VALUES (auth.uid(), v_date, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET seq_value = CASE WHEN public.daily_invoice_seq.seq_date = v_date
                       THEN public.daily_invoice_seq.seq_value + 1 ELSE 1 END,
      seq_date = v_date
  RETURNING seq_value INTO v_seq;

  RETURN 'KF-' || to_char(v_date, 'YYMMDD') || LPAD(v_seq::text, 3, '0');
END $$;

-- ---------------------------------------------------------------------
-- 6. Pendaftaran: trigger yang benar
--    - AFTER INSERT (profil butuh baris auth.users yang sudah ada, kalau BEFORE akan melanggar foreign key)
--    - membaca nama_toko dari metadata pendaftaran
--    - kode aktivasi tidak peka huruf besar/kecil
--    - pengguna baru mendapat role 'kasir', BUKAN 'admin' (lihat bagian A)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code TEXT := upper(trim(COALESCE(NEW.raw_user_meta_data->>'activation_code', '')));
  v_nama TEXT := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'nama_toko', '')), '');
BEGIN
  -- profil dulu (activation_codes.used_by merujuk ke profiles.id)
  INSERT INTO public.profiles (id, role, nama_toko)
  VALUES (NEW.id, 'kasir', COALESCE(v_nama, 'Toko Baru'))
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.activation_codes
  SET is_used = true, used_by = NEW.id, used_at = NOW()
  WHERE code = v_code AND is_used = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kode aktivasi tidak valid atau sudah digunakan';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS validate_activation_code_after_signup ON auth.users;
CREATE TRIGGER validate_activation_code_after_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'kasir';

-- ---------------------------------------------------------------------
-- 7. Fungsi untuk Panel Admin (sebelumnya tidak ada di schema.sql)
--    Hanya bisa dipanggil admin.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_admin_customers();
CREATE OR REPLACE FUNCTION public.get_admin_customers()
RETURNS TABLE (
  code TEXT,
  email TEXT,
  nama_toko TEXT,
  no_hp TEXT,
  alamat TEXT,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  total_nota BIGINT,
  total_penjualan NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak';
  END IF;

  RETURN QUERY
  SELECT
    ac.code,
    u.email::text,
    p.nama_toko,
    p.no_hp,
    p.alamat,
    ac.used_at,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(t.cnt, 0)::bigint,
    COALESCE(t.sum_total, 0)::numeric
  FROM public.activation_codes ac
  JOIN auth.users u ON u.id = ac.used_by
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt, SUM(tr.total_amount) AS sum_total
    FROM public.transactions tr
    WHERE tr.user_id = u.id
  ) t ON true
  WHERE ac.is_used = true
  ORDER BY ac.used_at DESC NULLS LAST;
END $$;

REVOKE ALL ON FUNCTION public.get_admin_customers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_customers() TO authenticated;

-- =====================================================================
-- A. PERIKSA DULU — pelanggan lama kemungkinan masih ber-role 'admin'
--    Trigger lama memberi role 'admin' ke SEMUA pendaftar, artinya setiap
--    pelanggan bisa membuka Panel Admin dan membuat kode aktivasi sendiri.
--
--    1) Lihat siapa saja yang admin:
--         SELECT p.id, u.email, p.nama_toko, p.role
--         FROM public.profiles p JOIN auth.users u ON u.id = p.id
--         ORDER BY p.role, u.email;
--
--    2) Jika hanya akun pemilik yang boleh admin, jalankan (GANTI email jika perlu):
--         UPDATE public.profiles
--         SET role = 'kasir'
--         WHERE id IN (SELECT id FROM auth.users WHERE email <> 'admin@nbprojects.com');
-- =====================================================================
