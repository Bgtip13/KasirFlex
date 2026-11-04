'use client';
import Modal from './Modal';
import Struk, { type StrukProps } from './Struk';
import { IconPrinter } from './icons';

type Props = {
  data: Omit<StrukProps, 'toko'>;
  toko: StrukProps['toko'];
  onClose: () => void;
  closeLabel?: string;
};

/** Pratinjau struk + tombol cetak. Dipakai di Buat Nota dan Riwayat. */
export default function ReceiptModal({ data, toko, onClose, closeLabel = 'Tutup' }: Props) {
  return (
    <Modal title="Struk" onClose={onClose} maxWidth="sm">
      <Struk {...data} toko={toko} />
      <div className="mt-5 grid grid-cols-2 gap-2 print:hidden">
        <button onClick={() => window.print()} className="btn btn-primary">
          <IconPrinter className="h-4 w-4" /> Cetak
        </button>
        <button onClick={onClose} className="btn btn-outline">
          {closeLabel}
        </button>
      </div>
    </Modal>
  );
}
