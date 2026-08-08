import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KasirFlex by NB Projects',
  description: 'Aplikasi kasir sederhana, cepat, dan modern.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
