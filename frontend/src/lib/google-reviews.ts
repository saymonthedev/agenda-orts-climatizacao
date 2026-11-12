/**
 * Avaliações do Perfil da Empresa no Google, pela Places API (New).
 *
 * Configuração (variáveis de ambiente do servidor):
 *   GOOGLE_PLACES_API_KEY  chave com a "Places API (New)" ativada
 *   GOOGLE_PLACE_ID        ID do lugar (ChIJ…) do perfil "ORTS Climatização Jaraguá"
 *
 * Sem configuração, ou se o Google falhar, devolve null e a seção não aparece.
 * O resultado fica em cache por 6 horas (≈4 consultas por dia, dentro da cota gratuita).
 */

export type GoogleReview = {
  author: string;
  authorUrl: string | null;
  authorPhoto: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  url: string | null;
};

export type GoogleReviews = {
  rating: number | null;
  total: number;
  reviews: GoogleReview[];
  reviewsUrl: string;
  writeReviewUrl: string;
};

type PlaceResponse = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  googleMapsLinks?: { reviewsUri?: string; writeAReviewUri?: string; placeUri?: string };
  reviews?: {
    rating?: number;
    text?: { text?: string };
    originalText?: { text?: string };
    relativePublishTimeDescription?: string;
    googleMapsUri?: string;
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  }[];
};

const FIELDS = 'rating,userRatingCount,reviews,googleMapsUri,googleMapsLinks';
const CACHE_SECONDS = 6 * 60 * 60;

export async function getGoogleReviews(): Promise<GoogleReviews | null> {
  if (process.env.GOOGLE_REVIEWS_FIXTURE === '1' && process.env.NODE_ENV !== 'production') return FIXTURE;
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!key || !placeId) return null;

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=pt-BR&regionCode=BR`, {
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELDS },
      next: { revalidate: CACHE_SECONDS },
    });
    if (!res.ok) {
      console.warn(JSON.stringify({ level: 'warn', message: 'Avaliações do Google indisponíveis', status: res.status }));
      return null;
    }
    return normalize(placeId, (await res.json()) as PlaceResponse);
  } catch (err) {
    console.warn(JSON.stringify({ level: 'warn', message: 'Falha ao buscar avaliações do Google', error: err instanceof Error ? err.message : 'erro' }));
    return null;
  }
}

function normalize(placeId: string, data: PlaceResponse): GoogleReviews | null {
  const total = data.userRatingCount ?? 0;
  if (!total) return null;
  const reviews = (data.reviews ?? [])
    .map((r) => ({
      author: r.authorAttribution?.displayName?.trim() || 'Cliente do Google',
      authorUrl: r.authorAttribution?.uri ?? null,
      authorPhoto: r.authorAttribution?.photoUri ?? null,
      rating: Math.round(r.rating ?? 0),
      text: (r.text?.text ?? r.originalText?.text ?? '').trim(),
      relativeTime: r.relativePublishTimeDescription ?? '',
      url: r.googleMapsUri ?? null,
    }))
    // só avaliações com texto viram cartão; as de só estrelas entram na nota geral
    .filter((r) => r.text.length > 0);
  const id = encodeURIComponent(placeId);
  return {
    rating: typeof data.rating === 'number' ? data.rating : null,
    total,
    reviews,
    reviewsUrl: data.googleMapsLinks?.reviewsUri ?? data.googleMapsUri ?? `https://search.google.com/local/reviews?placeid=${id}`,
    writeReviewUrl: data.googleMapsLinks?.writeAReviewUri ?? `https://search.google.com/local/writereview?placeid=${id}`,
  };
}

/** Dados de exemplo para desenvolvimento e testes (nunca usados em produção). */
const FIXTURE: GoogleReviews = {
  rating: 5,
  total: 4,
  reviewsUrl: 'https://www.google.com/maps',
  writeReviewUrl: 'https://www.google.com/maps',
  reviews: [
    {
      author: 'Cliente de exemplo A',
      authorUrl: 'https://www.google.com/maps',
      authorPhoto: null,
      rating: 5,
      text: 'Texto de exemplo para testes: atendimento pontual, instalação caprichada e tudo limpo no final. Explicou como usar e quando fazer a próxima limpeza.',
      relativeTime: 'há 2 semanas',
      url: 'https://www.google.com/maps',
    },
    {
      author: 'Cliente de exemplo B',
      authorUrl: null,
      authorPhoto: null,
      rating: 5,
      text: 'Texto de exemplo para testes: higienização feita com cuidado, protegeu a parede e os móveis. O aparelho voltou a gelar como novo.',
      relativeTime: 'há 1 mês',
      url: null,
    },
    {
      author: 'Cliente de exemplo C',
      authorUrl: null,
      authorPhoto: null,
      rating: 5,
      text: 'Texto de exemplo para testes: combinamos pelo WhatsApp e chegou no horário marcado.',
      relativeTime: 'há 3 meses',
      url: null,
    },
  ],
};
