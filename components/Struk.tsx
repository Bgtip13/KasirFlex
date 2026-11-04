import { rupiah } from '@/lib/format';

export interface StrukProps {
  toko?: {
    nama_toko?: string | null;
    no_hp?: string | null;
    alamat?: string | null;
  };
  invoiceNo: string;
  tanggal: string;
  items: { nama: string; qty: number; harga: number }[];
  total: number;
}

/**
 * Tampilan struk. Dipakai untuk pratinjau di layar dan untuk dicetak (window.print()).
 * Lebar dibatasi seperti kertas thermal; saat dicetak ikut mengecil ke ±72mm.
 */
export default function Struk({ toko, invoiceNo, tanggal, items, total }: StrukProps) {
  return (
    <div
      id="print-area"
      className="mx-auto w-full max-w-[340px] rounded-lg bg-white p-3 font-mono text-xs text-slate-800 print:max-w-[72mm] print:p-0 print:text-black"
    >
      <div className="mb-3 border-b border-dashed border-slate-400 pb-3 text-center">
        <h2 className="text-base font-bold uppercase tracking-wide">{toko?.nama_toko || 'Toko Saya'}</h2>
        {toko?.alamat && <p className="mt-0.5 text-[11px] text-slate-600 print:text-black">{toko.alamat}</p>}
        {toko?.no_hp && <p className="text-[11px] text-slate-600 print:text-black">Telp: {toko.no_hp}</p>}
      </div>

      <div className="mb-3 space-y-1 border-b border-dashed border-slate-400 pb-3 text-[11px]">
        <div className="flex justify-between gap-3">
          <span className="text-slate-600 print:text-black">No. Nota</span>
          <span className="font-semibold">{invoiceNo}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-600 print:text-black">Tanggal</span>
          <span className="text-right">{tanggal}</span>
        </div>
      </div>

      <div className="mb-3 space-y-2 border-b border-dashed border-slate-400 pb-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="break-words font-medium">{item.nama}</div>
              <div className="text-[10px] text-slate-600 print:text-black">
                {item.qty} x {rupiah(item.harga)}
              </div>
            </div>
            <div className="shrink-0 text-right font-semibold">{rupiah(item.qty * item.harga)}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-between gap-3 pt-1 text-sm font-bold">
        <span>TOTAL</span>
        <span>{rupiah(total)}</span>
      </div>

      <div className="mt-4 border-t border-dashed border-slate-400 pt-3 text-center text-[10px] text-slate-600 print:text-black">
        Terima kasih atas kunjungan Anda!
        <div className="mt-1">KasirFlex by NB Projects</div>
      </div>
    </div>
  );
}
