import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KasirFlex by NB Projects',
  description: 'Aplikasi kasir sederhana, cepat, dan modern.',
};

// viewport-fit=cover memungkinkan layout memakai area aman (notch / home indicator) di HP
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
