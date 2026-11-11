/** Monta links de contato a partir de telefones normalizados (apenas dígitos, com DDD). */
export function whatsappLink(digits: string, text?: string): string {
  const number = digits.replace(/\D/g, '');
  const full = number.startsWith('55') && number.length > 11 ? number : `55${number}`;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function telLink(digits: string): string {
  return `tel:+55${digits.replace(/\D/g, '')}`;
}

export function mapsSearchLink(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function mapsDirectionsLink(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function mapsEmbedUrl(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&hl=pt-BR&z=14&output=embed`;
}
