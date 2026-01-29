import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
<<<<<<< HEAD
      url: 'https://snipit.sh',
=======
      url: 'https://snipit.sh',
>>>>>>> main
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
