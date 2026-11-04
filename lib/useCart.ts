'use client';
import { useCallback, useMemo, useRef, useState } from 'react';

export type CartItem = { key: number; nama: string; harga: number; qty: number };

/**
 * State keranjang nota yang dipakai di halaman Buat Nota & Edit Nota.
 * qty boleh sementara 0 saat pengguna menghapus angka untuk mengetik ulang;
 * nilai itu dinormalkan ke 1 saat input kehilangan fokus (normalizeQty).
 */
export function useCart(initial: CartItem[] = []) {
  const keyRef = useRef(initial.reduce((max, i) => Math.max(max, i.key), 0));
  const [items, setItems] = useState<CartItem[]>(initial);

  const add = useCallback((nama: string, harga: number, qty = 1) => {
    const key = ++keyRef.current;
    setItems((prev) => {
      const found = prev.find((c) => c.nama === nama && c.harga === harga);
      if (found) return prev.map((c) => (c === found ? { ...c, qty: c.qty + qty } : c));
      return [...prev, { key, nama, harga, qty }];
    });
  }, []);

  const replaceAll = useCallback((list: { nama: string; harga: number; qty: number }[]) => {
    setItems(list.map((i) => ({ ...i, key: ++keyRef.current })));
  }, []);

  const changeQty = useCallback((key: number, delta: number) => {
    setItems((prev) =>
      prev.map((c) => (c.key === key ? { ...c, qty: Math.min(9999, Math.max(1, c.qty + delta)) } : c))
    );
  }, []);

  const setQty = useCallback((key: number, qty: number) => {
    setItems((prev) => prev.map((c) => (c.key === key ? { ...c, qty: Math.min(9999, Math.max(0, qty)) } : c)));
  }, []);

  const normalizeQty = useCallback((key: number) => {
    setItems((prev) => prev.map((c) => (c.key === key && c.qty < 1 ? { ...c, qty: 1 } : c)));
  }, []);

  const setNama = useCallback((key: number, nama: string) => {
    setItems((prev) => prev.map((c) => (c.key === key ? { ...c, nama } : c)));
  }, []);

  const setHarga = useCallback((key: number, harga: number) => {
    setItems((prev) => prev.map((c) => (c.key === key ? { ...c, harga } : c)));
  }, []);

  const remove = useCallback((key: number) => {
    setItems((prev) => prev.filter((c) => c.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = useMemo(() => items.reduce((sum, c) => sum + c.harga * c.qty, 0), [items]);
  const count = useMemo(() => items.reduce((sum, c) => sum + c.qty, 0), [items]);

  return { items, add, replaceAll, changeQty, setQty, normalizeQty, setNama, setHarga, remove, clear, total, count };
}
