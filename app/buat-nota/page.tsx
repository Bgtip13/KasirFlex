'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AppShell from '@/components/AppShell';
import AutoLogoutProvider from '@/components/AutoLogoutProvider';
import Struk from '@/components/Struk';

type Product = { id: string; nama: string; harga: number; kategori: string | null };
type CartItem = { key: number; nama: string; harga: number; qty: number };
type TokoData = { nama_toko: string; no_hp: string; alamat: string };
type StrukData = { invoiceNo: string; tanggal: string; items: { nama: string; qty: number; harga: number }[]; total: number };

export default function BuatNotaPage() {
  const keyRef = useRef(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [manual, setManual] = useState({ nama: '', harga: '', qty: '1' });
  const [showManual, setShowManual] = useState(false);
  const [toko, setToko] = useState<TokoData>({ nama_toko: '', no_hp: '', alamat: '' });
  const [struk, setStruk] = useState<StrukData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProducts();
    loadToko();
  }, []);

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProducts(data);
  }

  async function loadToko() {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data } = await supabase
        .from('profiles')
        .select('nama_toko, no_hp, alamat')
        .eq('id', userData.user.id)
        .single();
      if (data) setToko(data);
    }
  }

  const filtered = products.filter((p) =>
    p.nama.toLowerCase().includes(search.toLowerCase()) ||
    (p.kategori || '').toLowerCase().includes(search.toLowerCase())
  );

  function addProduct(p: Product) {
    setCart((prev) => {
      const found = prev.find((c) => c.nama === p.nama && c.harga === Number(p.harga));
      if (found) {
        return prev.map((c) => (c === found ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { key: ++keyRef.current, nama: p.nama, harga: Number(p.harga), qty: 1 }];
    });
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    const nama = manual.nama.trim();
    const harga = Number(manual.harga);
    const qty = Number(manual.qty) || 1;
    if (!nama || !harga) return;

    // Simpan juga ke master produk agar muncul di daftar lain kali
    await supabase.from('products').insert({ nama, harga }).select().single();

    setCart((prev) => [...prev, { key: ++keyRef.current, nama, harga, qty }]);
    setManual({ nama: '', harga: '', qty: '1' });
    setSuccess('Produk disimpan ke master & ditambahkan ke nota ✅');
    setTimeout(() => setSuccess(''), 2500);
    loadProducts();
  }

  function updateQty(key: number, qty: number) {
    if (qty < 1) return;
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, qty } : c)));
  }

  function removeItem(key: number) {
    setCart((prev) => prev.filter((c) => c.key !== key));
  }

  const total = cart.reduce((sum, c) => sum + c.harga * c.qty, 0);

  async function saveNote() {
    if (cart.length === 0) { setError('Nota masih kosong'); return; }
    setSaving(true);
    setError('');

    // 1. Ambil nomor nota otomatis (KF-YYMMDDNNN)
    const { data: invoiceNo, error: invErr } = await supabase.rpc('generate_invoice_no');
    if (invErr) { setError('Gagal membuat nomor nota'); setSaving(false); return; }

    // 2. Simpan transaksi
    const { data: txn, error: txnErr } = await supabase
      .from('transactions')
      .insert({ invoice_no: invoiceNo, total_amount: total })
      .select()
      .single();
    if (txnErr) { setError('Gagal menyimpan nota'); setSaving(false); return; }

    // 3. Simpan item-itemnya
    const items = cart.map((c) => ({
      transaction_id: txn.id,
      item_name: c.nama,
      quantity: c.qty,
      price: c.harga,
      subtotal: c.harga * c.qty,
    }));
    const { error: itemsErr } = await supabase.from('transaction_items').insert(items);
    if (itemsErr) { setError('Gagal menyimpan item nota'); setSaving(false); return; }

    // 4. Tampilkan preview struk
    const tanggal = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    setStruk({
      invoiceNo,
      tanggal,
      items: cart.map((c) => ({ nama: c.nama, qty: c.qty, harga: c.harga })),
      total,
    });
    setSaving(false);
  }

  return (
    <AutoLogoutProvider>
      <AppShell>
        <h1 className="mb-4 text-lg font-bold text-slate-800">Buat Nota</h1>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {success && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">{success}</p>}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* KIRI: pilih produk */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Cari produk..."
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />

            <div className="max-h-64 space-y-1 overflow-y-auto">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-left text-sm hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <span>
                    <span className="font-medium text-slate-700">{p.nama}</span>
                    {p.kategori && (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{p.kategori}</span>
                    )}
                  </span>
                  <span className="font-semibold text-emerald-600">Rp {Number(p.harga).toLocaleString('id-ID')}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Produk tidak ditemukan</p>}
            </div>

            <button
              onClick={() => setShowManual(!showManual)}
              className="mt-3 text-sm font-semibold text-emerald-600 hover:underline"
            >
              + Tambah produk manual
            </button>

            {showManual && (
              <form onSubmit={addManual} className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input
                  type="text" placeholder="Nama barang/jasa" value={manual.nama}
                  onChange={(e) => setManual({ ...manual, nama: e.target.value })}
                  className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none" required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number" placeholder="Harga" value={manual.harga}
                    onChange={(e) => setManual({ ...manual, harga: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none" required
                  />
                  <input
                    type="number" placeholder="Qty" value={manual.qty}
                    onChange={(e) => setManual({ ...manual, qty: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none" required
                  />
                </div>
                <button type="submit" className="mt-2 w-full rounded-lg bg-slate-800 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  Tambahkan
                </button>
              </form>
            )}
          </div>

          {/* KANAN: keranjang */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-700">Daftar Item ({cart.length})</p>

            {cart.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">Belum ada item. Klik produk di kiri untuk menambahkan.</p>
            )}

            <div className="space-y-2">
              {cart.map((c) => (
                <div key={c.key} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{c.nama}</p>
                    <p className="text-xs text-slate-400">Rp {c.harga.toLocaleString('id-ID')}</p>
                  </div>
                  <input
                    type="number" value={c.qty} min={1}
                    onChange={(e) => updateQty(c.key, Number(e.target.value))}
                    className="w-14 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm"
                  />
                  <p className="w-20 text-right text-sm font-semibold text-slate-700">Rp {(c.harga * c.qty).toLocaleString('id-ID')}</p>
                  <button onClick={() => removeItem(c.key)} className="text-red-500 hover:text-red-700">✕</button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="font-semibold text-slate-700">Total</span>
              <span className="text-xl font-bold text-emerald-600">Rp {total.toLocaleString('id-ID')}</span>
            </div>

            <button
              onClick={saveNote}
              disabled={saving || cart.length === 0}
              className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan & Cetak 🖨️'}
            </button>
          </div>
        </div>

        {/* MODAL PREVIEW STRUK */}
        {struk && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-4">
              <Struk {...struk} toko={toko} />
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  🖨️ Cetak
                </button>
                <button
                  onClick={() => { setStruk(null); setCart([]); }}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </AutoLogoutProvider>
  );
}
