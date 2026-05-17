import type { Metadata } from 'next';
import './globals.css';
import { PlayerProvider } from '@/components/PlayerProvider';

export const metadata: Metadata = {
  title: 'CW',
  description: 'Organização de partidas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#0a0a0f" />
      </head>
      <body className="bg-bg text-white font-sans antialiased">
        <PlayerProvider>{children}</PlayerProvider>
      </body>
    </html>
  );
}
