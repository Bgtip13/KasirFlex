'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AppShell from '@/components/AppShell';
import AutoLogoutProvider from '@/components/AutoLogoutProvider';

type CartItem = { key: number; nama: string; harga: number; qty: number };
type Product = { id: string; nama: string; harga: number };

export default function EditNotaPage() {
  const { id } = useParams();
  const router = useRouter();
  const keyRef = useRef(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [manual, setManual] = useState({ nama: '', harga: '', qty: '1' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const { data: txn } = await supabase
      .from('transactions').select('id, invoice_no').eq('id', id).single();
    if (txn) setInvoiceNo(txn.invoice_no);

    const { data: items } = await supabase
      .from('transaction_items').select('item_name, quantity, price').eq('transaction_id', id);
    setCart((items || []).map((it) => ({
      key: ++keyRef.current,
      nama: it.item_name,
      harga: Number(it.price),
      qty: it.quantity,
    })));

    const { data: prods } = await supabase
      .from('products').select('*').order('created_at', { ascending: false });
    if (prods) setProducts(prods);
    setLoading(false);
  }

  const filtered = products.filter((p) => p.nama.toLowerCase().includes(search.toLowerCase()));

  function addProduct(p: Product) {
    setCart((prev) => {
      const found = prev.find((c) => c.nama === p.nama && c.harga === Number(p.harga));
      if (found) return prev.map((c) => (c === found ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { key: ++keyRef.current, nama: p.nama, harga: Number(p.harga), qty: 1 }];
    });
  }

  function addManual(e: React.FormEvent) {
    e.preventDefault();
    const nama = manual.nama.trim();
    const harga = Number(manual.harga);
    const qty = Number(manual.qty) || 1;
    if (!nama || !harga) return;
    setCart((prev) => [...prev, { key: ++keyRef.current, nama, harga, qty }]);
    setManual({ nama: '', harga: '', qty: '1' });
  }

  function updateQty(key: number, qty: number) {
    if (qty < 1) return;
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, qty } : c)));
  }

  function updateHarga(key: number, harga: number) {
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, harga } : c)));
  }

  function removeItem(key: number) {
    setCart((prev) => prev.filter((c) => c.key !== key));
  }

  const total = cart.reduce((sum, c) => sum + c.harga * c.qty, 0);

  async function save() {
    if (cart.length === 0) { setError('Nota kosong, tidak bisa disimpan'); return; }
    setSaving(true);
    setError('');

    const { error: tErr } = await supabase
      .from('transactions')
      .update({ total_amount: total, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (tErr) { setError('Gagal memperbarui nota'); setSaving(false); return; }

    const { error: dErr } = await supabase
      .from('transaction_items').delete().eq('transaction_id', id);
    if (dErr) { setError('Gagal menghapus item lama'); setSaving(false); return; }

    const items = cart.map((c) => ({
      transaction_id: id,
      item_name: c.nama,
      quantity: c.qty,
      price: c.harga,
      subtotal: c.harga * c.qty,
    }));
    const { error: iErr } = await supabase.from('transaction_items').insert(items);
    if (iErr) { setError('Gagal menyimpan item'); setSaving(false); return; }

    setSuccess('Nota berhasil diperbarui ✅');
    setTimeout(() => router.push('/riwayat'), 1200);
  }

  if (loading) {
    return (
      <AutoLogoutProvider><AppShell>
        <p className="py-10 text-center text-sm text-slate-400">Memuat nota...</p>
      </AppShell></AutoLogoutProvider>
    );
  }

  return (
    <AutoLogoutProvider>
      <AppShell>
        <h1 className="mb-1 text-lg font-bold text-slate-800">Edit Nota</h1>
        <p className="mb-4 text-xs text-slate-400">Nomor nota: <b className="text-slate-600">{invoiceNo}</b> (nomor tetap, isi yang diubah)</p>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {success && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">{success}</p>}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* KIRI: pilih produk tambahan */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Cari produk untuk ditambahkan..."
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => addProduct(p)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-left text-sm hover:border-emerald-300 hover:bg-emerald-50">
                  <span className="font-medium text-slate-700">{p.nama}</span>
                  <span className="font-semibold text-emerald-600">Rp {Number(p.harga).toLocaleString('id-ID')}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Produk tidak ditemukan</p>}
            </div>

            <form onSubmit={addManual} className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
              <input type="text" placeholder="Nama barang/jasa" value={manual.nama}
                onChange={(e) => setManual({ ...manual, nama: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none" required />
              <input type="number" placeholder="Harga" value={manual.harga}
                onChange={(e) => setManual({ ...manual, harga: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none" required />
              <input type="number" placeholder="Qty" value={manual.qty}
                onChange={(e) => setManual({ ...manual, qty: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none" required />
              <button type="submit" className="rounded-lg bg-slate-800 py-2 text-sm font-semibold text-white hover:bg-slate-700 sm:col-span-3">
                + Tambah Item Manual
              </button>
            </form>
          </div>

          {/* KANAN: daftar item editable */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-700">Item Nota ({cart.length})</p>
            <div className="space-y-2">
              {cart.map((c) => (
                <div key={c.key} className="rounded-xl border border-slate-100 p-2">
                  <div className="flex items-center gap-2">
                    <input type="text" value={c.nama} disabled
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-600" />
                    <button onClick={() => removeItem(c.key)} className="text-red-500 hover:text-red-700">✕</button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input type="number" value={c.qty} min={1}
                      onChange={(e) => updateQty(c.key, Number(e.target.value))}
                      className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm" />
                    <input type="number" value={c.harga}
                      onChange={(e) => updateHarga(c.key, Number(e.target.value))}
                      className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm" />
                    <p className="w-24 text-right text-sm font-semibold text-slate-700">
                      Rp {(c.harga * c.qty).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
              {cart.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Tidak ada item.</p>}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="font-semibold text-slate-700">Total</span>
              <span className="text-xl font-bold text-emerald-600">Rp {total.toLocaleString('id-ID')}</span>
            </div>

            <button onClick={save} disabled={saving || cart.length === 0}
              className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? 'Menyimpan...' : '💾 Simpan Perubahan'}
            </button>
          </div>
        </div>
      </AppShell>
    </AutoLogoutProvider>
  );
}
