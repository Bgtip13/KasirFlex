'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/components/AppShell';
import { useCart } from '@/lib/useCart';
import { digitsToNumber, rupiah } from '@/lib/format';
import CartItemRow from '@/components/CartItemRow';
import ReceiptModal from '@/components/ReceiptModal';
import { Alert, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { IconCart, IconPlus, IconPrinter, IconSearch } from '@/components/icons';
import type { StrukProps } from '@/components/Struk';

type Product = { id: string; nama: string; harga: number; kategori: string | null };
type StrukData = Omit<StrukProps, 'toko'>;

const keyOf = (nama: string, harga: number) => `${nama}|${harga}`;

export default function BuatNotaPage() {
  const { profile } = useProfile();
  const cart = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'produk' | 'nota'>('produk'); // hanya dipakai di layar < lg
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ nama: '', harga: '', qty: '1', kategori: '' });
  const [struk, setStruk] = useState<StrukData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadProducts() {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) setError('Gagal memuat produk: ' + error.message);
    else setProducts(data ?? []);
    setLoadingProducts(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.nama.toLowerCase().includes(q) || (p.kategori || '').toLowerCase().includes(q));
  }, [products, search]);

  // jumlah tiap produk yang sudah ada di nota (untuk lencana "×2" di daftar produk)
  const qtyInCart = useMemo(() => {
    const m = new Map<string, number>();
    cart.items.forEach((c) => m.set(keyOf(c.nama, c.harga), (m.get(keyOf(c.nama, c.harga)) ?? 0) + c.qty));
    return m;
  }, [cart.items]);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 2500);
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const nama = manual.nama.trim();
    const harga = digitsToNumber(manual.harga);
    const qty = Math.max(1, digitsToNumber(manual.qty));
    const kategori = manual.kategori.trim();
    if (!nama || harga <= 0) {
      setError('Isi nama barang dan harga (harus lebih dari 0).');
      return;
    }

    // Simpan ke master produk hanya jika belum ada (nama & harga sama) agar tidak menggandakan daftar
    const exists = products.some((p) => p.nama.toLowerCase() === nama.toLowerCase() && Number(p.harga) === harga);
    let savedToMaster = false;
    if (!exists) {
      const { error: insErr } = await supabase.from('products').insert({ nama, harga, kategori: kategori || null });
      if (insErr) setError('Item ditambahkan ke nota, tetapi gagal disimpan ke daftar produk: ' + insErr.message);
      else savedToMaster = true;
    }

    cart.add(nama, harga, qty);
    setManual({ nama: '', harga: '', qty: '1', kategori: '' });
    if (savedToMaster) {
      flash('Produk disimpan ke daftar & ditambahkan ke nota');
      loadProducts();
    } else if (exists) {
      flash('Ditambahkan ke nota');
    }
  }

  async function saveNote() {
    // buang item berjumlah 0 / nama kosong
    const valid = cart.items.filter((c) => c.qty > 0 && c.nama.trim());
    if (valid.length === 0) {
      setError('Nota masih kosong');
      return;
    }
    setSaving(true);
    setError('');
    const total = valid.reduce((s, c) => s + c.harga * c.qty, 0);

    const { data: invoiceNo, error: invErr } = await supabase.rpc('generate_invoice_no');
    if (invErr || !invoiceNo) {
      setError('Gagal membuat nomor nota' + (invErr ? ': ' + invErr.message : ''));
      setSaving(false);
      return;
    }

    const { data: txn, error: txnErr } = await supabase
      .from('transactions')
      .insert({ invoice_no: invoiceNo, total_amount: total })
      .select()
      .single();
    if (txnErr || !txn) {
      setError('Gagal menyimpan nota' + (txnErr ? ': ' + txnErr.message : ''));
      setSaving(false);
      return;
    }

    const rows = valid.map((c) => ({
      transaction_id: txn.id,
      item_name: c.nama,
      quantity: c.qty,
      price: c.harga,
      subtotal: c.harga * c.qty,
    }));
    const { error: itemsErr } = await supabase.from('transaction_items').insert(rows);
    if (itemsErr) {
      // Batalkan nota agar tidak ada nota "kosong" tanpa item di riwayat
      await supabase.from('transactions').delete().eq('id', txn.id);
      setError('Gagal menyimpan item nota: ' + itemsErr.message);
      setSaving(false);
      return;
    }

    setStruk({
      invoiceNo,
      tanggal: new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }),
      items: valid.map((c) => ({ nama: c.nama, qty: c.qty, harga: c.harga })),
      total,
    });
    // Kosongkan keranjang SEKARANG (bukan saat modal ditutup) supaya nota tidak tersimpan dua kali
    cart.clear();
    setTab('produk');
    setSaving(false);
  }

  const canSave = cart.items.length > 0 && !saving;

  return (
    <div className="pb-20 lg:pb-0">
      <div className="print:hidden">
        <PageHeader title="Buat Nota" subtitle="Pilih produk, atur jumlah, lalu simpan & cetak." />

        <div className="mb-3 space-y-2 empty:hidden">
          {error && <Alert>{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}
        </div>

        {/* TAB (HP & tablet portrait) */}
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1 lg:hidden" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'produk'}
            onClick={() => setTab('produk')}
            className={`min-h-10 rounded-lg text-sm font-semibold transition ${tab === 'produk' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Produk
          </button>
          <button
            role="tab"
            aria-selected={tab === 'nota'}
            onClick={() => setTab('nota')}
            className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${tab === 'nota' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Nota
            {cart.items.length > 0 && (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">{cart.items.length}</span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
          {/* KIRI: PILIH PRODUK */}
          <section className={`card p-4 lg:col-span-3 ${tab === 'produk' ? '' : 'hidden lg:block'}`}>
            <div className="relative mb-3">
              <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari produk atau kategori..."
                aria-label="Cari produk"
                className="input pl-10"
              />
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <Spinner className="h-4 w-4 text-emerald-600" /> Memuat produk...
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                title={products.length === 0 ? 'Belum ada produk' : 'Produk tidak ditemukan'}
                hint={products.length === 0 ? 'Tambahkan produk lewat tombol "Tambah produk manual" di bawah.' : 'Coba kata kunci lain.'}
              />
            ) : (
              <div className="grid max-h-[55vh] grid-cols-1 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-2">
                {filtered.map((p) => {
                  const inCart = qtyInCart.get(keyOf(p.nama, Number(p.harga))) ?? 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => cart.add(p.nama, Number(p.harga))}
                      className={`relative flex min-h-14 items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition active:scale-[0.98] ${
                        inCart > 0 ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/60'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-semibold text-slate-800">{p.nama}</span>
                        {p.kategori && <span className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{p.kategori}</span>}
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-bold text-emerald-700">{rupiah(p.harga)}</span>
                        {inCart > 0 && <span className="rounded-full bg-emerald-600 px-2 text-[11px] font-bold text-white">×{inCart}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <button onClick={() => setShowManual((v) => !v)} className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline">
              <IconPlus className="h-4 w-4" /> {showManual ? 'Tutup form produk manual' : 'Tambah produk manual'}
            </button>

            {showManual && (
              <form onSubmit={addManual} className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input
                  type="text"
                  placeholder="Nama barang / jasa"
                  aria-label="Nama barang"
                  value={manual.nama}
                  onChange={(e) => setManual({ ...manual, nama: e.target.value })}
                  className="input"
                  required
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Harga"
                    aria-label="Harga"
                    value={manual.harga}
                    onChange={(e) => setManual({ ...manual, harga: e.target.value.replace(/\D/g, '') })}
                    className="input col-span-2"
                    required
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Qty"
                    aria-label="Jumlah"
                    value={manual.qty}
                    onChange={(e) => setManual({ ...manual, qty: e.target.value.replace(/\D/g, '') })}
                    className="input text-center"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Kategori (opsional)"
                  aria-label="Kategori"
                  value={manual.kategori}
                  onChange={(e) => setManual({ ...manual, kategori: e.target.value })}
                  className="input"
                />
                <button type="submit" className="btn btn-dark w-full">
                  Tambahkan ke Nota
                </button>
              </form>
            )}
          </section>

          {/* KANAN: NOTA / KERANJANG */}
          <section className={`card p-4 lg:sticky lg:top-24 lg:col-span-2 lg:self-start ${tab === 'nota' ? '' : 'hidden lg:block'}`}>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <IconCart className="h-4 w-4 text-emerald-600" /> Daftar Item ({cart.items.length})
            </p>

            {cart.items.length === 0 ? (
              <EmptyState icon={<IconCart className="h-6 w-6" />} title="Nota masih kosong" hint="Pilih produk dari daftar untuk menambahkannya ke nota." />
            ) : (
              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-0.5">
                {cart.items.map((c) => (
                  <CartItemRow
                    key={c.key}
                    item={c}
                    onChangeQty={(d) => cart.changeQty(c.key, d)}
                    onSetQty={(q) => cart.setQty(c.key, q)}
                    onBlurQty={() => cart.normalizeQty(c.key)}
                    onRemove={() => cart.remove(c.key)}
                  />
                ))}
              </div>
            )}

            {/* Total + tombol (versi layar lebar) */}
            <div className="mt-4 hidden border-t border-slate-200 pt-4 lg:block">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Total</span>
                <span className="text-2xl font-bold text-emerald-700">{rupiah(cart.total)}</span>
              </div>
              <button onClick={saveNote} disabled={!canSave} className="btn btn-primary mt-4 w-full py-3 text-base">
                {saving ? <Spinner className="h-4 w-4" /> : <IconPrinter className="h-5 w-5" />}
                {saving ? 'Menyimpan...' : 'Simpan & Cetak'}
              </button>
            </div>
          </section>
        </div>

        {/* BAR TOTAL MENEMPEL (HP & tablet portrait) — berada di atas navigasi bawah */}
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-600">{cart.items.length} item · {cart.count} pcs</p>
              <p className="truncate text-lg font-bold text-emerald-700">{rupiah(cart.total)}</p>
            </div>
            {tab === 'produk' && cart.items.length > 0 ? (
              <button onClick={() => setTab('nota')} className="btn btn-outline shrink-0">
                Lihat Nota
              </button>
            ) : null}
            <button onClick={saveNote} disabled={!canSave} className="btn btn-primary shrink-0">
              {saving ? <Spinner className="h-4 w-4" /> : <IconPrinter className="h-4 w-4" />}
              {saving ? 'Menyimpan' : 'Simpan & Cetak'}
            </button>
          </div>
        </div>
      </div>

      {/* PRATINJAU STRUK */}
      {struk && <ReceiptModal data={struk} toko={profile} onClose={() => setStruk(null)} closeLabel="Selesai" />}
    </div>
  );
}
