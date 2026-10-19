import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/nunito';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ascolto em Família',
  description: 'Aprenda idiomas com música, pelo método natural.',
  appleWebApp: { capable: true, title: 'Ascolto', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  colorScheme: 'light dark',
  // cor da barra de status = cor do cabeçalho (não a cor da marca)
  themeColor: '#f7faf9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
