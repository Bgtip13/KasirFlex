CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nama_toko TEXT,
  no_hp TEXT,
  alamat TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin','kasir')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activation_codes (
  code TEXT PRIMARY KEY,
  is_used BOOLEAN DEFAULT false,
  generated_by UUID REFERENCES profiles(id),
  used_by UUID REFERENCES profiles(id),
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

CREATE OR REPLACE FUNCTION generate_invoice_no()
RETURNS TEXT AS $$
DECLARE
  v_date DATE := CURRENT_DATE;
  v_seq INT;
BEGIN
  INSERT INTO daily_invoice_seq (user_id, seq_date, seq_value)
  VALUES (auth.uid(), v_date, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET seq_value = CASE WHEN daily_invoice_seq.seq_date = v_date
                       THEN daily_invoice_seq.seq_value + 1 ELSE 1 END,
      seq_date = v_date
  RETURNING seq_value INTO v_seq;
  RETURN 'KF-' || to_char(v_date,'YYMMDD') || LPAD(v_seq::text,3,'0');
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_user_registration()
RETURNS TRIGGER AS $$
DECLARE v_code TEXT := NEW.raw_user_meta_data->>'activation_code';
BEGIN
  UPDATE activation_codes SET is_used = true, used_by = NEW.id
  WHERE code = v_code AND is_used = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kode aktivasi tidak valid atau sudah digunakan';
  END IF;
  INSERT INTO public.profiles (id, role, nama_toko)
  VALUES (NEW.id, 'admin', 'Toko Baru');
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER validate_activation_code_after_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user_registration();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lihat profil sendiri" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "edit profil sendiri" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "baca kode aktivasi" ON activation_codes FOR SELECT USING (true);
CREATE POLICY "admin generate kode" ON activation_codes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "produk per toko" ON products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "nota per toko" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "item per toko" ON transaction_items FOR ALL USING (
  transaction_id IN (SELECT id FROM transactions WHERE user_id = auth.uid()));
INSERT INTO public.profiles (id, nama_toko, role)
SELECT id, 'Toko NB', 'admin' FROM auth.users WHERE email = 'admin@nbprojects.com'
ON CONFLICT (id) DO NOTHING;
