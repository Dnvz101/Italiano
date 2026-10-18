import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ascolto em Família',
    short_name: 'Ascolto',
    start_url: '/',
    display: 'standalone',
    background_color: '#eef1ee',
    theme_color: '#eef1ee',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
