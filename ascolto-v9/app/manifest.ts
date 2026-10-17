import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ascolto em Família',
    short_name: 'Ascolto',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f5f0',
    theme_color: '#0f766e',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
