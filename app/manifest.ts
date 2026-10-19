import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ascolto em Família',
    short_name: 'Ascolto',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7faf9',
    theme_color: '#f7faf9',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
