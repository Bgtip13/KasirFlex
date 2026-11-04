'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/lib/useCart';
import { digitsToNumber, rupiah } from '@/lib/format';
import CartItemRow from '@/components/CartItemRow';
import { Alert, EmptyState, LoadingBlock, PageHeader, Spinner } from '@/components/ui';
import { IconCart, IconPlus, IconSearch } from '@/components/icons';

type Product = { id: string; nama: string; harga: number; kategori: string | null };

export default function EditNotaPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const cart = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [oldItemIds, setOldItemIds] = useState<string[]>([]);
  const [manual, setManual] = useState({ nama: '', harga: '', qty: '1' });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { replaceAll } = cart;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: txn } = await supabase.from('transactions').select('id, invoice_no').eq('id', id).maybeSingle();
      if (cancelled) return;
      if (!txn) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setInvoiceNo(txn.invoice_no);

      const { data: items } = await supabase
        .from('transaction_items')
        .select('id, item_name, quantity, price')
        .eq('transaction_id', id);
      const { data: prods } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (cancelled) return;

      setOldItemIds((items ?? []).map((it) => it.id));
      replaceAll((items ?? []).map((it) => ({ nama: it.item_name, harga: Number(it.price), qty: it.quantity })));
      setProducts(prods ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, replaceAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => p.nama.toLowerCase().includes(q)) : products;
  }, [products, search]);

  function addManual(e: React.FormEvent) {
    e.preventDefault();
    const nama = manual.nama.trim();
    const harga = digitsToNumber(manual.harga);
    const qty = Math.max(1, digitsToNumber(manual.qty));
    if (!nama || harga <= 0) return;
    cart.add(nama, harga, qty);
    setManual({ nama: '', harga: '', qty: '1' });
  }

  async function save() {
    const valid = cart.items.filter((c) => c.qty > 0 && c.nama.trim());
    if (valid.length === 0) {
      setError('Nota kosong, tidak bisa disimpan');
      return;
    }
    setSaving(true);
    setError('');
    const total = valid.reduce((s, c) => s + c.harga * c.qty, 0);

    // URUTAN AMAN: tambah item baru dulu → hapus item lama → baru perbarui total.
    // Dengan begitu, bila ada langkah yang gagal, item nota tidak hilang.
    const rows = valid.map((c) => ({
      transaction_id: id,
      item_name: c.nama.trim(),
      quantity: c.qty,
      price: c.harga,
      subtotal: c.harga * c.qty,
    }));
    const { data: inserted, error: iErr } = await supabase.from('transaction_items').insert(rows).select('id');
    if (iErr || !inserted) {
      setError('Gagal menyimpan item: ' + (iErr?.message ?? 'tidak ada data'));
      setSaving(false);
      return;
    }
    const newIds = inserted.map((r) => r.id as string);

    if (oldItemIds.length > 0) {
      const { error: dErr } = await supabase.from('transaction_items').delete().in('id', oldItemIds);
      if (dErr) {
        await supabase.from('transaction_items').delete().in('id', newIds); // batalkan item baru
        setError('Gagal mengganti item lama: ' + dErr.message);
        setSaving(false);
        return;
      }
    }
    setOldItemIds(newIds);

    const { error: tErr } = await supabase
      .from('transactions')
      .update({ total_amount: total, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (tErr) {
      setError('Item tersimpan, tetapi gagal memperbarui total nota: ' + tErr.message + '. Tekan Simpan sekali lagi.');
      setSaving(false);
      return;
    }

    setSuccess('Nota berhasil diperbarui');
    setTimeout(() => router.push('/riwayat'), 1000);
  }

  if (loading) return <LoadingBlock label="Memuat nota..." />;

  if (notFound) {
    return (
      <div className="card">
        <EmptyState title="Nota tidak ditemukan" hint="Nota mungkin sudah dihapus atau bukan milik toko Anda." />
        <div className="pb-6 text-center">
          <Link href="/riwayat" className="btn btn-outline">Kembali ke Riwayat</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title="Edit Nota"
        subtitle={<>Nomor nota: <b className="text-slate-800">{invoiceNo}</b> (nomor tetap, isinya yang diubah)</>}
        action={<Link href="/riwayat" className="btn btn-outline btn-sm">← Kembali</Link>}
      />

      <div className="mb-3 space-y-2 empty:hidden">
        {error && <Alert>{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
        {/* ITEM NOTA (utama) */}
        <section className="card p-4 lg:col-span-3">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <IconCart className="h-4 w-4 text-emerald-600" /> Item Nota ({cart.items.length})
          </p>

          {cart.items.length === 0 ? (
            <EmptyState title="Tidak ada item" hint="Tambahkan item dari panel “Tambah Item”." />
          ) : (
            <div className="space-y-2">
              {cart.items.map((c) => (
                <CartItemRow
                  key={c.key}
                  item={c}
                  onChangeQty={(d) => cart.changeQty(c.key, d)}
                  onSetQty={(q) => cart.setQty(c.key, q)}
                  onBlurQty={() => cart.normalizeQty(c.key)}
                  onRemove={() => cart.remove(c.key)}
                  onNama={(v) => cart.setNama(c.key, v)}
                  onHarga={(v) => cart.setHarga(c.key, v)}
                />
              ))}
            </div>
          )}

          <div className="mt-4 hidden border-t border-slate-200 pt-4 lg:block">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Total</span>
              <span className="text-2xl font-bold text-emerald-700">{rupiah(cart.total)}</span>
            </div>
            <button onClick={save} disabled={saving || cart.items.length === 0 || !!success} className="btn btn-primary mt-4 w-full py-3 text-base">
              {saving && <Spinner className="h-4 w-4" />}
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </section>

        {/* TAMBAH ITEM */}
        <section className="card p-4 lg:col-span-2 lg:self-start">
          <p className="mb-3 text-sm font-semibold text-slate-800">Tambah Item</p>
          <div className="relative mb-3">
            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              aria-label="Cari produk"
              className="input pl-10"
            />
          </div>
          <div className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => cart.add(p.nama, Number(p.harga))}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left transition hover:border-emerald-300 hover:bg-emerald-50 active:scale-[0.98]"
              >
                <span className="min-w-0 break-words text-sm font-medium text-slate-800">{p.nama}</span>
                <span className="shrink-0 text-sm font-bold text-emerald-700">{rupiah(p.harga)}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="py-4 text-center text-sm text-slate-500">Produk tidak ditemukan</p>}
          </div>

          <form onSubmit={addManual} className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-600">Item manual</p>
            <input type="text" placeholder="Nama barang / jasa" aria-label="Nama barang" value={manual.nama} onChange={(e) => setManual({ ...manual, nama: e.target.value })} className="input" required />
            <div className="grid grid-cols-3 gap-2">
              <input type="text" inputMode="numeric" placeholder="Harga" aria-label="Harga" value={manual.harga} onChange={(e) => setManual({ ...manual, harga: e.target.value.replace(/\D/g, '') })} className="input col-span-2" required />
              <input type="text" inputMode="numeric" placeholder="Qty" aria-label="Jumlah" value={manual.qty} onChange={(e) => setManual({ ...manual, qty: e.target.value.replace(/\D/g, '') })} className="input text-center" required />
            </div>
            <button type="submit" className="btn btn-dark w-full">
              <IconPlus className="h-4 w-4" /> Tambah Item
            </button>
          </form>
        </section>
      </div>

      {/* BAR TOTAL MENEMPEL (HP & tablet portrait) */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-600">Total baru</p>
            <p className="truncate text-lg font-bold text-emerald-700">{rupiah(cart.total)}</p>
          </div>
          <button onClick={save} disabled={saving || cart.items.length === 0 || !!success} className="btn btn-primary shrink-0">
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? 'Menyimpan' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
}
