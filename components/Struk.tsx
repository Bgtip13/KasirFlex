'use client';

export interface StrukProps {
  toko?: {
    nama_toko?: string;
    no_hp?: string;
    alamat?: string;
  };
  invoiceNo: string;
  tanggal: string;
  items: {
    nama: string;
    qty: number;
    harga: number;
  }[];
  total: number;
}

export default function Struk({ toko, invoiceNo, tanggal, items, total }: StrukProps) {
  return (
    <div className="font-mono text-xs text-slate-800 p-2">
      {/* Header Toko */}
      <div className="text-center mb-3 border-b border-dashed border-slate-300 pb-2">
        <h2 className="text-base font-bold uppercase">{toko?.nama_toko || 'Toko Saya'}</h2>
        {toko?.alamat && <p className="text-[11px] text-slate-600">{toko.alamat}</p>}
        {toko?.no_hp && <p className="text-[11px] text-slate-600">Telp: {toko.no_hp}</p>}
      </div>

      {/* Info Transaksi */}
      <div className="mb-3 border-b border-dashed border-slate-300 pb-2 text-[11px]">
        <div className="flex justify-between">
          <span>No. Nota:</span>
          <span className="font-semibold">{invoiceNo}</span>
        </div>
        <div className="flex justify-between">
          <span>Tanggal:</span>
          <span>{tanggal}</span>
        </div>
      </div>

      {/* Daftar Item */}
      <div className="mb-3 border-b border-dashed border-slate-300 pb-2 space-y-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-start">
            <div className="flex-1 pr-2">
              <div>{item.nama}</div>
              <div className="text-[10px] text-slate-500">
                {item.qty} x Rp {item.harga.toLocaleString('id-ID')}
              </div>
            </div>
            <div className="font-medium">
              Rp {(item.qty * item.harga).toLocaleString('id-ID')}
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex justify-between font-bold text-sm pt-1">
        <span>TOTAL</span>
        <span>Rp {total.toLocaleString('id-ID')}</span>
      </div>

      <div className="mt-4 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-2">
        Terima kasih atas kunjungan Anda!
      </div>
    </div>
  );
}
