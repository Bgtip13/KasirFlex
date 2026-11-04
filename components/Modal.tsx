'use client';
import { useEffect, type ReactNode } from 'react';
import { IconX } from './icons';

type Props = {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  /** Lebar maksimum panel di layar besar */
  maxWidth?: 'sm' | 'md' | 'lg';
};

const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg' };

/**
 * Modal responsif: tampil sebagai "bottom sheet" di HP dan dialog di tengah di layar lebar.
 * Menutup dengan tombol Esc atau klik di luar panel. Saat dicetak, panel jadi biasa
 * (tanpa overlay) sehingga hanya isinya yang tercetak.
 */
export default function Modal({ title, onClose, children, maxWidth = 'md' }: Props) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-[2px] sm:items-center sm:p-4 print:static print:block print:bg-transparent print:p-0 print:backdrop-blur-none"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl ${widths[maxWidth]} print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:shadow-none`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 print:hidden">
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            >
              <IconX className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto overscroll-contain p-5 pb-safe print:overflow-visible print:p-0">{children}</div>
      </div>
    </div>
  );
}
