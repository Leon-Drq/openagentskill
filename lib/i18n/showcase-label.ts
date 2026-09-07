export function getShowcaseNavLabel(locale: string) {
  return ({ zh: '作品集', ja: '作品集', ko: '갤러리', es: 'Galería', de: 'Galerie', fr: 'Galerie', id: 'Galeri' } as Record<string, string>)[locale] || 'Gallery'
}
