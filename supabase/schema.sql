CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nama_toko TEXT,
  no_hp TEXT,
  alamat TEXT,
  role TEXT DEFAULT 'kasir' CHECK (role IN ('admin','kasir')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activation_codes (
  code TEXT PRIMARY KEY,
  is_used BOOLEAN DEFAULT false,
  generated_by UUID REFERENCES profiles(id),
  used_by UUID REFERENCES profiles(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid() NOT NULL REFERENCES profiles(id),
  nama TEXT NOT NULL,
  harga NUMERIC NOT NULL,
  kategori TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid() NOT NULL REFERENCES profiles(id),
  invoice_no TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transaction_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INT NOT NULL,
  price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL
);

CREATE TABLE daily_invoice_seq (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  seq_date DATE NOT NULL,
  seq_value INT NOT NULL
);

-- Dipakai policy RLS: apakah pengguna saat ini admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- Nomor nota harian memakai tanggal WIB (Asia/Jakarta)
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

-- Pendaftaran: wajib kode aktivasi. Pengguna baru berperan 'kasir' (BUKAN admin).
-- Dijalankan AFTER INSERT karena profil merujuk ke baris auth.users yang sudah ada.
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code TEXT := upper(trim(COALESCE(NEW.raw_user_meta_data->>'activation_code', '')));
  v_nama TEXT := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'nama_toko', '')), '');
BEGIN
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

CREATE TRIGGER validate_activation_code_after_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();

-- Data pelanggan untuk Panel Admin (hanya admin)
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

-- ---------------- Row Level Security ----------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_invoice_seq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lihat profil sendiri" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "edit profil sendiri" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Pengguna hanya boleh mengubah 3 kolom ini (kolom "role" TIDAK boleh diubah dari aplikasi)
REVOKE UPDATE ON profiles FROM anon, authenticated;
GRANT UPDATE (nama_toko, no_hp, alamat) ON profiles TO authenticated;

-- Kode aktivasi hanya terlihat & dikelola oleh admin
CREATE POLICY "admin baca kode" ON activation_codes FOR SELECT USING (public.is_admin());
CREATE POLICY "admin generate kode" ON activation_codes FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admin hapus kode" ON activation_codes FOR DELETE USING (public.is_admin() AND is_used = false);

CREATE POLICY "produk per toko" ON products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "nota per toko" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "item per toko" ON transaction_items FOR ALL USING (
  transaction_id IN (SELECT id FROM transactions WHERE user_id = auth.uid()));

-- Akun pemilik (admin). Buat user ini di Supabase → Authentication → Add user SEBELUM menjalankan
-- file ini (trigger pendaftaran menolak user baru tanpa kode aktivasi). Baris ini lalu menjadikannya admin.
INSERT INTO public.profiles (id, nama_toko, role)
SELECT id, 'Toko NB', 'admin' FROM auth.users WHERE email = 'admin@nbprojects.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
