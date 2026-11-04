'use client';
import { digitsToNumber, rupiah } from '@/lib/format';
import type { CartItem } from '@/lib/useCart';
import { IconMinus, IconPlus, IconTrash } from './icons';

type Props = {
  item: CartItem;
  onChangeQty: (delta: number) => void;
  onSetQty: (qty: number) => void;
  onBlurQty: () => void;
  onRemove: () => void;
  /** Jika diisi, nama & harga bisa diubah (dipakai di Edit Nota) */
  onNama?: (v: string) => void;
  onHarga?: (v: number) => void;
};

export default function CartItemRow({ item, onChangeQty, onSetQty, onBlurQty, onRemove, onNama, onHarga }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {onNama ? (
            <input
              type="text"
              value={item.nama}
              onChange={(e) => onNama(e.target.value)}
              aria-label="Nama item"
              className="input py-1.5"
            />
          ) : (
            <p className="break-words text-sm font-semibold text-slate-800">{item.nama}</p>
          )}
          {!onHarga && <p className="mt-0.5 text-xs text-slate-500">{rupiah(item.harga)}</p>}
        </div>
        <button
          onClick={onRemove}
          aria-label={`Hapus ${item.nama}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
        >
          <IconTrash className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center rounded-xl border border-slate-300 bg-white">
          <button
            onClick={() => onChangeQty(-1)}
            disabled={item.qty <= 1}
            aria-label="Kurangi jumlah"
            className="flex h-10 w-10 items-center justify-center rounded-l-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          >
            <IconMinus className="h-4 w-4" />
          </button>
          <input
            type="text"
            inputMode="numeric"
            value={item.qty === 0 ? '' : item.qty}
            onChange={(e) => onSetQty(digitsToNumber(e.target.value))}
            onBlur={onBlurQty}
            onFocus={(e) => e.target.select()}
            aria-label="Jumlah"
            className="h-10 w-12 border-x border-slate-200 bg-white text-center text-base font-semibold text-slate-800 outline-none sm:text-sm"
          />
          <button
            onClick={() => onChangeQty(1)}
            aria-label="Tambah jumlah"
            className="flex h-10 w-10 items-center justify-center rounded-r-xl text-slate-600 hover:bg-slate-100"
          >
            <IconPlus className="h-4 w-4" />
          </button>
        </div>

        {onHarga && (
          <div className="flex min-w-0 flex-1 basis-32 items-center gap-1.5">
            <span className="text-xs text-slate-500">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={item.harga === 0 ? '' : item.harga}
              onChange={(e) => onHarga(digitsToNumber(e.target.value))}
              onFocus={(e) => e.target.select()}
              aria-label="Harga satuan"
              className="input py-1.5 text-right"
            />
          </div>
        )}

        <p className="ml-auto text-right text-sm font-bold text-slate-900">{rupiah(item.harga * item.qty)}</p>
      </div>
    </div>
  );
}
