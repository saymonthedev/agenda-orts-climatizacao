/**
 * Nota e avaliações do Perfil da Empresa no Google, pela Places API (New).
 *
 * Configuração (variáveis de ambiente do servidor):
 *   GOOGLE_PLACES_API_KEY  chave com a "Places API (New)" ativada (obrigatória)
 *   GOOGLE_PLACE_ID        ID do lugar (ChIJ…); opcional: o padrão é o perfil da ORTS (SITE.googlePlaceId).
 *                          Se o ID deixar de valer, o perfil é procurado pelo nome (GOOGLE_PLACE_QUERY).
 *
 * Para o perfil da ORTS o Google entrega a nota e o total, mas não os comentários (testado com a
 * busca e com os detalhes do lugar, com e sem idioma). Os comentários são cadastrados no painel
 * (Configurações → Avaliações); se um dia a API passar a mandá-los, eles também aparecem.
 * Sem a chave, ou se o Google falhar, devolve null. O resultado fica em cache por 6 horas.
 */
import { SITE } from '@/content/site';

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

type PlaceReview = {
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  relativePublishTimeDescription?: string;
  googleMapsUri?: string;
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
};

type PlaceResponse = {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  googleMapsLinks?: { reviewsUri?: string; writeAReviewUri?: string; placeUri?: string };
  reviews?: PlaceReview[];
};

/** Resultado de cada consulta, só para o diagnóstico nos logs. */
type Attempt = { etapa: string; status: number; recebidas?: number };

const FIELDS = 'rating,userRatingCount,reviews,googleMapsUri,googleMapsLinks';
const CACHE_SECONDS = 6 * 60 * 60;
const API = 'https://places.googleapis.com/v1';

export async function getGoogleReviews(): Promise<GoogleReviews | null> {
  if (process.env.GOOGLE_REVIEWS_FIXTURE && process.env.NODE_ENV !== 'production') {
    // "1": com comentários; "sem-texto": só a nota
    return process.env.GOOGLE_REVIEWS_FIXTURE === 'sem-texto' ? { ...FIXTURE, reviews: [] } : FIXTURE;
  }
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  const attempts: Attempt[] = [];

  try {
    let placeId = process.env.GOOGLE_PLACE_ID?.trim() || SITE.googlePlaceId;
    let place = await placeDetails(placeId, key, attempts);
    if (!place) {
      // o ID pode mudar (perfil movido ou unificado): procura pelo nome
      const found = await searchPlace(key, attempts);
      if (found?.id) {
        placeId = found.id;
        place = found;
      }
    }
    if (!place) return warn('Avaliações do Google indisponíveis', attempts);
    const result = normalize(placeId, place);
    console.info(
      JSON.stringify({
        level: 'info',
        message: 'Avaliações do Google',
        nota: result?.rating ?? null,
        total: result?.total ?? 0,
        comentarios: result?.reviews.filter((r) => r.text).length ?? 0,
        tentativas: attempts,
      }),
    );
    return result;
  } catch (err) {
    return warn('Falha ao buscar avaliações do Google', attempts, err instanceof Error ? err.message : 'erro');
  }
}

async function placeDetails(placeId: string, key: string, attempts: Attempt[]): Promise<PlaceResponse | null> {
  const res = await fetch(`${API}/places/${encodeURIComponent(placeId)}?languageCode=pt-BR&regionCode=BR`, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELDS },
    next: { revalidate: CACHE_SECONDS },
  });
  const data = res.ok ? ((await res.json()) as PlaceResponse) : null;
  attempts.push({ etapa: 'detalhes', status: res.status, recebidas: data?.reviews?.length ?? 0 });
  return data;
}

/** Encontra o perfil pelo nome. Só aceita um resultado com "ORTS" no nome. */
async function searchPlace(key: string, attempts: Attempt[]): Promise<PlaceResponse | null> {
  const queries = [process.env.GOOGLE_PLACE_QUERY || 'ORTS Climatização Jaraguá do Sul', 'ORTS Climatização'];
  for (const textQuery of queries) {
    const res = await fetch(`${API}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': ['places.id', 'places.displayName', ...FIELDS.split(',').map((f) => `places.${f}`)].join(','),
      },
      // a ORTS atende na casa do cliente (sem endereço público): sem esta opção a busca a ignora
      body: JSON.stringify({ textQuery, languageCode: 'pt-BR', regionCode: 'BR', pageSize: 5, includePureServiceAreaBusinesses: true }),
      next: { revalidate: CACHE_SECONDS },
    });
    if (!res.ok) {
      attempts.push({ etapa: 'busca', status: res.status });
      return null;
    }
    const { places = [] } = (await res.json()) as { places?: PlaceResponse[] };
    const place = places.find((p) => /\borts\b/i.test(p.displayName?.text ?? ''));
    attempts.push({ etapa: 'busca', status: res.status, recebidas: place?.reviews?.length ?? 0 });
    if (place?.id) return place;
  }
  return null;
}

function warn(message: string, attempts: Attempt[], error?: string): null {
  console.warn(JSON.stringify({ level: 'warn', message, tentativas: attempts, ...(error ? { error } : {}) }));
  return null;
}

function normalize(placeId: string, data: PlaceResponse): GoogleReviews | null {
  const total = data.userRatingCount ?? 0;
  if (!total) return null;
  const reviews = (data.reviews ?? []).map((r) => ({
    author: r.authorAttribution?.displayName?.trim() || 'Cliente do Google',
    authorUrl: r.authorAttribution?.uri ?? null,
    authorPhoto: r.authorAttribution?.photoUri ?? null,
    rating: Math.round(r.rating ?? 0),
    text: (r.text?.text ?? r.originalText?.text ?? '').trim(),
    relativeTime: r.relativePublishTimeDescription ?? '',
    url: r.googleMapsUri ?? null,
  }));
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
      text: 'Texto de exemplo para testes: higienização feita com cuidado e o aparelho voltou a gelar como novo.',
      relativeTime: 'há 1 mês',
      url: null,
    },
    {
      author: 'Cliente de exemplo C',
      authorUrl: null,
      authorPhoto: null,
      rating: 5,
      text: 'Texto de exemplo para testes: ótimo atendimento.',
      relativeTime: 'há 3 meses',
      url: null,
    },
    { author: 'Cliente de exemplo D', authorUrl: null, authorPhoto: null, rating: 5, text: '', relativeTime: 'há 4 meses', url: null },
  ],
};
